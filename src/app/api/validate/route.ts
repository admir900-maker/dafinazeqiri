import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import GiftTicket from '@/models/GiftTicket';
import Settings from '@/models/Settings';
import ValidationLog from '@/models/ValidationLog';
import { logApiError } from '@/lib/errorLogger';

// Helper function to log validation activities
async function logValidation(validationSettings: any, data: {
  success: boolean;
  ticketId: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  validatorId: string;
  validatorName: string;
  qrData: string;
  message: string;
  timestamp: Date;
  validationType?: string;
  request?: NextRequest;
}) {
  if (!validationSettings.logValidations) return;

  try {
    // Console log for debugging
    console.log('Validation Log:', {
      timestamp: data.timestamp.toISOString(),
      success: data.success,
      ticketId: data.ticketId,
      eventId: data.eventId,
      validatedBy: data.validatorId,
      message: data.message,
      type: data.validationType || 'qr_scan'
    });

    // Create database log entry
    const deviceInfo = data.request ? {
      userAgent: data.request.headers.get('user-agent') || '',
      ip: data.request.headers.get('x-forwarded-for')?.split(',')[0] ||
        data.request.headers.get('x-real-ip') || 'unknown'
    } : undefined;

    const validationLog = new ValidationLog({
      validatorId: data.validatorId,
      validatorName: data.validatorName,
      bookingId: data.ticketId,
      eventId: data.eventId,
      eventTitle: data.eventTitle,
      userId: data.userId,
      userName: data.userName,
      validationType: data.validationType || 'entry',
      status: data.success ? 'validated' : 'rejected',
      notes: data.message,
      deviceInfo,
      metadata: {
        scanMethod: 'qr',
        ticketQuantity: 1,
        ticketType: 'Standard' // This could be enhanced to get actual ticket type
      }
    });

    await validationLog.save();

  } catch (error) {
    console.error('Failed to log validation:', error);
  }
}

// Helper function to get validation settings
async function getValidationSettings() {
  try {
    const settings = await Settings.findOne({});
    return settings?.validation || {
      qrCodeEnabled: true,
      scannerEnabled: true,
      multipleScansAllowed: false,
      scanTimeWindow: 5,
      requireValidatorRole: true,
      logValidations: true,
      offlineValidation: false,
      validationTimeout: 30,
      customValidationRules: [],
      antiReplayEnabled: true,
      maxValidationsPerTicket: 1,
      validationSoundEnabled: true,
      vibrationEnabled: true,
      geoLocationRequired: false,
      allowedLocations: []
    };
  } catch (error) {
    console.error('Error fetching validation settings:', error);
    // Return default settings if error
    return {
      qrCodeEnabled: true,
      scannerEnabled: true,
      multipleScansAllowed: false,
      scanTimeWindow: 5,
      requireValidatorRole: true,
      logValidations: true,
      offlineValidation: false,
      validationTimeout: 30,
      customValidationRules: [],
      antiReplayEnabled: true,
      maxValidationsPerTicket: 1,
      validationSoundEnabled: true,
      vibrationEnabled: true,
      geoLocationRequired: false,
      allowedLocations: []
    };
  }
}

// Helper function to check if validation is allowed based on admin settings
async function isValidationAllowed(eventDate: Date, validationSettings: any): Promise<{ allowed: boolean; error?: string }> {
  try {
    // Check if QR validation is enabled
    if (!validationSettings.qrCodeEnabled) {
      return {
        allowed: false,
        error: 'QR code validation is currently disabled.'
      };
    }

    // Check if scanner is enabled
    if (!validationSettings.scannerEnabled) {
      return {
        allowed: false,
        error: 'Ticket scanner is currently disabled.'
      };
    }

    // Use scan time window for validation timing
    const scanTimeWindow = validationSettings.scanTimeWindow || 5; // minutes default
    const today = new Date();
    const eventDateObj = new Date(eventDate);

    // Allow scanning within the scan time window (in days for now)
    const timeDifference = Math.abs(eventDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (timeDifference <= scanTimeWindow) {
      return { allowed: true };
    }

    return {
      allowed: false,
      error: `Ticket validation is not allowed at this time. Validation window: ${scanTimeWindow} day(s) around event date.`
    };
  } catch (error) {
    console.error('Error checking validation settings:', error);
    return {
      allowed: true // Fallback to allow validation if error occurs
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

    await connectToDatabase();

    // Get validation settings
    const validationSettings = await getValidationSettings();

    // Check if user is validator or admin (if required by settings)
    const userRole = user.publicMetadata?.role as string;
    if (validationSettings.requireValidatorRole && (!userRole || !['validator', 'admin'].includes(userRole))) {
      return NextResponse.json({ error: 'Insufficient permissions. Validator or admin role required.' }, { status: 403 });
    }

    const { qrCodeData, validationDate } = await req.json();

    if (!qrCodeData) {
      return NextResponse.json({ error: 'QR code data is required' }, { status: 400 });
    }

    await connectToDatabase();

    let parsedData;
    try {
      parsedData = JSON.parse(qrCodeData);
    } catch {
      return NextResponse.json({ error: 'Invalid QR code format' }, { status: 400 });
    }

    const { eventId, ticketId, userId: ticketUserId, bookingId } = parsedData;

    // Check if this is a gift ticket (ticketId starts with GFT-)
    if (ticketId && ticketId.startsWith('GFT-')) {
      const giftTicket = await GiftTicket.findOne({ ticketId });

      if (!giftTicket) {
        return NextResponse.json({ error: 'Gift ticket not found' }, { status: 404 });
      }

      // Check if gift ticket email was sent successfully
      if (giftTicket.status !== 'sent') {
        return NextResponse.json({
          error: 'Gift ticket not ready',
          message: 'This gift ticket has not been successfully sent yet.'
        }, { status: 400 });
      }

      // Check if validation date matches the gift ticket event date (if validation date was provided)
      if (validationDate && giftTicket.eventDate) {
        const selectedDate = new Date(validationDate);
        const ticketEventDate = new Date(giftTicket.eventDate);

        // Compare dates (YYYY-MM-DD format) - use UTC to avoid timezone issues
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        const ticketDateStr = ticketEventDate.toISOString().split('T')[0];

        if (selectedDateStr !== ticketDateStr) {
          // Log failed validation due to date mismatch
          await logValidation(validationSettings, {
            success: false,
            ticketId: giftTicket.ticketId,
            eventId: 'gift-ticket',
            eventTitle: giftTicket.eventTitle || giftTicket.ticketType,
            userId: giftTicket.recipientEmail,
            userName: giftTicket.recipientEmail,
            validatorId: userId,
            validatorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Validator-${userId}`,
            qrData: qrCodeData,
            message: `Wrong event date. This ticket is for ${ticketDateStr} but you are validating for ${selectedDateStr}`,
            timestamp: new Date(),
            validationType: 'entry',
            request: req
          });

          return NextResponse.json({
            success: false,
            error: 'Wrong event date',
            message: `This ticket is for an event on ${ticketEventDate.toLocaleDateString()} but you are validating tickets for ${selectedDate.toLocaleDateString()}. The ticket cannot be validated.`,
            event: {
              title: giftTicket.eventTitle || giftTicket.ticketType,
              date: giftTicket.eventDate,
              location: giftTicket.eventLocation || 'N/A',
            },
            ticket: {
              ticketId: giftTicket.ticketId,
              ticketName: giftTicket.ticketType,
              price: giftTicket.price
            }
          }, { status: 400 });
        }
      }

      // Check if ticket is already validated
      if (giftTicket.isValidated) {
        await logValidation(validationSettings, {
          success: false,
          ticketId: giftTicket.ticketId,
          eventId: 'gift-ticket',
          eventTitle: giftTicket.ticketType,
          userId: giftTicket.recipientEmail,
          userName: giftTicket.recipientEmail,
          validatorId: userId,
          validatorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Validator-${userId}`,
          qrData: qrCodeData,
          message: 'Gift ticket already validated',
          timestamp: new Date(),
          validationType: 'entry',
          request: req
        });

        return NextResponse.json({
          success: false,
          error: 'Ticket already validated',
          message: `This gift ticket has already been validated on ${new Date(giftTicket.validatedAt).toLocaleString()}.`,
          ticket: {
            ticketId: giftTicket.ticketId,
            ticketName: giftTicket.ticketType,
            price: giftTicket.price,
            usedAt: giftTicket.validatedAt,
            validatedBy: giftTicket.validatedBy,
          },
          event: {
            title: giftTicket.ticketType,
            date: new Date(),
            location: 'Gift Ticket Event',
          },
          customer: {
            email: giftTicket.recipientEmail
          }
        }, { status: 400 });
      }

      // Mark gift ticket as validated
      giftTicket.isValidated = true;
      giftTicket.validatedAt = new Date();
      giftTicket.validatedBy = userId;
      await giftTicket.save();

      // Log successful validation
      await logValidation(validationSettings, {
        success: true,
        ticketId: giftTicket.ticketId,
        eventId: 'gift-ticket',
        eventTitle: giftTicket.ticketType,
        userId: giftTicket.recipientEmail,
        userName: giftTicket.recipientEmail,
        validatorId: userId,
        validatorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Validator-${userId}`,
        qrData: qrCodeData,
        message: 'Gift ticket validated successfully',
        timestamp: new Date(),
        validationType: 'entry',
        request: req
      });

      return NextResponse.json({
        success: true,
        message: 'Gift ticket validated successfully',
        ticket: {
          ticketId: giftTicket.ticketId,
          ticketName: giftTicket.ticketType,
          price: giftTicket.price,
          usedAt: giftTicket.validatedAt,
          validatedBy: userId
        },
        event: {
          title: giftTicket.ticketType,
          date: new Date(),
          location: 'Gift Ticket Event'
        },
        customer: {
          email: giftTicket.recipientEmail
        }
      });
    }

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

    // Ensure eventId is always populated
    if (!booking.eventId || typeof booking.eventId === 'string') {
      await booking.populate('eventId');
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
    const ticketIndex = booking.tickets.findIndex((t: any) => t.ticketId === ticketId);

    if (ticketIndex === -1) {
      return NextResponse.json({ error: 'Ticket not found in booking' }, { status: 404 });
    }

    const ticket = booking.tickets[ticketIndex];

    // Check if ticket is already used
    if (ticket.isUsed) {
      // Ensure eventId is populated
      if (!booking.eventId || typeof booking.eventId === 'string') {
        await booking.populate('eventId');
      }

      // Log failed validation attempt
      await logValidation(validationSettings, {
        success: false,
        ticketId: ticket.ticketId,
        eventId: booking.eventId._id?.toString() || booking.eventId.toString(),
        eventTitle: booking.eventId.title || 'Unknown Event',
        userId: booking.userId,
        userName: `User-${booking.userId}`,
        validatorId: userId,
        validatorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Validator-${userId}`,
        qrData: qrCodeData,
        message: 'Ticket already validated',
        timestamp: new Date(),
        validationType: 'entry',
        request: req
      });

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
          title: booking.eventId.title || 'Unknown Event',
          date: booking.eventId.date || new Date(),
          location: booking.eventId.location || 'N/A',
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

    // Check if validation date matches the event date (if validation date was provided)
    if (validationDate) {
      const selectedDate = new Date(validationDate);
      const eventDate = new Date(booking.eventId.date);

      // Compare dates (YYYY-MM-DD format) - use UTC to avoid timezone issues
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      const eventDateStr = eventDate.toISOString().split('T')[0];

      console.log('Date comparison:', {
        selectedDateStr,
        eventDateStr,
        match: selectedDateStr === eventDateStr,
        selectedDate: selectedDate.toString(),
        eventDate: eventDate.toString()
      });

      if (selectedDateStr !== eventDateStr) {
        // Log failed validation due to date mismatch
        await logValidation(validationSettings, {
          success: false,
          ticketId: ticket.ticketId,
          eventId: booking.eventId._id.toString(),
          eventTitle: booking.eventId.title,
          userId: booking.userId,
          userName: `User-${booking.userId}`,
          validatorId: userId,
          validatorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Validator-${userId}`,
          qrData: qrCodeData,
          message: `Wrong event date. This ticket is for ${eventDateStr} but you are validating for ${selectedDateStr}`,
          timestamp: new Date(),
          validationType: 'entry',
          request: req
        });

        return NextResponse.json({
          success: false,
          error: 'Wrong event date',
          message: `This ticket is for an event on ${eventDate.toLocaleDateString()} but you are validating tickets for ${selectedDate.toLocaleDateString()}. The ticket cannot be validated.`,
          event: {
            title: booking.eventId.title || 'Unknown Event',
            date: booking.eventId.date,
            location: booking.eventId.location || 'N/A',
          },
          ticket: {
            ticketId: ticket.ticketId,
            ticketName: ticket.ticketName,
            price: ticket.price
          }
        }, { status: 400 });
      }
    }    // Check if validation is allowed based on admin settings
    const validationCheck = await isValidationAllowed(booking.eventId.date, validationSettings);
    if (!validationCheck.allowed) {
      // Log failed validation due to settings
      await logValidation(validationSettings, {
        success: false,
        ticketId: ticket.ticketId,
        eventId: booking.eventId._id.toString(),
        eventTitle: booking.eventId.title,
        userId: booking.userId,
        userName: `User-${booking.userId}`,
        validatorId: userId,
        validatorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Validator-${userId}`,
        qrData: qrCodeData,
        message: validationCheck.error || 'Validation not allowed',
        timestamp: new Date(),
        validationType: 'entry',
        request: req
      });

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

    // Log successful validation
    await logValidation(validationSettings, {
      success: true,
      ticketId: ticket.ticketId,
      eventId: booking.eventId._id.toString(),
      eventTitle: booking.eventId.title,
      userId: booking.userId,
      userName: `User-${booking.userId}`, // In a real app, you'd fetch the actual user name
      validatorId: userId,
      validatorName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || `Validator-${userId}`,
      qrData: qrCodeData,
      message: 'Ticket validated successfully',
      timestamp: new Date(),
      validationType: 'entry',
      request: req
    });

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
    console.error('❌ Error validating ticket:', error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while validating the ticket. Please try again.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}