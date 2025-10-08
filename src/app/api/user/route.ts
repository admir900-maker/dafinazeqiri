import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await currentUser();
    const isAdmin = user?.publicMetadata?.role === 'admin';

    return NextResponse.json({
      userId,
      isAdmin,
      metadata: user?.publicMetadata,
      firstName: user?.firstName,
      lastName: user?.lastName,
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    return NextResponse.json({ error: 'Failed to get user info' }, { status: 500 });
  }
}