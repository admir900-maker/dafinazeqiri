import { connectToDatabase } from '@/lib/mongodb';
import PaymentOption from '@/models/PaymentOption';

const defaultPaymentOptions = [
  {
    name: 'stripe-card',
    displayName: 'Credit/Debit Card',
    type: 'card',
    provider: 'Stripe',
    isActive: true,
    isDefault: true,
    configuration: {
      currency: 'EUR',
      minAmount: 1,
      maxAmount: 10000,
      processingFee: 2.9,
      processingFeeType: 'percentage'
    },
    supportedCurrencies: ['EUR', 'USD', 'GBP'],
    icon: '💳',
    color: '#6366f1',
    description: 'Pay securely with your credit or debit card',
    instructions: 'Enter your card details to complete the payment',
    priority: 100,
    testMode: false
  },
  {
    name: 'raiffeisen-bank',
    displayName: 'Raiffeisen Bank Transfer',
    type: 'bank_transfer',
    provider: 'Raiffeisen Bank',
    isActive: true,
    isDefault: false,
    configuration: {
      currency: 'EUR',
      minAmount: 10,
      maxAmount: 50000,
      processingFee: 1.5,
      processingFeeType: 'fixed'
    },
    supportedCurrencies: ['EUR'],
    icon: '🏦',
    color: '#cd7f32',
    description: 'Direct bank transfer via Raiffeisen Bank',
    instructions: 'You will be redirected to your online banking to complete the payment',
    priority: 80,
    testMode: false
  },
  {
    name: 'paypal',
    displayName: 'PayPal',
    type: 'digital_wallet',
    provider: 'PayPal',
    isActive: false,
    isDefault: false,
    configuration: {
      currency: 'EUR',
      minAmount: 1,
      maxAmount: 5000,
      processingFee: 3.4,
      processingFeeType: 'percentage'
    },
    supportedCurrencies: ['EUR', 'USD', 'GBP'],
    icon: '🅿️',
    color: '#0070ba',
    description: 'Pay with your PayPal account',
    instructions: 'Login to your PayPal account to complete the payment',
    priority: 60,
    testMode: false
  },
  {
    name: 'cash-on-delivery',
    displayName: 'Cash Payment',
    type: 'cash',
    provider: 'Manual',
    isActive: false,
    isDefault: false,
    configuration: {
      currency: 'EUR',
      minAmount: 5,
      maxAmount: 500,
      processingFee: 0,
      processingFeeType: 'fixed'
    },
    supportedCurrencies: ['EUR'],
    icon: '💵',
    color: '#10b981',
    description: 'Pay in cash at the venue',
    instructions: 'Present your ticket at the venue and pay in cash',
    priority: 40,
    testMode: false
  },
  {
    name: 'apple-pay',
    displayName: 'Apple Pay',
    type: 'digital_wallet',
    provider: 'Apple',
    isActive: false,
    isDefault: false,
    configuration: {
      currency: 'EUR',
      minAmount: 1,
      maxAmount: 3000,
      processingFee: 2.9,
      processingFeeType: 'percentage'
    },
    supportedCurrencies: ['EUR', 'USD', 'GBP'],
    icon: '',
    color: '#000000',
    description: 'Quick and secure payment with Apple Pay',
    instructions: 'Use Touch ID or Face ID to complete your payment',
    priority: 70,
    testMode: false
  },
  {
    name: 'google-pay',
    displayName: 'Google Pay',
    type: 'digital_wallet',
    provider: 'Google',
    isActive: false,
    isDefault: false,
    configuration: {
      currency: 'EUR',
      minAmount: 1,
      maxAmount: 3000,
      processingFee: 2.9,
      processingFeeType: 'percentage'
    },
    supportedCurrencies: ['EUR', 'USD', 'GBP'],
    icon: 'G',
    color: '#4285f4',
    description: 'Fast checkout with Google Pay',
    instructions: 'Authenticate with your device to complete the payment',
    priority: 65,
    testMode: false
  }
];

export async function seedPaymentOptions() {
  try {
    await connectToDatabase();

    // Check if payment options already exist
    const existingCount = await PaymentOption.countDocuments();

    if (existingCount > 0) {
      console.log('Payment options already exist, skipping seed');
      return { success: true, message: 'Payment options already exist' };
    }

    // Insert default payment options
    const result = await PaymentOption.insertMany(defaultPaymentOptions);

    console.log(`✅ Seeded ${result.length} payment options successfully`);

    return {
      success: true,
      message: `Seeded ${result.length} payment options successfully`,
      data: result
    };

  } catch (error) {
    console.error('❌ Error seeding payment options:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// For manual execution
if (require.main === module) {
  seedPaymentOptions()
    .then((result) => {
      console.log(result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}