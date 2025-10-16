import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';
import { generateTicketPDFs } from '@/lib/ticketPdfGenerator';
import Settings from '@/models/Settings';
import { PDFDocument } from 'pdf-lib';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    await connectToDatabase();

    // Find booking by ID or reference
    // Check if bookingId is a valid ObjectId, otherwise search by reference
    let booking;
    if (mongoose.Types.ObjectId.isValid(bookingId) && bookingId.length === 24) {
      booking = await Booking.findOne({
        $or: [
          { _id: bookingId },
          { bookingReference: bookingId }
        ]
      });
    } else {
      // Not a valid ObjectId, search only by reference
      booking = await Booking.findOne({ bookingReference: bookingId });
    }

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get event details
    const event = await Event.findById(booking.eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get site settings for logo
    const settings = await Settings.findOne();
    const logoUrl = settings?.branding?.logo;

    // Generate PDFs for all tickets
    const pdfBuffers = await generateTicketPDFs(
      booking.tickets.map((t: any) => ({
        ticketId: t.ticketId || 'N/A',
        ticketName: t.ticketName,
        price: t.price,
        qrCode: t.qrCode,
        color: t.color || '#3B82F6',
        ticketCurrency: booking.currency
      })),
      {
        title: event.title,
        date: event.date,
        location: event.location,
        venue: event.venue,
        city: event.city,
        country: event.country
      },
      {
        bookingReference: booking.bookingReference,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        currency: booking.currency
      },
      logoUrl
    );

    // If only one ticket, return it directly
    if (pdfBuffers.length === 1) {
      const pdfBuffer = pdfBuffers[0];
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ticket-${booking.bookingReference}.pdf"`,
        },
      });
    }

    // If multiple tickets, merge them into one PDF
    const mergedPdf = await PDFDocument.create();

    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();

    return new NextResponse(new Uint8Array(mergedPdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tickets-${booking.bookingReference}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating tickets for download:', error);
    return NextResponse.json(
      { error: 'Failed to generate tickets' },
      { status: 500 }
    );
  }
}
