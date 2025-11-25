import mongoose from 'mongoose';

const GiftTicketSchema = new mongoose.Schema({
  recipientEmail: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  ticketType: { type: String, required: true },
  price: { type: Number, required: true }, // Display price only (no payment required)
  currency: { type: String, default: 'EUR' },
  ticketId: { type: String, required: true, unique: true, index: true }, // Used as QR code for validation
  bookingReference: { type: String, required: true },
  eventDate: { type: Date }, // Optional event date
  pdfBase64: { type: String }, // Store generated PDF (base64) for later resend if needed
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' }, // Email send status only
  adminUserId: { type: String, required: true }, // Clerk admin who generated it

  // QR Code Validation fields (same as regular tickets)
  isValidated: { type: Boolean, default: false },
  validatedAt: { type: Date },
  validatedBy: { type: String }, // Staff/validator user ID

  sentAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.GiftTicket || mongoose.model('GiftTicket', GiftTicketSchema);