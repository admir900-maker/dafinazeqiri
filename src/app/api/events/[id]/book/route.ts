import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import Booking from '@/models/Booking';
import PaymentSettings from '@/models/PaymentSettings';
import { getStripe, isStripeEnabled } from '@/lib/stripe';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('👤 User ID:', userId);

    // STRIPE PAYMENT DISABLED - Use RaiAccept instead
    return NextResponse.json({
      error: 'Stripe payment is disabled. Please use RaiAccept (Raiffeisen Bank) payment method.'
    }, { status: 503 });

    // Check if Stripe is enabled
    const stripeEnabled = await isStripeEnabled();
    if (!stripeEnabled) {
      return NextResponse.json({ error: 'Payment processing is currently unavailable' }, { status: 503 });
    }

    // Get Stripe instance with settings from database
    const stripe = await getStripe();

    // Get current user information for customer details
    const user = await currentUser();
    const customerEmail = user?.emailAddresses[0]?.emailAddress || '';
    const customerName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Customer';

    console.log('👤 Customer info:', { customerName, customerEmail });

    const { ticketSelections } = await req.json();
    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    console.log('🎫 Ticket selections:', ticketSelections);
    console.log('🎪 Event ID:', eventId);

    // Validate input
    if (!ticketSelections || Object.keys(ticketSelections).length === 0) {
      return NextResponse.json({ error: 'No tickets selected' }, { status: 400 });
    }

    await connectToDatabase();
    console.log('🗄️ Database connected successfully');

    console.log('🔍 Looking for event with ID:', eventId);

    // Get event using Mongoose (consistent with event fetching API)
    const event = await Event.findById(eventId);

    console.log('📦 Event found:', event ? 'Yes' : 'No');

    if (!event) {
      // List some events for debugging
      const allEvents = await Event.find({}).limit(3).select('_id title');
      console.log('📋 Sample events in database:', allEvents.map(e => ({ id: e._id, title: e.title })));

      return NextResponse.json({
        error: 'Event not found',
        debug: {
          searchedId: eventId,
          sampleEvents: allEvents.map(e => ({ id: e._id, title: e.title }))
        }
      }, { status: 404 });
    }

    console.log('✅ Event found:', event.title);

    // Check ticket availability and calculate total
    let totalPrice = 0;
    const ticketBreakdown: Array<{
      name: string;
      quantity: number;
      price: number;
      total: number;
    }> = [];

    for (const [ticketName, quantity] of Object.entries(ticketSelections)) {
      // Cast to number and validate
      const qty = quantity as number;
      if (typeof qty !== 'number' || qty <= 0) continue;

      const ticketType = event.ticketTypes.find((t: { name: string; price: number; availableTickets: number }) => t.name === ticketName);

      if (!ticketType) {
        return NextResponse.json({ error: `Ticket type "${ticketName}" not found` }, { status: 400 });
      }

      if (ticketType.availableTickets < qty) {
        return NextResponse.json({
          error: `Not enough tickets available for ${ticketName}. Only ${ticketType.availableTickets} left.`
        }, { status: 400 });
      }

      const lineTotal = ticketType.price * qty;
      totalPrice += lineTotal;

      ticketBreakdown.push({
        name: ticketName,
        quantity: qty,
        price: ticketType.price,
        total: lineTotal
      });
    }

    // Get currency from payment settings using Mongoose
    let currency = 'eur'; // default fallback
    try {
      const paymentSettings = await PaymentSettings.findOne({});
      currency = paymentSettings?.currency || 'eur';
      console.log('💰 Currency from settings:', currency);
    } catch (settingsError) {
      console.error('❌ Error fetching payment settings:', settingsError);
      // Continue with default currency
    }

    // Create booking record first (will be confirmed by webhook)
    const bookingTickets = [];

    for (const [ticketName, quantity] of Object.entries(ticketSelections)) {
      // Cast to number and validate
      const qty = quantity as number;
      if (typeof qty !== 'number' || qty <= 0) continue;

      const ticketType = event.ticketTypes.find((t: any) => t.name === ticketName);
      if (!ticketType) continue;

      console.log('🎨 Ticket type color:', ticketType.color, 'for ticket:', ticketName);

      for (let i = 0; i < qty; i++) {
        try {
          const ticketId = uuidv4();
          const qrData = {
            eventId,
            ticketId,
            userId,
            ticketType: ticketName,
            price: ticketType.price,
            eventTitle: event.title,
            timestamp: Date.now()
          };

          console.log('🎫 Generating QR code for ticket:', ticketId);
          const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

          bookingTickets.push({
            ticketName,
            ticketId,
            qrCode,
            price: ticketType.price,
            color: ticketType.color || '#3B82F6',
            isUsed: false
          });
        } catch (qrError) {
          console.error('❌ Error generating QR code:', qrError);
          const err = qrError as Error;
          const errorMessage = err.message || 'Unknown error';
          throw new Error(`Failed to generate QR code for ticket: ${errorMessage}`);
        }
      }
    }

    let booking;
    try {
      console.log('💾 Creating booking record...');

      // Generate booking reference manually
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const bookingReference = `BKNG${timestamp}${random}`;

      console.log('📝 Generated booking reference:', bookingReference);

      booking = new Booking({
        userId,
        eventId,
        tickets: bookingTickets,
        totalAmount: totalPrice,
        currency: currency.toUpperCase(),
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'stripe',
        bookingReference,
        customerEmail,
        customerName,
        emailSent: false
      });

      await booking.save();
      console.log('✅ Booking created with ID:', booking._id);
    } catch (bookingError) {
      console.error('❌ Error creating booking:', bookingError);
      const err = bookingError as Error;
      const errorMessage = err.message || 'Unknown error';
      throw new Error(`Failed to create booking: ${errorMessage}`);
    }

    // Create Stripe Payment Intent with webhook handling
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalPrice * 100), // Convert to cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          eventId: eventId,
          userId: userId,
          bookingId: booking._id.toString(),
          ticketSelections: JSON.stringify(ticketSelections),
          eventTitle: event.title,
          totalTickets: Object.values(ticketSelections).reduce((sum: number, qty: any) => sum + qty, 0).toString(),
        },
        description: `Tickets for ${event.title} - ${Object.values(ticketSelections).reduce((sum: number, qty: any) => sum + qty, 0)} tickets`,
      });

      // Update booking with payment intent ID
      booking.paymentIntentId = paymentIntent.id;
      await booking.save();
      
      // Update QR codes with bookingId now that booking is saved
      for (let i = 0; i < booking.tickets.length; i++) {
        const ticket = booking.tickets[i];
        const qrData = {
          eventId,
          ticketId: ticket.ticketId,
          userId,
          bookingId: booking._id.toString(),
          ticketType: ticket.ticketName,
          price: ticket.price,
          eventTitle: event.title,
          timestamp: Date.now()
        };
        booking.tickets[i].qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
      }
      await booking.save();

      return NextResponse.json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
        },
        orderSummary: {
          eventId,
          eventTitle: event.title,
          ticketBreakdown,
          totalPrice,
          totalTickets: Object.values(ticketSelections).reduce((sum: number, qty: any) => sum + qty, 0),
          bookingReference: booking.bookingReference,
        },
        message: 'Payment intent created. Complete payment to confirm booking.',
      });

    } catch (stripeError: any) {
      // Remove booking if payment intent creation fails
      await Booking.findByIdAndDelete(booking._id);

      console.error('Stripe Payment Intent creation failed:', stripeError);
      return NextResponse.json({
        error: 'Payment processing failed: ' + stripeError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error booking tickets:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}