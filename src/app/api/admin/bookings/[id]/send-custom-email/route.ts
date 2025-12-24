import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { sendBookingConfirmationEmail } from '@/lib/emailService';

// POST /api/admin/bookings/[id]/send-custom-email - Send custom email with booking tickets
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();
    const { customMessage } = body;

    if (!customMessage || typeof customMessage !== 'string') {
      return NextResponse.json({ error: 'Custom message is required' }, { status: 400 });
    }

    const booking = await Booking.findById(id).populate('eventId');
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'confirmed' || booking.paymentStatus !== 'paid') {
      return NextResponse.json({
        error: 'Booking must be confirmed and paid'
      }, { status: 400 });
    }

    if (!booking.customerEmail) {
      return NextResponse.json({ error: 'Booking has no customer email' }, { status: 400 });
    }

    // Send email with custom message
    const sent = await sendBookingConfirmationEmail(booking, customMessage);

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Custom email sent successfully' });
  } catch (error: any) {
    console.error('Error sending custom email:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
