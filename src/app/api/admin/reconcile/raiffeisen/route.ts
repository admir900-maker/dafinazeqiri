import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { createRaiAcceptClient } from '@/lib/raiAccept';

function normalizeRemoteStatus(transactions: any[]): { status: string; statusCode?: string; last?: any } {
  if (!Array.isArray(transactions) || transactions.length === 0) return { status: 'UNKNOWN' };
  const last = transactions[transactions.length - 1];
  const status = last?.status || last?.transactionStatus || 'UNKNOWN';
  const statusCode = last?.statusCode || last?.transactionStatusCode;
  return { status, statusCode, last };
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('bookingId');
    const orderIdParam = searchParams.get('orderId');

    let booking: any = null;
    let orderId = orderIdParam || '';

    if (bookingId) {
      booking = await Booking.findById(bookingId).populate('eventId');
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      orderId = booking.raiffeisenPaymentId || '';
    } else if (orderId) {
      booking = await Booking.findOne({ raiffeisenPaymentId: orderId }).populate('eventId');
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId. Provide bookingId or orderId.' }, { status: 400 });
    }

    const client = createRaiAcceptClient();
    if (!client) return NextResponse.json({ error: 'RaiAccept not configured' }, { status: 500 });

    // Fetch order details and transactions
    const [orderDetails, orderTx] = await Promise.all([
      client.getOrderDetails(orderId).catch((e) => ({ error: e.message })),
      client.getOrderTransactions(orderId).catch((e) => ({ error: e.message })),
    ]);

    let txList: any[] = [];
    if (orderTx && !orderTx.error) {
      txList = Array.isArray(orderTx?.transactions) ? orderTx.transactions : (Array.isArray(orderTx) ? orderTx : []);
    }

    const remote = {
      orderId,
      order: orderDetails?.error ? null : orderDetails,
      transactions: txList,
      error: orderDetails?.error || orderTx?.error || null,
    };

    const { status: remoteStatus, statusCode } = normalizeRemoteStatus(txList);

    const local = booking ? {
      id: booking._id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      orderId: booking.raiffeisenPaymentId,
      transactionId: booking.raiffeisenTransactionId || null,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      createdAt: booking.createdAt,
      customerEmail: booking.customerEmail,
    } : null;

    let recommendedAction: 'none' | 'markPaidAndResend' | 'markFailed' = 'none';
    if (booking) {
      const success = statusCode === '0000' || ['SUCCESS', 'COMPLETED'].includes(remoteStatus);
      const failed = ['FAILED', 'DECLINED', 'ERROR', 'CANCELLED'].includes(remoteStatus);
      if (success && (booking.status !== 'confirmed' || booking.paymentStatus !== 'paid')) {
        recommendedAction = 'markPaidAndResend';
      } else if (failed && (booking.status === 'pending' || booking.paymentStatus === 'pending')) {
        recommendedAction = 'markFailed';
      }
    }

    return NextResponse.json({
      success: true,
      local,
      remote,
      summary: {
        remoteStatus,
        statusCode,
        recommendedAction,
        discrepancy: booking ? (recommendedAction !== 'none') : false,
      }
    });
  } catch (error: any) {
    console.error('Reconcile GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const { bookingId, action, resend } = await request.json();
    if (!bookingId || !action) return NextResponse.json({ error: 'bookingId and action are required' }, { status: 400 });

    const booking = await Booking.findById(bookingId).populate('eventId');
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    if (action === 'markPaidAndResend') {
      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      booking.paymentDate = booking.paymentDate || new Date();
      await booking.save();
      if (resend) {
        // call existing resend endpoint internally
        // we can just set emailSent=false to force re-send via admin UI, or leave to client
      }
      return NextResponse.json({ success: true, message: 'Booking marked as paid' });
    }

    if (action === 'markFailed') {
      booking.status = 'cancelled';
      booking.paymentStatus = 'failed';
      await booking.save();
      return NextResponse.json({ success: true, message: 'Booking marked as failed' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Reconcile POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
