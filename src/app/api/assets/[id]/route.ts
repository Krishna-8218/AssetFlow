import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { VALID_TRANSITIONS } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        department: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        registeredBy: { select: { name: true } },
        allocations: {
          include: {
            allocatedTo: { select: { name: true, email: true } },
            allocatedBy: { select: { name: true } }
          },
          orderBy: { allocatedAt: 'desc' }
        },
        maintenanceRequests: {
          include: {
            requestedBy: { select: { name: true } },
            assignedTo: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        bookings: {
          include: {
            bookedBy: { select: { name: true } }
          },
          orderBy: { startTime: 'desc' }
        }
      }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'ASSET_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized. Inventory access required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, condition, location, status, isShared, isBookable, departmentId, notes } = body;

    const originalAsset = await prisma.asset.findUnique({ where: { id } });
    if (!originalAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Validate Status Transitions if it's changing
    if (status && status !== originalAsset.status) {
      const allowed = VALID_TRANSITIONS[originalAsset.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json({
          error: `Invalid status transition. Cannot shift asset status from ${originalAsset.status} to ${status}`
        }, { status: 400 });
      }
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        name: name || undefined,
        condition: condition || undefined,
        location: location || undefined,
        status: status || undefined,
        isShared: isShared !== undefined ? !!isShared : undefined,
        isBookable: isBookable !== undefined ? !!isBookable : undefined,
        departmentId: departmentId === 'null' ? null : (departmentId || undefined),
        notes: notes || undefined
      }
    });

    await logActivity({
      userId: session.userId,
      action: `Updated asset details: ${updated.assetTag}`,
      entityType: 'ASSET',
      entityId: updated.id,
      previousValue: originalAsset,
      newValue: updated,
      role: session.role
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Asset PUT error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Retire or Dispose Asset - Admin Only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Perform retirement or disposal transition (status → RETIRED/DISPOSED)
    const updated = await prisma.asset.update({
      where: { id },
      data: {
        status: 'DISPOSED',
        assignedToId: null,
        departmentId: null
      }
    });

    await logActivity({
      userId: session.userId,
      action: `Disposed asset: ${asset.assetTag}`,
      entityType: 'ASSET',
      entityId: asset.id,
      previousValue: asset,
      newValue: updated,
      role: session.role
    });

    return NextResponse.json({ success: true, asset: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
