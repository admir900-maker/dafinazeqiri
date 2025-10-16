import mongoose from 'mongoose';

export interface BookingTicket {
  ticketName: string;
  ticketId: string;
  qrCode: string;
  price: number;
  color?: string;
  isUsed: boolean;
  usedAt?: Date;
  validatedBy?: string;
}

export interface IBooking extends mongoose.Document {
  _id: string;
  userId: string;
  eventId: string;
  tickets: BookingTicket[];
  totalAmount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentIntentId?: string;
  stripePaymentIntentId?: string;
  raiffeisenPaymentId?: string;
  paymentMethod: 'stripe' | 'raiffeisen' | 'direct';
  paymentDate?: Date;
  bookingReference: string;
  customerEmail?: string;
  customerName?: string;
  createdAt: Date;
  confirmedAt?: Date;
  emailSent: boolean;
  notes?: string;
}

const BookingTicketSchema = new mongoose.Schema({
  ticketName: { type: String, required: true },
  ticketId: { type: String, required: true },
  qrCode: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  color: { type: String },
  isUsed: { type: Boolean, default: false },
  usedAt: { type: Date },
  validatedBy: { type: String }, // userId of validator
});

const BookingSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  tickets: [BookingTicketSchema],
  totalAmount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'EUR' },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentIntentId: { type: String, unique: true, sparse: true },
  stripePaymentIntentId: { type: String, unique: true, sparse: true },
  raiffeisenPaymentId: { type: String, unique: true, sparse: true },
  paymentMethod: { type: String, required: true, enum: ['stripe', 'raiffeisen', 'direct'] },
  paymentDate: { type: Date },
  bookingReference: { type: String, required: true, unique: true },
  customerEmail: { type: String },
  customerName: { type: String },
  createdAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date },
  emailSent: { type: Boolean, default: false },
  notes: { type: String },
});

// Create compound indexes for better query performance
BookingSchema.index({ userId: 1, createdAt: -1 });
BookingSchema.index({ eventId: 1, status: 1 });
// Note: bookingReference already has unique: true in schema definition
// Note: tickets.qrCode already has unique: true in schema definition

const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;