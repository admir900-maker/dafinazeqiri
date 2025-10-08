import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectToDatabase();

    // Get user's bookings with event details
    const bookings = await Booking.find({ userId })
      .populate('eventId')
      .sort({ createdAt: -1 });

    const formattedBookings = bookings.map(booking => ({
      _id: booking._id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      paymentMethod: booking.paymentMethod,
      createdAt: booking.createdAt,
      confirmedAt: booking.confirmedAt,
      emailSent: booking.emailSent,
      notes: booking.notes,
      tickets: booking.tickets.map((ticket: any) => ({
        ticketId: ticket.ticketId,
        ticketName: ticket.ticketName,
        qrCode: ticket.qrCode,
        price: ticket.price,
        isUsed: ticket.isUsed,
        usedAt: ticket.usedAt,
        validatedBy: ticket.validatedBy
      })),
      event: booking.eventId ? {
        _id: booking.eventId._id,
        title: booking.eventId.title,
        date: booking.eventId.date,
        endDate: booking.eventId.endDate,
        location: booking.eventId.location,
        venue: booking.eventId.venue,
        address: booking.eventId.address,
        city: booking.eventId.city,
        country: booking.eventId.country,
        posterImage: booking.eventId.posterImage,
        category: booking.eventId.category,
        status: booking.eventId.status
      } : null
    }));

    return NextResponse.json({
      success: true,
      bookings: formattedBookings,
      totalBookings: formattedBookings.length
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}