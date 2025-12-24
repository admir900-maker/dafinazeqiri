import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import GiftTicket from '@/models/GiftTicket';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const tickets = await GiftTicket.find({}).lean();

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ error: 'No tickets found' }, { status: 404 });
    }

    // Convert to CSV
    const headers = [
      'ID',
      'Recipient Email',
      'Customer Name',
      'Ticket Type',
      'Price',
      'Currency',
      'Status',
      'Validated',
      'Event Title',
      'Event Date',
      'Event Time',
      'Event Venue',
      'Created At',
      'Sent At'
    ];

    const rows = tickets.map(ticket => [
      ticket._id?.toString() || '',
      ticket.recipientEmail || '',
      ticket.customerName || '',
      ticket.ticketType || '',
      ticket.price?.toString() || '0',
      ticket.currency || '',
      ticket.status || '',
      ticket.isValidated ? 'Yes' : 'No',
      ticket.eventTitle || '',
      ticket.eventDate ? new Date(ticket.eventDate).toLocaleDateString() : '',
      ticket.eventTime || '',
      ticket.eventVenue || '',
      ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '',
      ticket.sentAt ? new Date(ticket.sentAt).toLocaleString() : ''
    ]);

    // Escape CSV values
    const escapeCsvValue = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csv = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map(row => row.map(cell => escapeCsvValue(String(cell))).join(','))
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gift-tickets-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
