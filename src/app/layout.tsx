import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SkipLink } from "@/components/ui/accessibility";
import { ClerkProvider } from '@clerk/nextjs';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { FavoritesProvider, CartProvider } from '@/contexts/FavoritesCartContext';
import { getSiteConfig } from '@/lib/settings';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ['400', '700', '900'],
});

const BASE_URL = process.env.NEXT_PUBLIC_DOMAIN || 'https://dafinazeqiri.tickets';

// Generate dynamic metadata
export async function generateMetadata(): Promise<Metadata> {
  try {
    const siteConfig = await getSiteConfig();
    const siteUrl = siteConfig.siteUrl || BASE_URL;

    return {
      metadataBase: new URL(siteUrl),
      title: {
        default: `Dafina Zeqiri — Bileta Zyrtare | ${siteConfig.siteName}`,
        template: `%s | Dafina Zeqiri`,
      },
      description: `Blej bileta zyrtare për koncertet e Dafina Zeqirit. Dafina Zeqiri Supernova 2026 — biletat online, të sigurta dhe origjinale. Buy official Dafina Zeqiri concert tickets.`,
      keywords: [
        "Dafina Zeqiri",
        "Dafina Zeqiri bileta",
        "Dafina Zeqiri tickets",
        "Dafina Zeqiri koncert",
        "Dafina Zeqiri Supernova 2026",
        "Dafina Zeqiri 2026",
        "bileta koncert",
        "bileta online Kosovë",
        "Albanian pop concert tickets",
        "Kosovo concerts",
        "Supernova 2026",
        "dafinazeqiri.tickets",
      ],
      authors: [{ name: "Dafina Zeqiri", url: siteUrl }],
      creator: "Dafina Zeqiri",
      publisher: siteConfig.siteName,
      category: "music",
      alternates: {
        canonical: siteUrl,
      },
      openGraph: {
        title: `Dafina Zeqiri — Bileta Zyrtare | Supernova 2026`,
        description: `Blej bileta zyrtare për koncertet e Dafina Zeqirit. Supernova 2026 — biletat online, të sigurta dhe origjinale.`,
        url: siteUrl,
        siteName: `Dafina Zeqiri | ${siteConfig.siteName}`,
        type: "website",
        locale: "sq_AL",
        images: siteConfig.logoUrl ? [{ url: siteConfig.logoUrl, alt: "Dafina Zeqiri" }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: `Dafina Zeqiri — Bileta Zyrtare | Supernova 2026`,
        description: `Blej bileta zyrtare për koncertet e Dafina Zeqirit. Supernova 2026.`,
        images: siteConfig.logoUrl ? [siteConfig.logoUrl] : [],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      verification: {
        google: "7a041c9ed01aab8c",
      },
    };
  } catch {
    return {
      metadataBase: new URL(BASE_URL),
      title: {
        default: "Dafina Zeqiri — Bileta Zyrtare | Supernova 2026",
        template: "%s | Dafina Zeqiri",
      },
      description: "Blej bileta zyrtare për koncertet e Dafina Zeqirit. Dafina Zeqiri Supernova 2026 — biletat online, të sigurta dhe origjinale.",
      keywords: ["Dafina Zeqiri", "Dafina Zeqiri bileta", "Dafina Zeqiri tickets", "Dafina Zeqiri Supernova 2026", "bileta koncert", "Kosovo concerts"],
      openGraph: {
        title: "Dafina Zeqiri — Bileta Zyrtare | Supernova 2026",
        description: "Blej bileta zyrtare për koncertet e Dafina Zeqirit. Supernova 2026.",
        type: "website",
        url: BASE_URL,
      },
      twitter: {
        card: "summary_large_image",
        title: "Dafina Zeqiri — Bileta Zyrtare | Supernova 2026",
        description: "Blej bileta zyrtare për koncertet e Dafina Zeqirit.",
      },
      robots: { index: true, follow: true },
      verification: {
        google: "7a041c9ed01aab8c",
      },
    };
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <CurrencyProvider>
        <FavoritesProvider>
          <CartProvider>
            <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
              <body className={`${inter.variable} ${playfair.variable} font-sans antialiased min-h-screen flex flex-col`} style={{ background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #1a1a1a 100%)' }}>
                {/* Skip links for accessibility */}
                <SkipLink href="#main-content">Skip to main content</SkipLink>
                <SkipLink href="#navigation">Skip to navigation</SkipLink>

                <Header />
                <main id="main-content" className="flex-1 pt-16" role="main">
                  <div className="main-content">
                    {children}
                  </div>
                </main>
                <Footer />
              </body>
            </html>
          </CartProvider>
        </FavoritesProvider>
      </CurrencyProvider>
    </ClerkProvider>
  );
}
