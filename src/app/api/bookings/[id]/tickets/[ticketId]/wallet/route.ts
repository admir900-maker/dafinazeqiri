import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';

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
    const ticket = booking.tickets.find(t => t.ticketId === ticketId);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Create a simple pass data for wallets
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.biletara.eventticket',
      serialNumber: ticket.ticketId,
      teamIdentifier: 'BILETARA',
      organizationName: 'BiletAra',
      description: `${booking.eventId.title} - ${ticket.ticketName}`,
      logoText: 'BiletAra',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(30, 58, 138)',
      eventTicket: {
        primaryFields: [
          {
            key: 'event',
            label: 'EVENT',
            value: booking.eventId.title
          }
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'DATE',
            value: new Date(booking.eventId.date).toLocaleDateString()
          },
          {
            key: 'time',
            label: 'TIME',
            value: new Date(booking.eventId.date).toLocaleTimeString()
          }
        ],
        auxiliaryFields: [
          {
            key: 'venue',
            label: 'VENUE',
            value: booking.eventId.venue
          },
          {
            key: 'seat',
            label: 'TICKET TYPE',
            value: ticket.ticketName
          }
        ],
        backFields: [
          {
            key: 'terms',
            label: 'Terms and Conditions',
            value: 'This ticket is valid for one admission only. Present QR code at entrance.'
          },
          {
            key: 'contact',
            label: 'Contact',
            value: 'For support, visit biletara.com or email support@biletara.com'
          }
        ]
      },
      barcodes: [
        {
          message: JSON.stringify({
            eventId: booking.eventId._id,
            ticketId: ticket.ticketId,
            userId: userId,
            bookingId: booking._id,
            timestamp: Date.now()
          }),
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1'
        }
      ],
      locations: [
        {
          latitude: 41.6086,
          longitude: 21.7453, // Macedonia coordinates as default
          relevantText: `${booking.eventId.title} at ${booking.eventId.venue}`
        }
      ],
      relevantDate: booking.eventId.date
    };

    return NextResponse.json({
      success: true,
      passData,
      downloadUrls: {
        apple: `/api/bookings/${bookingId}/tickets/${ticketId}/wallet/apple`,
        google: `/api/bookings/${bookingId}/tickets/${ticketId}/wallet/google`
      }
    });

  } catch (error) {
    console.error('Error generating wallet pass:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}