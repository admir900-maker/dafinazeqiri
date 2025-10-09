import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import ValidationLog from '@/models/ValidationLog';

// GET /api/validation-logs - Get validation logs (for validators and admins)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const validatorId = searchParams.get('validatorId');
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status');
    const validationType = searchParams.get('validationType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    const query: any = {};

    if (validatorId) {
      query.validatorId = validatorId;
    }

    if (eventId) {
      query.eventId = eventId;
    }

    if (status) {
      query.status = status;
    }

    if (validationType) {
      query.validationType = validationType;
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

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get validation logs with pagination
    const [logs, totalCount] = await Promise.all([
      ValidationLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ValidationLog.countDocuments(query)
    ]);

    // Get statistics
    const stats = await ValidationLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasMore,
          limit
        },
        statistics: stats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      }
    });

  } catch (error: any) {
    console.error('Error fetching validation logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch validation logs'
    }, { status: 500 });
  }
}

// POST /api/validation-logs - Create a new validation log entry
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      bookingId,
      eventId,
      eventTitle,
      targetUserId,
      userName,
      validationType = 'entry',
      status,
      notes,
      location,
      metadata
    } = body;

    // Validate required fields
    if (!bookingId || !eventId || !eventTitle || !targetUserId || !userName || !status) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Get validator information (from current user)
    // Note: In a real implementation, you'd fetch this from Clerk
    const validatorName = 'Validator'; // This should be fetched from the current user

    // Get request headers for device info
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Create validation log entry
    const validationLog = new ValidationLog({
      validatorId: userId,
      validatorName,
      bookingId,
      eventId,
      eventTitle,
      userId: targetUserId,
      userName,
      validationType,
      status,
      notes,
      location,
      deviceInfo: {
        userAgent,
        ip
      },
      metadata
    });

    await validationLog.save();

    return NextResponse.json({
      success: true,
      data: validationLog,
      message: 'Validation log created successfully'
    });

  } catch (error: any) {
    console.error('Error creating validation log:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create validation log'
    }, { status: 500 });
  }
}