import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';

// GET /api/admin/users - Get all users with advanced filtering and pagination
export async function GET(request: NextRequest) {
  let userId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    userId = authUserId;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check
    // For now, allowing any authenticated user

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Get users from Clerk
    const client = await clerkClient();
    let query: any = {
      limit: Math.min(limit, 100), // Cap at 100 for performance
      offset,
      orderBy: sortOrder === 'desc' ? `-${sortBy}` : sortBy
    };

    // Add search if provided
    if (search) {
      query.query = search;
    }

    const response = await client.users.getUserList(query);

    // Connect to database to get booking statistics
    await connectToDatabase();

    const usersWithStats = await Promise.all(response.data.map(async (user: any) => {
      // Get booking statistics for each user
      const bookingStats = await Booking.aggregate([
        { $match: { userId: user.id } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            lastBooking: { $max: '$createdAt' }
          }
        }
      ]);

      const stats = bookingStats[0] || {
        totalBookings: 0,
        totalSpent: 0,
        lastBooking: null
      };

      return {
        id: user.id,
        emailAddress: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        imageUrl: user.imageUrl || '',
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        publicMetadata: user.publicMetadata,
        bookingStats: stats
      };
    }));

    // Filter by role if specified
    let filteredUsers = usersWithStats;
    if (role) {
      if (role === 'user') {
        filteredUsers = usersWithStats.filter(u => !u.publicMetadata.role);
      } else {
        filteredUsers = usersWithStats.filter(u => u.publicMetadata.role === role);
      }
    }

    return NextResponse.json({
      success: true,
      users: filteredUsers,
      totalCount: response.totalCount,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < response.totalCount
      }
    });

  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users'
    }, { status: 500 });
  }
}