import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Booking from '@/models/Booking';
import { auth } from '@clerk/nextjs/server';
import { validateAndSanitize, validateEvent } from '@/lib/validation';
import { logError } from '@/lib/errorLogger';

export async function GET() {
  try {
    await connectToDatabase();
    const events = await Event.find({}).sort({ date: 1 });

    // Calculate available tickets for each event
    const eventsWithAvailableTickets = await Promise.all(
      events.map(async (event) => {
        if (event.ticketTypes && event.ticketTypes.length > 0) {
          // Get all confirmed bookings for this event
          const confirmedBookings = await Booking.find({
            eventId: event._id,
            status: 'confirmed',
            paymentStatus: 'paid'
          });

          // Count tickets by type from confirmed bookings
          const bookedTicketCounts: { [key: string]: number } = {};
          confirmedBookings.forEach(booking => {
            booking.tickets.forEach((ticket: any) => {
              const ticketName = ticket.ticketName;
              bookedTicketCounts[ticketName] = (bookedTicketCounts[ticketName] || 0) + 1;
            });
          });

          // Update available tickets for each ticket type
          const updatedTicketTypes = event.ticketTypes.map((ticketType: any) => {
            const bookedCount = bookedTicketCounts[ticketType.name] || 0;
            const availableTickets = Math.max(0, ticketType.capacity - bookedCount);

            return {
              ...ticketType._doc || ticketType,
              availableTickets: availableTickets
            };
          });

          return {
            ...event._doc,
            ticketTypes: updatedTicketTypes
          };
        }

        return event;
      })
    );

    return NextResponse.json(eventsWithAvailableTickets);
  } catch (error: any) {
    logError('Error fetching events', error, { action: 'events-api-get' });
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await request.json();

    // Validate and sanitize the event data
    const { data: sanitizedData, validation } = validateAndSanitize(body, validateEvent);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors.map(err => `${err.field}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    const event = new Event(sanitizedData);
    await event.save();

    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    logError('Error creating event', error, { action: 'events-api-post' });
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
