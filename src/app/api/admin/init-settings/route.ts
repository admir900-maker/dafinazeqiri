import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import PaymentSettings from '@/models/PaymentSettings';

export async function POST() {
  try {
    await connectToDatabase();

    // Check if settings already exist
    let settings = await PaymentSettings.findOne({});

    if (!settings) {
      // Create initial settings from environment variables
      settings = new PaymentSettings({
        stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
        stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
        stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        currency: 'eur',
        currencySymbol: '€',
        isActive: true
      });

      await settings.save();

      console.log('✅ Default payment settings initialized');

      return NextResponse.json({
        success: true,
        message: 'Default payment settings initialized from environment variables'
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Payment settings already exist'
      });
    }

  } catch (error) {
    console.error('❌ Error initializing payment settings:', error);
    return NextResponse.json({
      error: 'Failed to initialize payment settings'
    }, { status: 500 });
  }
}