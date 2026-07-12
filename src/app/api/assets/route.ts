import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { ASSET_TAG_PREFIX } from '@/lib/constants';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const categoryId = searchParams.get('categoryId') || '';
    const status = searchParams.get('status') || '';
    const condition = searchParams.get('condition') || '';
    const departmentId = searchParams.get('departmentId') || '';
    const location = searchParams.get('location') || '';
    const isBookable = searchParams.get('isBookable') === 'true';
    const isShared = searchParams.get('isShared') === 'true';

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Sorting
    const sortField = searchParams.get('sortField') || 'assetTag';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Security constraints: Employees can only view assets allocated to them OR shared bookable resources.
    const isSpecialRole = session.role === 'ADMIN' || session.role === 'ASSET_MANAGER';
    const isDeptHead = session.role === 'DEPARTMENT_HEAD';

    const whereClause: any = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search } },
            { assetTag: { contains: search } },
            { serialNumber: { contains: search } },
            { location: { contains: search } }
          ]
        } : {},
        categoryId ? { categoryId } : {},
        status ? { status } : {},
        condition ? { condition } : {},
        departmentId ? { departmentId } : {},
        location ? { location: { contains: location } } : {},
        isBookable ? { isBookable: true } : {},
        isShared ? { isShared: true } : {},
        
        // RBAC filtering
        !isSpecialRole ? (
          isDeptHead ? {
            OR: [
              { departmentId: session.departmentId },
              { isShared: true }
            ]
          } : {
            OR: [
              { assignedToId: session.userId },
              { isShared: true }
            ]
          }
        ) : {}
      ]
    };

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where: whereClause,
        include: {
          category: { select: { name: true } },
          department: { select: { name: true, code: true } },
          assignedTo: { select: { name: true, email: true } }
        },
        orderBy: {
          [sortField]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.asset.count({ where: whereClause })
    ]);

    return NextResponse.json({
      assets,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    console.error('Assets GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Register Asset - Manager/Admin Only
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'ASSET_MANAGER')) {
      return NextResponse.json({ error: 'Unauthorized. Inventory access required.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      categoryId,
      serialNumber,
      acquisitionDate,
      acquisitionCost,
      condition,
      location,
      departmentId,
      notes,
      isShared,
      isBookable,
      customFieldsData // dynamic category specific fields JSON
    } = body;

    if (!name || !categoryId || !serialNumber || !acquisitionDate || acquisitionCost === undefined || !location) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    // Check unique serial number
    const existingSerial = await prisma.asset.findUnique({
      where: { serialNumber }
    });
    if (existingSerial) {
      return NextResponse.json({ error: `Serial Number '${serialNumber}' is already registered` }, { status: 400 });
    }

    // Auto-generate Asset Tag: e.g. AF-0001, AF-0002
    // We fetch the asset with the highest tag, parse its number and increment.
    const lastAsset = await prisma.asset.findFirst({
      orderBy: { assetTag: 'desc' }
    });

    let nextTagNum = 1;
    if (lastAsset && lastAsset.assetTag.startsWith(ASSET_TAG_PREFIX + '-')) {
      const parts = lastAsset.assetTag.split('-');
      const num = parseInt(parts[1]);
      if (!isNaN(num)) {
        nextTagNum = num + 1;
      }
    }
    const assetTag = `${ASSET_TAG_PREFIX}-${String(nextTagNum).padStart(4, '0')}`;

    // QR code holds metadata info
    const qrCode = `AssetFlow:${assetTag}:${serialNumber}`;

    const asset = await prisma.asset.create({
      data: {
        name,
        assetTag,
        categoryId,
        serialNumber,
        acquisitionDate: new Date(acquisitionDate),
        acquisitionCost: parseFloat(acquisitionCost),
        condition: condition || 'GOOD',
        location,
        status: 'AVAILABLE',
        isShared: !!isShared,
        isBookable: !!isBookable,
        qrCode,
        departmentId: departmentId || null,
        registeredById: session.userId,
        notes: notes || null,
        // Using notes to store stringified custom field entries
        images: customFieldsData ? JSON.stringify(customFieldsData) : null
      }
    });

    await logActivity({
      userId: session.userId,
      action: `Registered asset: ${name} (${assetTag})`,
      entityType: 'ASSET',
      entityId: asset.id,
      newValue: asset,
      role: session.role
    });

    return NextResponse.json(asset);
  } catch (error: any) {
    console.error('Asset Registration Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
