import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectToDatabase();

    // Find the booking - check if it's a MongoDB ObjectId or booking reference
    let booking;
    if (id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      // It's a MongoDB ObjectId
      booking = await Booking.findById(id);
    } else {
      // It's a booking reference
      booking = await Booking.findOne({ bookingReference: id });
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if the booking belongs to the user
    if (booking.userId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the event details
    const event = await Event.findById(booking.eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      booking: {
        _id: booking._id,
        bookingReference: booking.bookingReference,
        eventId: booking.eventId,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
        tickets: booking.tickets,
        createdAt: booking.createdAt,
        paymentDate: booking.paymentDate
      },
      event: {
        _id: event._id,
        title: event.title,           // Changed from 'name' to 'title'
        name: event.title,            // Keep 'name' for backward compatibility
        description: event.description,
        date: event.date,
        location: event.location,
        venue: event.venue,           // Add venue field
        address: event.address,       // Add address field
        city: event.city,             // Add city field
        country: event.country,       // Add country field
        image: event.posterImage      // Use posterImage for 'image'
      }
    });

  } catch (error) {
    console.error('❌ Get booking error:', error);
    return NextResponse.json({
      error: 'Failed to fetch booking details'
    }, { status: 500 });
  }
}