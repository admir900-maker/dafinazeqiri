import mongoose, { Schema, Document } from 'mongoose';

export interface IValidationLog extends Document {
  _id: string;
  validatorId: string;
  validatorName: string;
  bookingId: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  validationType: 'entry' | 'exit' | 'general';
  status: 'validated' | 'rejected' | 'flagged';
  notes?: string;
  location?: string;
  deviceInfo?: {
    userAgent: string;
    ip: string;
  };
  metadata?: {
    ticketType: string;
    ticketQuantity: number;
    scanMethod: 'qr' | 'manual' | 'nfc';
  };
  createdAt: Date;
  updatedAt: Date;
}

const ValidationLogSchema = new Schema<IValidationLog>({
  validatorId: {
    type: String,
    required: true
  },
  validatorName: {
    type: String,
    required: true
  },
  bookingId: {
    type: String,
    required: true
  },
  eventId: {
    type: String,
    required: true
  },
  eventTitle: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  validationType: {
    type: String,
    enum: ['entry', 'exit', 'general'],
    required: true,
    default: 'entry'
  },
  status: {
    type: String,
    enum: ['validated', 'rejected', 'flagged'],
    required: true
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  location: {
    type: String,
    maxlength: 200
  },
  deviceInfo: {
    userAgent: String,
    ip: String
  },
  metadata: {
    ticketType: String,
    ticketQuantity: Number,
    scanMethod: {
      type: String,
      enum: ['qr', 'manual', 'nfc'],
      default: 'qr'
    }
  }
}, {
  timestamps: true,
  collection: 'validation_logs'
});

// Indexes for better query performance
ValidationLogSchema.index({ validatorId: 1, createdAt: -1 });
ValidationLogSchema.index({ eventId: 1, createdAt: -1 });
ValidationLogSchema.index({ bookingId: 1 });
ValidationLogSchema.index({ userId: 1, createdAt: -1 });
ValidationLogSchema.index({ status: 1, createdAt: -1 });
ValidationLogSchema.index({ validationType: 1, createdAt: -1 });

const ValidationLog = mongoose.models.ValidationLog || mongoose.model<IValidationLog>('ValidationLog', ValidationLogSchema);

export default ValidationLog;