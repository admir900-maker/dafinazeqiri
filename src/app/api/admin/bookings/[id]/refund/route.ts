import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';
import { createRaiAcceptClient } from '@/lib/raiAccept';

/**
 * Issue a refund for a RaiAccept payment
 * POST /api/admin/bookings/[id]/refund
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { amount, reason } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking was paid via RaiAccept
    if (booking.paymentMethod !== 'raiffeisen') {
      return NextResponse.json(
        { error: 'This booking was not paid through RaiAccept' },
        { status: 400 }
      );
    }

    if (booking.paymentStatus !== 'paid') {
      return NextResponse.json(
        { error: 'Can only refund paid bookings' },
        { status: 400 }
      );
    }

    if (!booking.raiffeisenPaymentId || !booking.raiffeisenTransactionId) {
      return NextResponse.json(
        { error: 'Missing RaiAccept payment information' },
        { status: 400 }
      );
    }

    // Check refund amount doesn't exceed original amount
    if (amount > booking.totalAmount) {
      return NextResponse.json(
        { error: `Refund amount cannot exceed original amount of ${booking.totalAmount} ${booking.currency}` },
        { status: 400 }
      );
    }

    // Initialize RaiAccept client
    const raiAcceptClient = createRaiAcceptClient();
    if (!raiAcceptClient) {
      return NextResponse.json(
        { error: 'RaiAccept service not configured' },
        { status: 500 }
      );
    }

    console.log('🔄 Processing refund for booking:', booking.bookingReference);
    console.log('Amount:', amount, booking.currency);
    console.log('Order ID:', booking.raiffeisenPaymentId);
    console.log('Transaction ID:', booking.raiffeisenTransactionId);

    // Issue refund through RaiAccept
    const refundResult = await raiAcceptClient.issueRefund(
      booking.raiffeisenPaymentId,
      booking.raiffeisenTransactionId,
      amount,
      booking.currency || 'EUR'
    );

    console.log('✅ Refund issued successfully:', refundResult);

    // Parse RaiAccept refund response
    const refundTransaction = refundResult.transaction;
    const refundStatus = refundTransaction?.status;
    const refundStatusCode = refundTransaction?.statusCode;

    console.log('Refund transaction status:', refundStatus, 'Code:', refundStatusCode);

    // Only update booking if refund was successful
    if (refundStatusCode === '0000' || refundStatus === 'SUCCESS') {
      // Update booking status
      booking.status = 'refunded';
      booking.paymentStatus = 'refunded';
      booking.refundAmount = amount;
      booking.refundedAt = new Date();
      booking.refundReason = reason;
      booking.refundedBy = userId;

      await booking.save();

      // Restore ticket quantities
      if (booking.eventId) {
        const event = await Event.findById(booking.eventId);
        if (event) {
          for (const ticket of booking.tickets) {
            const ticketType = event.ticketTypes.find(
              (t: any) => t.name === ticket.ticketName
            );
            if (ticketType) {
              ticketType.availableTickets += 1;
            }
          }
          await event.save();
          console.log('✅ Ticket quantities restored');
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Refund issued successfully',
        refund: {
          transactionId: refundTransaction.transactionId,
          status: refundStatus,
          statusCode: refundStatusCode,
          amount: refundTransaction.transactionAmount,
          currency: refundTransaction.transactionCurrency,
          refundedAt: refundTransaction.createdOn,
        },
        booking: {
          id: booking._id,
          bookingReference: booking.bookingReference,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          refundAmount: booking.refundAmount,
          refundedAt: booking.refundedAt,
        },
      });
    } else {
      // Refund failed
      console.error('❌ Refund failed:', refundStatus, refundStatusCode);
      return NextResponse.json(
        {
          error: 'Refund failed',
          details: refundTransaction?.statusMessage || 'Unknown error',
          status: refundStatus,
          statusCode: refundStatusCode,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Refund error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process refund',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get refund status for a booking
 * GET /api/admin/bookings/[id]/refund
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();

    // Find booking
    const booking = await Booking.findById(id);
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking was paid via RaiAccept
    if (booking.paymentMethod !== 'raiffeisen') {
      return NextResponse.json(
        { error: 'This booking was not paid through RaiAccept' },
        { status: 400 }
      );
    }

    if (!booking.raiffeisenPaymentId || !booking.raiffeisenTransactionId) {
      return NextResponse.json(
        { error: 'Missing RaiAccept payment information' },
        { status: 400 }
      );
    }

    // Initialize RaiAccept client
    const raiAcceptClient = createRaiAcceptClient();
    if (!raiAcceptClient) {
      return NextResponse.json(
        { error: 'RaiAccept service not configured' },
        { status: 500 }
      );
    }

    console.log('📊 Fetching refund status for booking:', booking.bookingReference);

    // Get refund/transaction status from RaiAccept
    const statusResult = await raiAcceptClient.getRefundStatus(
      booking.raiffeisenPaymentId,
      booking.raiffeisenTransactionId
    );

    console.log('✅ Refund status retrieved:', statusResult);

    return NextResponse.json({
      success: true,
      booking: {
        id: booking._id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        refundAmount: booking.refundAmount,
        refundedAt: booking.refundedAt,
        refundReason: booking.refundReason,
      },
      raiAccept: {
        transaction: statusResult.transaction,
        order: statusResult.order,
        merchant: statusResult.merchant,
        card: statusResult.card,
      },
    });
  } catch (error) {
    console.error('❌ Get refund status error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get refund status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
