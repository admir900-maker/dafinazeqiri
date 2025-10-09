import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Category from '@/models/Category';

// Seed categories data
const seedCategories = [
  {
    name: 'Concerts & Music',
    slug: 'concerts-music',
    description: 'Live music performances, concerts, and musical events across all genres.',
    icon: '🎵',
    color: '#FF6B6B',
    sortOrder: 1,
    isActive: true
  },
  {
    name: 'Theater & Arts',
    slug: 'theater-arts',
    description: 'Theater performances, plays, musicals, and artistic showcases.',
    icon: '🎭',
    color: '#4ECDC4',
    sortOrder: 2,
    isActive: true
  },
  {
    name: 'Sports & Recreation',
    slug: 'sports-recreation',
    description: 'Sports events, games, tournaments, and recreational activities.',
    icon: '⚽',
    color: '#45B7D1',
    sortOrder: 3,
    isActive: true
  },
  {
    name: 'Conferences & Business',
    slug: 'conferences-business',
    description: 'Professional conferences, business meetings, seminars, and workshops.',
    icon: '💼',
    color: '#96CEB4',
    sortOrder: 4,
    isActive: true
  },
  {
    name: 'Comedy & Entertainment',
    slug: 'comedy-entertainment',
    description: 'Stand-up comedy shows, entertainment events, and fun gatherings.',
    icon: '😂',
    color: '#FECA57',
    sortOrder: 5,
    isActive: true
  },
  {
    name: 'Festivals & Celebrations',
    slug: 'festivals-celebrations',
    description: 'Cultural festivals, celebrations, parades, and community events.',
    icon: '🎪',
    color: '#FF9FF3',
    sortOrder: 6,
    isActive: true
  },
  {
    name: 'Educational & Learning',
    slug: 'educational-learning',
    description: 'Educational workshops, lectures, training sessions, and learning events.',
    icon: '📚',
    color: '#54A0FF',
    sortOrder: 7,
    isActive: true
  },
  {
    name: 'Food & Dining',
    slug: 'food-dining',
    description: 'Food festivals, wine tastings, cooking classes, and culinary experiences.',
    icon: '🍽️',
    color: '#FF6348',
    sortOrder: 8,
    isActive: true
  },
  {
    name: 'Technology & Innovation',
    slug: 'technology-innovation',
    description: 'Tech conferences, hackathons, product launches, and innovation events.',
    icon: '💻',
    color: '#2F3542',
    sortOrder: 9,
    isActive: true
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Wellness workshops, fitness events, health seminars, and mindfulness sessions.',
    icon: '🧘',
    color: '#26de81',
    sortOrder: 10,
    isActive: true
  }
];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Check if categories already exist
    const existingCategories = await Category.countDocuments();
    if (existingCategories > 0) {
      return NextResponse.json({
        message: 'Categories already exist',
        count: existingCategories
      });
    }

    // Create seed categories
    const createdCategories = await Category.insertMany(seedCategories);

    return NextResponse.json({
      message: 'Categories seeded successfully',
      count: createdCategories.length,
      categories: createdCategories
    });

  } catch (error: any) {
    console.error('Error seeding categories:', error);
    return NextResponse.json({ error: 'Failed to seed categories' }, { status: 500 });
  }
}