import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';

// POST /api/admin/events/[id]/tickets - Add a new ticket type to an event
export async function POST(
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

    const ticketType = await request.json();

    // Validate ticket type data
    if (!ticketType.name || ticketType.price < 0 || ticketType.capacity < 1) {
      return NextResponse.json(
        { error: 'Invalid ticket type data' },
        { status: 400 }
      );
    }

    // Find the event
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Create the new ticket type
    const newTicketType = {
      name: ticketType.name,
      price: ticketType.price,
      capacity: ticketType.capacity,
      availableTickets: ticketType.availableTickets || ticketType.capacity,
      description: ticketType.description || '',
      color: ticketType.color || '#3B82F6'
    };

    // Add the ticket type to the event
    event.ticketTypes.push(newTicketType);
    await event.save();

    // Populate the event with category information
    await event.populate('category', 'name icon color');

    return NextResponse.json({ success: true, event });

  } catch (error) {
    console.error('Error adding ticket type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/events/[id]/tickets - Update a ticket type in an event
export async function PUT(
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

    const { ticketType, ticketId } = await request.json();

    // Validate ticket type data
    if (!ticketType.name || ticketType.price < 0 || ticketType.capacity < 1) {
      return NextResponse.json(
        { error: 'Invalid ticket type data' },
        { status: 400 }
      );
    }

    // Find the event
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Find the ticket type to update
    const ticketIndex = event.ticketTypes.findIndex(
      (ticket: any) => ticket._id.toString() === ticketId
    );

    if (ticketIndex === -1) {
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }

    // Calculate how many tickets were sold
    const oldTicket = event.ticketTypes[ticketIndex];
    const soldTickets = oldTicket.capacity - oldTicket.availableTickets;

    // Update the ticket type
    event.ticketTypes[ticketIndex] = {
      ...event.ticketTypes[ticketIndex],
      name: ticketType.name,
      price: ticketType.price,
      capacity: ticketType.capacity,
      availableTickets: Math.max(0, ticketType.capacity - soldTickets), // Preserve sold tickets
      description: ticketType.description || '',
      color: ticketType.color || '#3B82F6'
    };

    await event.save();

    // Populate the event with category information
    await event.populate('category', 'name icon color');

    return NextResponse.json(event);

  } catch (error) {
    console.error('Error updating ticket type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}