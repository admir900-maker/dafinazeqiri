import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import GiftTicket from '@/models/GiftTicket';
import { getSiteConfig, getEmailConfig } from '@/lib/settings';
import { generateTicketPDFs } from '@/lib/ticketPdfGenerator';
import nodemailer from 'nodemailer';
import PaymentSettings from '@/models/PaymentSettings';

function randomId(len = 12) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !(await isUserAdmin())) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientEmail, customerName, ticketType, price, currency = 'EUR', eventTitle, eventDate, eventTime, eventVenue, eventLocation } = body || {};
    if (!recipientEmail || !customerName || !ticketType || typeof price !== 'number' || !eventTitle || !eventDate || !eventTime) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();
    const ticketId = `GFT-${randomId(10)}`;
    const bookingReference = `GIFT-${Date.now()}-${randomId(6)}`;

    // Parse event date
    const parsedEventDate = new Date(eventDate);

    // Generate QR code data in the same format as normal tickets
    const QRCode = require('qrcode');
    const qrData = {
      eventId: 'gift-ticket',
      ticketId,
      userId: 'gift',
      ticketType,
      price,
      eventTitle,
      timestamp: Date.now()
    };
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData));

    // Generate PDF (single ticket wrapped in array for existing generator)
    const siteConfig = await getSiteConfig();
    const pdfBuffers = await generateTicketPDFs([
      {
        ticketId,
        ticketName: ticketType,
        price,
        color: '#cd7f32',
        qrCode: qrCodeDataUrl,
      },
    ],
      {
        title: eventTitle,
        date: parsedEventDate,
        time: eventTime,
        venue: eventVenue || eventLocation || siteConfig.siteName,
        location: eventLocation || eventVenue || siteConfig.siteName,
      },
      {
        bookingReference,
        customerName,
        customerEmail: recipientEmail,
        currency,
      },
      siteConfig.logoUrl
    );

    const pdf = pdfBuffers[0];
    const pdfBase64 = pdf.toString('base64');

    // Create DB record (pending until email sends)
    const giftDoc = await GiftTicket.create({
      recipientEmail,
      customerName,
      ticketType,
      price,
      currency,
      ticketId,
      bookingReference,
      eventTitle,
      eventDate: parsedEventDate,
      eventTime,
      eventVenue: eventVenue || undefined,
      eventLocation: eventLocation || undefined,
      pdfBase64,
      status: 'pending',
      adminUserId: userId,
    });

    // Send email with attachment using database SMTP settings
    const emailConfig = await getEmailConfig();

    // Try to get SMTP settings from new Settings collection
    let smtpHost = emailConfig.smtp.host;
    let smtpPort = emailConfig.smtp.port;
    let smtpSecure = emailConfig.smtp.secure;
    let smtpUser = emailConfig.smtp.username;
    let smtpPass = emailConfig.smtp.password;
    let senderEmail = emailConfig.fromAddress;
    let senderName = emailConfig.fromName;

    // Fallback to legacy PaymentSettings if not configured
    if (!smtpHost || !smtpUser) {
      const legacySettings = await PaymentSettings.findOne({});
      if (legacySettings) {
        smtpHost = legacySettings.smtpHost;
        smtpPort = legacySettings.smtpPort || 587;
        smtpSecure = legacySettings.smtpSecure || false;
        smtpUser = legacySettings.smtpUser;
        smtpPass = legacySettings.smtpPass;
        senderEmail = legacySettings.senderEmail || legacySettings.smtpUser;
        senderName = legacySettings.senderName || siteConfig.siteName;
      }
    }

    if (!smtpHost || !smtpUser) {
      giftDoc.status = 'failed';
      await giftDoc.save();
      return NextResponse.json({ success: false, error: 'Email service not configured' }, { status: 500 });
    }

    // Create transporter with database settings
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const emailHtml = `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif;">
      <h2 style="color:#cd7f32;">You received a gift ticket</h2>
      <p>Dear ${customerName},</p>
      <p>A gift ticket has been generated for you.</p>
      <ul>
        <li><strong>Event:</strong> ${eventTitle}</li>
        <li><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
        <li><strong>Time:</strong> ${eventTime}</li>
        ${eventVenue ? `<li><strong>Venue:</strong> ${eventVenue}</li>` : ''}
        ${eventLocation ? `<li><strong>Location:</strong> ${eventLocation}</li>` : ''}
        <li><strong>Ticket Type:</strong> ${ticketType}</li>
        <li><strong>Price:</strong> ${price.toFixed(2)} ${currency}</li>
        <li><strong>Booking Reference:</strong> ${bookingReference}</li>
      </ul>
      <p>The PDF ticket is attached to this email. Please present the QR code at the event entrance for validation.</p>
      <p style="margin-top:24px;font-size:12px;color:#666;">${siteConfig.siteName} – Gift Ticket Service</p>
    </body></html>`;

    let sent = false;
    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: recipientEmail,
        subject: `Your Gift Ticket (${ticketType})`,
        html: emailHtml,
        attachments: [
          {
            filename: `gift-ticket-${ticketId}.pdf`,
            content: pdf,
            contentType: 'application/pdf'
          }
        ]
      });
      sent = true;
    } catch (emailError) {
      console.error('[GiftTicket][EMAIL] Send failed:', emailError);
      sent = false;
    }

    giftDoc.status = sent ? 'sent' : 'failed';
    giftDoc.sentAt = sent ? new Date() : undefined;
    await giftDoc.save();

    return NextResponse.json({ success: true, ticket: giftDoc, emailSent: sent });
  } catch (error: any) {
    console.error('[GiftTicket][CREATE] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create gift ticket' }, { status: 500 });
  }
}