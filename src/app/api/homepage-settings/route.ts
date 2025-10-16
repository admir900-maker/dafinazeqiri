import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get the latest settings
    const settings = await Settings.findOne().sort({ updatedAt: -1 }).lean() as any;

    if (!settings) {
      // Return default values if no settings found
      return NextResponse.json({
        success: true,
        data: {
          showHeroSection: true,
          showFeaturedEvents: true,
          showCategories: true,
          showStats: true,
          heroAutoRotate: false,
          heroRotationInterval: 5,
          theme: 'auto',
          primaryColor: '#2563eb',
          accentColor: '#8b5cf6'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: settings.homepage || {
        showHeroSection: true,
        showFeaturedEvents: true,
        showCategories: true,
        showStats: true,
        heroAutoRotate: false,
        heroRotationInterval: 5,
        theme: 'auto',
        primaryColor: '#2563eb',
        accentColor: '#8b5cf6'
      }
    });

  } catch (error) {
    console.error('Error fetching homepage settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch homepage settings' },
      { status: 500 }
    );
  }
}