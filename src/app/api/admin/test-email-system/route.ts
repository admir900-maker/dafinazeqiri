import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { sendBookingConfirmationEmail } from '@/lib/emailService';

export async function POST(req: NextRequest) {
  try {
    const { testEmail } = await req.json();

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    console.log('🧪 Testing email system with recipient:', testEmail);

    // Create a mock booking for testing
    const mockBooking = {
      _id: 'test-booking-id',
      bookingReference: 'TEST-EMAIL-' + Date.now(),
      customerName: 'Test Customer',
      customerEmail: testEmail,
      totalAmount: 25.00,
      currency: 'EUR',
      tickets: [{
        ticketName: 'Test Ticket',
        ticketId: 'test-ticket-id',
        price: 25.00,
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      }],
      createdAt: new Date(),
      paymentDate: new Date()
    };

    const mockEvent = {
      _id: 'test-event-id',
      title: 'Test Event - Email System Check',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      location: 'Test Venue',
      venue: 'Test Location'
    };

    console.log('📧 Sending test booking confirmation email...');

    const emailSent = await sendBookingConfirmationEmail(mockBooking);

    if (emailSent) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully!',
        details: {
          recipient: testEmail,
          bookingReference: mockBooking.bookingReference
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email. Check SMTP configuration and server logs.',
        details: {
          recipient: testEmail
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Test email failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Email test failed',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}