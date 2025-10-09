import { NextResponse } from 'next/server';
import { getStripePublicKey, isStripeEnabled } from '@/lib/stripe';

export async function GET() {
  try {
    const enabled = await isStripeEnabled();

    if (!enabled) {
      return NextResponse.json(
        { error: 'Stripe is not enabled' },
        { status: 503 }
      );
    }

    const publicKey = await getStripePublicKey();

    if (!publicKey) {
      return NextResponse.json(
        { error: 'Stripe public key not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json({ publicKey });
  } catch (error) {
    console.error('Error fetching Stripe public key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe configuration' },
      { status: 500 }
    );
  }
}