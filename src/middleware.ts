import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Skip maintenance check for admin routes and API endpoints
  if (req.nextUrl.pathname.startsWith('/admin') ||
    req.nextUrl.pathname.startsWith('/api') ||
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname === '/maintenance') {
    return;
  }

  // Check maintenance mode via environment variable as fallback
  // The main maintenance mode check will be done in the page components
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
