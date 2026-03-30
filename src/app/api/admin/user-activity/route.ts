import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import UserActivity from '@/models/UserActivity';
import Booking from '@/models/Booking';
import Event from '@/models/Event';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const userIdFilter = searchParams.get('userId');
    const eventId = searchParams.get('eventId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const device = searchParams.get('device');
    const browser = searchParams.get('browser');

    // Build query
    const query: any = {};

    if (action) {
      query.action = action;
    }

    if (status) {
      query.status = status;
    }

    if (userIdFilter) {
      query.userId = userIdFilter;
    }

    if (eventId) {
      query.eventId = eventId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    if (device) {
      query.device = device;
    }

    if (browser) {
      query.browser = { $regex: browser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { description: { $regex: escaped, $options: 'i' } },
        { userEmail: { $regex: escaped, $options: 'i' } },
        { userName: { $regex: escaped, $options: 'i' } },
        { eventTitle: { $regex: escaped, $options: 'i' } }
      ];
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get activities with pagination
    const [activities, totalCount] = await Promise.all([
      UserActivity.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      UserActivity.countDocuments(query)
    ]);

    // Get activity statistics
    const stats = await UserActivity.aggregate([
      {
        $facet: {
          byAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byDevice: [
            { $group: { _id: '$device', count: { $sum: 1 } } }
          ],
          byBrowser: [
            { $group: { _id: '$browser', count: { $sum: 1 } } }
          ],
          totalRevenue: [
            { $match: { action: 'payment_successful', amount: { $gt: 0 } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          recentActivity: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 }
          ],
          // Referral sources - where users come from
          byReferrer: [
            { $match: { referrer: { $exists: true, $nin: ['', null] } } },
            { $group: { _id: '$referrer', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
            { $project: { _id: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
          ],
          // User visit frequency - how many times each user visited
          topVisitors: [
            { $group: { _id: '$userId', email: { $first: '$userEmail' }, name: { $first: '$userName' }, totalActions: { $sum: 1 }, lastSeen: { $max: '$createdAt' }, firstSeen: { $min: '$createdAt' } } },
            { $sort: { totalActions: -1 } },
            { $limit: 15 }
          ],
          // Entry intents - first action per session (what brought them in)
          entryIntents: [
            { $sort: { createdAt: 1 } },
            { $group: { _id: '$sessionId', firstAction: { $first: '$action' }, userId: { $first: '$userId' } } },
            { $group: { _id: '$firstAction', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          // Most browsed events
          topBrowsedEvents: [
            { $match: { action: 'event_view', eventTitle: { $exists: true, $ne: null } } },
            { $group: { _id: '$eventTitle', eventId: { $first: '$eventId' }, views: { $sum: 1 }, uniqueViewers: { $addToSet: '$userId' } } },
            { $project: { _id: 1, eventId: 1, views: 1, uniqueViewers: { $size: '$uniqueViewers' } } },
            { $sort: { views: -1 } },
            { $limit: 10 }
          ],
          // Most viewed pages
          topPages: [
            { $match: { action: 'page_view' } },
            { $group: { _id: '$description', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
            { $project: { _id: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          // Unique users count
          uniqueUsersCount: [
            { $group: { _id: '$userId' } },
            { $count: 'total' }
          ],
          // Unique sessions count
          uniqueSessionsCount: [
            { $match: { sessionId: { $exists: true, $ne: null } } },
            { $group: { _id: '$sessionId' } },
            { $count: 'total' }
          ],
          // Geolocation - by country
          byCountry: [
            { $match: { country: { $exists: true, $nin: ['', null] } } },
            { $group: { _id: '$country', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
            { $project: { _id: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
            { $sort: { count: -1 } },
            { $limit: 15 }
          ],
          // Geolocation - by city
          byCity: [
            { $match: { city: { $exists: true, $nin: ['', null] } } },
            { $group: { _id: { city: '$city', country: '$country' }, count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
            { $project: { _id: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
            { $sort: { count: -1 } },
            { $limit: 20 }
          ],
          // Average session duration
          avgSessionDuration: [
            { $match: { duration: { $exists: true, $gt: 0 } } },
            { $group: { _id: null, avgDuration: { $avg: '$duration' }, totalDuration: { $sum: '$duration' }, count: { $sum: 1 } } }
          ],
          // Top buyers by location
          topBuyersByLocation: [
            { $match: { action: 'payment_successful', amount: { $gt: 0 }, country: { $exists: true, $nin: ['', null] } } },
            { $group: { _id: { city: '$city', country: '$country' }, totalSpent: { $sum: '$amount' }, transactions: { $sum: 1 }, uniqueBuyers: { $addToSet: '$userId' } } },
            { $project: { _id: 1, totalSpent: 1, transactions: 1, uniqueBuyers: { $size: '$uniqueBuyers' } } },
            { $sort: { totalSpent: -1 } },
            { $limit: 10 }
          ],
          // Top days of week (0=Sunday, 6=Saturday)
          byDayOfWeek: [
            { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
            { $project: { _id: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
            { $sort: { count: -1 } }
          ],
          // Top hours of day
          byHourOfDay: [
            { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
            { $project: { _id: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
            { $sort: { _id: 1 } }
          ],
          // Top months
          byMonth: [
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' }, revenue: { $sum: { $cond: [{ $eq: ['$action', 'payment_successful'] }, '$amount', 0] } } } },
            { $project: { _id: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' }, revenue: 1 } },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 12 }
          ],
          // Daily activity trend (last 30 days)
          dailyTrend: [
            { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' }, purchases: { $sum: { $cond: [{ $eq: ['$action', 'payment_successful'] }, 1, 0] } } } },
            { $project: { _id: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' }, purchases: 1 } },
            { $sort: { _id: 1 } }
          ],
          // Conversion funnel
          conversionFunnel: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $match: { _id: { $in: ['page_view', 'event_view', 'add_to_cart', 'checkout_started', 'payment_successful'] } } },
            { $sort: { count: -1 } }
          ],
          // Country details with countryCode
          countryDetails: [
            { $match: { country: { $exists: true, $nin: ['', null] } } },
            {
              $group: {
                _id: '$country',
                countryCode: { $first: '$countryCode' },
                count: { $sum: 1 },
                uniqueUsers: { $addToSet: '$userId' },
                purchases: { $sum: { $cond: [{ $eq: ['$action', 'payment_successful'] }, 1, 0] } },
                revenue: { $sum: { $cond: [{ $eq: ['$action', 'payment_successful'] }, '$amount', 0] } },
                cities: { $addToSet: '$city' }
              }
            },
            { $project: { _id: 1, countryCode: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' }, purchases: 1, revenue: 1, citiesCount: { $size: '$cities' } } },
            { $sort: { count: -1 } },
            { $limit: 30 }
          ],
          // City details with country info  
          cityDetails: [
            { $match: { city: { $exists: true, $nin: ['', null] } } },
            {
              $group: {
                _id: { city: '$city', country: '$country', countryCode: '$countryCode' },
                count: { $sum: 1 },
                uniqueUsers: { $addToSet: '$userId' },
                purchases: { $sum: { $cond: [{ $eq: ['$action', 'payment_successful'] }, 1, 0] } },
                revenue: { $sum: { $cond: [{ $eq: ['$action', 'payment_successful'] }, '$amount', 0] } },
                topActions: { $push: '$action' }
              }
            },
            { $project: { _id: 1, count: 1, uniqueUsers: { $size: '$uniqueUsers' }, purchases: 1, revenue: 1 } },
            { $sort: { count: -1 } },
            { $limit: 30 }
          ]
        }
      }
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit
        },
        statistics: {
          byAction: stats[0].byAction,
          byStatus: stats[0].byStatus,
          byDevice: stats[0].byDevice,
          byBrowser: stats[0].byBrowser,
          totalRevenue: stats[0].totalRevenue[0]?.total || 0,
          recentActivity: stats[0].recentActivity,
          byReferrer: stats[0].byReferrer,
          topVisitors: stats[0].topVisitors,
          entryIntents: stats[0].entryIntents,
          topBrowsedEvents: stats[0].topBrowsedEvents,
          topPages: stats[0].topPages,
          uniqueUsers: stats[0].uniqueUsersCount[0]?.total || 0,
          uniqueSessions: stats[0].uniqueSessionsCount[0]?.total || 0,
          byCountry: stats[0].byCountry,
          byCity: stats[0].byCity,
          avgSessionDuration: stats[0].avgSessionDuration[0] || { avgDuration: 0, totalDuration: 0, count: 0 },
          topBuyersByLocation: stats[0].topBuyersByLocation,
          byDayOfWeek: stats[0].byDayOfWeek,
          byHourOfDay: stats[0].byHourOfDay,
          byMonth: stats[0].byMonth,
          dailyTrend: stats[0].dailyTrend,
          conversionFunnel: stats[0].conversionFunnel,
          countryDetails: stats[0].countryDetails,
          cityDetails: stats[0].cityDetails
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user activities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user activities' },
      { status: 500 }
    );
  }
}

// DELETE - Clear old activities (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin role check
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Delete activities older than specified days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await UserActivity.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        cutoffDate
      }
    });

  } catch (error) {
    console.error('Error deleting old activities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete old activities' },
      { status: 500 }
    );
  }
}