import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { sendBookingConfirmationEmail } from '@/lib/emailService';
import { logApiError, logEmailError } from '@/lib/errorLogger';

export async function POST(req: NextRequest) {
  let userId: string | null | undefined;

  try {
    const authResult = await auth();
    userId = authResult.userId;
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.publicMetadata?.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const booking = await Booking.findById(bookingId).populate('eventId');

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'confirmed') {
      return NextResponse.json({
        message: 'Booking is already confirmed',
        booking: {
          id: booking._id,
          status: booking.status,
          bookingReference: booking.bookingReference
        }
      });
    }

    booking.status = 'confirmed';
    await booking.save();

    // Send confirmation email if not already sent
    try {
      if (!booking.emailSent) {
        const emailSent = await sendBookingConfirmationEmail(booking);

        if (emailSent) {
          booking.emailSent = true;
          await booking.save();
        }
      }
    } catch (emailError) {
      logEmailError('confirmBooking', booking.customerEmail || 'unknown', emailError, 'manual-confirmation');
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Booking confirmed successfully',
      booking: {
        id: booking._id,
        status: booking.status,
        bookingReference: booking.bookingReference,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        tickets: booking.tickets.length
      }
    });

  } catch (error) {
    logApiError('Manual booking confirmation failed', error, '/api/admin/confirm-booking', userId || undefined, 'confirm-booking');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}