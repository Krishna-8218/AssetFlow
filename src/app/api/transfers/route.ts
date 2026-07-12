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

    const { role, departmentId, userId } = session;
    const isSpecialRole = role === 'ADMIN' || role === 'ASSET_MANAGER';
    const isDeptHead = role === 'DEPARTMENT_HEAD';

    const transfers = await prisma.transfer.findMany({
      where: {
        ...(isSpecialRole ? {} : isDeptHead ? {
          OR: [
            { fromDeptId: departmentId },
            { toDeptId: departmentId }
          ]
        } : {
          OR: [
            { fromUserId: userId },
            { toUserId: userId }
          ]
        })
      },
      include: {
        asset: {
          select: { name: true, assetTag: true, serialNumber: true }
        },
        fromUser: { select: { name: true, email: true } },
        toUser: { select: { name: true, email: true } },
        fromDept: { select: { name: true, code: true } },
        toDept: { select: { name: true, code: true } },
        requestedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(transfers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Request Transfer
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assetId, toUserId, reason } = body;

    if (!assetId || !toUserId) {
      return NextResponse.json({ error: 'Asset and Target User are required' }, { status: 400 });
    }

    // Load asset, determine current owner
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { assignedTo: true }
    });

    if (!asset || !asset.assignedToId) {
      return NextResponse.json({ error: 'Asset is not currently allocated to anyone. Allocate it directly instead.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const transfer = await prisma.transfer.create({
      data: {
        assetId,
        fromUserId: asset.assignedToId,
        toUserId,
        fromDeptId: asset.departmentId,
        toDeptId: targetUser.departmentId,
        requestedById: session.userId,
        reason,
        status: 'REQUESTED'
      }
    });

    // Create notifications for Asset Managers and the old holder
    const managers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'ASSET_MANAGER'] } }
    });

    await prisma.notification.createMany({
      data: [
        ...managers.map(m => ({
          userId: m.id,
          title: 'Transfer Request Submitted',
          message: `${session.name} requested transfer of asset ${asset.name} (${asset.assetTag}) to ${targetUser.name}.`,
          type: 'TRANSFER_APPROVED',
          referenceId: transfer.id,
          referenceType: 'TRANSFER'
        })),
        {
          userId: asset.assignedToId,
          title: 'Transfer Request Initiated',
          message: `A transfer request has been initiated for asset ${asset.name} (${asset.assetTag}) held by you, to be handed to ${targetUser.name}.`,
          type: 'SYSTEM',
          referenceId: transfer.id,
          referenceType: 'TRANSFER'
        }
      ]
    });

    await logActivity({
      userId: session.userId,
      action: `Initiated transfer request of ${asset.assetTag} to ${targetUser.name}`,
      entityType: 'TRANSFER',
      entityId: transfer.id,
      newValue: transfer,
      role: session.role
    });

    return NextResponse.json(transfer);
  } catch (error: any) {
    console.error('Transfer POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Approve / Reject Transfer
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Unauthorized. Higher privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const { transferId, status, notes } = body;

    if (!transferId || !status) {
      return NextResponse.json({ error: 'Transfer ID and Status are required' }, { status: 400 });
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: { asset: true, fromUser: true, toUser: true }
    });

    if (!transfer || transfer.status !== 'REQUESTED') {
      return NextResponse.json({ error: 'Requested transfer log not found or already processed' }, { status: 404 });
    }

    // Role-check: Department Head can approve transfers only within their department
    if (session.role === 'DEPARTMENT_HEAD') {
      const isFromDept = transfer.fromDeptId === session.departmentId;
      const isToDept = transfer.toDeptId === session.departmentId;
      if (!isFromDept && !isToDept) {
        return NextResponse.json({ error: 'Unauthorized. Department heads can only approve departmental transfers.' }, { status: 403 });
      }
    }

    if (status === 'APPROVED') {
      // 1. Process old allocation as returned/transferred
      const activeAlloc = await prisma.allocation.findFirst({
        where: {
          assetId: transfer.assetId,
          allocatedToId: transfer.fromUserId,
          status: 'ACTIVE'
        }
      });

      if (activeAlloc) {
        await prisma.allocation.update({
          where: { id: activeAlloc.id },
          data: {
            returnedAt: new Date(),
            status: 'RETURNED',
            returnNotes: `Transferred directly to ${transfer.toUser.name} via Approved request ID: ${transferId}`
          }
        });
      }

      // 2. Create new allocation
      await prisma.allocation.create({
        data: {
          assetId: transfer.assetId,
          allocatedToId: transfer.toUserId,
          allocatedById: session.userId,
          departmentId: transfer.toDeptId,
          status: 'ACTIVE'
        }
      });

      // 3. Update asset
      await prisma.asset.update({
        where: { id: transfer.assetId },
        data: {
          assignedToId: transfer.toUserId,
          departmentId: transfer.toDeptId,
          status: 'ALLOCATED'
        }
      });

      // 4. Update transfer request status
      const updatedTransfer = await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: 'APPROVED',
          approvedById: session.userId,
          notes: notes || null
        }
      });

      // 5. Notify both users
      await prisma.notification.createMany({
        data: [
          {
            userId: transfer.fromUserId,
            title: 'Asset Transferred Out',
            message: `Asset ${transfer.asset.name} (${transfer.asset.assetTag}) has been successfully transferred to ${transfer.toUser.name}.`,
            type: 'TRANSFER_APPROVED',
            referenceId: transfer.assetId,
            referenceType: 'ASSET'
          },
          {
            userId: transfer.toUserId,
            title: 'Transferred Asset Assigned',
            message: `Asset ${transfer.asset.name} (${transfer.asset.assetTag}) has been transferred to you from ${transfer.fromUser.name}.`,
            type: 'ASSET_ASSIGNED',
            referenceId: transfer.assetId,
            referenceType: 'ASSET'
          }
        ]
      });

      await logActivity({
        userId: session.userId,
        action: `Approved asset transfer: ${transfer.asset.assetTag} to ${transfer.toUser.name}`,
        entityType: 'TRANSFER',
        entityId: transfer.id,
        newValue: updatedTransfer,
        role: session.role
      });

      return NextResponse.json(updatedTransfer);
    }

    if (status === 'REJECTED') {
      const updatedTransfer = await prisma.transfer.update({
        where: { id: transferId },
        data: {
          status: 'REJECTED',
          approvedById: session.userId,
          notes: notes || null
        }
      });

      // Notify requester
      await prisma.notification.create({
        data: {
          userId: transfer.requestedById,
          title: 'Transfer Request Rejected',
          message: `The transfer request for asset ${transfer.asset.name} (${transfer.asset.assetTag}) was rejected. Notes: ${notes || 'None'}.`,
          type: 'SYSTEM',
          referenceId: transfer.id,
          referenceType: 'TRANSFER'
        }
      });

      await logActivity({
        userId: session.userId,
        action: `Rejected asset transfer: ${transfer.asset.assetTag}`,
        entityType: 'TRANSFER',
        entityId: transfer.id,
        newValue: updatedTransfer,
        role: session.role
      });

      return NextResponse.json(updatedTransfer);
    }

    return NextResponse.json({ error: 'Invalid transfer status request' }, { status: 400 });
  } catch (error: any) {
    console.error('Transfer PUT error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
