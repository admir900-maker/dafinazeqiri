import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { sendBookingConfirmationEmail } from '@/lib/emailService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();

    // Find the booking - check if it's a MongoDB ObjectId or booking reference
    let booking;
    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      // It's a MongoDB ObjectId
      booking = await Booking.findById(id).populate('eventId');
    } else {
      // It's a booking reference
      booking = await Booking.findOne({ bookingReference: id }).populate('eventId');
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if the booking belongs to the user
    if (booking.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only send email for paid bookings
    if (booking.paymentStatus !== 'paid') {
      return NextResponse.json({
        error: 'Email can only be sent for confirmed bookings'
      }, { status: 400 });
    }

    // Send confirmation email
    await sendBookingConfirmationEmail(booking);

    // Update email sent flag
    booking.emailSent = true;
    await booking.save();

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully'
    });

  } catch (error) {
    console.error('❌ Resend email error:', error);
    return NextResponse.json({
      error: 'Failed to send confirmation email'
    }, { status: 500 });
  }
}