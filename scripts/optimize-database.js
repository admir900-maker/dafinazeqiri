const mongoose = require('mongoose');

// Load environment variables
try {
  require('dotenv').config();
} catch (error) {
  console.log('⚠️ dotenv not available, make sure MONGODB_URI is set as environment variable');
}

// Simple MongoDB connection function
async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is not defined.');
    console.log('💡 Please set your MongoDB connection string in one of these ways:');
    console.log('   1. Add MONGODB_URI=your_connection_string to your .env.local file');
    console.log('   2. Set it as an environment variable: set MONGODB_URI=your_connection_string');
    console.log('   3. Run: npm run optimize:db -- --uri="your_connection_string"');
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const opts = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    maxIdleTimeMS: 30000,
    minPoolSize: 5,
  };

  await mongoose.connect(MONGODB_URI, opts);
  return mongoose.connection;
}

async function optimizeDatabase() {
  try {
    console.log('🚀 Starting database optimization...');

    await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    // Events collection indexes
    console.log('📅 Optimizing Events collection...');

    try {
      // Index for date queries (most common for filtering upcoming events)
      await db.collection('events').createIndex({ date: 1 });
      console.log('✅ Created date index');

      // Compound index for category and date queries
      await db.collection('events').createIndex({ category: 1, date: 1 });
      console.log('✅ Created category + date index');

      // Index for search functionality
      await db.collection('events').createIndex({
        title: 'text',
        description: 'text',
        artists: 'text',
        location: 'text',
        venue: 'text',
        tags: 'text'
      });
      console.log('✅ Created text search index');

      // Index for location-based queries
      await db.collection('events').createIndex({ location: 1 });
      console.log('✅ Created location index');

      // Index for venue queries
      await db.collection('events').createIndex({ venue: 1 });
      console.log('✅ Created venue index');
    } catch (error) {
      console.log('ℹ️ Some events indexes may already exist:', error.message);
    }

    // Bookings collection indexes
    console.log('\n🎫 Optimizing Bookings collection...');

    try {
      // Index for event-based queries (used in ticket availability calculations)
      await db.collection('bookings').createIndex({
        eventId: 1,
        status: 1,
        paymentStatus: 1
      });
      console.log('✅ Created bookings compound index');

      // Index for user bookings
      await db.collection('bookings').createIndex({ userId: 1, createdAt: -1 });
      console.log('✅ Created user bookings index');

      // Index for payment processing
      await db.collection('bookings').createIndex({ paymentIntentId: 1 });
      console.log('✅ Created payment intent index');

      // Index for booking reference queries
      await db.collection('bookings').createIndex({ bookingReference: 1 });
      console.log('✅ Created booking reference index');
    } catch (error) {
      console.log('ℹ️ Some booking indexes may already exist:', error.message);
    }

    // Categories collection indexes
    console.log('\n🏷️ Optimizing Categories collection...');

    try {
      // Index for slug-based queries
      await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
      console.log('✅ Created categories slug index');

      // Index for name queries
      await db.collection('categories').createIndex({ name: 1 });
      console.log('✅ Created categories name index');
    } catch (error) {
      console.log('ℹ️ Some category indexes may already exist:', error.message);
    }

    // Tickets collection indexes (if exists)
    console.log('\n🎟️ Optimizing Tickets collection...');

    try {
      // Index for event-based ticket queries
      await db.collection('tickets').createIndex({ eventId: 1 });
      console.log('✅ Created tickets event index');

      // Index for booking-based queries
      await db.collection('tickets').createIndex({ bookingId: 1 });
      console.log('✅ Created tickets booking index');

      // Index for QR code lookups
      await db.collection('tickets').createIndex({ qrCode: 1 }, { unique: true });
      console.log('✅ Created tickets QR code index');
    } catch (error) {
      console.log('ℹ️ Some ticket indexes may already exist:', error.message);
    }

    console.log('\n✅ Database optimization completed successfully!');
    console.log('📊 All indexes have been created for improved query performance.');

    // Display created indexes for verification
    const collections = ['events', 'bookings', 'categories', 'tickets'];

    for (const collectionName of collections) {
      try {
        const indexes = await db.collection(collectionName).indexes();
        console.log(`\n📋 ${collectionName} indexes:`);
        indexes.forEach((index, i) => {
          console.log(`  ${i + 1}. ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''}`);
        });
      } catch (error) {
        console.log(`⚠️ Collection ${collectionName} not found or error accessing indexes`);
      }
    }

  } catch (error) {
    console.error('❌ Error optimizing database:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Performance analysis function
async function analyzeQueryPerformance() {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection not established');
    }

    console.log('📈 Analyzing query performance...');

    // Get collection stats
    const collections = ['events', 'bookings', 'categories'];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        const indexes = await collection.indexes();

        console.log(`\n📊 ${collectionName} collection stats:`);
        console.log(`  Documents: ${count}`);
        console.log(`  Indexes: ${indexes.length}`);

        // Sample document for size estimation
        const sampleDoc = await collection.findOne();
        if (sampleDoc) {
          const docSize = JSON.stringify(sampleDoc).length;
          console.log(`  Estimated avg document size: ${docSize} bytes`);
          console.log(`  Estimated collection size: ${((count * docSize) / 1024 / 1024).toFixed(2)} MB`);
        }
      } catch (error) {
        console.log(`⚠️ Could not get stats for ${collectionName}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing performance:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// Check command line arguments
const args = process.argv.slice(2);

// Look for URI in command line arguments
const uriArg = args.find(arg => arg.startsWith('--uri='));
if (uriArg) {
  process.env.MONGODB_URI = uriArg.split('=')[1];
}

if (args.includes('--analyze')) {
  analyzeQueryPerformance()
    .then(() => {
      console.log('🎉 Performance analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Analysis failed:', error);
      process.exit(1);
    });
} else {
  // Run optimization
  optimizeDatabase()
    .then(() => {
      console.log('🎉 Database optimization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Optimization failed:', error);
      process.exit(1);
    });
}