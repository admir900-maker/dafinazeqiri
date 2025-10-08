import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { emailService } from '@/lib/emailService';

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

    // Get the booking with populated event data
    const booking = await Booking.findById(bookingId).populate('eventId');

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

    // Generate and send email
    const emailHtml = emailService.generateBookingConfirmationEmail(
      booking,
      booking.eventId,
      booking.tickets
    );

    const emailSent = await emailService.sendEmail({
      to: userEmail,
      subject: `🎫 Booking Confirmed - ${booking.eventId.title}`,
      html: emailHtml
    });

    if (emailSent) {
      // Update booking to mark email as sent
      booking.emailSent = true;
      await booking.save();

      return NextResponse.json({
        success: true,
        message: 'Confirmation email sent successfully',
        emailAddress: userEmail,
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