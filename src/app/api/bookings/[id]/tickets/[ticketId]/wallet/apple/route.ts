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

    // Get the booking and verify ownership
    const booking = await Booking.findOne({ _id: bookingId, userId }).populate('eventId');

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

    // Generate Apple Wallet pass data
    const passJson = WalletPassGenerator.generateApplePass(ticketData);

    // In a production environment, you would need to:
    // 1. Sign the pass with Apple certificates
    // 2. Create a proper PKPass file with manifest and signature
    // 3. Return the binary .pkpass file

    // For now, return the JSON structure with instructions
    return NextResponse.json({
      success: true,
      message: 'Apple Wallet pass data generated',
      passData: passJson,
      instructions: WalletPassGenerator.getSetupInstructions().apple,
      currentStatus: 'Pass JSON structure is ready for signing and packaging'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error generating Apple Wallet pass:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}