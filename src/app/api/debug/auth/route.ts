import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
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