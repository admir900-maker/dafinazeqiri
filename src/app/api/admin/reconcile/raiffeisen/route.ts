import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { createRaiAcceptClient } from '@/lib/raiAccept';

// RaiAccept response codes and their interpretations
const RAIACCEPT_CODES: Record<string, { type: 'success' | 'decline' | 'error' | 'technical', description: string }> = {
  '0000': { type: 'success', description: 'Transaction successful' },
  '1001': { type: 'decline', description: 'Decline by Issuer: Suspected fraud' },
  '1002': { type: 'decline', description: 'Decline by Issuer: Card issue, contact bank' },
  '1003': { type: 'decline', description: 'Card issue, contact bank or use another payment method' },
  '1004': { type: 'decline', description: 'Decline by Issuer: Transaction not permitted' },
  '1005': { type: 'decline', description: 'Decline by Issuer: Card reported as lost' },
  '1006': { type: 'decline', description: 'Decline by Issuer: Card reported as stolen' },
  '1007': { type: 'error', description: 'Duplicate transaction detected' },
  '1008': { type: 'error', description: 'Invalid referencing transaction' },
  '1009': { type: 'error', description: 'Currency not supported' },
  '2001': { type: 'decline', description: 'Restricted card (embargoes)' },
  '2002': { type: 'error', description: 'Invalid Merchant ID' },
  '2003': { type: 'error', description: 'Invalid amount format' },
  '2004': { type: 'decline', description: 'Insufficient funds' },
  '2005': { type: 'error', description: 'Refund amount exceeds original transaction' },
  '2006': { type: 'decline', description: '3-D Secure authentication failed' },
  '2007': { type: 'decline', description: '3DS failed: Unknown device' },
  '2008': { type: 'decline', description: '3DS failed: Unsupported device' },
  '2009': { type: 'decline', description: '3DS frequency limit exceeded' },
  '2010': { type: 'decline', description: '3DS: No card records exist' },
  '2011': { type: 'decline', description: '3DS security failure' },
  '2012': { type: 'decline', description: '3DS: Card not enrolled' },
  '2013': { type: 'decline', description: '3DS: Max challenges exceeded' },
  '2014': { type: 'decline', description: 'NPA transaction not supported by issuer' },
  '2015': { type: 'decline', description: 'Merchant Initiated Auth (3RI) not supported' },
  '2016': { type: 'technical', description: '3DS Access Control Server unreachable' },
  '2017': { type: 'error', description: 'Decoupled 3DS Authentication expected' },
  '2018': { type: 'decline', description: 'Decoupled Auth timeout' },
  '2019': { type: 'error', description: 'Insufficient time for Decoupled Auth' },
  '2020': { type: 'decline', description: '3DS authentication not performed by consumer' },
  '2021': { type: 'technical', description: '3DS ACS timeout' },
  '2022': { type: 'decline', description: 'Daily/monthly limits exceeded' },
  '3001': { type: 'decline', description: 'Strong Customer Authentication required (Soft Decline)' },
  '3002': { type: 'decline', description: 'Expired card' },
  '3003': { type: 'error', description: 'Invalid card/account number' },
  '3004': { type: 'error', description: 'Invalid expiration date' },
  '3005': { type: 'error', description: 'Incorrect CVV' },
  '3006': { type: 'technical', description: 'Technical error with processor' },
  '3007': { type: 'technical', description: 'Technical error with payment schemes' },
  '3008': { type: 'error', description: 'Invalid 3DS transaction' },
  '3009': { type: 'decline', description: 'Suspected risk - low confidence' },
  '3010': { type: 'decline', description: 'Suspected risk - medium confidence' },
  '3011': { type: 'decline', description: 'Suspected risk - high confidence' },
  '3012': { type: 'decline', description: 'Suspected risk - very high confidence' },
  '3013': { type: 'decline', description: 'Preferred authentication method not supported' },
  '3014': { type: 'decline', description: 'Content Security Policy validation failed' },
  '3015': { type: 'error', description: 'Issuing Bank invalid or unknown' },
  '3016': { type: 'technical', description: 'Issuing Bank unreachable' },
  '3017': { type: 'decline', description: 'Possible security issue with card' },
  '4001': { type: 'decline', description: 'Generic refusal from card issuer' },
  '5001': { type: 'error', description: 'Too many transaction retries' },
  '5002': { type: 'decline', description: 'Risk-related rule prevents transaction' },
  '6001': { type: 'technical', description: 'Cannot insert into batch file for capture' },
  '6002': { type: 'technical', description: 'No batch response file for capture' },
  '6003': { type: 'technical', description: 'Batch file transaction count mismatch' },
  '6004': { type: 'technical', description: 'Identifier field missing in batch processing' },
  '6005': { type: 'technical', description: 'Unknown error during batch processing' },
  '6006': { type: 'technical', description: 'Duplicate batch file sent' },
  '6007': { type: 'technical', description: 'Duplicate transaction in batch file' },
  '6008': { type: 'technical', description: 'Technical error with 3DS processing' },
  '6009': { type: 'technical', description: 'Technical error in Risk module' },
  '7001': { type: 'error', description: 'Refund: Invalid data' },
  '7002': { type: 'technical', description: 'Processor response missing critical data' },
  '7003': { type: 'technical', description: 'Tokenizer service technical error' },
  '7004': { type: 'technical', description: 'Technical error - try again shortly' },
  '7005': { type: 'error', description: 'Data validation error' },
  '7006': { type: 'technical', description: 'Transaction timeout - cancelled by Gateway' },
  '7007': { type: 'technical', description: 'Reversal request technical error' },
  '7008': { type: 'decline', description: 'Authentication declined by 3DS router' },
  '7009': { type: 'error', description: 'Card brand not supported' },
  '7010': { type: 'technical', description: 'Infrastructure error' },
  '7011': { type: 'technical', description: 'Communication error with processor' },
  '9999': { type: 'technical', description: 'Unknown technical error' },
};

function getCodeInfo(statusCode?: string): { type: 'success' | 'decline' | 'error' | 'technical' | 'unknown', description: string } {
  if (!statusCode) return { type: 'unknown', description: 'Unknown status' };
  return RAIACCEPT_CODES[statusCode] || { type: 'unknown', description: `Unknown code: ${statusCode}` };
}

function normalizeRemoteStatus(transactions: any[]): { status: string; statusCode?: string; codeInfo: ReturnType<typeof getCodeInfo>; last?: any } {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { status: 'UNKNOWN', codeInfo: { type: 'unknown', description: 'No transactions found' } };
  }
  const last = transactions[transactions.length - 1];
  const status = last?.status || last?.transactionStatus || 'UNKNOWN';
  const statusCode = last?.statusCode || last?.transactionStatusCode;
  const codeInfo = getCodeInfo(statusCode);
  return { status, statusCode, codeInfo, last };
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('bookingId');
    const orderIdParam = searchParams.get('orderId');
    const customerName = searchParams.get('customerName');

    // If customer name search is provided, return all matching bookings with RaiAccept data
    if (customerName) {
      const nameSearch = customerName.trim();
      const bookings = await Booking.find({
        customerName: { $regex: nameSearch, $options: 'i' },
        raiffeisenPaymentId: { $exists: true, $ne: null }
      }).populate('eventId').sort({ createdAt: -1 }).limit(50);

      const client = createRaiAcceptClient();
      if (!client) return NextResponse.json({ error: 'RaiAccept not configured' }, { status: 500 });

      const results = await Promise.all(
        bookings.map(async (booking) => {
          const orderId = booking.raiffeisenPaymentId || '';
          if (!orderId) return null;

          const [orderDetails, orderTx] = await Promise.all([
            client.getOrderDetails(orderId).catch((e) => ({ error: e.message })),
            client.getOrderTransactions(orderId).catch((e) => ({ error: e.message })),
          ]);

          let txList: any[] = [];
          if (orderTx && !orderTx.error) {
            txList = Array.isArray(orderTx?.transactions) ? orderTx.transactions : (Array.isArray(orderTx) ? orderTx : []);
          }

          const { status: remoteStatus, statusCode, codeInfo } = normalizeRemoteStatus(txList);

          const success = statusCode === '0000' || codeInfo.type === 'success' || ['SUCCESS', 'COMPLETED'].includes(remoteStatus);
          const failed = codeInfo.type === 'decline' || codeInfo.type === 'error' || ['FAILED', 'DECLINED', 'ERROR', 'CANCELLED'].includes(remoteStatus);
          let recommendedAction: 'none' | 'markPaidAndResend' | 'markFailed' = 'none';
          if (success && (booking.status !== 'confirmed' || booking.paymentStatus !== 'paid')) {
            recommendedAction = 'markPaidAndResend';
          } else if (failed && (booking.status === 'pending' || booking.paymentStatus === 'pending')) {
            recommendedAction = 'markFailed';
          }

          return {
            local: {
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
              customerName: booking.customerName,
            },
            remote: {
              orderId,
              order: orderDetails?.error ? null : orderDetails,
              transactions: txList,
              error: orderDetails?.error || orderTx?.error || null,
            },
            summary: {
              remoteStatus,
              statusCode,
              codeType: codeInfo.type,
              codeDescription: codeInfo.description,
              recommendedAction,
              discrepancy: recommendedAction !== 'none',
            }
          };
        })
      );

      return NextResponse.json({
        success: true,
        searchType: 'customer',
        customerName: nameSearch,
        count: results.filter(r => r !== null).length,
        results: results.filter(r => r !== null)
      });
    }

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
      return NextResponse.json({ error: 'Missing orderId. Provide bookingId, orderId, or customerName.' }, { status: 400 });
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

    const { status: remoteStatus, statusCode, codeInfo } = normalizeRemoteStatus(txList);

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
      customerName: booking.customerName,
    } : null;

    let recommendedAction: 'none' | 'markPaidAndResend' | 'markFailed' = 'none';
    if (booking) {
      const success = statusCode === '0000' || codeInfo.type === 'success' || ['SUCCESS', 'COMPLETED'].includes(remoteStatus);
      const failed = codeInfo.type === 'decline' || codeInfo.type === 'error' || ['FAILED', 'DECLINED', 'ERROR', 'CANCELLED'].includes(remoteStatus);
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
        codeType: codeInfo.type,
        codeDescription: codeInfo.description,
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
