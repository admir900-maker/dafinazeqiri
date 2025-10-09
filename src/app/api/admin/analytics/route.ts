import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';
import Booking from '@/models/Booking';
import Ticket from '@/models/Ticket';
import Category from '@/models/Category';

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

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '6months'; // '1month', '3months', '6months', '1year', 'all'

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '1month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case '6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case '1year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date('2020-01-01'); // Far back date for 'all'
    }

    // 1. Total Revenue from confirmed bookings
    const revenueData = await Booking.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalBookings: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const totalBookings = revenueData[0]?.totalBookings || 0;

    // 2. Monthly Revenue Breakdown
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format monthly data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthlyRevenue = monthlyRevenue.map(item => ({
      month: monthNames[item._id.month - 1],
      year: item._id.year,
      revenue: item.revenue,
      bookings: item.bookings
    }));

    // 3. Event Statistics
    const eventStats = await Event.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          active: [
            { $match: { date: { $gte: now } } },
            { $count: 'count' }
          ],
          past: [
            { $match: { date: { $lt: now } } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const totalEvents = eventStats[0]?.total[0]?.count || 0;
    const activeEvents = eventStats[0]?.active[0]?.count || 0;
    const pastEvents = eventStats[0]?.past[0]?.count || 0;

    // 4. Popular Events (by booking count)
    const popularEvents = await Booking.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: '$event'
      },
      {
        $group: {
          _id: '$eventId',
          eventName: { $first: '$event.title' },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { bookings: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // 5. Category Statistics
    const categoryStats = await Event.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: { path: '$category', preserveNullAndEmptyArrays: true }
      },
      {
        $group: {
          _id: '$categoryId',
          categoryName: { $first: { $ifNull: ['$category.name', 'Uncategorized'] } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 6. Ticket Sales Statistics
    const ticketStats = await Ticket.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'bookingId',
          foreignField: '_id',
          as: 'booking'
        }
      },
      {
        $unwind: '$booking'
      },
      {
        $match: {
          'booking.status': 'confirmed',
          'booking.createdAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$ticketType',
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // 7. Recent Activity (last 10 bookings)
    const recentBookings = await Booking.find({
      createdAt: { $gte: startDate }
    })
      .populate('eventId', 'title')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 8. User Statistics
    const userStats = await Booking.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          bookings: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      {
        $facet: {
          uniqueUsers: [{ $count: 'count' }],
          topSpenders: [
            { $sort: { totalSpent: -1 } },
            { $limit: 5 }
          ],
          avgBookingsPerUser: [
            {
              $group: {
                _id: null,
                avgBookings: { $avg: '$bookings' }
              }
            }
          ]
        }
      }
    ]);

    const uniqueUsers = userStats[0]?.uniqueUsers[0]?.count || 0;
    const avgBookingsPerUser = userStats[0]?.avgBookingsPerUser[0]?.avgBookings || 0;

    // 9. Revenue Growth (compare with previous period)
    const previousPeriodStart = new Date(startDate);
    const periodDiff = now.getTime() - startDate.getTime();
    previousPeriodStart.setTime(startDate.getTime() - periodDiff);

    const previousRevenue = await Booking.aggregate([
      {
        $match: {
          status: 'confirmed',
          createdAt: { $gte: previousPeriodStart, $lt: startDate }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          bookings: { $sum: 1 }
        }
      }
    ]);

    const prevRevenue = previousRevenue[0]?.revenue || 0;
    const prevBookings = previousRevenue[0]?.bookings || 0;

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
    const bookingsGrowth = prevBookings > 0 ? ((totalBookings - prevBookings) / prevBookings * 100) : 0;

    // Prepare response
    const analyticsData = {
      summary: {
        totalRevenue,
        totalBookings,
        totalEvents,
        activeEvents,
        pastEvents,
        uniqueUsers,
        avgBookingsPerUser: Math.round(avgBookingsPerUser * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        bookingsGrowth: Math.round(bookingsGrowth * 100) / 100
      },
      monthlyRevenue: formattedMonthlyRevenue,
      popularEvents: popularEvents.map(event => ({
        name: event.eventName,
        bookings: event.bookings,
        revenue: event.revenue
      })),
      categoryStats: categoryStats.map(cat => ({
        category: cat.categoryName,
        count: cat.count
      })),
      ticketStats: ticketStats.map(ticket => ({
        type: ticket._id || 'Standard',
        count: ticket.count,
        revenue: ticket.revenue
      })),
      recentActivity: recentBookings.map(booking => ({
        id: booking._id,
        eventName: booking.eventId?.title || 'Unknown Event',
        userName: booking.userId ? `${booking.userId.firstName} ${booking.userId.lastName}` : 'Unknown User',
        amount: booking.totalAmount,
        status: booking.status,
        date: booking.createdAt
      })),
      timeframe,
      dateRange: {
        start: startDate,
        end: now
      }
    };

    return NextResponse.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data'
      },
      { status: 500 }
    );
  }
}