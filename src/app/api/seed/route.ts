import { NextResponse } from 'next/server';
import seedDatabase from '@/lib/seed-database';

export async function POST() {
  try {
    console.log('🚀 Starting database seeding process...');

    const result = await seedDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      data: result
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error);

    return NextResponse.json({
      success: false,
      message: 'Failed to seed database',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database seeding endpoint. Use POST method to seed the database.',
    usage: {
      method: 'POST',
      endpoint: '/api/seed',
      description: 'Seeds the database with sample categories and events'
    }
  });
}