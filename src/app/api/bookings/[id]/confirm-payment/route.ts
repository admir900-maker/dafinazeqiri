import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { fulfillPaidBooking } from '@/lib/bookingFulfillment';

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

    // Allow manual/admin recovery for RaiAccept bookings that were left pending or cancelled
    // even though the customer completed the success redirect.
    if (booking.paymentMethod === 'raiffeisen' && booking.paymentStatus !== 'paid') {
      await fulfillPaidBooking(booking, {
        paymentId: booking.raiffeisenPaymentId,
        transactionId: booking.raiffeisenTransactionId,
      });

      console.log('✅ Booking payment confirmed immediately:', booking.bookingReference);
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