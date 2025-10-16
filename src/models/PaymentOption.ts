import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentOption extends Document {
  name: string;
  displayName: string;
  type: 'card' | 'bank_transfer' | 'digital_wallet' | 'cash' | 'crypto' | 'other';
  provider: string;
  isActive: boolean;
  isDefault: boolean;
  configuration: {
    apiKey?: string;
    secretKey?: string;
    merchantId?: string;
    accountNumber?: string;
    bankCode?: string;
    walletAddress?: string;
    webhookUrl?: string;
    returnUrl?: string;
    cancelUrl?: string;
    currency?: string[];
    minAmount?: number;
    maxAmount?: number;
    processingFee?: number;
    processingFeeType?: 'fixed' | 'percentage';
    [key: string]: any;
  };
  supportedCurrencies: string[];
  icon?: string;
  color?: string;
  description?: string;
  instructions?: string;
  priority: number;
  testMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentOptionSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['card', 'bank_transfer', 'digital_wallet', 'cash', 'crypto', 'other']
  },
  provider: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  configuration: {
    type: Schema.Types.Mixed,
    default: {}
  },
  supportedCurrencies: [{
    type: String,
    uppercase: true,
    default: ['EUR']
  }],
  icon: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    trim: true,
    default: '#6366f1'
  },
  description: {
    type: String,
    trim: true
  },
  instructions: {
    type: String,
    trim: true
  },
  priority: {
    type: Number,
    default: 0
  },
  testMode: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'paymentoptions'
});

// Indexes
PaymentOptionSchema.index({ isActive: 1, priority: -1 });
PaymentOptionSchema.index({ type: 1 });

// Ensure only one default payment option per type
PaymentOptionSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    const Model = this.constructor as any;
    await Model.updateMany(
      { type: this.type, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

export default mongoose.models.PaymentOption || mongoose.model<IPaymentOption>('PaymentOption', PaymentOptionSchema);