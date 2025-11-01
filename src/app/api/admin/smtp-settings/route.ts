import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import PaymentSettings from '@/models/PaymentSettings';

export async function GET() {
  try {
    await connectToDatabase();

    const settings = await PaymentSettings.findOne({});

    if (!settings) {
      return NextResponse.json({
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: '',
        smtpPass: '',
        senderEmail: '',
        senderName: 'SUPERNOVA'
      });
    }

    return NextResponse.json({
      smtpHost: settings.smtpHost || '',
      smtpPort: settings.smtpPort || 587,
      smtpSecure: settings.smtpSecure || false,
      smtpUser: settings.smtpUser || '',
      smtpPass: settings.smtpPass || '',
      senderEmail: settings.senderEmail || '',
      senderName: settings.senderName || 'SUPERNOVA'
    });
  } catch (error) {
    console.error('Error fetching SMTP settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMTP settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      senderEmail,
      senderName
    } = await req.json();

    // Validation
    if (!smtpHost || !smtpUser || !senderEmail) {
      return NextResponse.json(
        { error: 'SMTP Host, Username, and Sender Email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      return NextResponse.json(
        { error: 'Invalid sender email format' },
        { status: 400 }
      );
    }

    // Validate port number
    if (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      return NextResponse.json(
        { error: 'SMTP Port must be a valid number between 1 and 65535' },
        { status: 400 }
      );
    }

    // Find existing settings or create new
    let settings = await PaymentSettings.findOne({});

    if (!settings) {
      settings = new PaymentSettings({});
    }

    // Update SMTP settings
    settings.smtpHost = smtpHost;
    settings.smtpPort = smtpPort;
    settings.smtpSecure = smtpSecure;
    settings.smtpUser = smtpUser;
    settings.smtpPass = smtpPass;
    settings.senderEmail = senderEmail;
    settings.senderName = senderName || 'SUPERNOVA';
    settings.updatedAt = new Date();

    await settings.save();

    return NextResponse.json({
      success: true,
      message: 'SMTP settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving SMTP settings:', error);
    return NextResponse.json(
      { error: 'Failed to save SMTP settings' },
      { status: 500 }
    );
  }
}