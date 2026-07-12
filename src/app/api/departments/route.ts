import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const departments = await prisma.department.findMany({
      include: {
        head: {
          select: { id: true, name: true, email: true }
        },
        parent: {
          select: { id: true, name: true, code: true }
        },
        _count: {
          select: { users: true, assets: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(departments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, code, description, headId, parentId, status } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and Code are required' }, { status: 400 });
    }

    // Check code unique
    const existing = await prisma.department.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ error: `Department code '${code}' already exists` }, { status: 400 });
    }

    const dept = await prisma.department.create({
      data: {
        name,
        code,
        description: description || null,
        headId: headId || null,
        parentId: parentId || null,
        status: status || 'ACTIVE'
      }
    });

    // Update Head Role if headId is provided and role is EMPLOYEE, change it to DEPARTMENT_HEAD
    if (headId) {
      const headUser = await prisma.user.findUnique({ where: { id: headId } });
      if (headUser && headUser.role === 'EMPLOYEE') {
        await prisma.user.update({
          where: { id: headId },
          data: { role: 'DEPARTMENT_HEAD', departmentId: dept.id }
        });
      }
    }

    await logActivity({
      userId: session.userId,
      action: 'Created department',
      entityType: 'DEPARTMENT',
      entityId: dept.id,
      newValue: dept,
      role: session.role
    });

    return NextResponse.json(dept);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, code, description, headId, parentId, status } = body;

    if (!id || !name || !code) {
      return NextResponse.json({ error: 'ID, Name and Code are required' }, { status: 400 });
    }

    const original = await prisma.department.findUnique({ where: { id } });
    if (!original) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    // Check code unique for other departments
    const existing = await prisma.department.findFirst({
      where: { code, id: { not: id } }
    });
    if (existing) {
      return NextResponse.json({ error: `Department code '${code}' is already used by another department` }, { status: 400 });
    }

    const dept = await prisma.department.update({
      where: { id },
      data: {
        name,
        code,
        description: description || null,
        headId: headId || null,
        parentId: parentId || null,
        status: status || 'ACTIVE'
      }
    });

    // Handle department head changes
    if (headId && headId !== original.headId) {
      // Promote new head if they are employee
      const headUser = await prisma.user.findUnique({ where: { id: headId } });
      if (headUser && headUser.role === 'EMPLOYEE') {
        await prisma.user.update({
          where: { id: headId },
          data: { role: 'DEPARTMENT_HEAD', departmentId: dept.id }
        });
      }
    }

    await logActivity({
      userId: session.userId,
      action: 'Updated department',
      entityType: 'DEPARTMENT',
      entityId: dept.id,
      previousValue: original,
      newValue: dept,
      role: session.role
    });

    return NextResponse.json(dept);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
