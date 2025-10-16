import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import PaymentOption from '@/models/PaymentOption';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency') || 'EUR';
    const amount = parseFloat(searchParams.get('amount') || '0');

    // Get active payment options that support the requested currency
    const paymentOptions = await PaymentOption.find({
      isActive: true,
      supportedCurrencies: { $in: [currency] },
      // Filter by amount limits if specified
      ...(amount > 0 && {
        $and: [
          { $or: [{ 'configuration.minAmount': { $exists: false } }, { 'configuration.minAmount': { $lte: amount } }] },
          { $or: [{ 'configuration.maxAmount': { $exists: false } }, { 'configuration.maxAmount': { $gte: amount } }] }
        ]
      })
    })
      .sort({ isDefault: -1, priority: -1, createdAt: -1 })
      .select({
        name: 1,
        displayName: 1,
        type: 1,
        provider: 1,
        isDefault: 1,
        icon: 1,
        color: 1,
        description: 1,
        instructions: 1,
        'configuration.currency': 1,
        'configuration.processingFee': 1,
        'configuration.processingFeeType': 1,
        testMode: 1
      })
      .lean();

    // Calculate processing fees for each option
    const optionsWithFees = paymentOptions.map(option => {
      let processingFee = 0;

      if (option.configuration?.processingFee && amount > 0) {
        if (option.configuration.processingFeeType === 'percentage') {
          processingFee = (amount * option.configuration.processingFee) / 100;
        } else {
          processingFee = option.configuration.processingFee;
        }
      }

      return {
        ...option,
        processingFee: Math.round(processingFee * 100) / 100, // Round to 2 decimal places
        totalAmount: amount > 0 ? Math.round((amount + processingFee) * 100) / 100 : 0
      };
    });

    return NextResponse.json({
      success: true,
      data: optionsWithFees,
      meta: {
        currency,
        amount,
        count: optionsWithFees.length
      }
    });

  } catch (error) {
    console.error('Error fetching payment options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment options' },
      { status: 500 }
    );
  }
}