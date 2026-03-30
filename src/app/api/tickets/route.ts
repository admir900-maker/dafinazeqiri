import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { auth, currentUser } from '@clerk/nextjs/server';
import { generateTicketCode } from '@/lib/qrcode';

export async function GET() {
  console.log('🎫 GET /api/tickets called');
  try {
    const { userId } = await auth();
    console.log('👤 User ID from auth:', userId);

    if (!userId) {
      console.log('❌ No user ID, returning unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    console.log('👤 Current user:', user?.firstName, user?.lastName);
    console.log('🔑 User metadata:', user?.publicMetadata);

    const isAdmin = user?.publicMetadata?.role === 'admin';
    console.log('👑 Is admin:', isAdmin);

    console.log('🔗 Connecting to database...');
    await connectToDatabase();
    console.log('✅ Database connected');

    let tickets;
    if (isAdmin) {
      console.log('👑 Admin: fetching all tickets');
      tickets = await Ticket.find({}).populate('eventId').sort({ createdAt: -1 });
    } else {
      console.log('👤 Regular user: fetching user tickets for', userId);
      tickets = await Ticket.find({ userId }).populate('eventId').sort({ createdAt: -1 });
    }

    console.log('🎫 Found tickets:', tickets.length);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to fetch tickets', details: errorMessage }, { status: 500 });
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

    // SECURITY: Whitelist allowed fields to prevent mass assignment
    const { eventId, ticketName } = body;
    if (!eventId || !ticketName) {
      return NextResponse.json({ error: 'eventId and ticketName are required' }, { status: 400 });
    }

    const qrCode = generateTicketCode();
    const ticket = new Ticket({ eventId, ticketName, userId, qrCode });
    await ticket.save();
    return NextResponse.json(ticket, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
