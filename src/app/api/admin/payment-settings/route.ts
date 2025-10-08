import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import PaymentSettings from '@/models/PaymentSettings';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    if (!clerkResponse.ok) {
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 401 });
    }

    const userData = await clerkResponse.json();
    if (userData.public_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectToDatabase();

    let settings = await PaymentSettings.findOne({});

    if (!settings) {
      // Create default settings if none exist
      settings = new PaymentSettings({
        stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
        currency: 'eur',
        currencySymbol: '€',
        isActive: true
      });
      await settings.save();
    }

    // Return settings with masked secret key for security
    return NextResponse.json({
      paymentProvider: settings.paymentProvider || 'stripe',
      stripePublishableKey: settings.stripePublishableKey || '',
      stripeSecretKey: settings.stripeSecretKey ? '••••••••••••••••' : '',
      stripeWebhookSecret: settings.stripeWebhookSecret ? '••••••••••••••••' : '',
      // Raiffeisen Bank Kosovo Settings
      raiffeisenMerchantId: settings.raiffeisenMerchantId || '',
      raiffeisenApiKey: settings.raiffeisenApiKey ? '••••••••••••••••' : '',
      raiffeisenSecretKey: settings.raiffeisenSecretKey ? '••••••••••••••••' : '',
      raiffeisenEnvironment: settings.raiffeisenEnvironment || 'sandbox',
      raiffeisenWebhookSecret: settings.raiffeisenWebhookSecret ? '••••••••••••••••' : '',
      raiffeisenCallbackUrl: settings.raiffeisenCallbackUrl || '',
      raiffeisenReturnUrl: settings.raiffeisenReturnUrl || '',
      platformFee: settings.platformFee || 5,
      currency: settings.currency || 'eur',
      currencySymbol: settings.currencySymbol || '€',
      isActive: settings.isActive,
      validationWindowDays: settings.validationWindowDays || 1,
      validationStartDays: settings.validationStartDays || 0,
      allowValidationAnytime: settings.allowValidationAnytime || false,
      // SMTP Settings
      smtpHost: settings.smtpHost || '',
      smtpPort: settings.smtpPort || 587,
      smtpSecure: settings.smtpSecure || false,
      smtpUser: settings.smtpUser || '',
      smtpPass: settings.smtpPass ? '••••••••••••••••' : '',
      senderEmail: settings.senderEmail || '',
      senderName: settings.senderName || 'BiletAra'
    });

  } catch (error) {
    console.error('Error fetching payment settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    if (!clerkResponse.ok) {
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 401 });
    }

    const userData = await clerkResponse.json();
    if (userData.public_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const {
      paymentProvider,
      stripePublishableKey,
      stripeSecretKey,
      stripeWebhookSecret,
      // Raiffeisen Bank Kosovo Settings
      raiffeisenMerchantId,
      raiffeisenApiKey,
      raiffeisenSecretKey,
      raiffeisenEnvironment,
      raiffeisenWebhookSecret,
      raiffeisenCallbackUrl,
      raiffeisenReturnUrl,
      platformFee,
      currency,
      currencySymbol,
      validationWindowDays,
      validationStartDays,
      allowValidationAnytime,
      // SMTP Settings
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      senderEmail,
      senderName
    } = await req.json();

    console.log('💾 Saving payment settings:', {
      paymentProvider,
      currency,
      currencySymbol,
      hasPublishableKey: !!stripePublishableKey,
      hasSecretKey: !!stripeSecretKey,
      hasWebhookSecret: !!stripeWebhookSecret,
      hasRaiffeisenMerchantId: !!raiffeisenMerchantId,
      hasRaiffeisenApiKey: !!raiffeisenApiKey,
      hasRaiffeisenSecretKey: !!raiffeisenSecretKey,
      hasSmtpConfig: !!(smtpHost && smtpUser)
    });

    // Basic validation based on payment provider
    if (paymentProvider === 'stripe' && (!stripePublishableKey || !stripeSecretKey)) {
      console.log('⚠️ Stripe selected but keys not provided');
    }

    if (paymentProvider === 'raiffeisen' && (!raiffeisenMerchantId || !raiffeisenApiKey || !raiffeisenSecretKey)) {
      console.log('⚠️ Raiffeisen selected but credentials not provided');
    }

    await connectToDatabase();

    let settings = await PaymentSettings.findOne({});

    if (!settings) {
      settings = new PaymentSettings({});
    }

    // Update settings
    if (paymentProvider) settings.paymentProvider = paymentProvider;
    if (stripePublishableKey) settings.stripePublishableKey = stripePublishableKey;
    if (stripeSecretKey && stripeSecretKey !== '••••••••••••••••') settings.stripeSecretKey = stripeSecretKey;
    if (stripeWebhookSecret) {
      settings.stripeWebhookSecret = stripeWebhookSecret;
    }

    // Update Raiffeisen Bank Kosovo settings
    if (raiffeisenMerchantId !== undefined) settings.raiffeisenMerchantId = raiffeisenMerchantId;
    if (raiffeisenApiKey && raiffeisenApiKey !== '••••••••••••••••') settings.raiffeisenApiKey = raiffeisenApiKey;
    if (raiffeisenSecretKey && raiffeisenSecretKey !== '••••••••••••••••') settings.raiffeisenSecretKey = raiffeisenSecretKey;
    if (raiffeisenEnvironment) settings.raiffeisenEnvironment = raiffeisenEnvironment;
    if (raiffeisenWebhookSecret && raiffeisenWebhookSecret !== '••••••••••••••••') settings.raiffeisenWebhookSecret = raiffeisenWebhookSecret;
    if (raiffeisenCallbackUrl !== undefined) settings.raiffeisenCallbackUrl = raiffeisenCallbackUrl;
    if (raiffeisenReturnUrl !== undefined) settings.raiffeisenReturnUrl = raiffeisenReturnUrl;

    if (platformFee !== undefined) settings.platformFee = Number(platformFee);
    settings.currency = currency || 'eur';
    settings.currencySymbol = currencySymbol || '€';
    settings.isActive = true;

    // Update SMTP settings
    if (smtpHost !== undefined) settings.smtpHost = smtpHost;
    if (smtpPort !== undefined) settings.smtpPort = Number(smtpPort);
    if (smtpSecure !== undefined) settings.smtpSecure = Boolean(smtpSecure);
    if (smtpUser !== undefined) settings.smtpUser = smtpUser;
    if (smtpPass && smtpPass !== '••••••••••••••••') settings.smtpPass = smtpPass;
    if (senderEmail !== undefined) settings.senderEmail = senderEmail;
    if (senderName !== undefined) settings.senderName = senderName;

    // Update validation window settings
    if (validationWindowDays !== undefined) {
      settings.validationWindowDays = Math.max(0, Number(validationWindowDays));
    }
    if (validationStartDays !== undefined) {
      settings.validationStartDays = Math.max(0, Number(validationStartDays));
    }
    if (allowValidationAnytime !== undefined) {
      settings.allowValidationAnytime = Boolean(allowValidationAnytime);
    }

    await settings.save();

    console.log('✅ Payment settings saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Payment settings saved successfully',
      settings: {
        currency: settings.currency,
        currencySymbol: settings.currencySymbol
      }
    });

  } catch (error) {
    console.error('❌ Error saving payment settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}