// import { HeroSection } from "@/components/sections/hero-section"
import { FeaturedEventsSection } from "@/components/sections/featured-events-section"

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || 'https://dafinazeqiri.tickets';

const personSchema = {
  "@context": "https://schema.org",
  "@type": "MusicGroup",
  "name": "Dafina Zeqiri",
  "url": BASE_URL,
  "sameAs": [
    "https://www.instagram.com/dafinazeqiri",
    "https://www.facebook.com/dafinazeqiri",
    "https://www.youtube.com/@dafinazeqiri",
    "https://open.spotify.com/artist/dafinazeqiri",
    "https://en.wikipedia.org/wiki/Dafina_Zeqiri",
  ],
  "genre": ["Albanian pop", "R&B", "Dance"],
  "description": "Dafina Zeqiri është një këngëtare shqiptare. Bli bileta zyrtare për koncertet e saj në dafinazeqiri.tickets.",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Dafina Zeqiri — Bileta Zyrtare",
  "url": BASE_URL,
  "description": "Platforma zyrtare e biletave për koncertet e Dafina Zeqirit. Supernova 2026.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${BASE_URL}/events?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      {/* Featured Events Section */}
      <FeaturedEventsSection />
      {/* Hero Section */}
      {/* <HeroSection /> */}
    </>
  )
}
