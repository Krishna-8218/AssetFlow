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

    // Build filters depending on role
    // Admins and Asset Managers see everything.
    // Department Heads see their department's data.
    // Employees see only their allocated items.
    const isSpecialRole = role === 'ADMIN' || role === 'ASSET_MANAGER';

    // 1. KPI Counts
    const assetsAvailable = await prisma.asset.count({
      where: {
        status: 'AVAILABLE',
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { departmentId } : { assignedToId: userId })
      }
    });

    const assetsAllocated = await prisma.asset.count({
      where: {
        status: 'ALLOCATED',
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { departmentId } : { assignedToId: userId })
      }
    });

    // Maintenance Today: PENDING or APPROVED or IN_PROGRESS requests
    const maintenanceToday = await prisma.maintenanceRequest.count({
      where: {
        status: { in: ['PENDING', 'APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'] },
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { asset: { departmentId } } : { requestedById: userId })
      }
    });

    // Active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        status: 'ONGOING',
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { bookedBy: { departmentId } } : { bookedById: userId })
      }
    });

    // Pending Transfers
    const pendingTransfers = await prisma.transfer.count({
      where: {
        status: 'REQUESTED',
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? {
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
      }
    });

    // Overdue allocations
    const now = new Date();
    const overdueReturns = await prisma.allocation.count({
      where: {
        status: 'OVERDUE',
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { departmentId } : { allocatedToId: userId })
      }
    });

    const upcomingReturns = await prisma.allocation.count({
      where: {
        status: 'ACTIVE',
        expectedReturnDate: { gt: now },
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { departmentId } : { allocatedToId: userId })
      }
    });

    const totalAssets = await prisma.asset.count({
      where: {
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { departmentId } : { assignedToId: userId })
      }
    });

    // 2. Recent activity logs (Last 10 logs)
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { user: { departmentId } } : { userId })
      },
      include: {
        user: {
          select: { name: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // 3. Overdue return records details
    const overdueAllocations = await prisma.allocation.findMany({
      where: {
        status: 'OVERDUE',
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { departmentId } : { allocatedToId: userId })
      },
      include: {
        asset: {
          select: { name: true, assetTag: true }
        },
        allocatedTo: {
          select: { name: true }
        }
      },
      orderBy: { expectedReturnDate: 'asc' },
      take: 5
    });

    // 4. Upcoming Bookings details
    const upcomingBookingsList = await prisma.booking.findMany({
      where: {
        status: 'UPCOMING',
        startTime: { gte: now },
        ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { bookedBy: { departmentId } } : { bookedById: userId })
      },
      include: {
        asset: {
          select: { name: true, assetTag: true }
        },
        bookedBy: {
          select: { name: true }
        }
      },
      orderBy: { startTime: 'asc' },
      take: 5
    });

    // 5. Assets by Status (Chart Data)
    const statuses = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
    const assetsByStatusData = await Promise.all(
      statuses.map(async (status) => {
        const count = await prisma.asset.count({
          where: {
            status,
            ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { departmentId } : { assignedToId: userId })
          }
        });
        return { name: status.replace('_', ' '), value: count };
      })
    );

    // 6. Assets by Department (Chart Data) - Limit to top 5
    const departments = await prisma.department.findMany({
      select: { id: true, name: true }
    });
    const assetsByDepartmentData = await Promise.all(
      departments.map(async (dept) => {
        const count = await prisma.asset.count({
          where: { departmentId: dept.id }
        });
        return { name: dept.name, count };
      })
    );

    // 7. Assets by Category (Chart Data)
    const categories = await prisma.assetCategory.findMany({
      select: { id: true, name: true }
    });
    const assetsByCategoryData = await Promise.all(
      categories.map(async (cat) => {
        const count = await prisma.asset.count({
          where: {
            categoryId: cat.id,
            ...(isSpecialRole ? {} : role === 'DEPARTMENT_HEAD' ? { departmentId } : { assignedToId: userId })
          }
        });
        return { name: cat.name, value: count };
      })
    );

    return NextResponse.json({
      stats: {
        assetsAvailable,
        assetsAllocated,
        maintenanceToday,
        activeBookings,
        pendingTransfers,
        upcomingReturns,
        overdueReturns,
        totalAssets
      },
      recentActivity,
      overdueAllocations,
      upcomingBookings: upcomingBookingsList,
      assetsByStatus: assetsByStatusData.filter(item => item.value > 0),
      assetsByDepartment: assetsByDepartmentData.filter(item => item.count > 0),
      assetsByCategory: assetsByCategoryData.filter(item => item.value > 0),
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
