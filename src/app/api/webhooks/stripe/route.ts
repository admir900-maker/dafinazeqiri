import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { sendBookingConfirmationEmail } from '@/lib/emailService';
import { clerkClient } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    console.log('Stripe webhook received');

    const body = await req.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
      console.log('Webhook signature verified:', event.type);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        await handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', failedPayment.id);
        await handlePaymentFailure(failedPayment);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  try {
    await connectToDatabase();

    const bookingId = paymentIntent.metadata.bookingId;
    if (!bookingId) {
      console.error('No bookingId in payment metadata');
      return;
    }

    // Get booking and populate event information
    const booking = await Booking.findById(bookingId).populate('eventId');
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return;
    }

    // Get customer information from Clerk
    let customerEmail = '';
    let customerName = 'Customer';

    try {
      if (booking.userId) {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(booking.userId);
        customerEmail = user.emailAddresses[0]?.emailAddress || '';
        customerName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer';

        // Update booking with customer information
        booking.customerEmail = customerEmail;
        booking.customerName = customerName;
        console.log('👤 Customer info retrieved:', { customerName, customerEmail });
      }
    } catch (userError) {
      console.error('Error getting user info from Clerk:', userError);
      // Continue without customer info - email might fail but booking will be confirmed
    }

    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.stripePaymentIntentId = paymentIntent.id;
    booking.paymentDate = new Date();
    await booking.save();

    console.log('Booking confirmed:', bookingId);

    // Send confirmation email if not already sent and we have customer email
    if (!booking.emailSent && customerEmail) {
      try {
        console.log('Sending confirmation email...');

        const emailSent = await sendBookingConfirmationEmail(booking);

        if (emailSent) {
          booking.emailSent = true;
          await booking.save();
          console.log('Confirmation email sent successfully');
        } else {
          console.log('Failed to send confirmation email');
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the booking if email fails
      }
    } else if (!customerEmail) {
      console.log('⚠️ No customer email available, skipping email send');
    } else {
      console.log('📧 Email already sent for this booking');
    }
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw error;
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  try {
    await connectToDatabase();

    const bookingId = paymentIntent.metadata.bookingId;
    if (!bookingId) {
      console.error('No bookingId in payment metadata');
      return;
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return;
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'failed';
    booking.stripePaymentIntentId = paymentIntent.id;
    await booking.save();

    console.log('Booking marked as failed:', bookingId);
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}
