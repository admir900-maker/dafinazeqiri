import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import nodemailer from 'nodemailer';
import { getSiteConfig } from '@/lib/settings';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.publicMetadata?.role as string;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { testEmail, smtpSettings } = await req.json();

    if (!testEmail) {
      return NextResponse.json({ error: 'Test email address is required' }, { status: 400 });
    }

    // Get site configuration
    const siteConfig = await getSiteConfig();

    // Use provided SMTP settings or fall back to environment variables
    const smtpConfig = smtpSettings || {
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpSecure: false,
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
      senderEmail: process.env.SENDER_EMAIL,
      senderName: siteConfig.siteName
    };

    if (!smtpConfig.smtpHost || !smtpConfig.smtpUser) {
      return NextResponse.json({
        error: 'SMTP configuration incomplete. Please provide SMTP host and username.'
      }, { status: 400 });
    }

    console.log('🧪 Testing email configuration...');
    console.log('📧 SMTP Settings:');
    console.log('- Host:', smtpConfig.smtpHost);
    console.log('- Port:', smtpConfig.smtpPort);
    console.log('- User:', smtpConfig.smtpUser);
    console.log('- Sender:', smtpConfig.senderEmail);

    // First, test SMTP connection with different configurations
    const testConfigs = [
      {
        name: 'Primary SMTP Configuration',
        config: {
          host: smtpConfig.smtpHost,
          port: smtpConfig.smtpPort,
          secure: smtpConfig.smtpSecure,
          auth: {
            user: smtpConfig.smtpUser,
            pass: smtpConfig.smtpPass,
          },
        }
      },
      {
        name: 'Alternative Port (25)',
        config: {
          host: smtpConfig.smtpHost,
          port: 25,
          secure: false,
          auth: {
            user: smtpConfig.smtpUser,
            pass: smtpConfig.smtpPass,
          },
        }
      },
      {
        name: 'With TLS Required',
        config: {
          host: smtpConfig.smtpHost,
          port: smtpConfig.smtpPort,
          secure: false,
          requireTLS: true,
          auth: {
            user: smtpConfig.smtpUser,
            pass: smtpConfig.smtpPass,
          },
        }
      }
    ];

    let workingConfig = null;

    for (const testConfig of testConfigs) {
      console.log(`🔄 Testing ${testConfig.name}...`);
      const testTransporter = nodemailer.createTransport(testConfig.config);

      try {
        await testTransporter.verify();
        console.log(`✅ ${testConfig.name} connection successful`);
        workingConfig = testConfig;
        break;
      } catch (connectionError) {
        console.error(`❌ ${testConfig.name} failed:`, connectionError instanceof Error ? connectionError.message : 'Unknown error');
      }
    }

    if (!workingConfig) {
      return NextResponse.json({
        success: false,
        error: 'All SMTP configuration attempts failed. Please check your SMTP credentials and ensure the sender email is properly configured.'
      }, { status: 500 });
    }

    console.log(`📧 Using working configuration: ${workingConfig.name}`);

    // Test email content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${siteConfig.siteName} Email Test</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Email Test Successful!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #495057; margin-top: 0;">Email Configuration Test</h2>
          <p>This is a test email to verify that your ${siteConfig.siteName} email configuration is working correctly.</p>
          
          <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #28a745;">✓ SMTP Configuration</h3>
            <ul style="margin: 0;">
              <li>Host: ${smtpConfig.smtpHost}</li>
              <li>Port: ${smtpConfig.smtpPort}</li>
              <li>From: ${smtpConfig.senderEmail || smtpConfig.smtpUser}</li>
              <li>Secure: ${smtpConfig.smtpSecure ? 'Yes' : 'No'}</li>
            </ul>
          </div>
          
          <p><strong>Test completed at:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; border-left: 4px solid #2196f3;">
          <p style="margin: 0;"><strong>Next Steps:</strong> Your email system is now ready to send booking confirmations and notifications!</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #6c757d; font-size: 14px; margin: 0;">
            ${siteConfig.siteName} - Event Ticketing Platform<br>
            This is an automated test email.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send test email using the working configuration
    const workingTransporter = nodemailer.createTransport(workingConfig.config);

    try {
      const mailOptions = {
        from: `"${smtpConfig.senderName || siteConfig.siteName}" <${smtpConfig.senderEmail || smtpConfig.smtpUser}>`,
        to: testEmail,
        subject: `✅ ${siteConfig.siteName} Email Configuration Test`,
        html: emailHtml,
      }; const result = await workingTransporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully:', result.messageId);

      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        configuration: {
          method: workingConfig.name,
          host: workingConfig.config.host,
          port: workingConfig.config.port,
          sender: process.env.SENDER_EMAIL,
          smtpUser: process.env.SMTP_USER?.substring(0, 10) + '...',
          messageId: result.messageId
        }
      });
    } catch (sendError) {
      console.error('❌ Failed to send test email:', sendError);
      return NextResponse.json({
        success: false,
        error: `Failed to send test email: ${sendError instanceof Error ? sendError.message : 'Unknown error'}`,
        configuration: {
          method: workingConfig.name,
          host: workingConfig.config.host,
          port: workingConfig.config.port,
          sender: process.env.SENDER_EMAIL,
          smtpUser: process.env.SMTP_USER?.substring(0, 10) + '...',
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Email test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during email test',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}