import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { WalletPassGenerator } from '@/lib/walletPassGenerator';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id: bookingId, ticketId } = resolvedParams;

    await connectToDatabase();

    // Find the booking - check if it's a MongoDB ObjectId or booking reference
    let booking;
    if (bookingId.length === 24 && /^[0-9a-fA-F]{24}$/.test(bookingId)) {
      // It's a MongoDB ObjectId
      booking = await Booking.findOne({ _id: bookingId, userId }).populate('eventId');
    } else {
      // It's a booking reference
      booking = await Booking.findOne({ bookingReference: bookingId, userId }).populate('eventId');
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Find the specific ticket
    const ticket = booking.tickets.find((t: any) => t.ticketId === ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Prepare ticket data for pass generation
    const ticketData = {
      ticketId: ticket.ticketId,
      ticketName: ticket.ticketName,
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      customerName: booking.customerName,
      event: {
        _id: booking.eventId._id,
        title: booking.eventId.title,
        date: booking.eventId.date,
        time: booking.eventId.time,
        venue: booking.eventId.venue,
        location: booking.eventId.location,
        posterImage: booking.eventId.posterImage,
        bannerImage: booking.eventId.bannerImage,
      },
      userId: userId
    };

    // Generate Google Pay pass object
    const googlePayObject = WalletPassGenerator.generateGooglePayObject(ticketData);

    // In a production environment, you would need to:
    // 1. Sign the JWT with your Google Service Account private key
    // 2. Create the proper Google Pay Save to Wallet link
    // 3. Handle the Google Wallet API integration

    // For now, return the object structure with instructions
    return NextResponse.json({
      success: true,
      message: 'Google Pay pass data generated',
      passData: googlePayObject,
      instructions: WalletPassGenerator.getSetupInstructions().google,
      currentStatus: 'Pass object structure is ready for JWT signing and API integration',
      saveUrl: `https://pay.google.com/gp/v/save/${encodeURIComponent(JSON.stringify(googlePayObject))}`
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error generating Google Pay pass:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}