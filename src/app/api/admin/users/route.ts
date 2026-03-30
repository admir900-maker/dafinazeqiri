import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';
import mongoose from 'mongoose';

// GET /api/admin/users - Get all users with advanced filtering and pagination
export async function GET(request: NextRequest) {
  let userId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    userId = authUserId;

    if (!userId || !(await isUserAdmin())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    // Get role counts from MongoDB cache (avoids iterating all Clerk users on every request)
    const db = mongoose.connection.db!;
    const cacheCol = db.collection('system_cache');
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    let roleCounts = { admin: 0, manager: 0, staff: 0, validator: 0, user: 0 };
    const cached = await cacheCol.findOne({ key: 'roleCounts' });

    if (cached && Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL) {
      roleCounts = cached.counts;
    } else {
      // Sync role counts from Clerk (use limit=500 to minimize API calls)
      try {
        const freshCounts = { admin: 0, manager: 0, staff: 0, validator: 0, user: 0 };
        let countOffset = 0;
        const countLimit = 500;
        while (true) {
          const batch = await client.users.getUserList({ limit: countLimit, offset: countOffset });
          for (const u of batch.data) {
            const r = (u.publicMetadata as any)?.role;
            if (r && r in freshCounts) {
              (freshCounts as any)[r]++;
            } else {
              freshCounts.user++;
            }
          }
          if (batch.data.length < countLimit) break;
          countOffset += countLimit;
        }
        roleCounts = freshCounts;
        await cacheCol.updateOne(
          { key: 'roleCounts' },
          { $set: { key: 'roleCounts', counts: freshCounts, updatedAt: new Date() } },
          { upsert: true }
        );
      } catch (e) {
        // If sync fails but we have stale cache, use it
        if (cached) {
          roleCounts = cached.counts;
        } else {
          // Last resort: count from current page
          for (const u of usersWithStats) {
            const r = u.publicMetadata?.role;
            if (r && r in roleCounts) {
              (roleCounts as any)[r]++;
            } else {
              roleCounts.user++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      users: filteredUsers,
      totalCount: response.totalCount,
      roleCounts,
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