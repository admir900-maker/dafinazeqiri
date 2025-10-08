import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Ticket from '@/models/Ticket';

export async function POST(request: NextRequest, { params }: { params: Promise<{ qrCode: string }> }) {
  try {
    await connectToDatabase();
    const { qrCode } = await params;

    const ticket = await Ticket.findOne({ qrCode }).populate('eventId');
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.isValidated) {
      return NextResponse.json({ error: 'Ticket already validated' }, { status: 400 });
    }

    ticket.isValidated = true;
    ticket.validatedAt = new Date();
    await ticket.save();

    return NextResponse.json({ message: 'Ticket validated successfully', ticket });
  } catch {
    return NextResponse.json({ error: 'Failed to validate ticket' }, { status: 500 });
  }
}
