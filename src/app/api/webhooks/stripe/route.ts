import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';

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

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return;
    }

    booking.status = 'confirmed';
    booking.paymentIntentId = paymentIntent.id;
    await booking.save();

    console.log('Booking confirmed:', bookingId);

    if (!booking.emailSent) {
      booking.emailSent = true;
      await booking.save();
      console.log('Email marked as sent');
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

    booking.status = 'failed';
    booking.paymentIntentId = paymentIntent.id;
    await booking.save();

    console.log('Booking marked as failed:', bookingId);
  } catch (error) {
    console.error('Error handling payment failure:', error);
    throw error;
  }
}
