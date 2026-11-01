import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
    }

    const now = new Date();
    const fourYearsAgo = new Date(now.getTime() - 4 * 365 * 24 * 60 * 60 * 1000);

    // Parallel fetch all reports data
    const [
      statusGroups,
      depts,
      maintenanceStats,
      overdueReturns,
      nearingRetirement,
      bookings
    ] = await Promise.all([
      // 1. Asset Status Grouping (single query instead of 6)
      prisma.asset.groupBy({
        by: ['status'],
        _count: { status: true }
      }),
      // 2. Department Allocations with count (single query instead of 1 + N)
      prisma.department.findMany({
        select: {
          name: true,
          code: true,
          _count: { select: { assets: true } }
        },
        orderBy: { name: 'asc' }
      }),
      // 3. Maintenance Group By
      prisma.maintenanceRequest.groupBy({
        by: ['assetId'],
        _count: { id: true },
        _sum: { cost: true }
      }),
      // 4. Overdue returns
      prisma.allocation.findMany({
        where: { status: 'OVERDUE' },
        include: {
          asset: { select: { name: true, assetTag: true } },
          allocatedTo: { select: { name: true } },
          department: { select: { code: true } }
        }
      }),
      // 5. Nearing Retirement
      prisma.asset.findMany({
        where: {
          AND: [
            { status: { notIn: ['RETIRED', 'DISPOSED'] } },
            { acquisitionDate: { lt: fourYearsAgo } }
          ]
        },
        include: {
          category: { select: { name: true } }
        },
        take: 10
      }),
      // 6. Bookings for heatmap
      prisma.booking.findMany({
        select: { startTime: true, endTime: true, status: true },
        where: { status: { not: 'CANCELLED' } }
      })
    ]);

    // Parse status summary
    const statusMap: Record<string, number> = {};
    let total = 0;
    for (const g of statusGroups) {
      statusMap[g.status] = g._count.status;
      total += g._count.status;
    }

    const summary = {
      total,
      allocated: statusMap['ALLOCATED'] || 0,
      available: statusMap['AVAILABLE'] || 0,
      maintenance: statusMap['UNDER_MAINTENANCE'] || 0,
      lost: statusMap['LOST'] || 0,
      retired: statusMap['RETIRED'] || 0
    };

    // Department allocations
    const departmentAllocations = depts.map(d => ({
      name: d.name,
      code: d.code,
      value: d._count.assets
    }));

    // Maintenance frequency by asset
    const assetIds = maintenanceStats.map(s => s.assetId);
    const relatedAssets = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, name: true, assetTag: true }
    });
    const assetMap = new Map(relatedAssets.map(a => [a.id, a]));

    const maintenanceFrequency = maintenanceStats.map(stat => {
      const asset = assetMap.get(stat.assetId);
      return {
        name: asset?.name || 'Unknown',
        tag: asset?.assetTag || 'N/A',
        count: stat._count.id,
        cost: stat._sum.cost || 0
      };
    }).sort((a, b) => b.count - a.count);

    // Group bookings by hour for peak utilization heatmap
    const hourCounts: Record<number, number> = {};
    for (let i = 8; i <= 18; i++) hourCounts[i] = 0;

    bookings.forEach(b => {
      const hour = new Date(b.startTime).getHours();
      if (hour >= 8 && hour <= 18) {
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });

    const bookingHeatmap = Object.entries(hourCounts).map(([h, count]) => ({
      hour: `${h}:00`,
      bookings: count
    }));

    return NextResponse.json({
      summary,
      departmentAllocations,
      maintenanceFrequency,
      overdueReturns,
      nearingRetirement,
      bookingHeatmap
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
