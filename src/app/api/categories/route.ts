import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.assetCategory.findMany({
      include: {
        _count: {
          select: { assets: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(categories);
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
    const { name, description, icon, customFields, status } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check unique
    const existing = await prisma.assetCategory.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: `Category name '${name}' already exists` }, { status: 400 });
    }

    const category = await prisma.assetCategory.create({
      data: {
        name,
        description: description || null,
        icon: icon || 'Package',
        customFields: customFields ? JSON.stringify(customFields) : null,
        status: status || 'ACTIVE'
      }
    });

    await logActivity({
      userId: session.userId,
      action: 'Created asset category',
      entityType: 'CATEGORY',
      entityId: category.id,
      newValue: category,
      role: session.role
    });

    return NextResponse.json(category);
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
    const { id, name, description, icon, customFields, status } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
    }

    const original = await prisma.assetCategory.findUnique({ where: { id } });
    if (!original) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const category = await prisma.assetCategory.update({
      where: { id },
      data: {
        name,
        description: description || null,
        icon: icon || 'Package',
        customFields: customFields ? JSON.stringify(customFields) : null,
        status: status || 'ACTIVE'
      }
    });

    await logActivity({
      userId: session.userId,
      action: 'Updated asset category',
      entityType: 'CATEGORY',
      entityId: category.id,
      previousValue: original,
      newValue: category,
      role: session.role
    });

    return NextResponse.json(category);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
