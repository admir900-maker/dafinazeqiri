import { clerkMiddleware, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const path = req.nextUrl.pathname;

  // Skip Next.js internals and maintenance page
  if (path.startsWith('/_next') || path === '/maintenance') {
    return;
  }

  // ADMIN API PROTECTION: Require admin role for all /api/admin/* routes
  if (path.startsWith('/api/admin')) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      if (user.publicMetadata?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
    }
    return;
  }

  // ADMIN PAGE PROTECTION: Require admin role for /admin/* pages
  if (path.startsWith('/admin')) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      if (user.publicMetadata?.role !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return;
  }

  // Skip other API routes and webhook endpoints
  if (path.startsWith('/api')) {
    return;
  }

  // Maintenance mode for public pages
  const envMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';

  if (envMaintenanceMode) {
    return NextResponse.redirect(new URL('/maintenance', req.url));
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
