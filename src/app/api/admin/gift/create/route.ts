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
    const { recipientEmail, customerName, ticketType, price, currency = 'EUR', quantity = 1, eventTitle, eventDate, eventTime, eventVenue, eventLocation } = body || {};
    if (!recipientEmail || !customerName || !ticketType || typeof price !== 'number' || !eventTitle || !eventDate || !eventTime) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const ticketQuantity = Math.min(Math.max(1, parseInt(String(quantity)) || 1), 100); // Limit to 1-100 tickets

    await connectToDatabase();
    const siteConfig = await getSiteConfig();
    const parsedEventDate = new Date(eventDate);
    const QRCode = require('qrcode');

    // Arrays to store all generated tickets and results
    const createdTickets: any[] = [];
    const ticketPDFData: any[] = [];

    // Generate multiple tickets
    for (let i = 0; i < ticketQuantity; i++) {
      const ticketId = `GFT-${randomId(10)}`;
      const bookingReference = `GIFT-${Date.now()}-${randomId(6)}`;

      // Generate QR code data
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

      ticketPDFData.push({
        ticketId,
        ticketName: ticketType,
        price,
        color: '#cd7f32',
        qrCode: qrCodeDataUrl,
        bookingReference,
      });

      createdTickets.push({
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
        status: 'pending',
        adminUserId: userId,
      });
    }

    // Generate all PDFs at once
    const pdfBuffers = await generateTicketPDFs(
      ticketPDFData.map(t => ({
        ticketId: t.ticketId,
        ticketName: t.ticketName,
        price: t.price,
        color: t.color,
        qrCode: t.qrCode,
      })),
      {
        title: eventTitle,
        date: parsedEventDate,
        time: eventTime,
        venue: eventVenue || eventLocation || siteConfig.siteName,
        location: eventLocation || eventVenue || siteConfig.siteName,
      },
      {
        bookingReference: createdTickets[0].bookingReference,
        customerName,
        customerEmail: recipientEmail,
        currency,
      },
      siteConfig.logoUrl
    );

    // Store PDFs as base64 in tickets
    for (let i = 0; i < createdTickets.length; i++) {
      createdTickets[i].pdfBase64 = pdfBuffers[i].toString('base64');
    }

    // Save all tickets to database
    const savedTickets = await GiftTicket.insertMany(createdTickets);

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
      await GiftTicket.updateMany(
        { _id: { $in: savedTickets.map(t => t._id) } },
        { status: 'failed' }
      );
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
      <h2 style="color:#cd7f32;">You received ${ticketQuantity > 1 ? ticketQuantity + ' gift tickets' : 'a gift ticket'}</h2>
      <p>Dear ${customerName},</p>
      <p>${ticketQuantity > 1 ? `${ticketQuantity} gift tickets have` : 'A gift ticket has'} been generated for you.</p>
      <ul>
        <li><strong>Event:</strong> ${eventTitle}</li>
        <li><strong>Date:</strong> ${new Date(eventDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
        <li><strong>Time:</strong> ${eventTime}</li>
        ${eventVenue ? `<li><strong>Venue:</strong> ${eventVenue}</li>` : ''}
        ${eventLocation ? `<li><strong>Location:</strong> ${eventLocation}</li>` : ''}
        <li><strong>Ticket Type:</strong> ${ticketType}</li>
        <li><strong>Price per ticket:</strong> ${price.toFixed(2)} ${currency}</li>
        <li><strong>Quantity:</strong> ${ticketQuantity}</li>
        <li><strong>Total Value:</strong> ${(price * ticketQuantity).toFixed(2)} ${currency}</li>
      </ul>
      <p>${ticketQuantity > 1 ? 'All PDF tickets are' : 'The PDF ticket is'} attached to this email. Please present the QR code${ticketQuantity > 1 ? 's' : ''} at the event entrance for validation.</p>
      <p style="margin-top:24px;font-size:12px;color:#666;">${siteConfig.siteName} – Gift Ticket Service</p>
    </body></html>`;

    // Prepare all PDF attachments
    const attachments = pdfBuffers.map((pdf, index) => ({
      filename: `gift-ticket-${savedTickets[index].ticketId}.pdf`,
      content: pdf,
      contentType: 'application/pdf'
    }));

    let sent = false;
    try {
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: recipientEmail,
        subject: `Your Gift Ticket${ticketQuantity > 1 ? 's' : ''} (${ticketType})`,
        html: emailHtml,
        attachments
      });
      sent = true;
    } catch (emailError) {
      console.error('[GiftTicket][EMAIL] Send failed:', emailError);
      sent = false;
    }

    // Update all tickets with email status
    await GiftTicket.updateMany(
      { _id: { $in: savedTickets.map(t => t._id) } },
      {
        status: sent ? 'sent' : 'failed',
        sentAt: sent ? new Date() : undefined
      }
    );

    return NextResponse.json({
      success: true,
      ticketsCreated: savedTickets.length,
      tickets: savedTickets,
      emailSent: sent
    });
  } catch (error: any) {
    console.error('[GiftTicket][CREATE] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create gift ticket' }, { status: 500 });
  }
}