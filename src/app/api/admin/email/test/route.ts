import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { EmailService } from '@/lib/emailService';
import { getEmailConfig, getSiteConfig } from '@/lib/settings';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to } = await request.json();
    if (!to) {
      return NextResponse.json({ error: 'Missing "to" address' }, { status: 400 });
    }

    const emailCfg = await getEmailConfig();
    const site = await getSiteConfig();
    const service = new EmailService({
      smtpHost: emailCfg.smtp.host,
      smtpPort: emailCfg.smtp.port,
      smtpSecure: emailCfg.smtp.secure,
      smtpUser: emailCfg.smtp.username,
      smtpPass: emailCfg.smtp.password,
      senderEmail: emailCfg.fromAddress,
      senderName: emailCfg.fromName,
    });

    const ok = await service.sendEmail({
      to,
      subject: `Test email from ${site.siteName}`,
      html: `<div style="font-family:Arial,sans-serif;padding:16px"><h2>Test email</h2><p>This is a test email from <strong>${site.siteName}</strong>. If you received this, SMTP is configured.</p></div>`
    }, { email: emailCfg.fromAddress, name: emailCfg.fromName });

    if (!ok) {
      return NextResponse.json({ success: false, message: 'Failed to send test email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Test email sent' });
  } catch (error: any) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
