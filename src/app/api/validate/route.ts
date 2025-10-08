import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';
import PaymentSettings from '@/models/PaymentSettings';

// Helper function to check if validation is allowed based on admin settings
async function isValidationAllowed(eventDate: Date): Promise<{ allowed: boolean; error?: string }> {
  try {
    const settings = await PaymentSettings.findOne({});

    // If no settings found, use default (1 day window)
    const validationWindowDays = settings?.validationWindowDays ?? 1;
    const validationStartDays = settings?.validationStartDays ?? 0;
    const allowValidationAnytime = settings?.allowValidationAnytime ?? false;

    // If admin allows validation anytime, always return allowed
    if (allowValidationAnytime) {
      return { allowed: true };
    }

    const today = new Date();
    const eventDateObj = new Date(eventDate);

    // Calculate days difference (positive if event is in future, negative if in past)
    const daysDifference = (eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    // Check if we're within the allowed validation window
    const withinStartWindow = daysDifference >= -validationStartDays;
    const withinEndWindow = Math.abs(daysDifference) <= validationWindowDays;

    if (withinStartWindow && withinEndWindow) {
      return { allowed: true };
    }

    // Create helpful error message based on the configuration
    let errorMessage = `Ticket validation is not allowed at this time. `;
    if (validationStartDays > 0) {
      errorMessage += `Validation opens ${validationStartDays} day(s) before the event. `;
    }
    errorMessage += `Validation window: ${validationWindowDays} day(s) around the event date.`;

    return {
      allowed: false,
      error: errorMessage
    };
  } catch (error) {
    console.error('Error checking validation settings:', error);
    // Fallback to default 1-day window if settings can't be loaded
    const daysDifference = Math.abs((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return {
      allowed: daysDifference <= 1,
      error: 'Ticket can only be validated on event day (default fallback)'
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is validator or admin
    const userRole = user.publicMetadata?.role as string;
    if (!userRole || !['validator', 'admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions. Validator or admin role required.' }, { status: 403 });
    }

    const { qrCodeData } = await req.json();

    if (!qrCodeData) {
      return NextResponse.json({ error: 'QR code data is required' }, { status: 400 });
    }

    await connectToDatabase();

    let parsedData;
    try {
      parsedData = JSON.parse(qrCodeData);
    } catch (error) {
      // If JSON parsing fails, try to find ticket by direct QR code match
      console.log('🔍 Trying direct QR code lookup for:', qrCodeData);

      const booking = await Booking.findOne({
        'tickets.qrCode': qrCodeData
      }).populate('eventId');

      if (!booking) {
        return NextResponse.json({ error: 'Invalid QR code format or ticket not found' }, { status: 400 });
      }

      const ticket = booking.tickets.find(t => t.qrCode === qrCodeData);
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found in booking' }, { status: 400 });
      }

      // Check if ticket is already used
      if (ticket.isUsed) {
        return NextResponse.json({
          success: false,
          error: 'Ticket already validated',
          message: `This ticket has already been validated on ${new Date(ticket.usedAt).toLocaleString()}. Please contact the responsible person if you believe this is an error.`,
          ticket: {
            ticketId: ticket.ticketId,
            ticketName: ticket.ticketName,
            price: ticket.price,
            usedAt: ticket.usedAt,
            validatedBy: ticket.validatedBy,
          },
          event: {
            title: booking.eventId.title,
            date: booking.eventId.date,
            location: booking.eventId.location,
          },
          booking: {
            bookingReference: booking.bookingReference,
            totalAmount: booking.totalAmount,
            currency: booking.currency,
          }
        }, { status: 400 });
      }

      // Check if validation is allowed based on admin settings
      const validationCheck = await isValidationAllowed(booking.eventId.date);
      if (!validationCheck.allowed) {
        return NextResponse.json({
          error: validationCheck.error,
          eventDate: booking.eventId.date
        }, { status: 400 });
      }

      // Mark ticket as used
      const ticketIndex = booking.tickets.findIndex(t => t.qrCode === qrCodeData);
      booking.tickets[ticketIndex].isUsed = true;
      booking.tickets[ticketIndex].usedAt = new Date();
      booking.tickets[ticketIndex].validatedBy = userId;

      await booking.save();

      // Direct QR code validation result - SUCCESS
      return NextResponse.json({
        success: true,
        message: 'Ticket validated successfully',
        ticket: {
          ticketId: ticket.ticketId,
          ticketName: ticket.ticketName,
          price: ticket.price,
          usedAt: booking.tickets[ticketIndex].usedAt,
          validatedBy: userId,
        },
        event: {
          title: booking.eventId.title,
          date: booking.eventId.date,
          location: booking.eventId.location,
        },
        booking: {
          bookingReference: booking.bookingReference,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
        }
      });
    }

    const { eventId, ticketId, userId: ticketUserId, bookingId } = parsedData;

    if (!eventId || !ticketId || !ticketUserId) {
      return NextResponse.json({ error: 'Incomplete QR code data - missing eventId, ticketId, or userId' }, { status: 400 });
    }

    // Find the booking - try by bookingId first, then by eventId + userId + ticketId
    let booking;
    if (bookingId) {
      booking = await Booking.findById(bookingId).populate('eventId');
    } else {
      // Fallback: find booking by eventId, userId, and check if it contains the ticketId
      booking = await Booking.findOne({
        eventId: eventId,
        userId: ticketUserId,
        'tickets.ticketId': ticketId
      }).populate('eventId');
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify booking belongs to the user in QR code
    if (booking.userId !== ticketUserId) {
      return NextResponse.json({ error: 'Invalid ticket ownership' }, { status: 400 });
    }

    // Verify booking is confirmed
    if (booking.status !== 'confirmed') {
      return NextResponse.json({
        error: 'Ticket is not confirmed',
        status: booking.status
      }, { status: 400 });
    }

    // Find the specific ticket
    const ticketIndex = booking.tickets.findIndex(t => t.ticketId === ticketId);

    if (ticketIndex === -1) {
      return NextResponse.json({ error: 'Ticket not found in booking' }, { status: 404 });
    }

    const ticket = booking.tickets[ticketIndex];

    // Check if ticket is already used
    if (ticket.isUsed) {
      return NextResponse.json({
        success: false,
        error: 'Ticket already validated',
        message: `This ticket has already been validated on ${new Date(ticket.usedAt).toLocaleString()}. Please contact the responsible person if you believe this is an error.`,
        ticket: {
          ticketId: ticket.ticketId,
          ticketName: ticket.ticketName,
          price: ticket.price,
          usedAt: ticket.usedAt,
          validatedBy: ticket.validatedBy,
        },
        event: {
          title: booking.eventId.title,
          date: booking.eventId.date,
          location: booking.eventId.location,
        },
        customer: {
          userId: booking.userId
        }
      }, { status: 400 });
    }

    // Check if event exists and matches
    if (!booking.eventId || booking.eventId._id.toString() !== eventId) {
      return NextResponse.json({ error: 'Event mismatch' }, { status: 400 });
    }

    // Check if validation is allowed based on admin settings
    const validationCheck = await isValidationAllowed(booking.eventId.date);
    if (!validationCheck.allowed) {
      return NextResponse.json({
        error: validationCheck.error,
        eventDate: booking.eventId.date
      }, { status: 400 });
    }

    // Mark ticket as used
    booking.tickets[ticketIndex].isUsed = true;
    booking.tickets[ticketIndex].usedAt = new Date();
    booking.tickets[ticketIndex].validatedBy = userId;

    await booking.save();

    return NextResponse.json({
      success: true,
      message: 'Ticket validated successfully',
      ticket: {
        ticketId: ticket.ticketId,
        ticketName: ticket.ticketName,
        price: ticket.price,
        usedAt: booking.tickets[ticketIndex].usedAt,
        validatedBy: userId
      },
      event: {
        title: booking.eventId.title,
        date: booking.eventId.date,
        venue: booking.eventId.venue,
        location: booking.eventId.location
      },
      customer: {
        userId: booking.userId
      }
    });

  } catch (error) {
    console.error('Error validating ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}