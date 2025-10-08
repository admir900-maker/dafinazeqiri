import nodemailer from 'nodemailer';
import { connectToDatabase } from './mongodb';
import PaymentSettings from '@/models/PaymentSettings';
import { logError, logEmailError, logDatabaseError } from './errorLogger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding: string;
  }>;
}

interface SMTPConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure?: boolean;
  smtpUser: string;
  smtpPass: string;
  senderEmail: string;
  senderName?: string;
}

// Function to load SMTP settings from database
async function loadSMTPSettings(): Promise<SMTPConfig | null> {
  try {
    await connectToDatabase();
    const settings = await PaymentSettings.findOne({});

    if (!settings || !settings.smtpHost || !settings.smtpUser) {
      return null;
    }

    return {
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort || 587,
      smtpSecure: settings.smtpSecure || false,
      smtpUser: settings.smtpUser,
      smtpPass: settings.smtpPass,
      senderEmail: settings.senderEmail || settings.smtpUser,
      senderName: settings.senderName || 'BiletAra'
    };
  } catch (error) {
    logDatabaseError('loadSMTPSettings', 'PaymentSettings', error);
    return null;
  }
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(smtpConfig?: SMTPConfig) {
    if (smtpConfig) {
      this.transporter = nodemailer.createTransport({
        host: smtpConfig.smtpHost,
        port: smtpConfig.smtpPort,
        secure: smtpConfig.smtpSecure || false,
        auth: {
          user: smtpConfig.smtpUser,
          pass: smtpConfig.smtpPass,
        },
      });
    } else {
      // Fallback to environment variables
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  async sendEmail(options: EmailOptions, senderConfig?: { email: string; name: string }): Promise<boolean> {
    try {
      const fromEmail = senderConfig?.email || process.env.SENDER_EMAIL;
      const fromName = senderConfig?.name || 'BiletAra';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      logEmailError('sendEmail', options.to, error, 'smtp-send');
      return false;
    }
  }

  generateBookingConfirmationEmail(
    booking: {
      bookingReference: string;
      totalAmount: number;
      currency: string;
      customerName: string;
      customerEmail: string
    },
    event: {
      title: string;
      description?: string;
      date: Date;
      location: string;
      venue?: string;
      address?: string;
      city?: string;
      country?: string;
    },
    tickets: {
      ticketName: string;
      price: number;
      qrCode: string;
      ticketId?: string;
    }[]
  ): string {
    const ticketRows = tickets.map(ticket => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${ticket.ticketName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${ticket.price.toFixed(2)} ${booking.currency}</td>
      </tr>
    `).join('');

    const qrCodes = tickets.map(ticket => `
      <div style="text-align: center; margin: 20px 0; padding: 20px; border: 2px dashed #7c3aed; border-radius: 12px;">
        <h3 style="color: #7c3aed; margin-bottom: 10px;">${ticket.ticketName}</h3>
        <img src="${ticket.qrCode}" alt="QR Code" style="width: 200px; height: 200px; margin: 10px auto; display: block;">
        <p style="font-size: 12px; color: #64748b; margin-top: 10px;">Ticket: ${ticket.ticketName}</p>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - BiletAra</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #60a5fa 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🎫 BiletAra</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Your tickets are confirmed!</p>
          </div>

          <!-- Content -->
          <div style="padding: 30px;">
            
            <!-- Success Message -->
            <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
              <h2 style="margin: 0 0 8px 0; font-size: 20px;">✅ Booking Confirmed!</h2>
              <p style="margin: 0; opacity: 0.9;">Booking Reference: <strong>${booking.bookingReference}</strong></p>
            </div>

            <!-- Event Details -->
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">📅 Event Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #64748b; width: 100px;">Event:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${event.title}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Date:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Venue:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${event.venue || event.location}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Address:</td>
                  <td style="padding: 8px 0; color: #1e293b;">${event.address || event.location}${event.city ? `, ${event.city}` : ''}${event.country ? `, ${event.country}` : ''}</td>
                </tr>
              </table>
            </div>

            <!-- Ticket Summary -->
            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">🎟️ Ticket Summary</h3>
              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">Ticket Type</th>
                    <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">Quantity</th>
                    <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-bottom: 1px solid #e2e8f0;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${ticketRows}
                  <tr style="background-color: #f8fafc;">
                    <td style="padding: 12px; font-weight: 600; color: #1e293b;">Total</td>
                    <td style="padding: 12px; text-align: center; font-weight: 600; color: #1e293b;">${tickets.length}</td>
                    <td style="padding: 12px; text-align: right; font-weight: 600; color: #1e293b; font-size: 18px;">${booking.totalAmount.toFixed(2)} ${booking.currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- QR Codes -->
            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 16px 0; color: #1e293b; font-size: 18px;">📱 Your Digital Tickets</h3>
              <p style="color: #64748b; margin-bottom: 20px;">Show these QR codes at the event entrance. Each QR code is unique and can only be used once.</p>
              ${qrCodes}
            </div>

            <!-- Important Info -->
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h4 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">⚠️ Important Information</h4>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li>Arrive at least 30 minutes before the event starts</li>
                <li>Bring a valid ID for verification</li>
                <li>Keep your tickets secure and don't share QR codes</li>
                <li>Screenshots of QR codes are accepted</li>
                <li>Each ticket allows one entry only</li>
              </ul>
            </div>

            <!-- Support -->
            <div style="text-align: center; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
              <p style="margin: 0 0 12px 0; color: #64748b;">Need help? Contact our support team</p>
              <p style="margin: 0; color: #64748b;">
                📧 <a href="mailto:support@biletara.com" style="color: #2563eb; text-decoration: none;">support@biletara.com</a> | 
                🌐 <a href="https://biletara.com" style="color: #2563eb; text-decoration: none;">biletara.com</a>
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 14px;">© 2025 BiletAra. All rights reserved.</p>
            <p style="margin: 8px 0 0 0; font-size: 12px;">You received this email because you booked tickets with BiletAra.</p>
          </div>

        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();

// Helper function to create EmailService with database SMTP settings
async function createEmailServiceWithDBSettings(): Promise<EmailService> {
  const smtpSettings = await loadSMTPSettings();

  if (smtpSettings) {
    return new EmailService(smtpSettings);
  } else {
    return new EmailService();
  }
}

// Helper function to send booking confirmation emails
export async function sendEmailConfirmation(booking: any): Promise<boolean> {
  try {
    if (!booking.eventId) {
      logError('Booking missing event information', null, { action: 'email-validation' });
      return false;
    }

    // Create email service with database settings
    const emailServiceInstance = await createEmailServiceWithDBSettings();
    const smtpSettings = await loadSMTPSettings();

    // Get user information from Clerk (if needed) or use booking data
    const customerEmail = booking.userEmail || 'customer@example.com'; // You may need to get this from Clerk
    const customerName = booking.userName || 'Customer'; // You may need to get this from Clerk

    // Prepare event information
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

    // Prepare booking information
    const bookingInfo = {
      bookingReference: booking.bookingReference,
      totalAmount: booking.totalAmount,
      currency: booking.currency.toUpperCase(),
      customerName,
      customerEmail,
    };

    // Prepare tickets information
    const ticketsInfo = booking.tickets.map((ticket: any) => ({
      ticketName: ticket.ticketName,
      price: ticket.price,
      qrCode: ticket.qrCode,
      ticketId: ticket.ticketId,
    }));

    // Generate email HTML
    const emailHtml = emailServiceInstance.generateBookingConfirmationEmail(
      bookingInfo,
      eventInfo,
      ticketsInfo
    );

    // Send the email with database sender config
    const senderConfig = smtpSettings ? {
      email: smtpSettings.senderEmail,
      name: smtpSettings.senderName || 'BiletAra'
    } : undefined;

    const success = await emailServiceInstance.sendEmail({
      to: customerEmail,
      subject: `Booking Confirmation - ${eventInfo.title} (#${bookingInfo.bookingReference})`,
      html: emailHtml,
    }, senderConfig);

    if (!success) {
      logEmailError('sendBookingConfirmation', customerEmail, null, 'confirmation');
    }

    return success;
  } catch (error) {
    logEmailError('sendEmailConfirmation', 'unknown', error, 'confirmation-process');
    return false;
  }
}

// Export the SMTPConfig type and EmailService
export type { SMTPConfig };
export { EmailService };
export default emailService;