import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import PaymentSettings from '@/models/PaymentSettings';

export async function GET() {
  try {
    await connectToDatabase();

    let settings = await PaymentSettings.findOne({});

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        paymentProvider: 'raiffeisen', // Default to Raiffeisen
        currency: 'EUR',
        currencySymbol: '€'
      });
    }

    // Return only public payment configuration (no sensitive keys)
    return NextResponse.json({
      paymentProvider: settings.paymentProvider || 'raiffeisen',
      currency: settings.currency || 'EUR',
      currencySymbol: settings.currencySymbol || '€'
    });

  } catch (error) {
    console.error('Error fetching payment config:', error);

    // Return default settings on error
    return NextResponse.json({
      paymentProvider: 'raiffeisen',
      currency: 'EUR',
      currencySymbol: '€'
    });
  }
}