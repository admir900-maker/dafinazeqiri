import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const eventId = searchParams.get('eventId');
    const search = searchParams.get('search');

    // Build filter
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (eventId) {
      filter.eventId = eventId;
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: filter },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $addFields: {
          customerFullName: { $concat: ['$customerName'] },
          eventTitle: '$event.title',
          ticketCount: { $size: '$tickets' }
        }
      }
    ];

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { bookingReference: { $regex: search, $options: 'i' } },
            { customerEmail: { $regex: search, $options: 'i' } },
            { customerName: { $regex: search, $options: 'i' } },
            { 'event.title': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Add sorting
    pipeline.push({ $sort: { createdAt: -1 } });

    // Get total count
    const totalCountPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await Booking.aggregate(totalCountPipeline);
    const total = totalResult[0]?.total || 0;

    // Add pagination
    pipeline.push(
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Execute aggregation
    const bookings = await Booking.aggregate(pipeline);

    // Get user details from Clerk for each booking
    const clerk = await clerkClient();
    const bookingsWithUserDetails = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const user = await clerk.users.getUser(booking.userId);
          return {
            ...booking,
            userDetails: {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.emailAddresses[0]?.emailAddress,
              imageUrl: user.imageUrl
            }
          };
        } catch (error) {
          return {
            ...booking,
            userDetails: null
          };
        }
      })
    );

    return NextResponse.json({
      bookings: bookingsWithUserDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      userId,
      eventId,
      tickets,
      customerEmail,
      customerName,
      paymentMethod = 'direct',
      notes
    } = body;

    // Validate required fields
    if (!userId || !eventId || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, eventId, tickets' },
        { status: 400 }
      );
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Calculate total amount
    const totalAmount = tickets.reduce((sum: number, ticket: any) => sum + (ticket.price || 0), 0);

    // Generate unique QR codes for tickets
    const ticketsWithQR = tickets.map((ticket: any, index: number) => ({
      ...ticket,
      ticketId: `${Date.now()}-${index}`,
      qrCode: `QR-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 8)}`,
      isUsed: false
    }));

    // Create booking
    const booking = new Booking({
      userId,
      eventId,
      tickets: ticketsWithQR,
      totalAmount,
      currency: 'USD',
      status: 'confirmed', // Admin created bookings are automatically confirmed
      paymentStatus: paymentMethod === 'direct' ? 'paid' : 'pending',
      paymentMethod,
      bookingReference: `BK-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase(),
      customerEmail,
      customerName,
      paymentDate: paymentMethod === 'direct' ? new Date() : undefined,
      confirmedAt: new Date(),
      emailSent: false,
      notes
    });

    await booking.save();

    // Populate event details
    await booking.populate('eventId');

    return NextResponse.json(booking, { status: 201 });

  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}