import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { makeUserAdmin } from '@/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { targetUserId } = await request.json();

    // Only allow current admins to make other users admin
    // For initial setup, you might want to temporarily comment this out
    // const isAdmin = await isUserAdmin();
    // if (!isAdmin) {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    const success = await makeUserAdmin(targetUserId);

    if (success) {
      return NextResponse.json({ message: 'User promoted to admin' });
    } else {
      return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}