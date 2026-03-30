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

    // Connect to database to get booking statistics
    await connectToDatabase();

    const mapUserWithStats = async (user: any) => {
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
        banned: user.banned || false,
        bookingStats: stats
      };
    };

    let resultUsers: any[] = [];
    let totalFiltered = 0;

    if (role) {
      // When filtering by role, we must iterate Clerk users because Clerk
      // doesn't support filtering by publicMetadata
      const matchesRole = (u: any) => {
        const r = (u.publicMetadata as any)?.role;
        return role === 'user' ? !r : r === role;
      };

      let collected: any[] = [];
      let batchOffset = 0;
      const batchLimit = 500;

      while (true) {
        const batchQuery: any = { limit: batchLimit, offset: batchOffset };
        if (search) batchQuery.query = search;
        const batch = await client.users.getUserList(batchQuery);

        for (const u of batch.data) {
          if (matchesRole(u)) {
            collected.push(u);
          }
        }
        if (batch.data.length < batchLimit) break;
        batchOffset += batchLimit;
      }

      totalFiltered = collected.length;

      // Sort collected users
      collected.sort((a: any, b: any) => {
        const field = sortBy === 'created_at' ? 'createdAt' :
          sortBy === 'last_sign_in_at' ? 'lastSignInAt' :
          sortBy === 'first_name' ? 'firstName' : 'lastName';
        const aVal = a[field] || '';
        const bVal = b[field] || '';
        return sortOrder === 'desc'
          ? (aVal > bVal ? -1 : aVal < bVal ? 1 : 0)
          : (aVal < bVal ? -1 : aVal > bVal ? 1 : 0);
      });

      // Paginate
      const pageUsers = collected.slice(offset, offset + limit);
      resultUsers = await Promise.all(pageUsers.map(mapUserWithStats));
    } else {
      // No role filter: use Clerk's built-in pagination
      const query: any = {
        limit: Math.min(limit, 100),
        offset,
        orderBy: sortOrder === 'desc' ? `-${sortBy}` : sortBy
      };
      if (search) query.query = search;

      const response = await client.users.getUserList(query);
      resultUsers = await Promise.all(response.data.map(mapUserWithStats));
      totalFiltered = response.totalCount;
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
          for (const u of resultUsers) {
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
      users: resultUsers,
      totalCount: totalFiltered,
      roleCounts,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < totalFiltered
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