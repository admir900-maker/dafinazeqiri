import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';
import { sendBookingConfirmationEmail } from '@/lib/emailService';

/**
 * RaiAccept Webhook Handler
 * Receives payment notifications from RaiAccept and updates booking status
 * 
 * Documentation: https://docs.raiaccept.com/code-integration.html#webhooks
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📨 RaiAccept webhook received');

    const body = await request.json();
    console.log('Webhook payload:', JSON.stringify(body, null, 2));

    // RaiAccept webhook structure per official documentation
    const {
      transaction,
      order,
      merchant,
      consumer,
      card,
      callbackUrls,
    } = body;

    // Extract key fields from nested structure
    const transactionId = transaction?.transactionId;
    const transactionStatus = transaction?.status;
    const statusCode = transaction?.statusCode;
    const transactionAmount = transaction?.transactionAmount;
    const transactionCurrency = transaction?.transactionCurrency;
    const isProduction = transaction?.isProduction;

    const orderIdentification = order?.orderIdentification;
    const merchantOrderReference = order?.invoice?.merchantOrderReference; // This is our booking._id
    const invoiceDescription = order?.invoice?.description;

    console.log('📋 Webhook details:', {
      transactionId,
      status: transactionStatus,
      statusCode,
      orderIdentification,
      merchantOrderReference,
      amount: transactionAmount,
      currency: transactionCurrency,
      isProduction,
    });

    if (!merchantOrderReference) {
      console.error('❌ Missing merchantOrderReference in webhook');
      return NextResponse.json({ error: 'Missing merchantOrderReference' }, { status: 400 });
    }

    await connectToDatabase();

    // Find the booking by ID (merchantOrderReference)
    const booking = await Booking.findById(merchantOrderReference);

    if (!booking) {
      console.error('❌ Booking not found:', merchantOrderReference);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    console.log('📋 Found booking:', booking.bookingReference);

    // Update booking based on payment status
    // Status code 0000 = successful transaction
    if (statusCode === '0000' || transactionStatus === 'COMPLETED' || transactionStatus === 'SUCCESS') {
      console.log('✅ Payment successful - updating booking');

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      booking.raiffeisenPaymentId = orderIdentification;
      booking.raiffeisenTransactionId = transactionId;

      // Store additional payment details
      if (card?.maskedCardNumber) {
        booking.paymentDetails = {
          cardMasked: card.maskedCardNumber,
          cardType: card.type,
          cardHolderName: card.cardHolderName,
        };
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
          // Don't fail the webhook if email fails
        }
      } else {
        console.log('ℹ️ Email already sent for this booking');
      }

      return NextResponse.json({
        success: true,
        message: 'Payment confirmed',
        bookingReference: booking.bookingReference,
      });
    } else if (statusCode !== '0000' || transactionStatus === 'FAILED' || transactionStatus === 'DECLINED' || transactionStatus === 'ERROR') {
      console.log('❌ Payment failed - updating booking');
      console.log('Status code:', statusCode, 'Status:', transactionStatus);

      booking.status = 'cancelled';
      booking.paymentStatus = 'failed';
      booking.raiffeisenPaymentId = orderIdentification;
      booking.raiffeisenTransactionId = transactionId;

      await booking.save();

      // Restore ticket quantities
      const event = await Event.findById(booking.eventId);
      if (event) {
        for (const ticket of booking.tickets) {
          const ticketType = event.ticketTypes.find((t: any) => t.name === ticket.ticketName);
          if (ticketType) {
            ticketType.availableTickets += 1;
          }
        }
        await event.save();
        console.log('🔄 Ticket quantities restored');
      }

      return NextResponse.json({
        success: true,
        message: 'Payment failed',
        bookingReference: booking.bookingReference,
      });
    } else if (transactionStatus === 'PENDING' || transactionStatus === 'PROCESSING') {
      console.log('⏳ Payment pending');

      booking.paymentStatus = 'pending';
      booking.raiffeisenPaymentId = orderIdentification;

      await booking.save();

      return NextResponse.json({
        success: true,
        message: 'Payment pending',
        bookingReference: booking.bookingReference,
      });
    } else {
      console.warn('⚠️ Unknown payment status:', transactionStatus, 'Status code:', statusCode);

      return NextResponse.json({
        success: true,
        message: 'Status received',
        status: transactionStatus,
        statusCode,
      });
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification (if RaiAccept uses this)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'RaiAccept webhook endpoint',
  });
}
