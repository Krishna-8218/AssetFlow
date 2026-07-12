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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const deptId = searchParams.get('departmentId') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    const employees = await prisma.user.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } }
            ]
          } : {},
          deptId ? { departmentId: deptId } : {},
          role ? { role: role } : {},
          status ? { status: status } : {}
        ]
      },
      include: {
        department: {
          select: { name: true, code: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Strip password hashes for safety
    const safeEmployees = employees.map(emp => {
      const { passwordHash, ...rest } = emp;
      return rest;
    });

    return NextResponse.json(safeEmployees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Update Employee Role / Status - Admin Only
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role, status, departmentId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userToEdit = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToEdit) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Do not allow changing own role or changing Admin roles
    if (userToEdit.id === session.userId && role && role !== userToEdit.role) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
    }
    if (userToEdit.role === 'ADMIN' && role && role !== 'ADMIN') {
      return NextResponse.json({ error: 'System administrator roles cannot be changed' }, { status: 400 });
    }

    const original = {
      role: userToEdit.role,
      status: userToEdit.status,
      departmentId: userToEdit.departmentId
    };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        role: role || undefined,
        status: status || undefined,
        departmentId: departmentId === 'null' ? null : (departmentId || undefined)
      },
      include: { department: true }
    });

    await logActivity({
      userId: session.userId,
      action: `Updated user profile/role: promoted to ${updated.role}`,
      entityType: 'USER',
      entityId: updated.id,
      previousValue: original,
      newValue: { role: updated.role, status: updated.status, departmentId: updated.departmentId },
      role: session.role
    });

    // Create notification for the promoted employee
    if (role && role !== original.role) {
      await prisma.notification.create({
        data: {
          userId: updated.id,
          title: 'Role Promoted',
          message: `Your account role has been updated to ${updated.role} by Administrator. Please reload your session.`,
          type: 'SYSTEM',
        }
      });
    }

    const { passwordHash, ...safeUser } = updated;
    return NextResponse.json(safeUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
