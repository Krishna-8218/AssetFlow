import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId');

    if (cycleId) {
      // Get detailed audit items for a cycle
      const items = await prisma.auditItem.findMany({
        where: { auditCycleId: cycleId },
        include: {
          asset: {
            select: { id: true, name: true, assetTag: true, location: true, status: true }
          },
          auditor: {
            select: { name: true }
          }
        }
      });
      return NextResponse.json(items);
    }

    // List all audit cycles
    const cycles = await prisma.auditCycle.findMany({
      include: {
        department: { select: { name: true, code: true } },
        category: { select: { name: true } },
        createdBy: { select: { name: true } },
        assignments: {
          include: {
            auditor: { select: { id: true, name: true } }
          }
        },
        _count: {
          select: { items: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(cycles);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'ASSET_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { name, scope, departmentId, categoryId, location, startDate, endDate, auditorIds } = body;

      if (!name || !scope || !startDate || !endDate || !auditorIds || auditorIds.length === 0) {
        return NextResponse.json({ error: 'Name, Scope, Dates, and Auditors are required' }, { status: 400 });
      }

      // 1. Create Cycle
      const cycle = await prisma.auditCycle.create({
        data: {
          name,
          scope,
          departmentId: departmentId || null,
          categoryId: categoryId || null,
          location: location || null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          createdById: session.userId,
          status: 'OPEN'
        }
      });

      // 2. Assign auditors
      await prisma.auditAssignment.createMany({
        data: auditorIds.map((auditorId: string) => ({
          auditCycleId: cycle.id,
          auditorId
        }))
      });

      // 3. Select target assets within scope
      const targetAssets = await prisma.asset.findMany({
        where: {
          AND: [
            { status: { notIn: ['RETIRED', 'DISPOSED'] } },
            departmentId ? { departmentId } : {},
            categoryId ? { categoryId } : {},
            location ? { location: { contains: location } } : {}
          ]
        }
      });

      // 4. Create Audit Items for each scope-matching asset
      if (targetAssets.length > 0) {
        await prisma.auditItem.createMany({
          data: targetAssets.map(a => ({
            auditCycleId: cycle.id,
            assetId: a.id,
            verificationStatus: null // Unverified initially
          }))
        });
      }

      // Notify Assigned Auditors
      await prisma.notification.createMany({
        data: auditorIds.map((auditorId: string) => ({
          userId: auditorId,
          title: 'Audit Cycle Assigned',
          message: `You have been assigned as an auditor for cycle: ${name}. Scope includes ${targetAssets.length} assets.`,
          type: 'AUDIT_ASSIGNED',
          referenceId: cycle.id,
          referenceType: 'AUDIT'
        }))
      });

      await logActivity({
        userId: session.userId,
        action: `Created audit cycle ${name} targeting ${targetAssets.length} assets`,
        entityType: 'AUDIT',
        entityId: cycle.id,
        newValue: cycle,
        role: session.role
      });

      return NextResponse.json(cycle);
    }

    if (action === 'verify') {
      const { itemId, verificationStatus, notes } = body;

      if (!itemId || !verificationStatus) {
        return NextResponse.json({ error: 'Item ID and Verification Status are required' }, { status: 400 });
      }

      const original = await prisma.auditItem.findUnique({
        where: { id: itemId },
        include: { auditCycle: true, asset: true }
      });

      if (!original || original.auditCycle.status === 'CLOSED') {
        return NextResponse.json({ error: 'Audit item not found or cycle already closed' }, { status: 400 });
      }

      const updated = await prisma.auditItem.update({
        where: { id: itemId },
        data: {
          verificationStatus,
          notes: notes || null,
          auditorId: session.userId,
          verifiedAt: new Date()
        }
      });

      // If damaged is flagged, notify inventory managers of a discrepancy
      if (verificationStatus === 'DAMAGED') {
        const managers = await prisma.user.findMany({ where: { role: 'ASSET_MANAGER' } });
        await prisma.notification.createMany({
          data: managers.map(m => ({
            userId: m.id,
            title: 'Audit Discrepancy: Damaged Asset',
            message: `${session.name} marked asset ${original.asset.name} (${original.asset.assetTag}) as Damaged. Notes: ${notes}`,
            type: 'DISCREPANCY_DETECTED',
            referenceId: original.assetId,
            referenceType: 'ASSET'
          }))
        });
      }

      return NextResponse.json(updated);
    }

    if (action === 'close') {
      const { cycleId } = body;

      if (!cycleId) {
        return NextResponse.json({ error: 'Cycle ID is required' }, { status: 400 });
      }

      const cycle = await prisma.auditCycle.findUnique({
        where: { id: cycleId }
      });

      if (!cycle || cycle.status === 'CLOSED') {
        return NextResponse.json({ error: 'Audit cycle not found or already closed' }, { status: 400 });
      }

      // Close cycle
      const updatedCycle = await prisma.auditCycle.update({
        where: { id: cycleId },
        data: {
          status: 'CLOSED',
          closedAt: new Date()
        }
      });

      // Business Rules: Update asset statuses for confirmed missing assets to LOST
      const missingItems = await prisma.auditItem.findMany({
        where: {
          auditCycleId: cycleId,
          verificationStatus: 'MISSING'
        },
        include: { asset: true }
      });

      if (missingItems.length > 0) {
        await Promise.all(
          missingItems.map(item =>
            prisma.asset.update({
              where: { id: item.assetId },
              data: { status: 'LOST' }
            })
          )
        );

        // Notify Admins of lost assets discrepancies
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
        await prisma.notification.createMany({
          data: admins.map(a => ({
            userId: a.id,
            title: 'Lost Assets: Audit Discrepancies Closed',
            message: `Audit cycle ${cycle.name} closed. ${missingItems.length} assets confirmed missing and updated to LOST status.`,
            type: 'DISCREPANCY_DETECTED',
            referenceId: cycleId,
            referenceType: 'AUDIT'
          }))
        });
      }

      await logActivity({
        userId: session.userId,
        action: `Closed audit cycle ${cycle.name} with ${missingItems.length} missing items.`,
        entityType: 'AUDIT',
        entityId: cycle.id,
        newValue: updatedCycle,
        role: session.role
      });

      return NextResponse.json(updatedCycle);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Audit API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
