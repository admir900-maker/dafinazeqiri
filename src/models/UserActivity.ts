import mongoose, { Schema, Document } from 'mongoose';

export interface IUserActivity extends Document {
  userId: string;
  userEmail?: string;
  userName?: string;
  sessionId?: string;
  action: string;
  description: string;
  eventId?: mongoose.Types.ObjectId;
  eventTitle?: string;
  ticketType?: string;
  quantity?: number;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  location?: string;
  referrer?: string;
  duration?: number; // in milliseconds
  metadata?: {
    [key: string]: any;
  };
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserActivitySchema: Schema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    index: true
  },
  userName: {
    type: String
  },
  sessionId: {
    type: String,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'page_view',
      'event_view',
      'ticket_selection',
      'add_to_cart',
      'remove_from_cart',
      'checkout_started',
      'payment_method_selected',
      'payment_attempted',
      'payment_successful',
      'payment_failed',
      'booking_created',
      'booking_cancelled',
      'email_sent',
      'login',
      'logout',
      'signup',
      'search',
      'filter_applied',
      'download_ticket',
      'share_event',
      'favorite_added',
      'favorite_removed',
      'review_submitted',
      'contact_form_submitted',
      'newsletter_signup',
      'error_occurred'
    ],
    index: true
  },
  description: {
    type: String,
    required: true
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    index: true
  },
  eventTitle: {
    type: String
  },
  ticketType: {
    type: String
  },
  quantity: {
    type: Number,
    min: 0
  },
  amount: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'raiffeisen', 'cash', 'bank_transfer', 'paypal']
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending', 'cancelled'],
    default: 'success',
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  device: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown']
  },
  browser: {
    type: String
  },
  location: {
    type: String
  },
  referrer: {
    type: String
  },
  duration: {
    type: Number,
    min: 0
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'useractivities'
});

// Indexes for better query performance
UserActivitySchema.index({ userId: 1, createdAt: -1 });
UserActivitySchema.index({ action: 1, createdAt: -1 });
UserActivitySchema.index({ eventId: 1, createdAt: -1 });
UserActivitySchema.index({ status: 1, createdAt: -1 });
UserActivitySchema.index({ createdAt: -1 });

// TTL index to automatically delete old activities after 1 year
UserActivitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.models.UserActivity || mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);