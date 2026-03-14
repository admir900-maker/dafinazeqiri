import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import UserActivity from '@/models/UserActivity';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const minutes = parseInt(searchParams.get('minutes') || '5');
    const mode = searchParams.get('mode') || 'live'; // live | today | historical

    let matchStage: any = {};

    if (mode === 'live') {
      matchStage.createdAt = { $gte: new Date(Date.now() - minutes * 60 * 1000) };
    } else if (mode === 'today') {
      // Today from midnight UTC
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      matchStage.createdAt = { $gte: todayStart };
    } else {
      // Historical - last 30 days
      matchStage.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    }

    // For 'today' mode also get live activities from last N minutes
    let liveActivities: any[] = [];
    if (mode === 'today') {
      liveActivities = await UserActivity.find({
        createdAt: { $gte: new Date(Date.now() - minutes * 60 * 1000) },
        country: { $exists: true, $nin: ['', null] },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .select('action country countryCode city userName userEmail userId createdAt status amount')
        .lean();
    }

    // Get recent activities with geo data
    const recentWithGeo = await UserActivity.find({
      ...matchStage,
      country: { $exists: true, $nin: ['', null] },
    })
      .sort({ createdAt: -1 })
      .limit(mode === 'live' ? 50 : 500)
      .select('action country countryCode city userName userEmail userId createdAt status amount')
      .lean();

    // Aggregate by country for the map
    const countryAgg = await UserActivity.aggregate([
      { $match: { ...matchStage, country: { $exists: true, $nin: ['', null] } } },
      {
        $group: {
          _id: '$countryCode',
          country: { $first: '$country' },
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          lastActivity: { $max: '$createdAt' },
          purchases: { $sum: { $cond: [{ $eq: ['$action', 'payment_successful'] }, 1, 0] } },
        }
      },
      { $project: { _id: 1, country: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' }, lastActivity: 1, purchases: 1 } },
      { $sort: { count: -1 } },
    ]);

    // For 'today' mode, determine which country codes are "live" (active in last N minutes)
    const liveCountryCodes = mode === 'today'
      ? [...new Set(liveActivities.map((a: any) => a.countryCode).filter(Boolean))]
      : [];

    return NextResponse.json({
      success: true,
      data: {
        activities: mode === 'today' ? recentWithGeo : recentWithGeo,
        liveActivities: mode === 'today' ? liveActivities : [],
        liveCountryCodes,
        countries: countryAgg,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error fetching live data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch live data' }, { status: 500 });
  }
}
