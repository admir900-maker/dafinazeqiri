import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/lib/admin';

// POST /api/admin/promote - Promote user role (admin only)
export async function POST(request: NextRequest) {
  let adminUserId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    adminUserId = authUserId;

    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the caller is an admin
    const admin = await isUserAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'staff', 'validator', ''];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update user metadata in Clerk
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: role || undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: `User ${role ? `promoted to ${role}` : 'role removed'}`
    });

  } catch (error: any) {
    console.error('Error promoting user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user role'
    }, { status: 500 });
  }
}