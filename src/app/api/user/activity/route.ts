import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import UserActivity from '@/models/UserActivity';

// Helper to get geolocation from IP (uses free ip-api.com)
async function getGeoFromIP(ip: string): Promise<{ city?: string; country?: string; countryCode?: string; region?: string }> {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') {
    return {};
  }
  try {
    // Use the first IP if multiple are provided (comma-separated)
    const cleanIP = ip.split(',')[0].trim();
    const res = await fetch(`http://ip-api.com/json/${cleanIP}?fields=city,country,countryCode,regionName`, {
      signal: AbortSignal.timeout(2000) // 2s timeout - don't block logging
    });
    if (res.ok) {
      const data = await res.json();
      if (data.city || data.country) {
        return { city: data.city, country: data.country, countryCode: data.countryCode, region: data.regionName };
      }
    }
  } catch {
    // Silently fail - geo is optional
  }
  return {};
}

// Helper function to extract user info from headers
function extractUserInfo(request: NextRequest, headersList: Headers) {
  const userAgent = headersList.get('user-agent') || '';
  const ipAddress = headersList.get('x-forwarded-for') ||
    headersList.get('x-real-ip') ||
    'unknown';

  // Simple device detection
  let device = 'unknown';
  if (userAgent.includes('Mobile')) {
    device = 'mobile';
  } else if (userAgent.includes('Tablet')) {
    device = 'tablet';
  } else {
    device = 'desktop';
  }

  // Simple browser detection
  let browser = 'unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';

  return {
    ipAddress,
    userAgent,
    device,
    browser
  };
}

// POST - Log user activity
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const headersList = await headers();

    // Connect to database
    await connectToDatabase();

    const body = await request.json();
    const {
      action,
      description,
      eventId,
      eventTitle,
      ticketType,
      quantity,
      amount,
      currency = 'EUR',
      paymentMethod,
      status = 'success',
      location,
      referrer,
      duration,
      metadata = {},
      errorMessage,
      userEmail,
      userName,
      sessionId
    } = body;

    // Validate required fields
    if (!action || !description) {
      return NextResponse.json(
        { success: false, error: 'Action and description are required' },
        { status: 400 }
      );
    }

    // Extract user info from headers
    const userInfo = extractUserInfo(request, headersList);

    // Get geolocation from IP (non-blocking best effort)
    const geo = await getGeoFromIP(userInfo.ipAddress);

    // Create activity log
    const activityData = {
      userId: userId || 'anonymous',
      userEmail,
      userName,
      sessionId,
      action,
      description,
      eventId,
      eventTitle,
      ticketType,
      quantity,
      amount,
      currency,
      paymentMethod,
      status,
      location,
      city: geo.city,
      country: geo.country,
      countryCode: geo.countryCode,
      region: geo.region,
      referrer,
      duration,
      metadata,
      errorMessage,
      ...userInfo
    };

    const activity = new UserActivity(activityData);
    await activity.save();

    return NextResponse.json({
      success: true,
      data: {
        id: activity._id,
        action,
        timestamp: activity.createdAt
      }
    });

  } catch (error) {
    console.error('Error logging user activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log activity' },
      { status: 500 }
    );
  }
}

// GET - Retrieve activity logs (for debugging or admin purposes)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');

    // Build query
    const query: any = {};

    if (userIdParam) {
      query.userId = userIdParam;
    } else {
      query.userId = userId; // Only show current user's activities for non-admin
    }

    if (action) {
      query.action = action;
    }

    // Get activities
    const activities = await UserActivity.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: activities
    });

  } catch (error) {
    console.error('Error fetching user activities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}