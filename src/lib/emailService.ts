import nodemailer from 'nodemailer';
import { connectToDatabase } from './mongodb';
import PaymentSettings from '@/models/PaymentSettings';
import { logError, logEmailError, logDatabaseError } from './errorLogger';
import { getEmailConfig, getSiteConfig } from './settings';
import { generateTicketPDFs } from './ticketPdfGenerator';

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
      ageLimit?: number;
    },
    tickets: {
      ticketName: string;
      price: number;
      qrCode: string;
      ticketId?: string;
      color?: string;
    }[]
  ): Promise<{ html: string; attachments: any[] }> {
    const siteConfig = await getSiteConfig();

    // Generate PDF tickets
    let pdfAttachments: any[] = [];
    try {
      console.log('📄 Generating PDF tickets...', { count: tickets.length });
      const pdfTickets = await generateTicketPDFs(
        tickets.map(t => ({
          ticketId: t.ticketId || 'N/A',
          ticketName: t.ticketName,
          price: t.price,
          qrCode: t.qrCode,
          color: t.color || '#3B82F6'
        })),
        {
          title: event.title,
          date: event.date,
          location: event.location,
          venue: event.venue,
          city: event.city,
          country: event.country,
          ageLimit: event.ageLimit
        },
        {
          bookingReference: booking.bookingReference,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          currency: booking.currency
        },
        siteConfig.logoUrl
      );

      pdfAttachments = pdfTickets.map((pdf, index) => {
        const ticket = tickets[index];
        if (!ticket || !ticket.ticketId) {
          console.warn(`⚠️ Missing ticket or ticketId at index ${index}`);
          return null;
        }
        return {
          filename: `ticket-${ticket.ticketName.replace(/\s+/g, '-')}-${ticket.ticketId.substring(0, 8)}.pdf`,
          content: pdf,
          contentType: 'application/pdf'
        };
      }).filter((attachment): attachment is { filename: string; content: Buffer; contentType: string } => attachment !== null);

      console.log('✅ PDF tickets generated successfully:', pdfAttachments.length);
    } catch (error) {
      console.error('❌ Error generating PDF tickets:', error);
      logError('PDF Generation Failed', error, { action: 'generate-ticket-pdfs' });
    }

    const ticketRows = tickets.map(ticket => `
      <tr style="background-color: rgba(255, 255, 255, 0.5);">
        <td style="padding: 14px; border-bottom: 2px solid rgba(236, 72, 153, 0.15); color: #2d1b4e; font-weight: 600;">${ticket.ticketName}</td>
        <td style="padding: 14px; border-bottom: 2px solid rgba(236, 72, 153, 0.15); text-align: center; color: #2d1b4e; font-weight: 600;">1</td>
        <td style="padding: 14px; border-bottom: 2px solid rgba(236, 72, 153, 0.15); text-align: right; color: #ec4899; font-weight: 700;">${ticket.price.toFixed(2)} ${booking.currency}</td>
      </tr>
    `).join('');

    // Create attachments array (only PDF tickets)
    const allAttachments = [...pdfAttachments];

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - ${siteConfig.siteName}</title>
      </head>
      <body style="font-family: 'Playfair Display', Georgia, serif; line-height: 1.6; color: #1a0a1e; margin: 0; padding: 0; background: linear-gradient(135deg, #1a0b2e 0%, #2d1b4e 25%, #4a2358 50%, #7b2c6f 75%, #c94b8b 100%);">
        <div style="max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(236, 72, 153, 0.4), 0 0 40px rgba(168, 85, 247, 0.3);">
          
          <!-- Header with Dafina Zeqiri Style -->
          <div style="background: linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #b4530a 100%); color: white; padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.2) 0%, transparent 60%); pointer-events: none;"></div>
            <h1 style="margin: 0; font-size: 32px; font-weight: 900; font-family: 'Playfair Display', Georgia, serif; position: relative; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);">✨ ${siteConfig.siteName}</h1>
            <p style="margin: 12px 0 0 0; font-size: 18px; font-weight: 300; position: relative; letter-spacing: 1px;">Your tickets are confirmed!</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            
            <!-- Success Message -->
            <div style="background: linear-gradient(135deg, #ec4899, #a855f7); color: white; padding: 25px; border-radius: 16px; text-align: center; margin-bottom: 30px; box-shadow: 0 8px 20px rgba(236, 72, 153, 0.3);">
              <h2 style="margin: 0 0 10px 0; font-size: 24px; font-family: 'Playfair Display', Georgia, serif; font-weight: 700;">✅ Booking Confirmed!</h2>
              <p style="margin: 0; font-size: 16px; font-weight: 500; letter-spacing: 0.5px;">Booking Reference: <strong style="font-size: 18px;">${booking.bookingReference}</strong></p>
            </div>

            <!-- Event Details -->
            <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.08), rgba(168, 85, 247, 0.08)); padding: 25px; border-radius: 16px; margin-bottom: 30px; border: 2px solid rgba(236, 72, 153, 0.2);">
              <h3 style="margin: 0 0 20px 0; color: #7b2c6f; font-size: 22px; font-family: 'Playfair Display', Georgia, serif; font-weight: 700;">🎭 Event Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; color: #a855f7; width: 100px; font-size: 15px;">Event:</td>
                  <td style="padding: 10px 0; color: #2d1b4e; font-size: 15px; font-weight: 600;">${event.title}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; color: #a855f7; font-size: 15px;">Date:</td>
                  <td style="padding: 10px 0; color: #2d1b4e; font-size: 15px;">${new Date(event.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; color: #a855f7; font-size: 15px;">Venue:</td>
                  <td style="padding: 10px 0; color: #2d1b4e; font-size: 15px;">${event.venue || event.location}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: 700; color: #a855f7; font-size: 15px;">Address:</td>
                  <td style="padding: 10px 0; color: #2d1b4e; font-size: 15px;">${event.address || event.location}${event.city ? `, ${event.city}` : ''}${event.country ? `, ${event.country}` : ''}</td>
                </tr>
              </table>
            </div>

            <!-- Ticket Summary -->
            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 20px 0; color: #7b2c6f; font-size: 22px; font-family: 'Playfair Display', Georgia, serif; font-weight: 700;">🎟️ Ticket Summary</h3>
              <table style="width: 100%; border-collapse: collapse; border: 2px solid rgba(236, 72, 153, 0.3); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.1);">
                <thead>
                  <tr style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15));">
                    <th style="padding: 15px; text-align: left; font-weight: 700; color: #7b2c6f; border-bottom: 2px solid rgba(236, 72, 153, 0.3); font-size: 15px;">Ticket Type</th>
                    <th style="padding: 15px; text-align: center; font-weight: 700; color: #7b2c6f; border-bottom: 2px solid rgba(236, 72, 153, 0.3); font-size: 15px;">Quantity</th>
                    <th style="padding: 15px; text-align: right; font-weight: 700; color: #7b2c6f; border-bottom: 2px solid rgba(236, 72, 153, 0.3); font-size: 15px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${ticketRows}
                  <tr style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2));">
                    <td style="padding: 15px; font-weight: 700; color: #2d1b4e; font-size: 16px;">Total</td>
                    <td style="padding: 15px; text-align: center; font-weight: 700; color: #2d1b4e; font-size: 16px;">${tickets.length}</td>
                    <td style="padding: 15px; text-align: right; font-weight: 700; color: #ec4899; font-size: 20px;">${booking.totalAmount.toFixed(2)} ${booking.currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- PDF Tickets Notice -->
            ${pdfAttachments.length > 0 ? `
            <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1)); border-left: 5px solid #ec4899; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(236, 72, 153, 0.15);">
              <p style="color: #7b2c6f; margin: 0; font-size: 16px; font-weight: 700; font-family: 'Playfair Display', Georgia, serif;">
                📎 Your tickets are attached as PDF files
              </p>
              <p style="color: #2d1b4e; margin: 10px 0 0 0; font-size: 14px; font-weight: 500;">
                ${tickets.length} ticket PDF${tickets.length > 1 ? 's' : ''} ${tickets.length > 1 ? 'are' : 'is'} attached to this email. You can download, print, or save them to your device.
              </p>
            </div>
            ` : ''}

            <!-- Ticket List -->
            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 20px 0; color: #7b2c6f; font-size: 22px; font-family: 'Playfair Display', Georgia, serif; font-weight: 700;">🎟️ Your Tickets</h3>
              <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(236, 72, 153, 0.08)); border-left: 5px solid #a855f7; padding: 20px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(168, 85, 247, 0.15);">
                <p style="color: #7b2c6f; margin: 0; font-size: 16px; font-weight: 600;">
                  <strong style="font-family: 'Playfair Display', Georgia, serif;">Important:</strong> Your tickets are attached as PDF files to this email.
                </p>
                <ul style="color: #2d1b4e; margin: 12px 0 0 0; padding-left: 24px; font-size: 14px; line-height: 1.8;">
                  <li>Download the PDF tickets from the attachments</li>
                  <li>Each ticket contains a unique QR code for entry</li>
                  <li>You can print the tickets or show them on your mobile device</li>
                  <li>Keep your tickets secure and don't share QR codes</li>
                  <li>Each QR code can only be used once</li>
                </ul>
              </div>
              ${tickets.map((ticket, index) => `
                <div style="text-align: center; margin: 15px 0; padding: 20px; border: 2px solid rgba(236, 72, 153, 0.3); border-radius: 16px; background: linear-gradient(135deg, rgba(236, 72, 153, 0.05), rgba(168, 85, 247, 0.05)); box-shadow: 0 4px 12px rgba(236, 72, 153, 0.1);">
                  <p style="font-size: 18px; color: #7b2c6f; margin: 5px 0; font-weight: 700; font-family: 'Playfair Display', Georgia, serif;">${ticket.ticketName || 'Event Ticket'}</p>
                  <p style="font-size: 14px; color: #a855f7; margin: 8px 0; font-weight: 600;">Ticket ID: ${ticket.ticketId || 'N/A'}</p>
                  <p style="font-size: 15px; color: #ec4899; margin: 8px 0; font-weight: 700;">Price: ${ticket.price.toFixed(2)} ${booking.currency}</p>
                </div>
              `).join('')}
            </div>

            <!-- Important Info -->
            <div style="background: linear-gradient(135deg, rgba(205, 127, 50, 0.15), rgba(236, 72, 153, 0.1)); border: 2px solid rgba(205, 127, 50, 0.6); padding: 24px; border-radius: 16px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(205, 127, 50, 0.2);">
              <h4 style="margin: 0 0 16px 0; color: #7b2c6f; font-size: 20px; font-family: 'Playfair Display', Georgia, serif; font-weight: 700;">⚠️ Important Information</h4>
              <ul style="margin: 0; padding-left: 24px; color: #2d1b4e; font-size: 14px; line-height: 1.8;">
                <li>Arrive at least 30 minutes before the event starts</li>
                <li>Bring a valid ID for verification</li>
                <li>Keep your tickets secure and don't share QR codes</li>
                <li>Screenshots of QR codes are accepted</li>
                <li>Each ticket allows one entry only</li>
                ${event.ageLimit ? `<li><strong>Minimum age requirement: ${event.ageLimit} years old</strong></li>` : ''}
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

          <!-- Footer with Dafina Zeqiri Glamorous Style -->
          <div style="background: linear-gradient(135deg, #2d1b4e, #7b2c6f); color: rgba(255, 255, 255, 0.9); padding: 30px; text-align: center; border-top: 3px solid rgba(236, 72, 153, 0.5);">
            <p style="margin: 0; font-size: 16px; font-weight: 600; font-family: 'Playfair Display', Georgia, serif;">✨ © 2025 ${siteConfig.siteName}. All rights reserved.</p>
            <p style="margin: 12px 0 0 0; font-size: 14px; opacity: 0.9;">You received this email because you booked tickets with ${siteConfig.siteName}.</p>
          </div>

        </div>
      </body>
      </html>
    `;

    return {
      html: emailHtml,
      attachments: allAttachments
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
      ageLimit: booking.eventId?.ageLimit,
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

    // Prepare tickets information - look up colors from event ticket types if not in booking
    const ticketsInfo = booking.tickets.map((ticket: any) => {
      let ticketColor = ticket.color;

      // If color not in booking ticket, try to get it from event's ticket types
      if (!ticketColor && booking.eventId?.ticketTypes) {
        const eventTicketType = booking.eventId.ticketTypes.find(
          (tt: any) => tt.name === ticket.ticketName
        );
        ticketColor = eventTicketType?.color;
      }

      return {
        ticketName: ticket.ticketName,
        price: ticket.price,
        qrCode: ticket.qrCode,
        ticketId: ticket.ticketId,
        color: ticketColor || '#3B82F6'
      };
    });

    console.log('🎨 Tickets colors for PDF:', ticketsInfo.map((t: any) => ({
      name: t.ticketName,
      color: t.color
    })));

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