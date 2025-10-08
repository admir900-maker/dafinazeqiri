import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

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

    const { stripePublicKey, stripeSecretKey } = await req.json();

    if (!stripePublicKey || !stripeSecretKey) {
      return NextResponse.json({ error: 'Both Stripe keys are required' }, { status: 400 });
    }

    // Validate public key format
    if (!stripePublicKey.startsWith('pk_')) {
      return NextResponse.json({ error: 'Invalid Stripe public key format' }, { status: 400 });
    }

    // Validate secret key format
    if (!stripeSecretKey.startsWith('sk_')) {
      return NextResponse.json({ error: 'Invalid Stripe secret key format' }, { status: 400 });
    }

    // Test the Stripe connection
    try {
      const stripe = new Stripe(stripeSecretKey);

      // Try to retrieve account details to test the connection
      const account = await stripe.accounts.retrieve();

      return NextResponse.json({
        success: true,
        message: 'Stripe connection successful',
        accountId: account.id,
        businessProfile: account.business_profile?.name || 'Not set',
        country: account.country,
        currency: account.default_currency?.toUpperCase(),
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled
      });

    } catch (stripeError: any) {
      console.error('Stripe connection error:', stripeError);

      if (stripeError.type === 'StripeAuthenticationError') {
        return NextResponse.json({
          error: 'Invalid Stripe secret key'
        }, { status: 400 });
      }

      if (stripeError.type === 'StripePermissionError') {
        return NextResponse.json({
          error: 'Stripe key does not have required permissions'
        }, { status: 400 });
      }

      return NextResponse.json({
        error: `Stripe error: ${stripeError.message}`
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error testing Stripe connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}