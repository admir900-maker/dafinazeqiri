import mongoose from 'mongoose';

const PaymentSettingsSchema = new mongoose.Schema({
  // Payment Provider Selection
  paymentProvider: { type: String, default: 'stripe', enum: ['stripe', 'raiffeisen', 'both'] },

  // Stripe Settings
  stripePublishableKey: { type: String, required: false },
  stripeSecretKey: { type: String, required: false },
  stripeWebhookSecret: { type: String, required: false },

  // Raiffeisen Bank Kosovo Settings
  raiffeisenMerchantId: { type: String, required: false },
  raiffeisenApiKey: { type: String, required: false },
  raiffeisenSecretKey: { type: String, required: false },
  raiffeisenEnvironment: { type: String, default: 'sandbox', enum: ['sandbox', 'production'] },
  raiffeisenWebhookSecret: { type: String, required: false },
  raiffeisenCallbackUrl: { type: String, required: false },
  raiffeisenReturnUrl: { type: String, required: false },

  platformFee: { type: Number, default: 5 },
  currency: { type: String, default: 'eur', enum: ['eur', 'usd', 'EUR', 'USD'] },
  currencySymbol: { type: String, default: '€' },
  isActive: { type: Boolean, default: true },

  // Validation Window Settings
  validationWindowDays: { type: Number, default: 1 }, // How many days before/after event to allow validation
  validationStartDays: { type: Number, default: 0 }, // How many days before event to start allowing validation
  allowValidationAnytime: { type: Boolean, default: false }, // Allow validation regardless of event date

  // SMTP Settings
  smtpHost: { type: String, required: false },
  smtpPort: { type: Number, default: 587 },
  smtpSecure: { type: Boolean, default: false },
  smtpUser: { type: String, required: false },
  smtpPass: { type: String, required: false },
  senderEmail: { type: String, required: false },
  senderName: { type: String, default: 'BiletAra' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
PaymentSettingsSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const PaymentSettings = mongoose.models.PaymentSettings || mongoose.model('PaymentSettings', PaymentSettingsSchema);

export default PaymentSettings;