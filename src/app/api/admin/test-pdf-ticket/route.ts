import { NextRequest, NextResponse } from 'next/server';
import { generateTicketPDFs } from '@/lib/ticketPdfGenerator';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  try {
    // Generate a sample QR code
    const qrCodeData = 'TICKET-TEST-12345';
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Sample ticket data
    const tickets = [{
      ticketId: 'GW0T961106',
      ticketName: 'Extra VIP Invitation',
      price: 0,
      ticketCurrency: 'ALL',
      color: '#3B82F6',
      qrCode: qrCodeDataUrl
    }];

    const eventData = {
      title: 'Morad - Concert in Tirana',
      eventTitle: 'Morad - Concert in Tirana',
      venue: 'Tirana',
      city: 'Tirana',
      country: 'Albania',
      date: new Date('2025-09-12T19:00:00'),
      eventDate: new Date('2025-09-12T19:00:00'),
      location: 'Tirana',
      ageLimit: 18
    };

    const bookingData = {
      bookingReference: 'GW0T961106',
      customerName: 'Admir Jakupi 3',
      customerEmail: 'test@example.com',
      currency: 'ALL'
    };

    console.log('🎫 Generating test PDF ticket...');
    const pdfBuffers = await generateTicketPDFs(tickets, eventData, bookingData);
    const pdfBuffer = pdfBuffers[0];
    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Return the PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="test-ticket.pdf"',
      },
    });
  } catch (error) {
    console.error('❌ Error generating test PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
