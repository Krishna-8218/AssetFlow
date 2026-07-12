import { prisma } from '@/lib/prisma';
import { setSession, clearSession, getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'login') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { department: true }
      });

      if (!user || user.status === 'INACTIVE') {
        return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 });
      }

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      // Create JWT session
      const sessionPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
      };
      await setSession(sessionPayload);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department?.name || null
        }
      });
    }

    if (action === 'signup') {
      const { email, password, name, phone, departmentId } = body;

      if (!email || !password || !name) {
        return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Create User with EMPLOYEE role ONLY. Signup can never assign Admin or Manager roles.
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name,
          phone,
          departmentId: departmentId || null,
          role: 'EMPLOYEE', // Strictly employee
          status: 'ACTIVE'
        },
        include: { department: true }
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'User self-signup',
          entityType: 'USER',
          entityId: user.id,
          newValue: JSON.stringify({ name: user.name, email: user.email, role: user.role }),
          role: user.role,
        }
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to AssetFlow!',
          message: `Your account has been created successfully with the ${user.role} role.`,
          type: 'SYSTEM',
        }
      });

      // Set JWT session
      const sessionPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
      };
      await setSession(sessionPayload);

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department?.name || null
        }
      });
    }

    if (action === 'logout') {
      await clearSession();
      return NextResponse.json({ success: true });
    }

    if (action === 'session') {
      const session = await getSession();
      if (!session) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
      }
      return NextResponse.json({ authenticated: true, user: session });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Auth API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
