import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

interface TicketData {
  ticketId: string;
  ticketName: string;
  price?: number;
  ticketPrice?: number;
  ticketCurrency?: string;
  color?: string;
  qrCode: string;
}

interface EventData {
  title?: string;
  eventTitle?: string;
  date?: Date;
  eventDate?: Date;
  location?: string;
  venue?: string;
  eventVenue?: string;
  eventLocation?: string;
  city?: string;
  country?: string;
  ageLimit?: number;
}

interface BookingData {
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  currency?: string;
}

interface TicketPDFOptions {
  ticket: TicketData;
  event: EventData;
  booking: BookingData;
  logoUrl?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function generateTicketPDF(options: TicketPDFOptions): Promise<Buffer> {
  const { ticket, event, booking, logoUrl } = options;

  console.log(`🎨 PDF Generator - Ticket: ${ticket.ticketName} Color: ${ticket.color}`);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - (margin * 2);

  const ticketColor = ticket.color || '#3b51f7';
  const colorRgb = hexToRgb(ticketColor);

  const headerHeight = 180;
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width: width,
    height: headerHeight,
    color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
  });

  if (logoUrl) {
    try {
      let logoImageBytes: ArrayBuffer;
      let logoImage;

      if (logoUrl.startsWith('data:')) {
        const base64Data = logoUrl.split(',')[1];
        const binaryString = Buffer.from(base64Data, 'base64');
        logoImageBytes = binaryString.buffer;
      } else {
        const logoResponse = await fetch(logoUrl);
        logoImageBytes = await logoResponse.arrayBuffer();
      }

      if (logoUrl.includes('png') || logoUrl.startsWith('data:image/png')) {
        logoImage = await pdfDoc.embedPng(logoImageBytes);
      } else {
        logoImage = await pdfDoc.embedJpg(logoImageBytes);
      }

      const logoSize = 60;
      const logoX = margin + 10;
      const logoY = height - headerHeight / 2 - logoSize / 2;

      page.drawCircle({
        x: logoX + logoSize / 2,
        y: logoY + logoSize / 2,
        size: logoSize / 2,
        color: rgb(1, 1, 1),
      });

      page.drawImage(logoImage, {
        x: logoX + 5,
        y: logoY + 5,
        width: logoSize - 10,
        height: logoSize - 10,
      });
    } catch (error) {
      console.error('Error embedding logo:', error);
    }
  }

  const titleFontSize = 28;
  const titleY = height - headerHeight / 2 + 10;
  const eventTitle = event.eventTitle || event.title || 'Event';
  page.drawText(eventTitle.toUpperCase(), {
    x: margin + (logoUrl ? 90 : 0),
    y: titleY,
    size: titleFontSize,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  const badgeY = titleY - 35;
  const badgeText = ticket.ticketName.toUpperCase();
  const badgeWidth = helveticaBold.widthOfTextAtSize(badgeText, 12) + 20;

  page.drawRectangle({
    x: margin + (logoUrl ? 90 : 0),
    y: badgeY - 5,
    width: badgeWidth,
    height: 25,
    color: rgb(1, 1, 1),
    borderColor: rgb(1, 1, 1),
    borderWidth: 2,
  });

  page.drawText(badgeText, {
    x: margin + (logoUrl ? 90 : 0) + 10,
    y: badgeY,
    size: 12,
    font: helveticaBold,
    color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
  });

  let currentY = height - headerHeight - 60;

  page.drawText('EVENT DETAILS', {
    x: margin,
    y: currentY,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  currentY -= 30;

  const leftColumnX = margin;
  const rightColumnX = width / 2 + 20;
  const labelColor = rgb(0.4, 0.4, 0.4);
  const valueColor = rgb(0, 0, 0);
  const labelSize = 10;
  const valueSize = 12;
  const lineHeight = 35;

  // Event Date
  const eventDate = event.eventDate || event.date || new Date();
  page.drawText('Date', {
    x: leftColumnX,
    y: currentY,
    size: labelSize,
    font: helveticaBold,
    color: labelColor,
  });
  page.drawText(formatDate(eventDate), {
    x: leftColumnX,
    y: currentY - 15,
    size: valueSize,
    font: helvetica,
    color: valueColor,
  });

  currentY -= lineHeight;

  // Event Time
  page.drawText('Time', {
    x: leftColumnX,
    y: currentY,
    size: labelSize,
    font: helveticaBold,
    color: labelColor,
  });
  page.drawText(formatTime(eventDate), {
    x: leftColumnX,
    y: currentY - 15,
    size: valueSize,
    font: helvetica,
    color: valueColor,
  });

  currentY -= lineHeight;

  // Venue
  const eventVenue = event.eventVenue || event.venue || event.location || 'TBA';
  page.drawText('Venue', {
    x: leftColumnX,
    y: currentY,
    size: labelSize,
    font: helveticaBold,
    color: labelColor,
  });
  page.drawText(eventVenue, {
    x: leftColumnX,
    y: currentY - 15,
    size: valueSize,
    font: helvetica,
    color: valueColor,
  });

  currentY -= lineHeight;

  // Location
  const eventLocation = event.eventLocation || event.city || '';
  if (eventLocation) {
    page.drawText('Location', {
      x: leftColumnX,
      y: currentY,
      size: labelSize,
      font: helveticaBold,
      color: labelColor,
    });
    page.drawText(eventLocation, {
      x: leftColumnX,
      y: currentY - 15,
      size: valueSize,
      font: helvetica,
      color: valueColor,
    });
  }

  currentY = height - headerHeight - 90;

  page.drawText('Ticket ID', {
    x: rightColumnX,
    y: currentY,
    size: labelSize,
    font: helveticaBold,
    color: labelColor,
  });
  page.drawText(ticket.ticketId.substring(0, 18), {
    x: rightColumnX,
    y: currentY - 15,
    size: valueSize,
    font: helvetica,
    color: valueColor,
  });

  currentY -= lineHeight;

  // Price
  page.drawText('Price', {
    x: rightColumnX,
    y: currentY,
    size: labelSize,
    font: helveticaBold,
    color: labelColor,
  });
  const currency = ticket.ticketCurrency || 'EUR';
  const ticketPrice = ticket.ticketPrice || ticket.price || 0;
  page.drawText(`${ticketPrice} ${currency}`, {
    x: rightColumnX,
    y: currentY - 15,
    size: valueSize,
    font: helveticaBold,
    color: valueColor,
  });

  currentY -= lineHeight;

  page.drawText('Booking Reference', {
    x: rightColumnX,
    y: currentY,
    size: labelSize,
    font: helveticaBold,
    color: labelColor,
  });
  page.drawText(booking.bookingReference, {
    x: rightColumnX,
    y: currentY - 15,
    size: valueSize,
    font: helvetica,
    color: valueColor,
  });

  currentY -= lineHeight;

  page.drawText('Customer', {
    x: rightColumnX,
    y: currentY,
    size: labelSize,
    font: helveticaBold,
    color: labelColor,
  });
  page.drawText(booking.customerName, {
    x: rightColumnX,
    y: currentY - 15,
    size: valueSize,
    font: helvetica,
    color: valueColor,
  });

  currentY = 280;

  const qrSectionHeight = 220;
  page.drawRectangle({
    x: margin,
    y: currentY - qrSectionHeight,
    width: contentWidth,
    height: qrSectionHeight,
    color: rgb(0.95, 0.95, 0.95),
  });

  page.drawText('SCAN TO VALIDATE', {
    x: width / 2 - helveticaBold.widthOfTextAtSize('SCAN TO VALIDATE', 14) / 2,
    y: currentY - 30,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  let qrCodeDataUrl: string;

  if (ticket.qrCode.startsWith('data:image')) {
    qrCodeDataUrl = ticket.qrCode;
  } else {
    qrCodeDataUrl = await QRCode.toDataURL(ticket.ticketId, {
      width: 500,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }

  const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  const qrSize = 140;
  const qrX = (width - qrSize) / 2;
  const qrY = currentY - qrSectionHeight + 40;

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  const instructionText = 'Present this QR code at the entrance';
  page.drawText(instructionText, {
    x: width / 2 - helvetica.widthOfTextAtSize(instructionText, 10) / 2,
    y: qrY - 20,
    size: 10,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  const footerY = 50;

  const disclaimer = 'This ticket is valid for one person only. Not transferable.';
  page.drawText(disclaimer, {
    x: width / 2 - helvetica.widthOfTextAtSize(disclaimer, 8) / 2,
    y: footerY,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  const branding = 'Powered by Biletara';
  page.drawText(branding, {
    x: width / 2 - helvetica.widthOfTextAtSize(branding, 8) / 2,
    y: footerY - 15,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateTicketPDFs(
  tickets: TicketData[],
  event: EventData,
  booking: BookingData,
  logoUrl?: string
): Promise<Buffer[]> {
  const pdfBuffers: Buffer[] = [];

  for (const ticket of tickets) {
    const pdfBuffer = await generateTicketPDF({
      ticket,
      event,
      booking,
      logoUrl,
    });
    pdfBuffers.push(pdfBuffer);
  }

  return pdfBuffers;
}

export default generateTicketPDFs;
