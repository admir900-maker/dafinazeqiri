import { connectToDatabase } from './mongodb';
import Settings from '@/models/Settings';

let cachedSettings: any = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get settings from database with caching
export async function getSettings() {
  const now = Date.now();

  // Return cached settings if still valid
  if (cachedSettings && (now - lastFetch) < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    await connectToDatabase();

    // Get settings from database
    let settings = await Settings.findOne({}).lean();

    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({
        updatedBy: 'system',
        version: 1
      });
    }

    cachedSettings = settings;
    lastFetch = now;

    return settings;
  } catch (error) {
    console.error('Error fetching settings:', error);

    // Return fallback settings based on environment variables
    return getFallbackSettings();
  }
}

// Get fallback settings from environment variables
export function getFallbackSettings() {
  return {
    general: {
      siteName: process.env.SITE_NAME || 'BiletAra',
      siteUrl: process.env.NEXT_PUBLIC_DOMAIN || 'https://dafinazeqiri.tickets',
      currency: 'EUR',
      timezone: 'UTC'
    },
    email: {
      fromName: process.env.EMAIL_FROM_NAME || 'BiletAra',
      fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@dafinazeqiri.tickets',
      smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        username: process.env.SMTP_USERNAME || '',
        password: process.env.SMTP_PASSWORD || ''
      }
    },
    payments: {
      stripe: {
        enabled: true,
        publicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ''
      }
    },
    media: {
      cloudinary: {
        enabled: true,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        apiKey: process.env.CLOUDINARY_API_KEY || '',
        apiSecret: process.env.CLOUDINARY_API_SECRET || ''
      }
    },
    system: {
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      debugMode: process.env.NODE_ENV === 'development'
    }
  };
}

// Clear settings cache (useful after settings update)
export function clearSettingsCache() {
  cachedSettings = null;
  lastFetch = 0;
}

// Get specific setting value with fallback
export async function getSetting(path: string, fallback?: any) {
  const settings = await getSettings();

  const keys = path.split('.');
  let value = settings;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback;
    }
  }

  return value || fallback;
}

// Get Stripe configuration
export async function getStripeConfig() {
  const settings = await getSettings();

  return {
    publicKey: settings.payments?.stripe?.publicKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: settings.payments?.stripe?.secretKey || process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: settings.payments?.stripe?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '',
    enabled: settings.payments?.stripe?.enabled ?? true
  };
}

// Get email configuration
export async function getEmailConfig() {
  const settings = await getSettings();

  return {
    fromName: settings.email?.fromName || process.env.EMAIL_FROM_NAME || 'dafinazeqiri.tickets',
    fromAddress: settings.email?.fromAddress || process.env.EMAIL_FROM_ADDRESS || 'info@dafinazeqiri.tickets',
    replyToAddress: settings.email?.replyToAddress || process.env.EMAIL_REPLY_TO || 'info@dafinazeqiri.tickets',
    smtp: {
      host: settings.email?.smtp?.host || process.env.SMTP_HOST || '',
      port: settings.email?.smtp?.port || parseInt(process.env.SMTP_PORT || '587'),
      secure: settings.email?.smtp?.secure ?? (process.env.SMTP_SECURE === 'true'),
      username: settings.email?.smtp?.username || process.env.SMTP_USERNAME || '',
      password: settings.email?.smtp?.password || process.env.SMTP_PASSWORD || ''
    }
  };
}

// Get Cloudinary configuration
export async function getCloudinaryConfig() {
  const settings = await getSettings();

  return {
    cloudName: settings.media?.cloudinary?.cloudName || process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: settings.media?.cloudinary?.apiKey || process.env.CLOUDINARY_API_KEY || '',
    apiSecret: settings.media?.cloudinary?.apiSecret || process.env.CLOUDINARY_API_SECRET || '',
    folder: settings.media?.cloudinary?.folder || 'biletara',
    enabled: settings.media?.cloudinary?.enabled ?? true
  };
}

// Get general site configuration
export async function getSiteConfig() {
  const settings = await getSettings();

  return {
    siteName: settings.general?.siteName || 'BiletAra',
    siteDescription: settings.general?.siteDescription || 'Event booking platform',
    siteUrl: settings.general?.siteUrl || process.env.NEXT_PUBLIC_DOMAIN || 'https://dafinazeqiri.tickets',
    currency: settings.general?.currency || 'EUR',
    timezone: settings.general?.timezone || 'UTC',
    logoUrl: settings.general?.logoUrl || '',
    faviconUrl: settings.general?.faviconUrl || ''
  };
}

// Check if maintenance mode is enabled
export async function isMaintenanceMode() {
  const settings = await getSettings();
  return settings.system?.maintenanceMode || process.env.MAINTENANCE_MODE === 'true';
}

// Get system configuration
export async function getSystemConfig() {
  const settings = await getSettings();

  return {
    maintenanceMode: settings.system?.maintenanceMode || process.env.MAINTENANCE_MODE === 'true',
    maintenanceMessage: settings.system?.maintenanceMessage || 'We are currently performing maintenance. Please check back later.',
    debugMode: settings.system?.debugMode ?? (process.env.NODE_ENV === 'development'),
    logLevel: settings.system?.logLevel || 'info'
  };
}