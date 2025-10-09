import nodemailer from 'nodemailer';
import { connectToDatabase } from './mongodb';
import PaymentSettings from '@/models/PaymentSettings';
import { logError, logEmailError, logDatabaseError } from './errorLogger';
import { getEmailConfig, getSiteConfig } from './settings';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    encoding?: string;
    cid?: string; // Content-ID for inline images
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

// Function to load SMTP settings from database (updated to use new settings service)
async function loadSMTPSettings(): Promise<SMTPConfig | null> {
  try {
    const emailConfig = await getEmailConfig();
    const siteConfig = await getSiteConfig();

    if (!emailConfig.smtp.host || !emailConfig.smtp.username) {
      // Fallback to legacy PaymentSettings for backward compatibility
      await connectToDatabase();
      const legacySettings = await PaymentSettings.findOne({});

      if (!legacySettings || !legacySettings.smtpHost || !legacySettings.smtpUser) {
        return null;
      }

      return {
        smtpHost: legacySettings.smtpHost,
        smtpPort: legacySettings.smtpPort || 587,
        smtpSecure: legacySettings.smtpSecure || false,
        smtpUser: legacySettings.smtpUser,
        smtpPass: legacySettings.smtpPass,
        senderEmail: legacySettings.senderEmail || legacySettings.smtpUser,
        senderName: legacySettings.senderName || siteConfig.siteName
      };
    }

    return {
      smtpHost: emailConfig.smtp.host,
      smtpPort: emailConfig.smtp.port,
      smtpSecure: emailConfig.smtp.secure,
      smtpUser: emailConfig.smtp.username,
      smtpPass: emailConfig.smtp.password,
      senderEmail: emailConfig.fromAddress,
      senderName: emailConfig.fromName
    };
  } catch (error) {
    logDatabaseError('loadSMTPSettings', 'Settings', error);
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
        tls: {
          rejectUnauthorized: false, // Accept self-signed certificates
          ciphers: 'SSLv3'
        }
      });
    } else {
      // Fallback to environment variables
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    }
  }

  async sendEmail(options: EmailOptions, senderConfig?: { email: string; name: string }): Promise<boolean> {
    try {
      const siteConfig = await getSiteConfig();
      const fromEmail = senderConfig?.email || process.env.SENDER_EMAIL;
      const fromName = senderConfig?.name || siteConfig.siteName;

      console.log('📧 Attempting to send email:', {
        to: options.to,
        subject: options.subject,
        fromEmail,
        fromName
      });

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments,
      };

      // Test connection before sending
      try {
        await this.transporter.verify();
        console.log('✅ SMTP connection verified successfully');
      } catch (verifyError) {
        console.error('❌ SMTP verification failed:', verifyError);
        logEmailError('sendEmail-verify', options.to, verifyError, 'smtp-verify');
        return false;
      }

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      logEmailError('sendEmail', options.to, error, 'smtp-send');
      return false;
    }
  }

  async generateBookingConfirmationEmail(
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
  ): Promise<{ html: string; attachments: any[] }> {
    const siteConfig = await getSiteConfig();

    const ticketRows = tickets.map(ticket => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${ticket.ticketName}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">1</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${ticket.price.toFixed(2)} ${booking.currency}</td>
      </tr>
    `).join('');

    const qrCodes = tickets.map((ticket, index) => {
      console.log('🎫 Processing ticket for email:', {
        ticketName: ticket.ticketName,
        hasQrCode: !!ticket.qrCode,
        qrCodeLength: ticket.qrCode ? ticket.qrCode.length : 0,
        qrCodePreview: ticket.qrCode ? ticket.qrCode.substring(0, 50) + '...' : 'No QR code',
        isDataUrl: ticket.qrCode ? ticket.qrCode.startsWith('data:image/') : false
      });

      // Create a unique CID for this QR code
      const qrCodeCid = `qrcode_${ticket.ticketId || index}`;

      return {
        html: `
        <div style="text-align: center; margin: 20px 0; padding: 20px; border: 2px dashed #7c3aed; border-radius: 12px; background-color: #fafafa;">
          <h3 style="color: #7c3aed; margin-bottom: 15px; font-size: 18px;">${ticket.ticketName || 'Event Ticket'}</h3>
          ${ticket.qrCode && ticket.qrCode.startsWith('data:image/') ?
            `<div style="background-color: white; padding: 15px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
               <img src="cid:${qrCodeCid}" alt="QR Code for ${ticket.ticketName || 'Event Ticket'}" style="width: 180px; height: 180px; display: block; border: none;" />
             </div>` :
            `<div style="width: 180px; height: 180px; margin: 15px auto; display: flex; align-items: center; justify-content: center; background-color: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; color: #6b7280; font-size: 14px;">
               <div style="text-align: center;">
                 <div>⚠️</div>
                 <div>QR Code Missing</div>
                 <div style="font-size: 12px; margin-top: 5px;">Please contact support</div>
               </div>
             </div>`
          }
          <div style="margin-top: 15px; padding: 10px; background-color: #f8fafc; border-radius: 6px;">
            <p style="font-size: 14px; color: #475569; margin: 5px 0; font-weight: 600;">Ticket: ${ticket.ticketName || 'Event Ticket'}</p>
            <p style="font-size: 12px; color: #64748b; margin: 5px 0;">ID: ${ticket.ticketId || 'N/A'}</p>
            <p style="font-size: 11px; color: #94a3b8; margin: 5px 0;">Show this QR code at the entrance</p>
          </div>
        </div>
      `,
        attachment: ticket.qrCode && ticket.qrCode.startsWith('data:image/') ? {
          filename: `qr_${ticket.ticketId || index}.png`,
          content: ticket.qrCode.split(',')[1], // Remove data:image/png;base64, prefix
          encoding: 'base64',
          cid: qrCodeCid
        } : null
      };
    });

    // Generate HTML content from QR codes
    const qrCodesHtml = qrCodes.map(qr => qr.html).join('');

    // Create attachments array
    const qrAttachments = qrCodes
      .map(qr => qr.attachment)
      .filter(attachment => attachment !== null);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - ${siteConfig.siteName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #60a5fa 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🎫 ${siteConfig.siteName}</h1>
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
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                <p style="color: #1e40af; margin: 0; font-size: 14px; font-weight: 500;">
                  <strong>Important:</strong> Show these QR codes at the event entrance for quick entry.
                </p>
                <ul style="color: #1e40af; margin: 8px 0 0 0; padding-left: 20px; font-size: 13px;">
                  <li>Each QR code is unique and can only be used once</li>
                  <li>Screenshots or printed copies work perfectly</li>
                  <li>Keep your tickets secure and don't share QR codes</li>
                </ul>
              </div>
              ${qrCodesHtml}
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
                📧 <a href="mailto:support@${siteConfig.siteUrl || 'example.com'}" style="color: #2563eb; text-decoration: none;">support@${siteConfig.siteUrl || 'example.com'}</a> | 
                🌐 <a href="https://${siteConfig.siteUrl || 'example.com'}" style="color: #2563eb; text-decoration: none;">${siteConfig.siteUrl || 'example.com'}</a>
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background-color: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 14px;">© 2025 ${siteConfig.siteName}. All rights reserved.</p>
            <p style="margin: 8px 0 0 0; font-size: 12px;">You received this email because you booked tickets with ${siteConfig.siteName}.</p>
          </div>

        </div>
      </body>
      </html>
    `;

    return {
      html: emailHtml,
      attachments: qrAttachments
    };
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
export async function sendBookingConfirmationEmail(booking: any): Promise<boolean> {
  try {
    if (!booking.eventId) {
      logError('Booking missing event information', null, { action: 'email-validation' });
      return false;
    }

    // Create email service with database settings
    const emailServiceInstance = await createEmailServiceWithDBSettings();
    const smtpSettings = await loadSMTPSettings();

    // Get customer information from booking (should be populated by webhook)
    const customerEmail = booking.customerEmail;
    const customerName = booking.customerName || 'Customer';

    if (!customerEmail) {
      logError('Booking missing customer email', null, { action: 'email-validation', bookingId: booking._id });
      return false;
    }

    // Debug: Log event data for troubleshooting
    console.log('📧 Email Service - Event Data Debug:', {
      hasEventId: !!booking.eventId,
      eventIdType: typeof booking.eventId,
      eventTitle: booking.eventId?.title,
      eventDate: booking.eventId?.date,
      eventVenue: booking.eventId?.venue,
      eventLocation: booking.eventId?.location,
      eventAddress: booking.eventId?.address
    });

    // Prepare event information
    const eventInfo = {
      title: booking.eventId?.title || 'Event Title Not Available',
      description: booking.eventId?.description || '',
      date: booking.eventId?.date ? new Date(booking.eventId.date) : new Date(),
      location: booking.eventId?.location || 'Location Not Available',
      venue: booking.eventId?.venue || booking.eventId?.location || 'Venue Not Available',
      address: booking.eventId?.address || 'Address Not Available',
      city: booking.eventId?.city || '',
      country: booking.eventId?.country || '',
    };

    // Prepare booking information
    const bookingInfo = {
      bookingReference: booking.bookingReference,
      totalAmount: booking.totalAmount,
      currency: booking.currency.toUpperCase(),
      customerName,
      customerEmail,
    };

    console.log('📧 Email Service Debug - Booking data:', {
      bookingReference: booking.bookingReference,
      ticketsCount: booking.tickets?.length || 0,
      tickets: booking.tickets?.map((ticket: any) => ({
        ticketName: ticket.ticketName,
        ticketId: ticket.ticketId,
        hasQrCode: !!ticket.qrCode,
        qrCodeType: typeof ticket.qrCode,
        qrCodeLength: ticket.qrCode ? ticket.qrCode.length : 0
      })) || []
    });

    // Prepare tickets information
    const ticketsInfo = booking.tickets.map((ticket: any) => ({
      ticketName: ticket.ticketName,
      price: ticket.price,
      qrCode: ticket.qrCode,
      ticketId: ticket.ticketId,
    }));

    // Generate email HTML and attachments
    const emailContent = await emailServiceInstance.generateBookingConfirmationEmail(
      bookingInfo,
      eventInfo,
      ticketsInfo
    );

    // Send the email with database sender config and QR code attachments
    const siteConfig = await getSiteConfig();
    const senderConfig = smtpSettings ? {
      email: smtpSettings.senderEmail,
      name: smtpSettings.senderName || siteConfig.siteName
    } : undefined;

    const success = await emailServiceInstance.sendEmail({
      to: customerEmail,
      subject: `Booking Confirmation - ${eventInfo.title} (#${bookingInfo.bookingReference})`,
      html: emailContent.html,
      attachments: emailContent.attachments,
    }, senderConfig);

    if (!success) {
      logEmailError('sendBookingConfirmation', customerEmail, null, 'confirmation');
    }

    return success;
  } catch (error) {
    logEmailError('sendBookingConfirmationEmail', 'unknown', error, 'confirmation-process');
    return false;
  }
}

// Export the SMTPConfig type and EmailService
export type { SMTPConfig };
export { EmailService };
export default emailService;