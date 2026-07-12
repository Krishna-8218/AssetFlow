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
    const assetId = searchParams.get('assetId') || '';

    const bookings = await prisma.booking.findMany({
      where: {
        AND: [
          assetId ? { assetId } : {},
          session.role === 'EMPLOYEE' ? { bookedById: session.userId } : {}
        ]
      },
      include: {
        asset: {
          select: { name: true, assetTag: true, location: true }
        },
        bookedBy: {
          select: { name: true, email: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Book Resource with strict overlap conflict checking
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assetId, startTime, endTime, purpose, notes } = body;

    if (!assetId || !startTime || !endTime) {
      return NextResponse.json({ error: 'Asset, Start Time, and End Time are required' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    // Verify asset exists and is bookable
    const asset = await prisma.asset.findUnique({
      where: { id: assetId }
    });

    if (!asset) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    if (!asset.isBookable || !asset.isShared) {
      return NextResponse.json({ error: 'This resource is not configured for bookings' }, { status: 400 });
    }

    // Block if asset is lost, retired, or disposed
    if (['LOST', 'RETIRED', 'DISPOSED'].includes(asset.status)) {
      return NextResponse.json({ error: 'Resource is currently unavailable for service' }, { status: 400 });
    }

    // Overlap validation: reject bookings that overlap existing ones
    // Rule: start < existing.end AND end > existing.start
    // Status should not be CANCELLED
    const overlap = await prisma.booking.findFirst({
      where: {
        assetId,
        status: { not: 'CANCELLED' },
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } }
        ]
      },
      include: {
        bookedBy: { select: { name: true } }
      }
    });

    if (overlap) {
      return NextResponse.json({
        error: 'Overlap Conflict Rejected',
        conflict: true,
        message: `Time slot conflict detected. This resource is already booked by ${overlap.bookedBy.name} from ${formatDate(overlap.startTime)} to ${formatDate(overlap.endTime)}.`
      }, { status: 409 });
    }

    // Create Booking
    const booking = await prisma.booking.create({
      data: {
        assetId,
        bookedById: session.userId,
        startTime: start,
        endTime: end,
        purpose: purpose || null,
        notes: notes || null,
        status: 'UPCOMING'
      }
    });

    // Notify employee of booking confirmation
    await prisma.notification.create({
      data: {
        userId: session.userId,
        title: 'Booking Confirmed',
        message: `Your booking for resource ${asset.name} (${asset.assetTag}) from ${formatDate(start)} to ${formatDate(end)} has been confirmed.`,
        type: 'BOOKING_CONFIRMED',
        referenceId: booking.id,
        referenceType: 'BOOKING'
      }
    });

    await logActivity({
      userId: session.userId,
      action: `Booked resource: ${asset.assetTag} (${formatDate(start)} - ${formatDate(end)})`,
      entityType: 'BOOKING',
      entityId: booking.id,
      newValue: booking,
      role: session.role
    });

    return NextResponse.json(booking);
  } catch (error: any) {
    console.error('Booking POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Cancel Booking
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, status } = body; // status can be CANCELLED

    if (!bookingId || !status) {
      return NextResponse.json({ error: 'Booking ID and Status are required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { asset: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Validate ownership
    if (session.role === 'EMPLOYEE' && booking.bookedById !== session.userId) {
      return NextResponse.json({ error: 'You are not authorized to edit this booking' }, { status: 403 });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status }
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: booking.bookedById,
        title: 'Booking Cancelled',
        message: `Your reservation for ${booking.asset.name} on ${formatDate(booking.startTime)} has been cancelled.`,
        type: 'BOOKING_CANCELLED',
        referenceId: booking.id,
        referenceType: 'BOOKING'
      }
    });

    await logActivity({
      userId: session.userId,
      action: `Cancelled resource booking: ${booking.asset.assetTag}`,
      entityType: 'BOOKING',
      entityId: booking.id,
      newValue: updated,
      role: session.role
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
