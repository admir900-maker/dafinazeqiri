import { connectToDatabase } from '@/lib/mongodb';
import Category from '@/models/Category';
import Event from '@/models/Event';
import { hash } from 'bcryptjs';

// Sample categories
const sampleCategories = [
  {
    name: 'Music & Concerts',
    slug: 'music-concerts',
    description: 'Live music performances, concerts, and musical events',
    icon: '🎵',
    color: '#FF6B6B',
    isActive: true
  },
  {
    name: 'Technology & Innovation',
    slug: 'technology-innovation',
    description: 'Tech conferences, workshops, and innovation showcases',
    icon: '💻',
    color: '#4ECDC4',
    isActive: true
  },
  {
    name: 'Arts & Culture',
    slug: 'arts-culture',
    description: 'Art exhibitions, cultural events, and creative showcases',
    icon: '🎨',
    color: '#45B7D1',
    isActive: true
  },
  {
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Sporting events, fitness classes, and athletic competitions',
    icon: '⚽',
    color: '#96CEB4',
    isActive: true
  },
  {
    name: 'Food & Dining',
    slug: 'food-dining',
    description: 'Culinary experiences, food festivals, and dining events',
    icon: '🍽️',
    color: '#FFEAA7',
    isActive: true
  },
  {
    name: 'Business & Networking',
    slug: 'business-networking',
    description: 'Business conferences, networking events, and professional meetups',
    icon: '💼',
    color: '#DDA0DD',
    isActive: true
  },
  {
    name: 'Education & Learning',
    slug: 'education-learning',
    description: 'Educational workshops, seminars, and learning experiences',
    icon: '📚',
    color: '#98D8C8',
    isActive: true
  },
  {
    name: 'Entertainment',
    slug: 'entertainment',
    description: 'Comedy shows, theater performances, and entertainment events',
    icon: '🎭',
    color: '#F7DC6F',
    isActive: true
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Wellness workshops, health seminars, and mindfulness events',
    icon: '🧘',
    color: '#AED6F1',
    isActive: true
  },
  {
    name: 'Travel & Adventure',
    slug: 'travel-adventure',
    description: 'Travel meetups, adventure tours, and exploration events',
    icon: '✈️',
    color: '#F8C471',
    isActive: true
  }
];

// Sample events
const createSampleEvents = (categories: any[]) => {
  const events = [
    // Music & Concerts Events
    {
      title: 'Summer Music Festival 2025',
      description: 'Join us for an unforgettable weekend of live music featuring local and international artists across multiple stages. Experience diverse genres from rock to electronic dance music.',
      category: categories.find(c => c.slug === 'music-concerts')?._id,
      date: new Date('2025-07-15'),
      time: '18:00',
      endDate: new Date('2025-07-17'),
      location: 'Central Park Amphitheater',
      venue: 'Main Stage Arena',
      address: '123 Park Avenue',
      city: 'New York',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
      price: 150.00,
      currency: 'USD',
      capacity: 5000,
      ticketTypes: [
        {
          name: 'General Admission',
          price: 150.00,
          capacity: 3000,
          description: 'General access to all festival areas',
          color: '#FF6B6B'
        },
        {
          name: 'VIP Pass',
          price: 350.00,
          capacity: 500,
          description: 'VIP area access, complimentary drinks, premium viewing',
          color: '#FFD93D'
        },
        {
          name: 'Early Bird',
          price: 120.00,
          capacity: 1000,
          description: 'Discounted early bird pricing',
          color: '#6BCF7F'
        }
      ],
      tags: ['music', 'festival', 'outdoor', 'weekend'],
      isActive: true,
      featured: true
    },
    {
      title: 'Jazz Evening at Blue Note',
      description: 'An intimate jazz performance featuring renowned musicians in the cozy atmosphere of Blue Note jazz club.',
      category: categories.find(c => c.slug === 'music-concerts')?._id,
      date: new Date('2025-11-20'),
      time: '20:00',
      location: 'Blue Note Jazz Club',
      venue: 'Main Hall',
      address: '456 Jazz Street',
      city: 'New Orleans',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800',
      price: 75.00,
      currency: 'USD',
      capacity: 200,
      ticketTypes: [
        {
          name: 'Standard Seating',
          price: 75.00,
          capacity: 150,
          description: 'Regular seating with great acoustics',
          color: '#4A90E2'
        },
        {
          name: 'Premium Table',
          price: 120.00,
          capacity: 50,
          description: 'Table service with complimentary appetizers',
          color: '#F5A623'
        }
      ],
      tags: ['jazz', 'music', 'intimate', 'nightlife'],
      isActive: true,
      featured: false
    },

    // Technology Events
    {
      title: 'TechConf 2025: Future of AI',
      description: 'Leading tech conference exploring the latest developments in artificial intelligence, machine learning, and emerging technologies.',
      category: categories.find(c => c.slug === 'technology-innovation')?._id,
      date: new Date('2025-09-10'),
      time: '09:00',
      endDate: new Date('2025-09-12'),
      location: 'San Francisco Convention Center',
      venue: 'Hall A & B',
      address: '747 Howard St',
      city: 'San Francisco',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
      price: 499.00,
      currency: 'USD',
      capacity: 2000,
      ticketTypes: [
        {
          name: 'Conference Pass',
          price: 499.00,
          capacity: 1500,
          description: 'Access to all sessions and networking events',
          color: '#4ECDC4'
        },
        {
          name: 'Workshop Bundle',
          price: 799.00,
          capacity: 300,
          description: 'Conference + hands-on workshops',
          color: '#FF6B6B'
        },
        {
          name: 'Student Discount',
          price: 199.00,
          capacity: 200,
          description: 'Special pricing for students with valid ID',
          color: '#95E1D3'
        }
      ],
      tags: ['technology', 'AI', 'conference', 'networking'],
      isActive: true,
      featured: true
    },

    // Arts & Culture Events
    {
      title: 'Modern Art Exhibition: Digital Dreams',
      description: 'Explore the intersection of technology and art in this groundbreaking exhibition featuring digital installations and interactive artworks.',
      category: categories.find(c => c.slug === 'arts-culture')?._id,
      date: new Date('2025-08-05'),
      time: '10:00',
      endDate: new Date('2025-10-05'),
      location: 'Metropolitan Museum of Art',
      venue: 'Contemporary Wing',
      address: '1000 5th Ave',
      city: 'New York',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800',
      price: 25.00,
      currency: 'USD',
      capacity: 500,
      ticketTypes: [
        {
          name: 'General Admission',
          price: 25.00,
          capacity: 400,
          description: 'Standard museum entry',
          color: '#45B7D1'
        },
        {
          name: 'Guided Tour',
          price: 45.00,
          capacity: 100,
          description: 'Expert-led tour of the exhibition',
          color: '#F7DC6F'
        }
      ],
      tags: ['art', 'exhibition', 'digital', 'culture'],
      isActive: true,
      featured: false
    },

    // Sports Events
    {
      title: 'City Marathon Championship',
      description: 'Annual city marathon featuring professional athletes and amateur runners. Multiple distance categories available.',
      category: categories.find(c => c.slug === 'sports-fitness')?._id,
      date: new Date('2025-10-15'),
      time: '07:00',
      location: 'City Center',
      venue: 'Downtown Route',
      address: 'Starting at City Hall',
      city: 'Boston',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800',
      price: 50.00,
      currency: 'USD',
      capacity: 10000,
      ticketTypes: [
        {
          name: 'Full Marathon',
          price: 75.00,
          capacity: 3000,
          description: '42.2km race registration',
          color: '#96CEB4'
        },
        {
          name: 'Half Marathon',
          price: 50.00,
          capacity: 5000,
          description: '21.1km race registration',
          color: '#FECA57'
        },
        {
          name: '10K Fun Run',
          price: 25.00,
          capacity: 2000,
          description: '10km recreational run',
          color: '#FF9FF3'
        }
      ],
      tags: ['marathon', 'running', 'sports', 'fitness'],
      isActive: true,
      featured: true
    },

    // Food Events
    {
      title: 'International Food Festival',
      description: 'Taste cuisines from around the world prepared by renowned chefs and local food artisans.',
      category: categories.find(c => c.slug === 'food-dining')?._id,
      date: new Date('2025-06-20'),
      time: '11:00',
      endDate: new Date('2025-06-22'),
      location: 'Riverside Park',
      venue: 'Festival Grounds',
      address: '789 River Road',
      city: 'Chicago',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      price: 35.00,
      currency: 'USD',
      capacity: 3000,
      ticketTypes: [
        {
          name: 'Day Pass',
          price: 35.00,
          capacity: 2000,
          description: 'Single day festival access',
          color: '#FFEAA7'
        },
        {
          name: 'Weekend Pass',
          price: 80.00,
          capacity: 800,
          description: 'All three days access',
          color: '#FD79A8'
        },
        {
          name: 'VIP Foodie Experience',
          price: 150.00,
          capacity: 200,
          description: 'Exclusive tastings and chef meet & greets',
          color: '#FDCB6E'
        }
      ],
      tags: ['food', 'international', 'festival', 'culinary'],
      isActive: true,
      featured: false
    },

    // Business Events
    {
      title: 'Startup Pitch Competition',
      description: 'Watch innovative startups pitch their ideas to leading investors and industry experts.',
      category: categories.find(c => c.slug === 'business-networking')?._id,
      date: new Date('2025-11-08'),
      time: '14:00',
      location: 'Innovation Hub',
      venue: 'Main Auditorium',
      address: '321 Startup Ave',
      city: 'Austin',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
      price: 100.00,
      currency: 'USD',
      capacity: 500,
      ticketTypes: [
        {
          name: 'Attendee Pass',
          price: 100.00,
          capacity: 400,
          description: 'Watch presentations and network',
          color: '#DDA0DD'
        },
        {
          name: 'Investor Access',
          price: 250.00,
          capacity: 100,
          description: 'Exclusive investor lounge and meetings',
          color: '#A29BFE'
        }
      ],
      tags: ['startup', 'business', 'networking', 'innovation'],
      isActive: true,
      featured: false
    },

    // Educational Events
    {
      title: 'Digital Marketing Masterclass',
      description: 'Comprehensive workshop covering modern digital marketing strategies, social media, and analytics.',
      category: categories.find(c => c.slug === 'education-learning')?._id,
      date: new Date('2025-09-25'),
      time: '09:30',
      endDate: new Date('2025-09-26'),
      location: 'Learning Center',
      venue: 'Conference Room A',
      address: '555 Education Blvd',
      city: 'Seattle',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1553028826-f4804151e466?w=800',
      price: 299.00,
      currency: 'USD',
      capacity: 150,
      ticketTypes: [
        {
          name: 'Workshop Access',
          price: 299.00,
          capacity: 120,
          description: 'Two-day intensive workshop',
          color: '#98D8C8'
        },
        {
          name: 'Premium Package',
          price: 499.00,
          capacity: 30,
          description: 'Workshop + 1-on-1 consultation',
          color: '#74B9FF'
        }
      ],
      tags: ['marketing', 'education', 'workshop', 'digital'],
      isActive: true,
      featured: false
    },

    // Entertainment Events
    {
      title: 'Comedy Night: Stand-up Spectacular',
      description: 'An evening of laughter featuring top comedians from around the country performing their best material.',
      category: categories.find(c => c.slug === 'entertainment')?._id,
      date: new Date('2025-12-14'),
      time: '20:00',
      location: 'Comedy Club Central',
      venue: 'Main Stage',
      address: '888 Laugh Lane',
      city: 'Los Angeles',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1465514254768-e4a5a6a94ee7?w=800',
      price: 45.00,
      currency: 'USD',
      capacity: 300,
      ticketTypes: [
        {
          name: 'Standard Seating',
          price: 45.00,
          capacity: 250,
          description: 'General admission seating',
          color: '#F7DC6F'
        },
        {
          name: 'Front Row Premium',
          price: 85.00,
          capacity: 50,
          description: 'Front row seats with meet & greet',
          color: '#FF7675'
        }
      ],
      tags: ['comedy', 'entertainment', 'nightlife', 'standup'],
      isActive: true,
      featured: false
    },

    // Health & Wellness Events
    {
      title: 'Mindfulness & Meditation Retreat',
      description: 'Three-day wellness retreat focusing on mindfulness practices, meditation, and mental health awareness.',
      category: categories.find(c => c.slug === 'health-wellness')?._id,
      date: new Date('2025-08-30'),
      time: '08:00',
      endDate: new Date('2025-09-01'),
      location: 'Serenity Wellness Center',
      venue: 'Meditation Hall',
      address: '200 Peaceful Path',
      city: 'Sedona',
      country: 'USA',
      posterImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      price: 450.00,
      currency: 'USD',
      capacity: 100,
      ticketTypes: [
        {
          name: 'Full Retreat',
          price: 450.00,
          capacity: 80,
          description: 'All sessions, meals, and accommodation',
          color: '#AED6F1'
        },
        {
          name: 'Day Pass',
          price: 180.00,
          capacity: 20,
          description: 'Single day attendance',
          color: '#85C1E9'
        }
      ],
      tags: ['wellness', 'meditation', 'health', 'retreat'],
      isActive: true,
      featured: true
    }
  ];

  return events;
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Category.deleteMany({});
    await Event.deleteMany({});
    console.log('✅ Existing data cleared');

    // Insert categories
    console.log('📂 Inserting categories...');
    const insertedCategories = await Category.insertMany(sampleCategories);
    console.log(`✅ Inserted ${insertedCategories.length} categories`);

    // Insert events
    console.log('🎫 Inserting events...');
    const sampleEvents = createSampleEvents(insertedCategories);
    const insertedEvents = await Event.insertMany(sampleEvents);
    console.log(`✅ Inserted ${insertedEvents.length} events`);

    // Update category event counts
    console.log('🔄 Updating category event counts...');
    for (const category of insertedCategories) {
      const eventCount = await Event.countDocuments({ category: category._id });
      await Category.findByIdAndUpdate(category._id, { eventCount });
    }
    console.log('✅ Category event counts updated');

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Categories: ${insertedCategories.length}`);
    console.log(`   Events: ${insertedEvents.length}`);
    console.log('\n💡 You can now:');
    console.log('   - Browse events at http://localhost:3000/events');
    console.log('   - View categories at http://localhost:3000/categories');
    console.log('   - Access admin panel at http://localhost:3000/admin');

    return {
      categories: insertedCategories.length,
      events: insertedEvents.length
    };

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

export default seedDatabase;