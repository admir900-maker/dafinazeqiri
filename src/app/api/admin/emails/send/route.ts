import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import nodemailer from 'nodemailer';
import { connectToDatabase } from '@/lib/mongodb';
import PaymentSettings from '@/models/PaymentSettings';
import { getEmailConfig } from '@/lib/settings';

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

    // Get SMTP settings from database (same as booking emails)
    let smtpConfig: any;
    
    try {
      const emailConfig = await getEmailConfig();
      
      if (emailConfig.smtp.host && emailConfig.smtp.username) {
        smtpConfig = {
          host: emailConfig.smtp.host,
          port: emailConfig.smtp.port || 587,
          secure: emailConfig.smtp.secure || false,
          auth: {
            user: emailConfig.smtp.username,
            pass: emailConfig.smtp.password
          }
        };
      } else {
        // Fallback to legacy PaymentSettings
        await connectToDatabase();
        const legacySettings = await PaymentSettings.findOne({});
        
        if (!legacySettings || !legacySettings.smtpHost || !legacySettings.smtpUser) {
          return NextResponse.json({
            success: false,
            error: 'SMTP credentials not configured in database'
          }, { status: 500 });
        }
        
        smtpConfig = {
          host: legacySettings.smtpHost,
          port: legacySettings.smtpPort || 587,
          secure: legacySettings.smtpSecure || false,
          auth: {
            user: legacySettings.smtpUser,
            pass: legacySettings.smtpPass
          }
        };
      }
    } catch (error) {
      console.error('Error loading SMTP settings:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to load SMTP configuration'
      }, { status: 500 });
    }

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
