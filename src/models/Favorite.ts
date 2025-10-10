import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
  _id: string;
  userId: string;
  eventId: string;
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true,
  collection: 'favorites'
});

// Create compound index to prevent duplicate favorites
FavoriteSchema.index({ userId: 1, eventId: 1 }, { unique: true });

const Favorite = mongoose.models.Favorite || mongoose.model<IFavorite>('Favorite', FavoriteSchema);

export default Favorite;