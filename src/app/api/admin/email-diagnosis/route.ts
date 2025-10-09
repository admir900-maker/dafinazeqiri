import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import PaymentSettings from '@/models/PaymentSettings';

export async function GET() {
  try {
    await connectToDatabase();

    const settings = await PaymentSettings.findOne({});

    // Check environment variables
    const envSMTPConfig = {
      SMTP_HOST: process.env.SMTP_HOST || 'Not set',
      SMTP_PORT: process.env.SMTP_PORT || 'Not set',
      SMTP_USER: process.env.SMTP_USER ? '***' + process.env.SMTP_USER.slice(-5) : 'Not set',
      SMTP_PASS: process.env.SMTP_PASS ? 'Set (hidden)' : 'Not set',
      SENDER_EMAIL: process.env.SENDER_EMAIL || 'Not set'
    };

    // Check database settings
    const dbSMTPConfig = settings ? {
      smtpHost: settings.smtpHost || 'Not set',
      smtpPort: settings.smtpPort || 'Not set',
      smtpSecure: settings.smtpSecure || false,
      smtpUser: settings.smtpUser ? '***' + settings.smtpUser.slice(-5) : 'Not set',
      smtpPass: settings.smtpPass ? 'Set (hidden)' : 'Not set',
      senderEmail: settings.senderEmail || 'Not set',
      senderName: settings.senderName || 'Not set'
    } : 'No database settings found';

    const diagnosis = {
      timestamp: new Date().toISOString(),
      environmentVariables: envSMTPConfig,
      databaseSettings: dbSMTPConfig,
      configurationStatus: {
        hasEnvConfig: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
        hasDBConfig: !!(settings?.smtpHost && settings?.smtpUser && settings?.smtpPass),
        recommendedPriority: 'Database settings take priority over environment variables'
      }
    };

    return NextResponse.json(diagnosis);
  } catch (error) {
    console.error('Email diagnostic error:', error);
    return NextResponse.json({
      error: 'Failed to retrieve email configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}