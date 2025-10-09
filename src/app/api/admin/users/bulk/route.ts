import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// POST /api/admin/users/bulk - Bulk operations on users
export async function POST(request: NextRequest) {
  let adminUserId: string | null = null;

  try {
    const { userId: authUserId } = await auth();
    adminUserId = authUserId;

    if (!adminUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userIds, data } = body;

    if (!action || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json({
        error: 'Action and userIds array are required'
      }, { status: 400 });
    }

    const client = await clerkClient();
    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        switch (action) {
          case 'updateRole':
            if (!data?.role) {
              throw new Error('Role is required for updateRole action');
            }
            await client.users.updateUserMetadata(userId, {
              publicMetadata: {
                role: data.role || undefined
              }
            });
            results.push({ userId, success: true, action: 'updateRole' });
            break;

          case 'ban':
            await client.users.banUser(userId);
            results.push({ userId, success: true, action: 'ban' });
            break;

          case 'unban':
            await client.users.unbanUser(userId);
            results.push({ userId, success: true, action: 'unban' });
            break;

          case 'updateMetadata':
            if (!data?.metadata) {
              throw new Error('Metadata is required for updateMetadata action');
            }
            await client.users.updateUserMetadata(userId, {
              publicMetadata: data.metadata
            });
            results.push({ userId, success: true, action: 'updateMetadata' });
            break;

          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error: any) {
        errors.push({
          userId,
          error: error.message,
          action
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk operation completed. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors
    });

  } catch (error: any) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform bulk operation'
    }, { status: 500 });
  }
}