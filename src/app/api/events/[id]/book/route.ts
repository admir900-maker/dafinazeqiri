import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Ticket from '@/models/Ticket';
import Booking from '@/models/Booking';
import PaymentSettings from '@/models/PaymentSettings';
import Stripe from 'stripe';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

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

    const { ticketSelections, useWebhook = true } = await req.json();
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
      if (typeof quantity !== 'number' || quantity <= 0) continue;

      const ticketType = event.ticketTypes.find((t: { name: string; price: number; availableTickets: number }) => t.name === ticketName);

      if (!ticketType) {
        return NextResponse.json({ error: `Ticket type "${ticketName}" not found` }, { status: 400 });
      }

      if (ticketType.availableTickets < quantity) {
        return NextResponse.json({
          error: `Not enough tickets available for ${ticketName}. Only ${ticketType.availableTickets} left.`
        }, { status: 400 });
      }

      const lineTotal = ticketType.price * quantity;
      totalPrice += lineTotal;

      ticketBreakdown.push({
        name: ticketName,
        quantity,
        price: ticketType.price,
        total: lineTotal
      });
    }

    if (useWebhook) {
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
        if (typeof quantity !== 'number' || quantity <= 0) continue;

        const ticketType = event.ticketTypes.find((t: any) => t.name === ticketName);
        if (!ticketType) continue;

        for (let i = 0; i < quantity; i++) {
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
              isUsed: false
            });
          } catch (qrError) {
            console.error('❌ Error generating QR code:', qrError);
            throw new Error(`Failed to generate QR code for ticket: ${qrError.message}`);
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
          paymentMethod: 'stripe',
          bookingReference,
          emailSent: false
        });

        await booking.save();
        console.log('✅ Booking created with ID:', booking._id);
      } catch (bookingError) {
        console.error('❌ Error creating booking:', bookingError);
        throw new Error(`Failed to create booking: ${bookingError.message}`);
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
    } else {
      // Direct booking (original functionality) - for testing or alternative flow
      const purchasedTickets: any[] = [];
      const bookingTickets = [];

      for (const [ticketName, quantity] of Object.entries(ticketSelections)) {
        if (typeof quantity !== 'number' || quantity <= 0) continue;

        const ticketType = event.ticketTypes.find((t: any) => t.name === ticketName);

        if (!ticketType) {
          return NextResponse.json({ error: `Ticket type "${ticketName}" not found` }, { status: 400 });
        }

        if (ticketType.availableTickets < quantity) {
          return NextResponse.json({
            error: `Not enough tickets available for ${ticketName}. Only ${ticketType.availableTickets} left.`
          }, { status: 400 });
        }

        // Update available tickets for this ticket type
        const ticketTypeIndex = event.ticketTypes.findIndex((t: any) => t.name === ticketName);
        event.ticketTypes[ticketTypeIndex].availableTickets -= quantity;

        // Generate tickets for this type
        for (let i = 0; i < quantity; i++) {
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

          const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
          const ticketCode = `TKT-${eventId.slice(-6)}-${ticketName.replace(/\s+/g, '').toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

          // Create booking ticket record
          bookingTickets.push({
            ticketName,
            ticketId,
            qrCode,
            price: ticketType.price,
            isUsed: false
          });

          // Keep legacy ticket for compatibility
          const newTicket = new Ticket({
            eventId: eventId,
            userId,
            ticketType: ticketName,
            price: ticketType.price,
            qrCode: ticketCode,
            isValidated: false,
            purchaseDate: new Date(),
            status: 'active'
          });

          purchasedTickets.push(newTicket);
        }
      }

      // Save the updated event
      await event.save();

      // Create booking record
      const paymentSettings = await PaymentSettings.findOne({});
      const currency = paymentSettings?.currency || 'EUR';

      // Generate booking reference manually
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const bookingReference = `BKNG${timestamp}${random}`;

      const booking = new Booking({
        userId,
        eventId,
        tickets: bookingTickets,
        totalAmount: totalPrice,
        currency: currency.toUpperCase(),
        status: 'confirmed',
        paymentMethod: 'direct',
        bookingReference,
        confirmedAt: new Date(),
        emailSent: false
      });

      await booking.save();

      // Save all legacy tickets
      if (purchasedTickets.length > 0) {
        await Ticket.insertMany(purchasedTickets);
      }

      // Check if event is sold out
      const totalAvailable = event.ticketTypes.reduce((sum: number, ticket: any) => sum + ticket.availableTickets, 0);

      if (totalAvailable === 0) {
        event.status = 'sold-out';
        await event.save();
      }

      return NextResponse.json({
        success: true,
        message: 'Tickets booked successfully!',
        ticketCount: purchasedTickets.length,
        totalPrice,
        bookingReference: booking.bookingReference,
        ticketCodes: purchasedTickets.map(t => t.qrCode),
        purchaseDate: new Date().toISOString()
      });
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