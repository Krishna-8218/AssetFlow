import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'all';

    // 1. Asset Utilization (Allocated vs Available ratios)
    const totalCount = await prisma.asset.count();
    const allocatedCount = await prisma.asset.count({ where: { status: 'ALLOCATED' } });
    const availableCount = await prisma.asset.count({ where: { status: 'AVAILABLE' } });
    const maintenanceCount = await prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } });
    const lostCount = await prisma.asset.count({ where: { status: 'LOST' } });
    const retiredCount = await prisma.asset.count({ where: { status: 'RETIRED' } });

    // 2. Department allocations breakdown
    const depts = await prisma.department.findMany({
      select: { id: true, name: true, code: true }
    });
    const departmentAllocations = await Promise.all(
      depts.map(async (d) => {
        const count = await prisma.asset.count({ where: { departmentId: d.id } });
        return { name: d.name, code: d.code, value: count };
      })
    );

    // 3. Maintenance frequency by asset
    const maintenanceStats = await prisma.maintenanceRequest.groupBy({
      by: ['assetId'],
      _count: { id: true },
      _sum: { cost: true }
    });

    const maintenanceFrequency = await Promise.all(
      maintenanceStats.map(async (stat) => {
        const asset = await prisma.asset.findUnique({
          where: { id: stat.assetId },
          select: { name: true, assetTag: true }
        });
        return {
          name: asset?.name || 'Unknown',
          tag: asset?.assetTag || 'N/A',
          count: stat._count.id,
          cost: stat._sum.cost || 0
        };
      })
    );

    // Sort by count desc
    maintenanceFrequency.sort((a, b) => b.count - a.count);

    // 4. Overdue Returns
    const overdueReturns = await prisma.allocation.findMany({
      where: { status: 'OVERDUE' },
      include: {
        asset: { select: { name: true, assetTag: true } },
        allocatedTo: { select: { name: true } },
        department: { select: { code: true } }
      }
    });

    // 5. Assets near retirement (acquired > 4 years ago for Electronics, 7 for furniture etc.)
    const now = new Date();
    const fourYearsAgo = new Date(now.getTime() - 4 * 365 * 24 * 60 * 60 * 1000);
    const nearingRetirement = await prisma.asset.findMany({
      where: {
        AND: [
          { status: { notIn: ['RETIRED', 'DISPOSED'] } },
          { acquisitionDate: { lt: fourYearsAgo } }
        ]
      },
      include: {
        category: { select: { name: true } }
      },
      orderBy: { acquisitionDate: 'asc' }
    });

    // 6. Resource Booking Peak usage Heatmap (Bookings grouped by Hour of day)
    const bookings = await prisma.booking.findMany({
      where: { status: { not: 'CANCELLED' } }
    });

    const bookingHours = Array(24).fill(0);
    bookings.forEach(b => {
      const hr = new Date(b.startTime).getHours();
      bookingHours[hr] += 1;
    });

    const bookingHeatmap = bookingHours.map((count, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      bookings: count
    }));

    return NextResponse.json({
      summary: {
        total: totalCount,
        allocated: allocatedCount,
        available: availableCount,
        maintenance: maintenanceCount,
        lost: lostCount,
        retired: retiredCount
      },
      departmentAllocations: departmentAllocations.filter(d => d.value > 0),
      maintenanceFrequency: maintenanceFrequency.slice(0, 10),
      overdueReturns,
      nearingRetirement,
      bookingHeatmap
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
