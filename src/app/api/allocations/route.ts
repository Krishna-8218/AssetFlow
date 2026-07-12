import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    // Security constraints
    const isSpecialRole = session.role === 'ADMIN' || session.role === 'ASSET_MANAGER';
    const isDeptHead = session.role === 'DEPARTMENT_HEAD';

    const allocations = await prisma.allocation.findMany({
      where: {
        AND: [
          status ? { status } : {},
          !isSpecialRole ? (
            isDeptHead ? { departmentId: session.departmentId } : { allocatedToId: session.userId }
          ) : {}
        ]
      },
      include: {
        asset: {
          select: { id: true, name: true, assetTag: true, serialNumber: true }
        },
        allocatedTo: {
          select: { id: true, name: true, email: true }
        },
        allocatedBy: {
          select: { name: true }
        },
        department: {
          select: { name: true, code: true }
        }
      },
      orderBy: { allocatedAt: 'desc' }
    });

    return NextResponse.json(allocations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Allocate Asset - Double Allocation Block in force here
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'ASSET_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized. Inventory access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { assetId, allocatedToId, expectedReturnDate, notes } = body;

    if (!assetId || !allocatedToId) {
      return NextResponse.json({ error: 'Asset and Target Employee are required' }, { status: 400 });
    }

    // Load asset and verify availability
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        assignedTo: { select: { name: true, email: true } },
        department: { select: { name: true } }
      }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Business Rules: Double allocation block
    if (asset.status !== 'AVAILABLE') {
      const currentHolder = asset.assignedTo?.name || 'Department Allocation';
      const deptName = asset.department?.name || 'N/A';
      return NextResponse.json({
        error: 'Double allocation blocked',
        conflict: true,
        message: `This asset is currently held by ${currentHolder} (${deptName}). You cannot allocate a busy asset. Please submit a Transfer Request instead.`
      }, { status: 409 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: allocatedToId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Target employee not found' }, { status: 404 });
    }

    // Create allocation
    const allocation = await prisma.allocation.create({
      data: {
        assetId,
        allocatedToId,
        allocatedById: session.userId,
        departmentId: targetUser.departmentId,
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
        status: 'ACTIVE'
      }
    });

    // Update asset
    await prisma.asset.update({
      where: { id: assetId },
      data: {
        status: 'ALLOCATED',
        assignedToId: allocatedToId,
        departmentId: targetUser.departmentId
      }
    });

    // Create notifications
    await prisma.notification.create({
      data: {
        userId: allocatedToId,
        title: 'Asset Assigned to You',
        message: `You have been allocated asset ${asset.name} (${asset.assetTag}). Expected return: ${expectedReturnDate ? expectedReturnDate : 'Open-ended'}.`,
        type: 'ASSET_ASSIGNED',
        referenceId: assetId,
        referenceType: 'ASSET'
      }
    });

    await logActivity({
      userId: session.userId,
      action: `Allocated asset ${asset.assetTag} to ${targetUser.name}`,
      entityType: 'ALLOCATION',
      entityId: allocation.id,
      newValue: allocation,
      role: session.role
    });

    return NextResponse.json(allocation);
  } catch (error: any) {
    console.error('Allocation POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Return Asset (Mark allocation complete)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'ASSET_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized. Inventory access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { allocationId, conditionOnReturn, returnNotes } = body;

    if (!allocationId) {
      return NextResponse.json({ error: 'Allocation ID is required' }, { status: 400 });
    }

    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
      include: { asset: true, allocatedTo: true }
    });

    if (!allocation || allocation.status === 'RETURNED') {
      return NextResponse.json({ error: 'Active allocation record not found' }, { status: 404 });
    }

    // Close allocation
    const updatedAlloc = await prisma.allocation.update({
      where: { id: allocationId },
      data: {
        returnedAt: new Date(),
        conditionOnReturn: conditionOnReturn || 'GOOD',
        returnNotes: returnNotes || null,
        status: 'RETURNED'
      }
    });

    // Revert Asset to AVAILABLE
    await prisma.asset.update({
      where: { id: allocation.assetId },
      data: {
        status: 'AVAILABLE',
        assignedToId: null,
        condition: conditionOnReturn || undefined
      }
    });

    // Notify employee of verified return check-in
    await prisma.notification.create({
      data: {
        userId: allocation.allocatedToId,
        title: 'Asset Return Processed',
        message: `Your return check-in for ${allocation.asset.name} (${allocation.asset.assetTag}) has been verified. Condition: ${conditionOnReturn}.`,
        type: 'SYSTEM',
        referenceId: allocation.assetId,
        referenceType: 'ASSET'
      }
    });

    await logActivity({
      userId: session.userId,
      action: `Processed return for asset ${allocation.asset.assetTag}`,
      entityType: 'ALLOCATION',
      entityId: allocation.id,
      newValue: updatedAlloc,
      role: session.role
    });

    return NextResponse.json(updatedAlloc);
  } catch (error: any) {
    console.error('Allocation PUT error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
