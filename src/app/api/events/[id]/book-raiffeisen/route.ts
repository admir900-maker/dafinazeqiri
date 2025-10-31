import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Booking from '@/models/Booking';
import { createRaiAcceptClient } from '@/lib/raiAccept';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { getSiteConfig } from '@/lib/settings';

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
    const { tickets } = await request.json();

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json({ error: 'No tickets selected' }, { status: 400 });
    }

    // Get user info from Clerk
    const user = await currentUser();
    const customerEmail = user?.emailAddresses?.[0]?.emailAddress || '';
    const customerName = user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.username || customerEmail;

    await connectToDatabase();

    // Get event details
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check ticket availability
    let totalAmount = 0;
    const bookingTickets = [];

    for (const ticket of tickets) {
      const ticketType = event.ticketTypes.find((t: any) => t._id.toString() === ticket.ticketId);
      if (!ticketType) {
        return NextResponse.json({ error: `Ticket type not found: ${ticket.ticketId}` }, { status: 400 });
      }

      if (ticketType.availableTickets < ticket.quantity) {
        return NextResponse.json({
          error: `Not enough tickets available for ${ticketType.name}`
        }, { status: 400 });
      }

      console.log('🎨 Ticket type color:', ticketType.color, 'for ticket:', ticketType.name);

      // Create individual ticket entries
      for (let i = 0; i < ticket.quantity; i++) {
        const ticketId = uuidv4();
        const qrCode = await QRCode.toDataURL(`${event._id}-${ticketId}`);

        bookingTickets.push({
          ticketName: ticketType.name,
          ticketId: ticketId,
          qrCode: qrCode,
          price: ticketType.price,
          color: ticketType.color || '#3B82F6',
          isUsed: false
        });

        totalAmount += ticketType.price;
      }
    }

    // Generate booking reference
    const bookingReference = `BRA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create booking
    const booking = new Booking({
      userId,
      eventId: id,
      tickets: bookingTickets,
      totalAmount,
      currency: 'EUR',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'raiffeisen',
      bookingReference,
      customerEmail,
      customerName,
      emailSent: false
    });

    await booking.save();

    // Initialize RaiAccept API client
    console.log('🔧 Initializing RaiAccept client...');
    const raiAcceptClient = createRaiAcceptClient();

    if (!raiAcceptClient) {
      console.error('❌ RaiAccept client is null - check environment variables');
      console.error('RAIACCEPT_CLIENT_ID:', process.env.RAIACCEPT_CLIENT_ID ? 'Set' : 'Missing');
      console.error('RAIACCEPT_CLIENT_SECRET:', process.env.RAIACCEPT_CLIENT_SECRET ? 'Set' : 'Missing');
      console.error('RAIACCEPT_ENVIRONMENT:', process.env.RAIACCEPT_ENVIRONMENT);

      return NextResponse.json({
        error: 'Payment service not configured. Please check RaiAccept credentials.'
      }, { status: 500 });
    }

    // Get site configuration for description
    const siteConfig = await getSiteConfig();

    console.log('💳 Creating RaiAccept payment with amount:', totalAmount);

    // Create RaiAccept payment
    const paymentResult = await raiAcceptClient.createPayment({
      amount: totalAmount,
      currency: 'EUR',
      orderId: booking._id.toString(),
      description: `${siteConfig.siteName} - ${event.name} - ${bookingTickets.length} ticket(s)`,
      customerEmail,
      customerName,
      language: 'en', // or 'sq' for Albanian, 'sr' for Serbian
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/booking-success?bookingId=${booking._id}`,
      failureUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout?error=payment_failed`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout?error=payment_cancelled`,
      notificationUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/raiaccept`
    });

    console.log('Payment result:', paymentResult);

    if (!paymentResult.success || !paymentResult.paymentUrl) {
      console.error('❌ Payment creation failed:', paymentResult.error);
      // Delete booking if payment creation failed
      await Booking.findByIdAndDelete(booking._id);

      return NextResponse.json({
        error: 'Failed to create payment session',
        details: paymentResult.error || 'Unknown error'
      }, { status: 500 });
    }

    console.log('✅ Payment URL created:', paymentResult.paymentUrl);

    // Update booking with RaiAccept order ID
    booking.raiffeisenPaymentId = paymentResult.orderIdentification;
    await booking.save();

    // Update ticket quantities
    for (const ticket of tickets) {
      const ticketType = event.ticketTypes.find((t: any) => t._id.toString() === ticket.ticketId);
      if (ticketType) {
        ticketType.availableTickets -= ticket.quantity;
      }
    }
    await event.save();

    return NextResponse.json({
      paymentUrl: paymentResult.paymentUrl,
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      orderIdentification: paymentResult.orderIdentification
    });

  } catch (error) {
    console.error('❌ RaiAccept payment creation error:', error);
    return NextResponse.json({
      error: 'Failed to create payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}