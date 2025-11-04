import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import mongoose from 'mongoose';

// GET /api/admin/tickets/sales
// Query params:
// - eventId?: string
// - startDate?: string (ISO)
// - endDate?: string (ISO)
// - includeDetails?: 'true' | 'false'
// - perGroupLimit?: number (default 25)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    const search = request.nextUrl.searchParams;
    const eventId = search.get('eventId');
    const startDate = search.get('startDate');
    const endDate = search.get('endDate');
    const includeDetails = (search.get('includeDetails') || 'true') === 'true';
    const perGroupLimit = Math.max(1, Math.min(parseInt(search.get('perGroupLimit') || '25', 10) || 25, 200));

    const match: any = {
      status: 'confirmed',
      paymentStatus: 'paid',
    };

    if (eventId) {
      try {
        match.eventId = new mongoose.Types.ObjectId(eventId);
      } catch {
        return NextResponse.json({ error: 'Invalid eventId' }, { status: 400 });
      }
    }

    // Filter by paymentDate when available, otherwise createdAt
    if (startDate || endDate) {
      const dateRange: any = {};
      if (startDate) dateRange.$gte = new Date(startDate);
      if (endDate) dateRange.$lte = new Date(endDate);
      match.$or = [
        { paymentDate: dateRange },
        { paymentDate: { $exists: false } as any, createdAt: dateRange },
      ];
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: match },
      { $unwind: '$tickets' },
      {
        $project: {
          eventId: 1,
          bookingId: '$_id',
          bookingReference: '$bookingReference',
          customerName: '$customerName',
          customerEmail: '$customerEmail',
          createdAt: { $ifNull: ['$paymentDate', '$createdAt'] },
          ticketName: '$tickets.ticketName',
          ticketId: '$tickets.ticketId',
          ticketPrice: '$tickets.price',
        },
      },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { eventId: '$eventId', ticketName: '$ticketName' },
          eventTitle: { $first: '$event.title' },
          eventDate: { $first: '$event.date' },
          count: { $sum: 1 },
          revenue: { $sum: '$ticketPrice' },
          items: includeDetails
            ? {
              $push: {
                bookingId: '$bookingId',
                bookingReference: '$bookingReference',
                customerName: '$customerName',
                customerEmail: '$customerEmail',
                ticketId: '$ticketId',
                ticketPrice: '$ticketPrice',
                createdAt: '$createdAt',
              },
            }
            : undefined,
        },
      },
      { $sort: { 'eventDate': -1, 'eventTitle': 1, '_id.ticketName': 1 } },
    ];

    if (includeDetails) {
      // Limit number of items per group to keep payload reasonable
      pipeline.push({
        $project: {
          eventTitle: 1,
          eventDate: 1,
          count: 1,
          revenue: 1,
          items: { $slice: ['$items', perGroupLimit] },
          _id: 1,
        },
      });
    }

    const groups = await (Booking as any).aggregate(pipeline);

    const totals = groups.reduce(
      (acc: any, g: any) => {
        acc.sold += g.count || 0;
        acc.revenue += g.revenue || 0;
        return acc;
      },
      { sold: 0, revenue: 0 }
    );

    return NextResponse.json({
      success: true,
      totals,
      groups: groups.map((g: any) => ({
        eventId: g._id.eventId,
        ticketName: g._id.ticketName,
        eventTitle: g.eventTitle || 'Unknown Event',
        eventDate: g.eventDate || null,
        count: g.count,
        revenue: g.revenue,
        items: includeDetails ? g.items : undefined,
      })),
    });
  } catch (error: any) {
    console.error('Tickets sales GET error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
