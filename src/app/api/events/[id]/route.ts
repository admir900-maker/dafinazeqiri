import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Category from '@/models/Category';
import Booking from '@/models/Booking';
import { auth } from '@clerk/nextjs/server';
import { validateAndSanitize, validateEvent } from '@/lib/validation';
import { logError } from '@/lib/errorLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 API: Fetching event...');
    await connectToDatabase();
    console.log('✅ API: Database connected');
    
    const { id } = await params;
    console.log('🔍 API: Looking for event ID:', id);
    
    const event = await Event.findById(id).populate('category', 'name slug icon color');
    console.log('📦 API: Event found:', event ? 'YES' : 'NO');

    if (!event) {
      console.log('❌ API: Event not found in database');
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    console.log('✅ API: Returning event data');

    // Calculate actual available tickets based on bookings
    if (event.ticketTypes && event.ticketTypes.length > 0) {
      // Get all confirmed bookings for this event
      const confirmedBookings = await Booking.find({
        eventId: id,
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
      event.ticketTypes = event.ticketTypes.map((ticketType: any) => {
        const bookedCount = bookedTicketCounts[ticketType.name] || 0;
        const availableTickets = Math.max(0, ticketType.capacity - bookedCount);

        console.log(`📊 Ticket availability for ${ticketType.name}:`, {
          capacity: ticketType.capacity,
          booked: bookedCount,
          available: availableTickets
        });

        return {
          ...ticketType._doc || ticketType,
          availableTickets: availableTickets
        };
      });
    }

    return NextResponse.json(event);
  } catch (error: any) {
    console.error('❌ API ERROR:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    logError('Error fetching event by ID', error, { action: 'events-api-get-by-id' });
    return NextResponse.json({ 
      error: 'Failed to fetch event',
      details: error.message 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const event = await Event.findByIdAndUpdate(id, sanitizedData, { new: true });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error: any) {
    logError('Error updating event', error, { action: 'events-api-put', eventId: await params.then(p => p.id) });
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    logError('Error deleting event', error, { action: 'events-api-delete' });
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}