import mongoose from 'mongoose';

const TicketTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  capacity: { type: Number, required: true },
  availableTickets: { type: Number, required: true },
  description: { type: String },
  color: { type: String, default: '#3B82F6' },
});

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String }, // Time field for events
  endDate: { type: Date },
  location: { type: String, required: true },
  venue: { type: String },
  address: { type: String },
  city: { type: String },
  country: { type: String },

  // Media
  posterImage: { type: String },
  bannerImage: { type: String },
  youtubeTrailer: { type: String },
  gallery: [{ type: String }],

  // Ticket types
  ticketTypes: [TicketTypeSchema],

  // Legacy fields for backward compatibility
  price: { type: Number },
  capacity: { type: Number },
  availableTickets: { type: Number },

  // Event details
  category: { type: String, enum: ['concert', 'festival', 'theater', 'sports', 'comedy', 'conference', 'other'], default: 'concert' },
  ageLimit: { type: Number, min: 0 },
  duration: { type: Number }, // in minutes
  language: { type: String },
  artists: [{ type: String }],
  organizer: { type: String },
  status: { type: String, enum: ['draft', 'published', 'cancelled', 'sold-out'], default: 'published' },
  maxCapacity: { type: Number }, // Maximum capacity for the event

  // SEO and social
  tags: [{ type: String }],
  metaDescription: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Event || mongoose.model('Event', EventSchema);
