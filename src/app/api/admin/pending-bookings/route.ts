import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.publicMetadata?.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    console.log('🔍 Fetching pending bookings...');
    const pendingBookings = await Booking.find({ status: 'pending' })
      .populate('eventId')
      .sort({ createdAt: -1 })
      .limit(50);

    const bookingsData = pendingBookings.map(booking => ({
      id: booking._id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      ticketCount: booking.tickets.length,
      userId: booking.userId,
      eventTitle: booking.eventId?.title || 'Unknown Event',
      eventDate: booking.eventId?.date,
      createdAt: booking.createdAt,
      paymentIntentId: booking.paymentIntentId || null
    }));

    console.log(`✅ Found ${pendingBookings.length} pending bookings`);

    return NextResponse.json({
      success: true,
      count: pendingBookings.length,
      bookings: bookingsData
    });

  } catch (error) {
    console.error('❌ Error fetching pending bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}