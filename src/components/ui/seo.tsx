import Head from 'next/head';
import { useEffect, useState } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  twitterCard?: 'summary' | 'summary_large_image';
  canonicalUrl?: string;
  noindex?: boolean;
  structuredData?: object;
  locale?: string;
  alternateLanguages?: { hreflang: string; href: string }[];
}

interface SiteConfig {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  currency: string;
  timezone: string;
  logoUrl: string;
  faviconUrl: string;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = 'Discover and book tickets for the best concerts, festivals, and live events. Secure booking, instant delivery, and unforgettable experiences await.',
  keywords = [
    'concert tickets',
    'live events',
    'music festivals',
    'ticket booking',
    'live music',
    'entertainment',
    'event tickets',
    'concert venues'
  ],
  ogImage = '/og-image.jpg',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  canonicalUrl,
  noindex = false,
  structuredData,
  locale = 'en_US',
  alternateLanguages = []
}) => {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    siteName: 'BiletAra', // fallback
    siteDescription: '',
    siteUrl: '',
    currency: 'EUR',
    timezone: 'UTC',
    logoUrl: '',
    faviconUrl: ''
  })

  // Fetch site configuration
  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const response = await fetch('/api/site-config')
        if (response.ok) {
          const config = await response.json()
          setSiteConfig(config)
        }
      } catch (error) {
        console.error('Failed to fetch site config:', error)
      }
    }

    fetchSiteConfig()
  }, [])

  const siteUrl = siteConfig.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://dafinazeqiri.tickets';
  const fullTitle = title ? (title.includes(siteConfig.siteName) ? title : `${title} | ${siteConfig.siteName}`) : `${siteConfig.siteName} - Your Premier Destination for Live Events`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;
  const fullCanonicalUrl = canonicalUrl || siteUrl;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content={siteConfig.siteName} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#3B82F6" />

      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonicalUrl} />

      {/* Language alternates */}
      {alternateLanguages.map(({ hreflang, href }) => (
        <link key={hreflang} rel="alternate" hrefLang={hreflang} href={href} />
      ))}

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:image:alt" content={title} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:site_name" content={siteConfig.siteName} />
      <meta property="og:locale" content={locale} />

      {/* Twitter Card */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      <meta name="twitter:image:alt" content={title} />

      {/* Favicons */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Structured Data */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
    </Head>
  );
};

// Predefined structured data generators
export const generateEventStructuredData = (event: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: string;
  };
  offers: {
    price: number;
    currency: string;
    availability: string;
  }[];
  performer?: string[];
  image?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: event.name,
  description: event.description,
  startDate: event.startDate,
  endDate: event.endDate,
  location: {
    '@type': 'Place',
    name: event.location.name,
    address: event.location.address,
  },
  offers: event.offers.map(offer => ({
    '@type': 'Offer',
    price: offer.price,
    priceCurrency: offer.currency,
    availability: `https://schema.org/${offer.availability}`,
  })),
  performer: event.performer?.map(name => ({
    '@type': 'Person',
    name,
  })),
  image: event.image,
});

export const generateOrganizationStructuredData = async () => {
  try {
    const response = await fetch('/api/site-config')
    const siteConfig = response.ok ? await response.json() : {
      siteName: 'BiletAra',
      siteDescription: 'Premier destination for live event tickets and entertainment experiences',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://dafinazeqiri.tickets'
    }

    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: siteConfig.siteName,
      description: siteConfig.siteDescription || 'Premier destination for live event tickets and entertainment experiences',
      url: siteConfig.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://dafinazeqiri.tickets',
      logo: `${siteConfig.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://dafinazeqiri.tickets'}/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+1-555-123-4567',
        contactType: 'customer service',
        email: 'info@dafinazeqiri.tickets',
      },
      sameAs: [
        'https://twitter.com/biletara',
        'https://facebook.com/biletara',
        'https://instagram.com/biletara',
      ],
    }
  } catch (error) {
    // Fallback if API fails
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'BiletAra',
      description: 'Premier destination for live event tickets and entertainment experiences',
      url: process.env.NEXT_PUBLIC_SITE_URL || 'https://dafinazeqiri.tickets',
      logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://dafinazeqiri.tickets'}/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+1-555-123-4567',
        contactType: 'customer service',
        email: 'info@dafinazeqiri.tickets',
      },
      sameAs: [
        'https://twitter.com/biletara',
        'https://facebook.com/biletara',
        'https://instagram.com/biletara',
      ],
    }
  }
};

export const generateBreadcrumbStructuredData = (items: { name: string; url: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});