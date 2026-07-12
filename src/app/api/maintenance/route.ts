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

    const requests = await prisma.maintenanceRequest.findMany({
      where: {
        // Employees can only view their own raised requests
        ...(session.role === 'EMPLOYEE' ? { requestedById: session.userId } : {})
      },
      include: {
        asset: {
          select: { name: true, assetTag: true, location: true }
        },
        requestedBy: {
          select: { name: true, email: true }
        },
        assignedTo: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Raise Maintenance Request
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assetId, description, priority, issueType } = body;

    if (!assetId || !description) {
      return NextResponse.json({ error: 'Asset and Problem Description are required' }, { status: 400 });
    }

    // Verify asset status. Do not raise maintenance for disposed/retired items
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || ['RETIRED', 'DISPOSED'].includes(asset.status)) {
      return NextResponse.json({ error: 'This asset is no longer active and cannot receive maintenance' }, { status: 400 });
    }

    const maintenance = await prisma.maintenanceRequest.create({
      data: {
        assetId,
        requestedById: session.userId,
        description,
        priority: priority || 'MEDIUM',
        issueType: issueType || 'Hardware Malfunction',
        status: 'PENDING'
      }
    });

    // Notify Asset Managers
    const managers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] } }
    });

    await prisma.notification.createMany({
      data: managers.map(m => ({
        userId: m.id,
        title: 'New Maintenance Ticket',
        message: `${session.name} raised a maintenance request for ${asset.name} (${asset.assetTag}).`,
        type: 'SYSTEM',
        referenceId: maintenance.id,
        referenceType: 'MAINTENANCE'
      }))
    });

    await logActivity({
      userId: session.userId,
      action: `Raised maintenance ticket for ${asset.assetTag}`,
      entityType: 'MAINTENANCE',
      entityId: maintenance.id,
      newValue: maintenance,
      role: session.role
    });

    return NextResponse.json(maintenance);
  } catch (error: any) {
    console.error('Maintenance POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Update Kanban Column Status & Technician Assignment
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Unauthorized. Operational privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, status, assignedToId, resolutionNotes } = body;

    if (!requestId || !status) {
      return NextResponse.json({ error: 'Request ID and Status are required' }, { status: 400 });
    }

    const original = await prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: { asset: true }
    });

    if (!original) {
      return NextResponse.json({ error: 'Maintenance ticket not found' }, { status: 404 });
    }

    // Update maintenance log details
    const updated = await prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        status,
        assignedToId: assignedToId || undefined,
        approvedById: (status === 'APPROVED' || status === 'REJECTED') ? session.userId : undefined,
        resolutionNotes: resolutionNotes || undefined,
        resolvedAt: status === 'RESOLVED' ? new Date() : undefined
      }
    });

    // Business Rules: Change asset status to UNDER_MAINTENANCE on approval
    if (status === 'APPROVED') {
      await prisma.asset.update({
        where: { id: original.assetId },
        data: { status: 'UNDER_MAINTENANCE' }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: original.requestedById,
          title: 'Maintenance Request Approved',
          message: `Your repair request for ${original.asset.name} (${original.asset.assetTag}) was approved. Status shifted to Under Maintenance.`,
          type: 'MAINTENANCE_APPROVED',
          referenceId: original.assetId,
          referenceType: 'ASSET'
        }
      });
    }

    // Business Rules: Change asset status to AVAILABLE on resolution
    if (status === 'RESOLVED') {
      await prisma.asset.update({
        where: { id: original.assetId },
        data: { status: 'AVAILABLE' }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: original.requestedById,
          title: 'Maintenance Completed',
          message: `Your maintenance ticket for ${original.asset.name} (${original.asset.assetTag}) has been resolved.`,
          type: 'MAINTENANCE_COMPLETED',
          referenceId: original.assetId,
          referenceType: 'ASSET'
        }
      });
    }

    await logActivity({
      userId: session.userId,
      action: `Shifted maintenance ticket ${requestId.substring(0, 8)} status to ${status}`,
      entityType: 'MAINTENANCE',
      entityId: updated.id,
      previousValue: original,
      newValue: updated,
      role: session.role
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Maintenance PUT error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
