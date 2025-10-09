import { NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/settings';

export async function GET() {
  try {
    const config = await getSiteConfig();

    // Return only public configuration
    return NextResponse.json({
      siteName: config.siteName,
      siteDescription: config.siteDescription,
      currency: config.currency,
      logoUrl: config.logoUrl,
      faviconUrl: config.faviconUrl
    });
  } catch (error) {
    console.error('Error fetching site config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site configuration' },
      { status: 500 }
    );
  }
}