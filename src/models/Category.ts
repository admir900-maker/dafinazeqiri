import mongoose from 'mongoose';

export interface ICategory extends mongoose.Document {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  isActive: boolean;
  eventCount: number;
  sortOrder: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: false,
    maxlength: 500
  },
  icon: {
    type: String,
    required: false,
    default: '🎭' // Default emoji icon
  },
  color: {
    type: String,
    required: false,
    default: '#8B5CF6' // Default purple color
  },
  image: {
    type: String,
    required: false // Cloudinary image URL
  },
  isActive: {
    type: Boolean,
    default: true
  },
  eventCount: {
    type: Number,
    default: 0,
    min: 0
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  metaTitle: {
    type: String,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    maxlength: 160
  },
}, {
  timestamps: true
});

// Create indexes for better performance
CategorySchema.index({ isActive: 1, sortOrder: 1 });
CategorySchema.index({ name: 'text', description: 'text' });

// Middleware to generate slug from name if not provided
CategorySchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for URL path
CategorySchema.virtual('path').get(function () {
  return `/categories/${this.slug}`;
});

// Method to update event count
CategorySchema.methods.updateEventCount = async function () {
  const Event = mongoose.model('Event');
  const count = await Event.countDocuments({
    category: this._id,
    date: { $gte: new Date() } // Only count future events
  });
  this.eventCount = count;
  return this.save();
};

const Category = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export default Category;