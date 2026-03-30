import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isUserAdmin } from '@/lib/admin';

export async function GET() {
  try {
    // SECURITY: Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }

    const admin = await isUserAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, sessionId } = await auth();

    return NextResponse.json({
      authenticated: !!userId,
      userId: userId || null,
      sessionId: sessionId || null,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error checking auth:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Failed to check authentication',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}