import Head from 'next/head';

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

export const SEO: React.FC<SEOProps> = ({
  title = 'BiletAra - Your Premier Destination for Live Events',
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://biletara.com';
  const fullTitle = title.includes('BiletAra') ? title : `${title} | BiletAra`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`;
  const fullCanonicalUrl = canonicalUrl || siteUrl;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content="BiletAra" />
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
      <meta property="og:site_name" content="BiletAra" />
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

export const generateOrganizationStructuredData = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'BiletAra',
  description: 'Premier destination for live event tickets and entertainment experiences',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://biletara.com',
  logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://biletara.com'}/logo.png`,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+1-555-123-4567',
    contactType: 'customer service',
    email: 'support@biletara.com',
  },
  sameAs: [
    'https://twitter.com/biletara',
    'https://facebook.com/biletara',
    'https://instagram.com/biletara',
  ],
});

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