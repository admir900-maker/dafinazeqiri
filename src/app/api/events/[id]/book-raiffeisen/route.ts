import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Booking from '@/models/Booking';
import { RaiffeisenBankAPI, getRaiffeisenConfig } from '@/lib/raiffeisenBank';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

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
      const ticketType = event.tickets.find((t: any) => t._id.toString() === ticket.ticketId);
      if (!ticketType) {
        return NextResponse.json({ error: `Ticket type not found: ${ticket.ticketId}` }, { status: 400 });
      }

      if (ticketType.sold + ticket.quantity > ticketType.quantity) {
        return NextResponse.json({
          error: `Not enough tickets available for ${ticketType.name}`
        }, { status: 400 });
      }

      // Create individual ticket entries
      for (let i = 0; i < ticket.quantity; i++) {
        const ticketId = uuidv4();
        const qrCode = await QRCode.toDataURL(`${event._id}-${ticketId}`);

        bookingTickets.push({
          ticketName: ticketType.name,
          ticketId: ticketId,
          qrCode: qrCode,
          price: ticketType.price,
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

    // Get Raiffeisen configuration
    const config = await getRaiffeisenConfig();
    if (!config) {
      return NextResponse.json({ error: 'Raiffeisen Bank configuration not found' }, { status: 500 });
    }

    // Initialize Raiffeisen API
    const raiffeisenAPI = new RaiffeisenBankAPI(config);

    // Create payment intent
    const paymentIntent = await raiffeisenAPI.createPaymentIntent({
      amount: totalAmount,
      currency: 'EUR',
      orderId: booking._id.toString(),
      description: `BiletAra - ${event.name} - ${bookingTickets.length} ticket(s)`,
      customerEmail,
      customerName,
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/booking-success?bookingId=${booking._id}`,
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/raiffeisen/webhook`
    });

    // Update booking with payment intent ID
    booking.raiffeisenPaymentId = paymentIntent.paymentId;
    await booking.save();

    // Update ticket quantities
    for (const ticket of tickets) {
      const ticketType = event.tickets.find((t: any) => t._id.toString() === ticket.ticketId);
      if (ticketType) {
        ticketType.sold += ticket.quantity;
      }
    }
    await event.save();

    return NextResponse.json({
      paymentUrl: paymentIntent.redirectUrl,
      bookingId: booking._id,
      bookingReference: booking.bookingReference
    });

  } catch (error) {
    console.error('❌ Raiffeisen payment creation error:', error);
    return NextResponse.json({
      error: 'Failed to create payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}