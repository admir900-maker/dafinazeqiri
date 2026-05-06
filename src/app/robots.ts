import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || 'https://dafinazeqiri.tickets';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/validator/',
          '/seed/',
          '/maintenance/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
