import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { sendBookingConfirmationEmail } from '@/lib/emailService';

// POST /api/admin/bookings/[id]/resend - Resend booking confirmation email with tickets
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Optional: ensure only authenticated users can trigger resend
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const booking = await Booking.findById(id).populate('eventId');
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'confirmed' || booking.paymentStatus !== 'paid') {
      return NextResponse.json({
        error: 'Booking must be confirmed and paid before resending tickets'
      }, { status: 400 });
    }

    if (!booking.customerEmail) {
      return NextResponse.json({ error: 'Booking has no customer email' }, { status: 400 });
    }

    const sent = await sendBookingConfirmationEmail(booking);

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    // Mark as sent if not already
    if (!booking.emailSent) {
      booking.emailSent = true;
      await booking.save();
    }

    return NextResponse.json({ success: true, message: 'Tickets resent successfully' });
  } catch (error: any) {
    console.error('Error resending tickets:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
