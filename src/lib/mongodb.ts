import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}


type MongooseGlobal = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongoose: MongooseGlobal | undefined;
}


const cached: MongooseGlobal = global.mongoose || { conn: null, promise: null };
global.mongoose = cached;

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      minPoolSize: 5, // Maintain at least 5 socket connections
    };
    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
