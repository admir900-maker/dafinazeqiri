import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';
import { sendBookingConfirmationEmail } from '@/lib/emailService';

/**
 * Confirm RaiAccept payment when user returns from payment page
 * This is a fallback in case webhook hasn't been received yet
 */
export async function POST(request: NextRequest) {
  try {
    const { bookingId, sessionId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    await connectToDatabase();

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
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

    // If payment is still pending, confirm it
    // (This assumes successful return from RaiAccept payment page)
    if (booking.paymentStatus === 'pending') {
      console.log('✅ Confirming payment for booking:', booking.bookingReference);

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';

      if (sessionId) {
        booking.raiffeisenPaymentId = sessionId;
      }

      await booking.save();

      // Send confirmation email with tickets if not already sent
      if (!booking.emailSent) {
        try {
          console.log('📧 Sending confirmation email to:', booking.customerEmail);

          // Populate event details for email
          await booking.populate('eventId');

          // Send email with populated booking
          const emailSent = await sendBookingConfirmationEmail(booking);

          if (emailSent) {
            booking.emailSent = true;
            await booking.save();
            console.log('✅ Email sent successfully');
          } else {
            console.error('❌ Email sending returned false');
          }
        } catch (emailError) {
          console.error('❌ Failed to send email:', emailError);
          // Don't fail the confirmation if email fails
        }
      }
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
