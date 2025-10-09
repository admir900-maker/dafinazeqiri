import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';

// PUT /api/admin/events/[id]/tickets/[ticketId] - Update a specific ticket type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id, ticketId } = await params;

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

    return NextResponse.json({ success: true, event });

  } catch (error) {
    console.error('Error updating ticket type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/events/[id]/tickets/[ticketId] - Delete a ticket type from an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id, ticketId } = await params;

    // Find the event
    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Find the ticket type to delete
    const ticketIndex = event.ticketTypes.findIndex(
      (ticket: any) => ticket._id.toString() === ticketId
    );

    if (ticketIndex === -1) {
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }

    // Check if any tickets have been sold for this type
    const ticket = event.ticketTypes[ticketIndex];
    const soldTickets = ticket.capacity - ticket.availableTickets;

    if (soldTickets > 0) {
      return NextResponse.json(
        { error: `Cannot delete ticket type. ${soldTickets} tickets have already been sold.` },
        { status: 400 }
      );
    }

    // Remove the ticket type
    event.ticketTypes.splice(ticketIndex, 1);
    await event.save();

    // Populate the event with category information
    await event.populate('category', 'name icon color');

    return NextResponse.json({ success: true, event });

  } catch (error) {
    console.error('Error deleting ticket type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}