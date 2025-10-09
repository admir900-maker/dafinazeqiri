import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import Event from '@/models/Event';
import Category from '@/models/Category';
import Booking from '@/models/Booking';
import { auth } from '@clerk/nextjs/server';
import { validateAndSanitize, validateEvent } from '@/lib/validation';
import { logError } from '@/lib/errorLogger';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Ensure models are registered
    if (!mongoose.models.Category) {
      require('@/models/Category');
    }
    if (!mongoose.models.Event) {
      require('@/models/Event');
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Cap at 100
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Build query
    let query: any = {};
    if (category) {
      query.category = category;
    }

    // Use lean() for better performance and select only needed fields
    const events = await Event.find(query)
      .populate('category', 'name slug icon color')
      .select('title description date time location venue ticketTypes posterImage bannerImage artists maxCapacity tags youtubeTrailer category')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Much faster for read-only operations

    // Get total count for pagination (only if needed)
    const totalEvents = page === 1 ? await Event.countDocuments(query) : 0;

    // Optimize ticket availability calculation with aggregation
    const eventIds = events.map(event => event._id);
    const bookingAggregation = await Booking.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      },
      {
        $unwind: '$tickets'
      },
      {
        $group: {
          _id: {
            eventId: '$eventId',
            ticketName: '$tickets.ticketName'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Create lookup map for booked tickets
    const bookedTicketsMap: { [key: string]: { [ticketName: string]: number } } = {};
    bookingAggregation.forEach(item => {
      const eventId = item._id.eventId.toString();
      const ticketName = item._id.ticketName;
      if (!bookedTicketsMap[eventId]) {
        bookedTicketsMap[eventId] = {};
      }
      bookedTicketsMap[eventId][ticketName] = item.count;
    });

    // Update events with available ticket counts
    const eventsWithAvailableTickets = events.map((event: any) => {
      if (event.ticketTypes && event.ticketTypes.length > 0) {
        const eventId = event._id.toString();
        const bookedTickets = bookedTicketsMap[eventId] || {};

        const updatedTicketTypes = event.ticketTypes.map((ticketType: any) => {
          const bookedCount = bookedTickets[ticketType.name] || 0;
          const availableTickets = Math.max(0, ticketType.capacity - bookedCount);

          return {
            ...ticketType,
            availableTickets: availableTickets
          };
        });

        return {
          ...event,
          ticketTypes: updatedTicketTypes
        };
      }

      return event;
    });

    // Add cache headers for better performance
    const response = NextResponse.json({
      success: true,
      events: eventsWithAvailableTickets,
      pagination: {
        page,
        limit,
        total: totalEvents,
        pages: totalEvents ? Math.ceil(totalEvents / limit) : 0
      }
    });

    // Cache for 5 minutes
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return response;
  } catch (error: any) {
    logError('Error fetching events', error, { action: 'events-api-get' });
    return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
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
