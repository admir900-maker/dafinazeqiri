import Stripe from 'stripe';
import { getStripeConfig } from './settings';

let stripe: Stripe | null = null;

// Initialize Stripe with settings from database
export async function getStripe(): Promise<Stripe> {
  if (stripe) return stripe;

  const config = await getStripeConfig();

  if (!config.secretKey) {
    throw new Error('Stripe secret key not configured');
  }

  stripe = new Stripe(config.secretKey, {
    apiVersion: '2025-09-30.clover',
  });

  return stripe;
}

// Get Stripe public key for client-side
export async function getStripePublicKey(): Promise<string> {
  const config = await getStripeConfig();
  return config.publicKey || '';
}

// Get Stripe webhook secret
export async function getStripeWebhookSecret(): Promise<string> {
  const config = await getStripeConfig();
  return config.webhookSecret || '';
}

// Check if Stripe is enabled
export async function isStripeEnabled(): Promise<boolean> {
  const config = await getStripeConfig();
  return config.enabled && !!config.secretKey;
}

// Default export for backward compatibility
export default async function getStripeInstance(): Promise<Stripe> {
  return getStripe();
}