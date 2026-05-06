import { MetadataRoute } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import Event from '@/models/Event';

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || 'https://dafinazeqiri.tickets';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Dynamic event pages
  try {
    await connectToDatabase();
    const events = await Event.find({ isActive: true }, { _id: 1, updatedAt: 1, slug: 1 }).lean();
    const eventPages: MetadataRoute.Sitemap = events.map((event: any) => ({
      url: `${BASE_URL}/events/${event._id}`,
      lastModified: event.updatedAt ? new Date(event.updatedAt) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    return [...staticPages, ...eventPages];
  } catch {
    return staticPages;
  }
}
