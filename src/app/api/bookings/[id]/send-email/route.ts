import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { sendBookingConfirmationEmail } from '@/lib/emailService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookingId = resolvedParams.id;

    await connectToDatabase();

    // Find the booking - check if it's a MongoDB ObjectId or booking reference
    let booking;
    if (bookingId.length === 24 && /^[0-9a-fA-F]{24}$/.test(bookingId)) {
      // It's a MongoDB ObjectId
      booking = await Booking.findById(bookingId).populate('eventId');
    } else {
      // It's a booking reference
      booking = await Booking.findOne({ bookingReference: bookingId }).populate('eventId');
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify ownership (users can only send emails for their own bookings, or admin can send for any)
    const userRole = user.publicMetadata?.role as string;
    if (booking.userId !== userId && userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      return NextResponse.json({
        error: 'Cannot send email for unconfirmed booking',
        status: booking.status
      }, { status: 400 });
    }

    // Get user email
    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }

    // Send booking confirmation email
    const emailSent = await sendBookingConfirmationEmail(booking);

    if (emailSent) {
      // Update booking to mark email as sent
      booking.emailSent = true;
      await booking.save();

      return NextResponse.json({
        success: true,
        message: 'Confirmation email sent successfully',
        emailAddress: booking.customerEmail,
        bookingReference: booking.bookingReference
      });
    } else {
      return NextResponse.json({
        error: 'Failed to send email'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}