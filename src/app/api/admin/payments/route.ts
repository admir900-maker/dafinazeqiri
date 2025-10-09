import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
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

    // TODO: Add admin role check here
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const search = searchParams.get('search');

    // Build query
    let query: any = {};

    if (status && status !== 'all') {
      query.paymentStatus = status;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }

    if (search) {
      query.$or = [
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { bookingReference: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    // Get payments with event details
    const [payments, totalPayments] = await Promise.all([
      Booking.find(query)
        .populate('eventId', 'title date venue')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query)
    ]);

    // Transform data to payment format
    const transformedPayments = payments.map((booking: any) => ({
      id: booking._id.toString(),
      bookingId: booking.bookingReference,
      amount: booking.totalAmount,
      currency: booking.currency,
      status: booking.paymentStatus,
      method: booking.paymentMethod,
      customerEmail: booking.customerEmail || 'N/A',
      customerName: booking.customerName || 'N/A',
      eventTitle: booking.eventId?.title || 'Unknown Event',
      eventDate: booking.eventId?.date,
      venue: booking.eventId?.venue,
      createdAt: booking.createdAt,
      paymentDate: booking.paymentDate,
      confirmedAt: booking.confirmedAt,
      stripePaymentIntentId: booking.stripePaymentIntentId,
      raiffeisenPaymentId: booking.raiffeisenPaymentId,
      ticketsCount: booking.tickets?.length || 0,
      notes: booking.notes
    }));

    // Calculate payment statistics
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'paid'] },
                '$totalAmount',
                0
              ]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'pending'] },
                '$totalAmount',
                0
              ]
            }
          },
          completedPayments: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'paid'] },
                1,
                0
              ]
            }
          },
          failedPayments: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'failed'] },
                1,
                0
              ]
            }
          },
          refundedAmount: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'refunded'] },
                '$totalAmount',
                0
              ]
            }
          },
          pendingPayments: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'pending'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const paymentStats = stats[0] || {
      totalRevenue: 0,
      pendingAmount: 0,
      completedPayments: 0,
      failedPayments: 0,
      refundedAmount: 0,
      pendingPayments: 0
    };

    // Payment method breakdown
    const methodBreakdown = await Booking.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Recent payment activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          dailyRevenue: { $sum: '$totalAmount' },
          dailyCount: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    return NextResponse.json({
      success: true,
      payments: transformedPayments,
      stats: paymentStats,
      methodBreakdown,
      recentActivity,
      pagination: {
        page,
        limit,
        total: totalPayments,
        pages: Math.ceil(totalPayments / limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payments'
    }, { status: 500 });
  }
}