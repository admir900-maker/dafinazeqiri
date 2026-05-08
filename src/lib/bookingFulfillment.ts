import { sendBookingConfirmationEmail } from '@/lib/emailService';

interface FulfillPaidBookingOptions {
  paymentId?: string | null;
  transactionId?: string | null;
  sendEmail?: boolean;
  paymentDetails?: {
    cardMasked?: string;
    cardType?: string;
    cardHolderName?: string;
  };
}

async function ensureBookingPopulated(booking: any) {
  if (!booking?.eventId?.title && typeof booking.populate === 'function') {
    await booking.populate('eventId');
  }
}

export async function sendTicketsForBooking(booking: any) {
  await ensureBookingPopulated(booking);

  if (!booking.customerEmail) {
    return false;
  }

  const sent = await sendBookingConfirmationEmail(booking);
  if (sent) {
    booking.emailSent = true;
    booking.emailLastSentAt = new Date();
    await booking.save();
  }

  return sent;
}

export async function fulfillPaidBooking(booking: any, options: FulfillPaidBookingOptions = {}) {
  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  booking.paymentDate = booking.paymentDate || new Date();
  booking.confirmedAt = booking.confirmedAt || new Date();

  if (options.paymentId) {
    booking.raiffeisenPaymentId = options.paymentId;
  }

  if (options.transactionId) {
    booking.raiffeisenTransactionId = options.transactionId;
  }

  if (options.paymentDetails) {
    booking.paymentDetails = {
      ...(booking.paymentDetails || {}),
      ...options.paymentDetails,
    };
  }

  await booking.save();

  let emailSent = booking.emailSent;
  if (options.sendEmail !== false && !booking.emailSent) {
    try {
      emailSent = await sendTicketsForBooking(booking);
    } catch (error) {
      console.error('❌ Failed to send booking confirmation email:', error);
      emailSent = false;
    }
  }

  return {
    emailSent,
    booking,
  };
}
