import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const entityType = searchParams.get('entityType') || '';
    const role = searchParams.get('role') || '';

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const skip = (page - 1) * limit;

    // Security constraints: Employees can only view their own activity logs.
    // Managers/Admins view all.
    const isSpecialRole = session.role === 'ADMIN' || session.role === 'ASSET_MANAGER';
    const isDeptHead = session.role === 'DEPARTMENT_HEAD';

    const whereClause: any = {
      AND: [
        search ? {
          OR: [
            { action: { contains: search } },
            { entityId: { contains: search } },
            { user: { name: { contains: search } } }
          ]
        } : {},
        entityType ? { entityType } : {},
        role ? { role } : {},
        
        // RBAC constraint
        !isSpecialRole ? (
          isDeptHead ? { user: { departmentId: session.departmentId } } : { userId: session.userId }
        ) : {}
      ]
    };

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: { name: true, email: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.activityLog.count({ where: whereClause })
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
