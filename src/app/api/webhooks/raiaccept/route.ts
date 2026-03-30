import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';
import { sendBookingConfirmationEmail } from '@/lib/emailService';
import { getSetting } from '@/lib/settings';

/**
 * RaiAccept Webhook Handler
 * Receives payment notifications from RaiAccept and updates booking status
 * 
 * SECURITY: Webhook secret verification via RAIACCEPT_WEBHOOK_SECRET env var
 * Documentation: https://docs.raiaccept.com/code-integration.html#webhooks
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📨 RaiAccept webhook received');

    // SECURITY: Webhook secret is mandatory — reject if not configured
    const webhookSecret = process.env.RAIACCEPT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ RAIACCEPT_WEBHOOK_SECRET not configured — rejecting webhook');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }
    const providedSecret = request.headers.get('x-webhook-secret');
    if (!providedSecret || providedSecret !== webhookSecret) {
      console.error('❌ Invalid or missing webhook secret');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    // Verify payment amount matches booking total (prevent partial payment attacks)
    if (transactionAmount != null && statusCode === '0000') {
      // RaiAccept sends amount in cents, booking stores in standard units
      const paidAmount = typeof transactionAmount === 'number' ? transactionAmount : parseFloat(transactionAmount);
      const expectedAmount = booking.totalAmount * 100; // Convert to cents
      if (Math.abs(paidAmount - expectedAmount) > 1) {
        console.error('❌ Amount mismatch! Paid:', paidAmount, 'Expected:', expectedAmount);
        return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
      }
    }

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

      // Check email template setting
      const sendConfirmationEnabled = await getSetting('email.templates.bookingConfirmation', true);

      // Send confirmation email with tickets if enabled and not already sent
      if (sendConfirmationEnabled && !booking.emailSent) {
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
      } else if (!sendConfirmationEnabled) {
        console.log('ℹ️ Booking confirmation emails are disabled by settings; skipping email send.');
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
