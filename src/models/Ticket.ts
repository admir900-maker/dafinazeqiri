import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: String, required: true }, // Clerk user ID
  qrCode: { type: String, required: true, unique: true },
  isValidated: { type: Boolean, default: false },
  validatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
