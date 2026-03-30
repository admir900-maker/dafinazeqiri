import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import UserActivity from '@/models/UserActivity';
import mongoose from 'mongoose';

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

    // Get previous role for audit trail
    const client = await clerkClient();
    const targetUser = await client.users.getUser(userId);
    const previousRole = (targetUser.publicMetadata as any)?.role || 'user';

    // Update user metadata in Clerk
    // Build new publicMetadata: spread existing, then set or delete role
    const newMetadata = { ...(targetUser.publicMetadata as Record<string, any>) };
    if (role) {
      newMetadata.role = role;
    } else {
      delete newMetadata.role;
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata: newMetadata
    });

    // Log the role change for forensics
    await connectToDatabase();
    await UserActivity.create({
      userId: adminUserId,
      action: 'admin_action',
      description: `Role change: ${targetUser.emailAddresses?.[0]?.emailAddress || userId} from "${previousRole}" to "${role || 'user'}"`,
      status: 'success',
      metadata: {
        targetUserId: userId,
        targetEmail: targetUser.emailAddresses?.[0]?.emailAddress,
        targetName: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim(),
        previousRole,
        newRole: role || 'user',
        action: 'role_change',
      }
    });

    // Invalidate role counts cache so next load picks up the change
    try {
      const db = mongoose.connection.db!;
      await db.collection('system_cache').deleteOne({ key: 'roleCounts' });
    } catch (_) { /* ignore */ }

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