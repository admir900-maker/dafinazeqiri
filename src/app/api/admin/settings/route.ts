import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { logApiError } from '@/lib/errorLogger';
import { clearSettingsCache } from '@/lib/settings';

// GET /api/admin/settings - Get all settings
export async function GET(request: NextRequest) {
  let userId: string | null = null;

  try {
    const authResult = await auth();
    userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // TODO: Add admin role check when user metadata is properly set
    await connectToDatabase();

    // Get settings document (there should only be one)
    let settings = await Settings.findOne({}).lean();

    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({
        updatedBy: userId,
        version: 1
      });
    }

    return NextResponse.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    logApiError('Failed to fetch settings', error, 'GET /api/admin/settings', userId || undefined, 'get-settings');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update all settings
export async function PUT(request: NextRequest) {
  let userId: string | null = null;

  try {
    const authResult = await auth();
    userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();

    await connectToDatabase();

    // Get current settings or create new one
    let settings = await Settings.findOne({});

    if (settings) {
      // Update existing settings
      Object.assign(settings, body, {
        updatedBy: userId,
        version: (settings.version || 1) + 1
      });
      await settings.save();
    } else {
      // Create new settings
      settings = await Settings.create({
        ...body,
        updatedBy: userId,
        version: 1
      });
    }

    // Clear settings cache after update
    clearSettingsCache();

    return NextResponse.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    logApiError('Failed to update settings', error, 'PUT /api/admin/settings', userId || undefined, 'update-settings');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings - Update specific settings section
export async function PATCH(request: NextRequest) {
  let userId: string | null = null;

  try {
    const authResult = await auth();
    userId = authResult.userId;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { section, data } = await request.json();

    if (!section || !data) {
      return NextResponse.json({
        success: false,
        error: 'Section and data are required'
      }, { status: 400 });
    }

    await connectToDatabase();

    // Get current settings or create new one
    let settings = await Settings.findOne({});

    if (!settings) {
      settings = await Settings.create({
        updatedBy: userId,
        version: 1
      });
    }

    // Update specific section
    settings[section] = { ...settings[section], ...data };
    settings.updatedBy = userId;
    settings.version = (settings.version || 1) + 1;

    await settings.save();

    // Clear settings cache after update
    clearSettingsCache();

    return NextResponse.json({
      success: true,
      data: settings,
      message: `${section} settings updated successfully`
    });

  } catch (error) {
    console.error('Error updating settings section:', error);
    logApiError('Failed to update settings section', error, 'PATCH /api/admin/settings', userId || undefined, 'update-settings-section');
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}