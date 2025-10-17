import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Category from '@/models/Category';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Connecting to database...');
    await connectToDatabase();
    console.log('✅ DEBUG: Database connected');

    // Get all categories
    const categories = await Category.find({}).lean();
    console.log('📊 DEBUG: Found categories:', categories.length);

    return NextResponse.json({
      success: true,
      count: categories.length,
      categories: categories.map((c: any) => ({
        id: c._id?.toString() || 'unknown',
        name: c.name || 'No name',
        slug: c.slug || 'No slug'
      })),
      message: 'This is a debug endpoint showing all categories in the database'
    });
  } catch (error: any) {
    console.error('❌ DEBUG ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
