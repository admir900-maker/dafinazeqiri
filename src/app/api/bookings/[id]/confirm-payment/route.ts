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

    console.log('🔄 Attempting to confirm payment for booking:', id);

    // Find the booking - check if it's a MongoDB ObjectId or booking reference
    let booking;
    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      // It's a MongoDB ObjectId
      booking = await Booking.findById(id);
      console.log('🔍 Searching by ObjectId:', id);
    } else {
      // It's a booking reference
      booking = await Booking.findOne({ bookingReference: id });
      console.log('🔍 Searching by booking reference:', id);
    }

    if (!booking) {
      console.log('❌ Booking not found for:', id);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    console.log('📋 Booking found:', {
      id: booking._id,
      reference: booking.bookingReference,
      currentStatus: booking.status,
      currentPaymentStatus: booking.paymentStatus,
      userId: booking.userId
    });

    // Check if the booking belongs to the user
    if (booking.userId !== userId) {
      console.log('🚫 Access denied. Booking userId:', booking.userId, 'Request userId:', userId);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only update if payment is still pending (don't override webhook updates)
    if (booking.paymentStatus === 'pending') {
      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      booking.paymentDate = new Date();
      await booking.save();

      console.log('✅ Booking payment confirmed immediately:', booking.bookingReference);

      // Send confirmation email if not already sent
      if (!booking.emailSent && booking.customerEmail) {
        try {
          console.log('📧 Sending confirmation email after immediate payment confirmation...');

          // Populate the event data for email
          const populatedBooking = await Booking.findById(booking._id).populate('eventId');

          const emailSent = await sendBookingConfirmationEmail(populatedBooking);

          if (emailSent) {
            populatedBooking.emailSent = true;
            await populatedBooking.save();
            console.log('✅ Confirmation email sent successfully after immediate confirmation');
          } else {
            console.log('❌ Failed to send confirmation email after immediate confirmation');
          }
        } catch (emailError) {
          console.error('❌ Error sending confirmation email after immediate confirmation:', emailError);
          // Don't fail the payment confirmation if email fails
        }
      } else if (!booking.customerEmail) {
        console.log('⚠️ No customer email available for immediate confirmation email');
      } else if (booking.emailSent) {
        console.log('📧 Email already sent for this booking');
      }
    } else {
      console.log('ℹ️ Booking payment status was already:', booking.paymentStatus);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed',
      paymentStatus: booking.paymentStatus
    });

  } catch (error) {
    console.error('❌ Confirm payment error:', error);
    return NextResponse.json({
      error: 'Failed to confirm payment'
    }, { status: 500 });
  }
}