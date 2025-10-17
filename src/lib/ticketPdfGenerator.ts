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

// Default logo as base64 PNG (circle with "B" letter)
const DEFAULT_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAADsUlEQVR4nO2dS2gUQRCGP40xRo0PfCVGjYqKqHhQQTyIB0VFUBQPUVQUFEUQD4IHD4J4UBAR8eDJg3gQRUQRRfHgQRQVRVEUH/hARVFUFB/xFVOyBYGQzE5P9/R0z/4fFJidu7P1T3VXV1dXNwghRCDMAY4A94AvwE/gN/ADGASGAM8A3gH3gauAB2wFeoABYASwFP8GgV6gFagHyoEyoBzYCDQCncAToN/6nOZ7h4F2YC+wGlgJLAPmAXOBGpSBYB0wAPxtxoHXQBuwBViY4TdLgN3AJeApMMb/G7MR4DlwHNgBLLFPPJWvpEUuA7wGvqTY+Q+BM0BjyseYC+wD7lrVqyWlr1Hrtevs01eVVDLASuCAVSVNTJibwIoC+1sKHAOeT3Gib8BlYHm0kogxH+gCfllJuTlJHgMbSuD7OqDH+nwG+JKQxFfAtij8tBRYbBs4W3rOu1q0kMU0E22F1gFXrO+zjG9YR4FZLiSxyo6C3cBP6/ONQGMJfT/T6h8TxpwCZrqSxCqr2nWVxI8FwHNLXp9tjluJ+u6YtTcfrdrodWyHKwmschdwxfKjKaavqfbtDWtcfGpCZamGfEkgvz+mnLVr/J/XsSqxiSELmSX0D8uXi6TrIww0AF8tX1qcSlBnHRBD49buqHYhiQa0JZJ0rQtJXKVt6jrtjnU5leDZQltO/fBpnzXOmG2d+OW5RllXE8p7bKGt61xNKG8fXI0t2R95N8eqr2x5u8TlhPIOYaGt61ksLqeUG4cL4vwfrbIcNljq6rog0S5cSJb2kvX/2QsZIANkgAyQATJABsgAGSADZIAMkAEyQAbIABkgA2SADJABMkAGpDTgpA1Yz7Q+23s1/VRBO9BntZ0VjmPIPmtzPNP66/gNLIlLEoeAMYdBZD/Q4FoSB5xJ4p5jSRy2ktgL/HYYRGqB9a4lUQt8cxREPHsSt6LEZ0sS51xK4j5xy4BDwIgD4yaBY1bV6D3gjt1rQaXD+5ADNq6kPmGc0bDafAeKcK8FVX7+K40khoGmqCRxmPjmwCRt/RuikMRJkpHRhCRGLMeikkQXyctT60Oou1VlabVHZy4l0U0KTiVsYkxaSTTkKolekpXeAiXRT7LSl6ckholXek15f79u8s2QfaOxiSQVZ+bvEe/SOwRsI8P9mOnUAN1Zfv+I3aIi3TUp3nS+zfJbncB6inBvKknxppNn0rL8XosW7SqVQv8AHbhLqzy6ProAAAAASUVORK5CYII=';

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

  const headerHeight = 200;
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width: width,
    height: headerHeight,
    color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
  });

  // Always try to embed logo (use provided or default)
  const finalLogoUrl = logoUrl || DEFAULT_LOGO;
  if (finalLogoUrl) {
    try {
      // Skip SVG files as they're not supported by pdf-lib
      if (finalLogoUrl.includes('svg') || finalLogoUrl.startsWith('data:image/svg')) {
        console.log('⚠️ SVG logos are not supported. Using default PNG logo instead.');
        // Use default PNG logo instead of SVG
        const base64Data = DEFAULT_LOGO.split(',')[1];
        const binaryString = Buffer.from(base64Data, 'base64');
        const logoImageBytes = binaryString.buffer;
        const logoImage = await pdfDoc.embedPng(logoImageBytes);

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
      } else {
        // Handle PNG and JPG
        let logoImageBytes: ArrayBuffer;
        let logoImage;

        if (finalLogoUrl.startsWith('data:')) {
          const base64Data = finalLogoUrl.split(',')[1];
          const binaryString = Buffer.from(base64Data, 'base64');
          logoImageBytes = binaryString.buffer;
        } else {
          const logoResponse = await fetch(finalLogoUrl);
          logoImageBytes = await logoResponse.arrayBuffer();
        }

        // Detect image format from data URL or file extension
        const isPng = finalLogoUrl.includes('png') || finalLogoUrl.startsWith('data:image/png');

        if (isPng) {
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
      }
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

  // Customer Name
  page.drawText('Customer', {
    x: rightColumnX,
    y: currentY,
    size: labelSize,
    font: helveticaBold,
    color: labelColor,
  });
  const customerName = booking.customerName.length > 20
    ? booking.customerName.substring(0, 20) + '...'
    : booking.customerName;
  page.drawText(customerName, {
    x: rightColumnX,
    y: currentY - 15,
    size: valueSize,
    font: helvetica,
    color: valueColor,
  });

  currentY -= lineHeight;

  // Customer Email
  page.drawText('Email', {
    x: rightColumnX,
    y: currentY,
    size: labelSize,
    font: helveticaBold,
    color: labelColor,
  });
  const customerEmail = booking.customerEmail.length > 25
    ? booking.customerEmail.substring(0, 25) + '...'
    : booking.customerEmail;
  page.drawText(customerEmail, {
    x: rightColumnX,
    y: currentY - 15,
    size: 9,
    font: helvetica,
    color: valueColor,
  });

  // Add age limit if available (left column continuation)
  if (event.ageLimit) {
    currentY = height - headerHeight - 90 - (lineHeight * 4);
    page.drawText('Age Limit', {
      x: leftColumnX,
      y: currentY,
      size: labelSize,
      font: helveticaBold,
      color: labelColor,
    });
    page.drawText(`${event.ageLimit}+ years`, {
      x: leftColumnX,
      y: currentY - 15,
      size: valueSize,
      font: helvetica,
      color: valueColor,
    });
  }

  currentY = 300;

  // Important Information Section
  const infoSectionY = currentY - 40;
  page.drawText('IMPORTANT INFORMATION', {
    x: margin,
    y: infoSectionY,
    size: 12,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.2),
  });

  const instructions = [
    '• This ticket is valid for one person only',
    '• Please arrive 30 minutes before the event starts',
    '• Keep this ticket with you at all times during the event',
    '• No refunds or exchanges unless event is cancelled',
  ];

  let instructionY = infoSectionY - 20;
  instructions.forEach(instruction => {
    page.drawText(instruction, {
      x: margin + 5,
      y: instructionY,
      size: 9,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    instructionY -= 14;
  });

  currentY = 190;

  const qrSectionHeight = 150;
  page.drawRectangle({
    x: margin,
    y: currentY - qrSectionHeight,
    width: contentWidth,
    height: qrSectionHeight,
    color: rgb(0.95, 0.95, 0.95),
  });

  page.drawText('SCAN TO VALIDATE', {
    x: width / 2 - helveticaBold.widthOfTextAtSize('SCAN TO VALIDATE', 14) / 2,
    y: currentY - 25,
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

  const qrSize = 110;
  const qrX = (width - qrSize) / 2;
  const qrY = currentY - qrSectionHeight + 20;

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  const instructionText = 'Present this QR code at the entrance for validation';
  page.drawText(instructionText, {
    x: width / 2 - helvetica.widthOfTextAtSize(instructionText, 9) / 2,
    y: qrY - 15,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Add ticket serial number at bottom of QR section
  const serialText = `Serial: ${ticket.ticketId}`;
  page.drawText(serialText, {
    x: width / 2 - helvetica.widthOfTextAtSize(serialText, 7) / 2,
    y: currentY - qrSectionHeight + 5,
    size: 7,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Footer section
  const footerY = 60;

  // Draw footer separator line
  page.drawLine({
    start: { x: margin, y: footerY + 10 },
    end: { x: width - margin, y: footerY + 10 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  const disclaimer = 'This ticket is non-transferable and valid for single entry only';
  page.drawText(disclaimer, {
    x: width / 2 - helvetica.widthOfTextAtSize(disclaimer, 8) / 2,
    y: footerY,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  const contactInfo = 'For support: support@biletara.com | www.biletara.com';
  page.drawText(contactInfo, {
    x: width / 2 - helvetica.widthOfTextAtSize(contactInfo, 7) / 2,
    y: footerY - 12,
    size: 7,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  const branding = 'Powered by Biletara Ticketing Platform';
  page.drawText(branding, {
    x: width / 2 - helveticaBold.widthOfTextAtSize(branding, 8) / 2,
    y: footerY - 27,
    size: 8,
    font: helveticaBold,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Add generation timestamp
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  const timestampText = `Generated: ${timestamp}`;
  page.drawText(timestampText, {
    x: width / 2 - helvetica.widthOfTextAtSize(timestampText, 6) / 2,
    y: footerY - 40,
    size: 6,
    font: helvetica,
    color: rgb(0.7, 0.7, 0.7),
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
