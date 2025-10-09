import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Category from '@/models/Category';
import Booking from '@/models/Booking';
import { logApiError } from '@/lib/errorLogger';

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check
    // For now, allowing any authenticated user

    await connectToDatabase();

    // Get current date for filtering
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get total statistics
    const [
      totalEvents,
      activeEvents,
      totalCategories,
      activeCategories,
      totalBookings,
      totalRevenue,
      pendingBookings,
      recentEvents,
      eventsByCategory,
      monthlyStats,
      recentBookings
    ] = await Promise.all([
      // Total events
      Event.countDocuments({}),

      // Active events (future events)
      Event.countDocuments({ date: { $gte: now } }),

      // Total categories
      Category.countDocuments({}),

      // Active categories
      Category.countDocuments({ isActive: true }),

      // Total bookings
      Booking.countDocuments({}),

      // Total revenue from paid bookings
      Booking.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).then(result => result[0]?.total || 0),

      // Pending bookings
      Booking.countDocuments({ status: 'pending' }),

      // Recent events (last 10)
      Event.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('category', 'name icon color')
        .lean(),

      // Events by category
      Event.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $unwind: '$categoryInfo'
        },
        {
          $group: {
            _id: '$categoryInfo.name',
            count: { $sum: 1 },
            icon: { $first: '$categoryInfo.icon' },
            color: { $first: '$categoryInfo.color' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]),

      // Monthly statistics
      Event.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfLastMonth }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            events: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]),

      // Recent bookings (last 10)
      Booking.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('eventId', 'title date location')
        .lean()
    ]);

    // Calculate growth percentages for bookings and revenue
    const thisMonthBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    const lastMonthBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    const thisMonthRevenue = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).then(result => result[0]?.total || 0);

    const lastMonthRevenue = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).then(result => result[0]?.total || 0);

    // Calculate growth percentages
    const eventsGrowth = lastMonthBookings > 0
      ? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings * 100)
      : 0;

    const revenueGrowth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100)
      : 0;

    // Format response
    const response = {
      overview: {
        totalEvents,
        activeEvents,
        totalCategories,
        activeCategories,
        totalBookings,
        totalRevenue,
        pendingBookings,
        growth: {
          events: eventsGrowth,
          revenue: revenueGrowth
        }
      },
      recentActivity: recentEvents.map(event => ({
        id: event._id,
        title: event.title,
        date: event.date,
        category: event.category?.name || 'Uncategorized',
        status: event.date > now ? 'upcoming' : 'past',
        createdAt: event.createdAt
      })),
      recentBookings: recentBookings.map(booking => ({
        id: booking._id,
        bookingReference: booking.bookingReference,
        customerName: booking.customerName,
        eventTitle: booking.eventId?.title || 'Unknown Event',
        totalAmount: booking.totalAmount,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt
      })),
      eventsByCategory: eventsByCategory.map(cat => ({
        name: cat._id,
        count: cat.count,
        icon: cat.icon,
        color: cat.color
      })),
      monthlyTrends: monthlyStats.map(stat => ({
        month: `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}`,
        events: stat.events
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    logApiError('Failed to fetch admin statistics', error, 'GET /api/admin/stats', undefined, 'get-admin-stats'); return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}