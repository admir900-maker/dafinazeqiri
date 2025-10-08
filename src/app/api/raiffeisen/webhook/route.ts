import { NextRequest, NextResponse } from 'next/server';
import { RaiffeisenBankAPI, getRaiffeisenConfig } from '@/lib/raiffeisenBank';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { sendBookingConfirmationEmail } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  console.log('🏦 Raiffeisen Bank webhook received');

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature') || '';

    // Get Raiffeisen configuration
    const config = await getRaiffeisenConfig();
    if (!config) {
      console.error('❌ Raiffeisen Bank configuration not found');
      return NextResponse.json({ error: 'Configuration not found' }, { status: 500 });
    }

    // Initialize Raiffeisen API
    const raiffeisenAPI = new RaiffeisenBankAPI(config);

    // Verify webhook signature
    if (!raiffeisenAPI.verifyWebhookSignature(rawBody, signature)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(rawBody);
    console.log('🏦 Webhook data:', {
      type: webhookData.event_type,
      paymentId: webhookData.payment_id,
      status: webhookData.status,
      orderId: webhookData.order_id
    });

    // Handle payment completion
    if (webhookData.event_type === 'payment.completed' && webhookData.status === 'completed') {
      await handlePaymentSuccess(webhookData);
    } else if (webhookData.event_type === 'payment.failed') {
      await handlePaymentFailed(webhookData);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Raiffeisen webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handlePaymentSuccess(webhookData: any) {
  try {
    console.log('✅ Processing successful Raiffeisen payment:', webhookData.payment_id);

    await connectToDatabase();

    // Find the booking by orderId
    const booking = await Booking.findOne({
      $or: [
        { stripePaymentIntentId: webhookData.order_id },
        { _id: webhookData.order_id }
      ]
    });

    if (!booking) {
      console.error('❌ Booking not found for orderId:', webhookData.order_id);
      return;
    }

    // Update booking status
    booking.paymentStatus = 'paid';
    booking.raiffeisenPaymentId = webhookData.payment_id;
    booking.paymentDate = new Date();
    booking.paymentMethod = 'raiffeisen';

    await booking.save();

    console.log('✅ Booking updated successfully:', booking._id);

    // Send confirmation email
    try {
      await sendBookingConfirmationEmail(booking);
      console.log('📧 Confirmation email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send confirmation email:', emailError);
    }

  } catch (error) {
    console.error('❌ Error handling payment success:', error);
  }
}

async function handlePaymentFailed(webhookData: any) {
  try {
    console.log('❌ Processing failed Raiffeisen payment:', webhookData.payment_id);

    await connectToDatabase();

    // Find and update the booking
    const booking = await Booking.findOne({
      $or: [
        { stripePaymentIntentId: webhookData.order_id },
        { _id: webhookData.order_id }
      ]
    });

    if (booking) {
      booking.paymentStatus = 'failed';
      booking.raiffeisenPaymentId = webhookData.payment_id;
      await booking.save();
      console.log('❌ Booking marked as failed:', booking._id);
    }

  } catch (error) {
    console.error('❌ Error handling payment failure:', error);
  }
}