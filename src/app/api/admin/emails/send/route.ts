import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check

    const { to, subject, body, inReplyTo, references } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get SMTP settings from environment or use configured settings
    const smtpConfig = {
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
      port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD
      }
    };

    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      return NextResponse.json({
        success: false,
        error: 'SMTP credentials not configured'
      }, { status: 500 });
    }

    const transporter = nodemailer.createTransport(smtpConfig);

    const mailOptions: any = {
      from: smtpConfig.auth.user,
      to,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>')
    };

    // Add reply headers if this is a reply
    if (inReplyTo) {
      mailOptions.inReplyTo = inReplyTo;
    }
    if (references) {
      mailOptions.references = references;
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully'
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send email'
    }, { status: 500 });
  }
}
