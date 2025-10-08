import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { emailService } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.publicMetadata?.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    console.log('🔍 Looking for booking:', bookingId);
    const booking = await Booking.findById(bookingId).populate('eventId');

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'confirmed') {
      return NextResponse.json({
        message: 'Booking is already confirmed',
        booking: {
          id: booking._id,
          status: booking.status,
          bookingReference: booking.bookingReference
        }
      });
    }

    console.log('📝 Manually confirming booking...');
    booking.status = 'confirmed';
    await booking.save();

    console.log('✅ Booking manually confirmed:', bookingId);

    // Send confirmation email if not already sent
    try {
      if (!booking.emailSent) {
        console.log('📧 Sending confirmation email...');

        // Prepare email data
        const eventInfo = {
          title: booking.eventId.title,
          description: booking.eventId.description,
          date: new Date(booking.eventId.date),
          location: booking.eventId.location,
          venue: booking.eventId.venue,
          address: booking.eventId.address,
          city: booking.eventId.city,
          country: booking.eventId.country,
        };

        const bookingInfo = {
          bookingReference: booking.bookingReference,
          totalAmount: booking.totalAmount,
          currency: booking.currency.toUpperCase(),
          customerName: 'Customer', // You may want to get this from Clerk
          customerEmail: 'customer@example.com', // You may want to get this from Clerk
        };

        const ticketsInfo = booking.tickets.map((ticket: any) => ({
          ticketName: ticket.ticketName,
          price: ticket.price,
          qrCode: ticket.qrCode,
          ticketId: ticket.ticketId,
        }));

        // Generate email HTML
        const emailHtml = emailService.generateBookingConfirmationEmail(
          bookingInfo,
          eventInfo,
          ticketsInfo
        );

        // Send the email
        const emailSent = await emailService.sendEmail({
          to: bookingInfo.customerEmail,
          subject: `Booking Confirmation - ${eventInfo.title} (#${bookingInfo.bookingReference})`,
          html: emailHtml,
        });

        if (emailSent) {
          booking.emailSent = true;
          await booking.save();
          console.log('✅ Confirmation email sent');
        } else {
          console.log('⚠️ Email failed to send but continuing...');
        }
      }
    } catch (emailError) {
      console.error('❌ Error sending confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Booking confirmed successfully',
      booking: {
        id: booking._id,
        status: booking.status,
        bookingReference: booking.bookingReference,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        tickets: booking.tickets.length
      }
    });

  } catch (error) {
    console.error('❌ Error confirming booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}