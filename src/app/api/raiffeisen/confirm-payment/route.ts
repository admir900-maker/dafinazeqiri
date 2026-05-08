import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { fulfillPaidBooking } from '@/lib/bookingFulfillment';

/**
 * Confirm RaiAccept payment when user returns from payment page
 * This is a fallback in case webhook hasn't been received yet
 * SECURITY: Requires authentication and booking ownership verification
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, sessionId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    await connectToDatabase();

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify booking belongs to the authenticated user
    if (booking.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only allow confirmation for recent bookings (created within last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    if (booking.createdAt < twoHoursAgo) {
      return NextResponse.json({ error: 'Booking confirmation window expired' }, { status: 400 });
    }

    // If already confirmed, return success
    if (booking.paymentStatus === 'paid' && booking.status === 'confirmed') {
      return NextResponse.json({
        success: true,
        message: 'Payment already confirmed',
        booking: {
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          emailSent: booking.emailSent,
        },
      });
    }

    // The customer only lands on the success URL after a successful RaiAccept flow.
    // Allow this fallback to recover bookings that were left pending or prematurely cancelled.
    if (booking.paymentMethod === 'raiffeisen' && booking.paymentStatus !== 'paid') {
      console.log('✅ Confirming payment for booking:', booking.bookingReference);

      await fulfillPaidBooking(booking, {
        paymentId: sessionId || booking.raiffeisenPaymentId,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed',
      booking: {
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        emailSent: booking.emailSent,
      },
    });
  } catch (error) {
    console.error('❌ Payment confirmation error:', error);
    return NextResponse.json(
      {
        error: 'Payment confirmation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
