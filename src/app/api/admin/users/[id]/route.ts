import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Event from '@/models/Event';

// GET /api/admin/users/[id] - Get detailed user information
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let adminUserId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    adminUserId = authUserId;

    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id: targetUserId } = params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user details from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(targetUserId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Connect to database for booking history
    await connectToDatabase();

    // Get detailed booking history with events
    const bookings = await Booking.find({ userId: targetUserId })
      .populate('eventId')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get booking statistics
    const bookingStats = await Booking.aggregate([
      { $match: { userId: targetUserId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get total statistics
    const totalStats = await Booking.aggregate([
      { $match: { userId: targetUserId } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          firstBooking: { $min: '$createdAt' },
          lastBooking: { $max: '$createdAt' },
          avgBookingValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get monthly activity
    const monthlyActivity = await Booking.aggregate([
      { $match: { userId: targetUserId } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          bookings: { $sum: 1 },
          spent: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    const userData = {
      id: user.id,
      emailAddress: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      imageUrl: user.imageUrl || '',
      createdAt: user.createdAt,
      lastSignInAt: user.lastSignInAt,
      publicMetadata: user.publicMetadata,
      banned: user.banned || false,
      bookings: bookings.map(booking => ({
        id: booking._id,
        eventTitle: booking.eventId?.title || 'Unknown Event',
        eventDate: booking.eventId?.date,
        status: booking.status,
        totalAmount: booking.totalAmount,
        quantity: booking.quantity,
        createdAt: booking.createdAt,
        paymentMethod: booking.paymentMethod
      })),
      statistics: {
        byStatus: bookingStats,
        total: totalStats[0] || {
          totalBookings: 0,
          totalSpent: 0,
          firstBooking: null,
          lastBooking: null,
          avgBookingValue: 0
        },
        monthlyActivity
      }
    };

    return NextResponse.json({
      success: true,
      user: userData
    });

  } catch (error: any) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user details'
    }, { status: 500 });
  }
}

// PUT /api/admin/users/[id] - Update user information
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let adminUserId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    adminUserId = authUserId;

    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id: targetUserId } = params;
    const body = await request.json();
    const { role, banned, publicMetadata } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const client = await clerkClient();

    // Update user metadata
    if (role !== undefined || publicMetadata) {
      const updatedMetadata = {
        ...publicMetadata,
        role: role || undefined
      };

      await client.users.updateUserMetadata(targetUserId, {
        publicMetadata: updatedMetadata
      });
    }

    // Update ban status if provided
    if (banned !== undefined) {
      if (banned) {
        await client.users.banUser(targetUserId);
      } else {
        await client.users.unbanUser(targetUserId);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user'
    }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] - Delete user (soft delete by banning)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let adminUserId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    adminUserId = authUserId;

    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id: targetUserId } = params;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const client = await clerkClient();

    // Ban the user (soft delete)
    await client.users.banUser(targetUserId);

    return NextResponse.json({
      success: true,
      message: 'User banned successfully'
    });

  } catch (error: any) {
    console.error('Error banning user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to ban user'
    }, { status: 500 });
  }
}