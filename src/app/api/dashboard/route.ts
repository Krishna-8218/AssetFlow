import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, departmentId, userId } = session;
    const isSpecialRole = role === 'ADMIN' || role === 'ASSET_MANAGER';
    const now = new Date();

    const assetFilter = isSpecialRole
      ? {}
      : role === 'DEPARTMENT_HEAD'
      ? { departmentId }
      : { assignedToId: userId };

    const allocationFilter = isSpecialRole
      ? {}
      : role === 'DEPARTMENT_HEAD'
      ? { departmentId }
      : { allocatedToId: userId };

    const transferFilter = isSpecialRole
      ? {}
      : role === 'DEPARTMENT_HEAD'
      ? {
          OR: [
            { fromDeptId: departmentId },
            { toDeptId: departmentId },
          ],
        }
      : {
          OR: [
            { fromUserId: userId },
            { toUserId: userId },
          ],
        };

    const bookingFilter = isSpecialRole
      ? {}
      : role === 'DEPARTMENT_HEAD'
      ? { bookedBy: { departmentId } }
      : { bookedById: userId };

    const maintenanceFilter = isSpecialRole
      ? {}
      : role === 'DEPARTMENT_HEAD'
      ? { asset: { departmentId } }
      : { requestedById: userId };

    const activityFilter = isSpecialRole
      ? {}
      : role === 'DEPARTMENT_HEAD'
      ? { user: { departmentId } }
      : { userId };

    // Parallel fetch all dashboard data in a single batch
    const [
      statusGroups,
      departments,
      categories,
      maintenanceToday,
      activeBookings,
      pendingTransfers,
      overdueReturns,
      upcomingReturns,
      recentActivity,
      overdueAllocations,
      upcomingBookingsList,
    ] = await Promise.all([
      prisma.asset.groupBy({
        by: ['status'],
        _count: { status: true },
        where: assetFilter,
      }),
      prisma.department.findMany({
        select: {
          name: true,
          _count: { select: { assets: true } },
        },
        orderBy: { name: 'asc' },
        take: 8,
      }),
      prisma.assetCategory.findMany({
        select: {
          name: true,
          _count: { select: { assets: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.maintenanceRequest.count({
        where: {
          status: { in: ['PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'] },
          ...maintenanceFilter,
        },
      }),
      prisma.booking.count({
        where: {
          status: 'ONGOING',
          ...bookingFilter,
        },
      }),
      prisma.transfer.count({
        where: {
          status: 'REQUESTED',
          ...transferFilter,
        },
      }),
      prisma.allocation.count({
        where: {
          status: 'OVERDUE',
          ...allocationFilter,
        },
      }),
      prisma.allocation.count({
        where: {
          status: 'ACTIVE',
          expectedReturnDate: { gt: now },
          ...allocationFilter,
        },
      }),
      prisma.activityLog.findMany({
        where: activityFilter,
        include: {
          user: { select: { name: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.allocation.findMany({
        where: {
          status: 'OVERDUE',
          ...allocationFilter,
        },
        include: {
          asset: { select: { name: true, assetTag: true } },
          allocatedTo: { select: { name: true } },
        },
        orderBy: { expectedReturnDate: 'asc' },
        take: 5,
      }),
      prisma.booking.findMany({
        where: {
          status: 'UPCOMING',
          startTime: { gte: now },
          ...bookingFilter,
        },
        include: {
          asset: { select: { name: true, assetTag: true } },
          bookedBy: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 5,
      }),
    ]);

    // Parse status group counts
    const statusMap: Record<string, number> = {};
    let totalAssets = 0;
    for (const group of statusGroups) {
      statusMap[group.status] = group._count.status;
      totalAssets += group._count.status;
    }

    const assetsAvailable = statusMap['AVAILABLE'] || 0;
    const assetsAllocated = statusMap['ALLOCATED'] || 0;

    const ALL_STATUSES = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
    const assetsByStatus = ALL_STATUSES.map((status) => ({
      name: status.replace('_', ' '),
      value: statusMap[status] || 0,
    })).filter((item) => item.value > 0);

    const assetsByDepartment = departments
      .map((d) => ({ name: d.name, count: d._count.assets }))
      .filter((d) => d.count > 0);

    const assetsByCategory = categories
      .map((c) => ({ name: c.name, value: c._count.assets }))
      .filter((c) => c.value > 0);

    return NextResponse.json({
      stats: {
        assetsAvailable,
        assetsAllocated,
        maintenanceToday,
        activeBookings,
        pendingTransfers,
        upcomingReturns,
        overdueReturns,
        totalAssets,
      },
      recentActivity,
      overdueAllocations,
      upcomingBookings: upcomingBookingsList,
      assetsByStatus,
      assetsByDepartment,
      assetsByCategory,
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
