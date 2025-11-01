import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { getSiteConfig } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      senderEmail,
      senderName,
      testEmail
    } = await req.json();

    const siteConfig = await getSiteConfig();

    // Validation
    if (!smtpHost || !smtpUser || !smtpPass || !senderEmail || !testEmail) {
      return NextResponse.json(
        { error: 'Missing required SMTP configuration' },
        { status: 400 }
      );
    }

    // Create transporter with provided settings
    const transportConfig: SMTPTransport.Options = {
      host: smtpHost,
      port: smtpPort || 587,
      secure: smtpSecure || false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000, // 10 second timeout
      greetingTimeout: 5000,
      socketTimeout: 10000,
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    };

    const transporter = nodemailer.createTransport(transportConfig);

    // Verify connection
    await transporter.verify();

    // Send test email
    const testEmailData = {
      from: {
        name: senderName || siteConfig.siteName,
        address: senderEmail
      },
      to: testEmail,
      subject: `SMTP Configuration Test - ${siteConfig.siteName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1; text-align: center;">🎉 SMTP Test Successful!</h2>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">Configuration Details:</h3>
            <ul style="color: #6b7280;">
              <li><strong>SMTP Host:</strong> ${smtpHost}</li>
              <li><strong>SMTP Port:</strong> ${smtpPort}</li>
              <li><strong>Secure Connection:</strong> ${smtpSecure ? 'Yes (SSL/TLS)' : 'No'}</li>
              <li><strong>Username:</strong> ${smtpUser}</li>
              <li><strong>Sender Email:</strong> ${senderEmail}</li>
              <li><strong>Sender Name:</strong> ${senderName || 'SUPERNOVA'}</li>
            </ul>
          </div>
          <p style="color: #6b7280;">
            This is a test email to verify your SMTP configuration is working correctly. 
            Your SUPERNOVA application can now send emails for booking confirmations, 
            password resets, and other notifications.
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #9ca3af; font-size: 14px;">
              Sent by SUPERNOVA Event Management System<br>
              ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
      text: `
SMTP Test Successful!

Your SMTP configuration is working correctly.

Configuration Details:
- SMTP Host: ${smtpHost}
- SMTP Port: ${smtpPort}
- Secure Connection: ${smtpSecure ? 'Yes (SSL/TLS)' : 'No'}
- Username: ${smtpUser}
- Sender Email: ${senderEmail}
- Sender Name: ${senderName || 'SUPERNOVA'}

This is a test email to verify your SMTP configuration. Your SUPERNOVA application can now send emails for booking confirmations, password resets, and other notifications.

Sent by SUPERNOVA Event Management System
${new Date().toLocaleString()}
      `
    };

    await transporter.sendMail(testEmailData);

    return NextResponse.json({
      success: true,
      message: 'SMTP test successful! Test email sent.'
    });

  } catch (error: any) {
    console.error('SMTP test failed:', error);

    let errorMessage = 'SMTP connection failed';

    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Check host and port.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'SMTP host not found. Check the hostname.';
    } else if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Check username and password.';
    } else if (error.responseCode === 535) {
      errorMessage = 'Authentication failed. Check your credentials.';
    } else if (error.responseCode === 587 || error.responseCode === 465) {
      errorMessage = 'Connection issue. Try different port or security settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error.code || error.responseCode || 'Unknown error'
      },
      { status: 400 }
    );
  }
}