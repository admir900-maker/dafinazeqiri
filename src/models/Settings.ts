import mongoose from 'mongoose';

export interface ISettings extends mongoose.Document {
  // General Application Settings
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    logoUrl?: string;
    faviconUrl?: string;
    timezone: string;
    language: string;
    currency: string;
    dateFormat: string;
    timeFormat: string;
  };

  // Email Configuration
  email: {
    fromName: string;
    fromAddress: string;
    replyToAddress: string;
    supportEmail: string;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      username: string;
      password: string;
    };
    templates: {
      welcomeEmail: boolean;
      bookingConfirmation: boolean;
      eventReminders: boolean;
      passwordReset: boolean;
    };
  };

  // Payment Gateway Settings
  payments: {
    stripe: {
      enabled: boolean;
      publicKey: string;
      secretKey: string;
      webhookSecret: string;
    };
    raiffeisen: {
      enabled: boolean;
      merchantId: string;
      secretKey: string;
      webhookUrl: string;
    };
    paypal: {
      enabled: boolean;
      clientId: string;
      clientSecret: string;
      sandbox: boolean;
    };
    settings: {
      currency: string;
      taxRate: number;
      processingFee: number;
      refundPolicy: string;
    };
  };

  // Security & Authentication
  security: {
    registrationEnabled: boolean;
    emailVerificationRequired: boolean;
    twoFactorEnabled: boolean;
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    captchaEnabled: boolean;
    captchaSiteKey: string;
    captchaSecretKey: string;
  };

  // Cloudinary Media Settings
  media: {
    cloudinary: {
      enabled: boolean;
      cloudName: string;
      apiKey: string;
      apiSecret: string;
      folder: string;
    };
    maxFileSize: number;
    allowedFileTypes: string[];
    compressionEnabled: boolean;
    compressionQuality: number;
  };

  // Homepage & UI Settings
  homepage: {
    showHeroSection: boolean;
    showFeaturedEvents: boolean;
    showCategories: boolean;
    showStats: boolean;
    heroAutoRotate: boolean;
    heroRotationInterval: number; // seconds
    theme: 'light' | 'dark' | 'auto';
    primaryColor: string;
    accentColor: string;
  };

  // Booking & Event Settings
  booking: {
    defaultCapacity: number;
    advanceBookingDays: number;
    cancellationDeadlineHours: number;
    autoConfirmBookings: boolean;
    waitlistEnabled: boolean;
    maxTicketsPerUser: number;
    qrCodeEnabled: boolean;
    reminderEmailHours: number[];
  };

  // QR Code Validation Settings
  validation: {
    qrCodeEnabled: boolean;
    scannerEnabled: boolean;
    multipleScansAllowed: boolean;
    scanTimeWindow: number; // minutes
    requireValidatorRole: boolean;
    logValidations: boolean;
    offlineValidation: boolean;
    validationTimeout: number; // seconds
    customValidationRules: string[];
    antiReplayEnabled: boolean;
    maxValidationsPerTicket: number;
    validationSoundEnabled: boolean;
    vibrationEnabled: boolean;
    geoLocationRequired: boolean;
    allowedLocations: string[];
  };

  // Analytics & Tracking
  analytics: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    hotjarId?: string;
    cookieConsentEnabled: boolean;
    trackingEnabled: boolean;
  };

  // Social Media Integration
  social: {
    facebook: {
      appId?: string;
      pageUrl?: string;
    };
    twitter: {
      handle?: string;
      apiKey?: string;
    };
    instagram: {
      username?: string;
    };
    linkedin: {
      companyId?: string;
    };
  };

  // Notifications
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    slackWebhook?: string;
    discordWebhook?: string;
    adminAlerts: {
      newBookings: boolean;
      paymentFailures: boolean;
      systemErrors: boolean;
      lowCapacity: boolean;
    };
  };

  // Maintenance & System
  system: {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    backupEnabled: boolean;
    backupFrequency: string;
    cachingEnabled: boolean;
    rateLimitEnabled: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number;
  };

  // Legal & Compliance
  legal: {
    termsOfServiceUrl?: string;
    privacyPolicyUrl?: string;
    cookiePolicyUrl?: string;
    gdprCompliance: boolean;
    dataRetentionDays: number;
    contactEmail: string;
    companyName: string;
    companyAddress: string;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
  version: number;
}

const SettingsSchema = new mongoose.Schema<ISettings>({
  general: {
    siteName: { type: String, default: 'SUPERNOVA' },
    siteDescription: { type: String, default: 'Event booking platform' },
    siteUrl: { type: String, default: 'https://dafinazeqiri.tickets' },
    logoUrl: { type: String },
    faviconUrl: { type: String },
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' },
    currency: { type: String, default: 'EUR' },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, default: '24h' }
  },

  email: {
    fromName: { type: String, default: 'SUPERNOVA' },
    fromAddress: { type: String, default: 'noreply@dafinazeqiri.tickets' },
    replyToAddress: { type: String, default: 'info@dafinazeqiri.tickets' },
    supportEmail: { type: String, default: 'info@dafinazeqiri.tickets' },
    smtp: {
      host: { type: String, default: '' },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      username: { type: String, default: '' },
      password: { type: String, default: '' }
    },
    templates: {
      welcomeEmail: { type: Boolean, default: true },
      bookingConfirmation: { type: Boolean, default: true },
      eventReminders: { type: Boolean, default: true },
      passwordReset: { type: Boolean, default: true }
    }
  },

  payments: {
    stripe: {
      enabled: { type: Boolean, default: false },
      publicKey: { type: String, default: '' },
      secretKey: { type: String, default: '' },
      webhookSecret: { type: String, default: '' }
    },
    raiffeisen: {
      enabled: { type: Boolean, default: false },
      merchantId: { type: String, default: '' },
      secretKey: { type: String, default: '' },
      webhookUrl: { type: String, default: '' }
    },
    paypal: {
      enabled: { type: Boolean, default: false },
      clientId: { type: String, default: '' },
      clientSecret: { type: String, default: '' },
      sandbox: { type: Boolean, default: true }
    },
    settings: {
      currency: { type: String, default: 'EUR' },
      taxRate: { type: Number, default: 0 },
      processingFee: { type: Number, default: 0 },
      refundPolicy: { type: String, default: '7 days' }
    }
  },

  security: {
    registrationEnabled: { type: Boolean, default: true },
    emailVerificationRequired: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
    passwordMinLength: { type: Number, default: 8 },
    sessionTimeout: { type: Number, default: 3600 },
    maxLoginAttempts: { type: Number, default: 5 },
    lockoutDuration: { type: Number, default: 900 },
    captchaEnabled: { type: Boolean, default: false },
    captchaSiteKey: { type: String, default: '' },
    captchaSecretKey: { type: String, default: '' }
  },

  media: {
    cloudinary: {
      enabled: { type: Boolean, default: true },
      cloudName: { type: String, default: '' },
      apiKey: { type: String, default: '' },
      apiSecret: { type: String, default: '' },
      folder: { type: String, default: 'biletara' }
    },
    maxFileSize: { type: Number, default: 10485760 }, // 10MB
    allowedFileTypes: { type: [String], default: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
    compressionEnabled: { type: Boolean, default: true },
    compressionQuality: { type: Number, default: 80 }
  },

  homepage: {
    showHeroSection: { type: Boolean, default: true },
    showFeaturedEvents: { type: Boolean, default: true },
    showCategories: { type: Boolean, default: true },
    showStats: { type: Boolean, default: true },
    heroAutoRotate: { type: Boolean, default: false },
    heroRotationInterval: { type: Number, default: 5 }, // seconds
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    primaryColor: { type: String, default: '#2563eb' },
    accentColor: { type: String, default: '#8b5cf6' }
  },

  booking: {
    defaultCapacity: { type: Number, default: 100 },
    advanceBookingDays: { type: Number, default: 365 },
    cancellationDeadlineHours: { type: Number, default: 24 },
    autoConfirmBookings: { type: Boolean, default: true },
    waitlistEnabled: { type: Boolean, default: true },
    maxTicketsPerUser: { type: Number, default: 10 },
    qrCodeEnabled: { type: Boolean, default: true },
    reminderEmailHours: { type: [Number], default: [24, 2] }
  },

  validation: {
    qrCodeEnabled: { type: Boolean, default: true },
    scannerEnabled: { type: Boolean, default: true },
    multipleScansAllowed: { type: Boolean, default: false },
    scanTimeWindow: { type: Number, default: 60 }, // minutes
    requireValidatorRole: { type: Boolean, default: true },
    logValidations: { type: Boolean, default: true },
    offlineValidation: { type: Boolean, default: false },
    validationTimeout: { type: Number, default: 30 }, // seconds
    customValidationRules: { type: [String], default: [] },
    antiReplayEnabled: { type: Boolean, default: true },
    maxValidationsPerTicket: { type: Number, default: 1 },
    validationSoundEnabled: { type: Boolean, default: true },
    vibrationEnabled: { type: Boolean, default: true },
    geoLocationRequired: { type: Boolean, default: false },
    allowedLocations: { type: [String], default: [] }
  },

  analytics: {
    googleAnalyticsId: { type: String },
    facebookPixelId: { type: String },
    hotjarId: { type: String },
    cookieConsentEnabled: { type: Boolean, default: true },
    trackingEnabled: { type: Boolean, default: true }
  },

  social: {
    facebook: {
      appId: { type: String },
      pageUrl: { type: String }
    },
    twitter: {
      handle: { type: String },
      apiKey: { type: String }
    },
    instagram: {
      username: { type: String }
    },
    linkedin: {
      companyId: { type: String }
    }
  },

  notifications: {
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false },
    pushEnabled: { type: Boolean, default: false },
    slackWebhook: { type: String },
    discordWebhook: { type: String },
    adminAlerts: {
      newBookings: { type: Boolean, default: true },
      paymentFailures: { type: Boolean, default: true },
      systemErrors: { type: Boolean, default: true },
      lowCapacity: { type: Boolean, default: true }
    }
  },

  system: {
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'We are currently performing maintenance. Please check back later.' },
    debugMode: { type: Boolean, default: false },
    logLevel: { type: String, enum: ['error', 'warn', 'info', 'debug'], default: 'info' },
    backupEnabled: { type: Boolean, default: true },
    backupFrequency: { type: String, default: 'daily' },
    cachingEnabled: { type: Boolean, default: true },
    rateLimitEnabled: { type: Boolean, default: true },
    rateLimitRequests: { type: Number, default: 100 },
    rateLimitWindow: { type: Number, default: 900 }
  },

  legal: {
    termsOfServiceUrl: { type: String },
    privacyPolicyUrl: { type: String },
    cookiePolicyUrl: { type: String },
    gdprCompliance: { type: Boolean, default: true },
    dataRetentionDays: { type: Number, default: 365 },
    contactEmail: { type: String, default: 'contact@dafinazeqiri.tickets' },
    companyName: { type: String, default: 'SUPERNOVA Ltd.' },
    companyAddress: { type: String, default: '' }
  },

  updatedBy: { type: String, required: true },
  version: { type: Number, default: 1 }
}, {
  timestamps: true,
  collection: 'settings'
});

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;