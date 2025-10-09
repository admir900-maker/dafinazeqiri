import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Booking from '@/models/Booking';

// GET /api/admin/users/export - Export users data as CSV
export async function GET(request: NextRequest) {
  let adminUserId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    adminUserId = authUserId;

    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const role = searchParams.get('role') || '';
    const includeStats = searchParams.get('includeStats') === 'true';

    // Get all users from Clerk
    const client = await clerkClient();
    const allUsers = [];
    let offset = 0;
    const limit = 100;

    // Fetch all users in batches
    while (true) {
      const response = await client.users.getUserList({
        limit,
        offset,
        orderBy: '-created_at'
      });

      allUsers.push(...response.data);

      if (response.data.length < limit) {
        break;
      }

      offset += limit;
    }

    // Filter by role if specified
    let filteredUsers = allUsers;
    if (role) {
      if (role === 'user') {
        filteredUsers = allUsers.filter(u => !u.publicMetadata?.role);
      } else {
        filteredUsers = allUsers.filter(u => u.publicMetadata?.role === role);
      }
    }

    // Get booking statistics if requested
    let usersWithStats = filteredUsers;
    if (includeStats) {
      await connectToDatabase();

      usersWithStats = await Promise.all(filteredUsers.map(async (user: any) => {
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

        return { ...user, bookingStats: stats };
      }));
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID',
        'Email',
        'First Name',
        'Last Name',
        'Role',
        'Created At',
        'Last Sign In',
        'Banned'
      ];

      if (includeStats) {
        headers.push('Total Bookings', 'Total Spent', 'Last Booking');
      }

      const csvRows = [headers.join(',')];

      for (const user of usersWithStats) {
        const row = [
          user.id,
          user.emailAddresses[0]?.emailAddress || '',
          user.firstName || '',
          user.lastName || '',
          user.publicMetadata?.role || 'user',
          new Date(user.createdAt).toISOString(),
          user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : '',
          user.banned ? 'Yes' : 'No'
        ];

        if (includeStats) {
          const stats = (user as any).bookingStats;
          row.push(
            stats.totalBookings.toString(),
            stats.totalSpent.toString(),
            stats.lastBooking ? new Date(stats.lastBooking).toISOString() : ''
          );
        }

        // Escape commas and quotes in CSV
        const escapedRow = row.map(field => {
          if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        });

        csvRows.push(escapedRow.join(','));
      }

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Return JSON format
    return NextResponse.json({
      success: true,
      users: usersWithStats.map((user: any) => ({
        id: user.id,
        emailAddress: user.emailAddresses[0]?.emailAddress || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.publicMetadata?.role || 'user',
        createdAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        banned: user.banned || false,
        ...(includeStats && { bookingStats: user.bookingStats })
      })),
      exportedAt: new Date().toISOString(),
      totalCount: usersWithStats.length
    });

  } catch (error: any) {
    console.error('Error exporting users:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export users'
    }, { status: 500 });
  }
}