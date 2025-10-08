import mongoose from 'mongoose';

export interface BookingTicket {
  ticketName: string;
  ticketId: string;
  qrCode: string;
  price: number;
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
  paymentIntentId?: string;
  paymentMethod: 'stripe' | 'direct';
  bookingReference: string;
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
  paymentIntentId: { type: String, unique: true, sparse: true },
  paymentMethod: { type: String, required: true, enum: ['stripe', 'direct'] },
  bookingReference: { type: String, required: true, unique: true },
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