import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
  console.log('🔍 GET /api/debug/auth called');

  try {
    console.log('🔑 Attempting to get auth...');
    const authResult = await auth();
    console.log('� Auth result:', authResult);

    const { userId } = authResult;
    console.log('�👤 Auth userId:', userId);

    if (!userId) {
      console.log('❌ No user ID found');
      return NextResponse.json({
        authenticated: false,
        error: 'No user ID from auth()',
        authResult: authResult
      });
    }

    console.log('👤 Attempting to get current user...');
    const user = await currentUser();
    console.log('👤 Current user result:', user);

    if (!user) {
      console.log('❌ No user data found');
      return NextResponse.json({
        authenticated: false,
        error: 'No user data from currentUser()',
        userId: userId
      });
    }

    console.log('👤 Current user data:', {
      id: user?.id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      publicMetadata: user?.publicMetadata
    });

    const isAdmin = user?.publicMetadata?.role === 'admin';

    return NextResponse.json({
      authenticated: true,
      userId,
      user: {
        id: user?.id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        emailAddresses: user?.emailAddresses?.map(e => e.emailAddress),
      },
      publicMetadata: user?.publicMetadata,
      isAdmin,
    });

  } catch (error) {
    console.error('❌ Auth debug error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Auth check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}