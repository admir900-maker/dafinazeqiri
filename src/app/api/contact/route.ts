import { NextRequest, NextResponse } from 'next/server';
import { validateAndSanitize, validateContactForm } from '@/lib/validation';
import { logError } from '@/lib/errorLogger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate and sanitize the contact form data
    const { data: sanitizedData, validation } = validateAndSanitize(body, validateContactForm);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors.map(err => err.message)
        },
        { status: 400 }
      );
    }

    // In a real application, you would:
    // 1. Save the message to your database
    // 2. Send an email notification to your support team
    // 3. Send a confirmation email to the user

    // For now, we'll just log the message and simulate success
    logError('New contact form submission', null, {
      action: 'contact-form-submission',
      data: {
        name: sanitizedData.name,
        email: sanitizedData.email,
        subject: sanitizedData.subject,
        messageLength: sanitizedData.message.length
      }
    });

    // Here you would typically integrate with your email service
    // Example: await sendContactFormEmail(sanitizedData);

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon!'
    });

  } catch (error: any) {
    logError('Contact form API error', error, { action: 'contact-api' });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Handle GET requests to provide form configuration
export async function GET() {
  return NextResponse.json({
    supportEmail: 'support@biletara.com',
    businessEmail: 'business@biletara.com',
    maxMessageLength: 2000,
    supportedLanguages: ['en', 'tr'],
    responseTime: '24-48 hours'
  });
}