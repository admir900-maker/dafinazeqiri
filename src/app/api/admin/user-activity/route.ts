import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import UserActivity from '@/models/UserActivity';
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

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { eventTitle: { $regex: search, $options: 'i' } }
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
          recentActivity: stats[0].recentActivity
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