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
        currency: 'eur',
        currencySymbol: '€'
      });
    }

    // Return only public currency information
    return NextResponse.json({
      currency: settings.currency || 'eur',
      currencySymbol: settings.currencySymbol || '€'
    });

  } catch (error) {
    console.error('Error fetching currency settings:', error);
    // Return default on error
    return NextResponse.json({
      currency: 'eur',
      currencySymbol: '€'
    });
  }
}