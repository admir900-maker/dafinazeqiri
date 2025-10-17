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

// Generate dynamic metadata
export async function generateMetadata(): Promise<Metadata> {
  try {
    const siteConfig = await getSiteConfig();

    return {
      title: `${siteConfig.siteName} - Discover Amazing Concerts & Events`,
      description: `Your ultimate destination for concert tickets and live music experiences. Discover, book, and enjoy unforgettable events with ${siteConfig.siteName}.`,
      keywords: "concerts, tickets, music events, live performances, festivals",
      authors: [{ name: `${siteConfig.siteName} Team` }],
      openGraph: {
        title: `${siteConfig.siteName} - Discover Amazing Concerts & Events`,
        description: `Your ultimate destination for concert tickets and live music experiences with ${siteConfig.siteName}.`,
        type: "website",
      },
    };
  } catch (error) {
    // Fallback metadata
    return {
      title: "BiletAra - Discover Amazing Concerts & Events",
      description: "Your ultimate destination for concert tickets and live music experiences. Discover, book, and enjoy unforgettable events with world-class artists.",
      keywords: "concerts, tickets, music events, live performances, festivals",
      authors: [{ name: "BiletAra Team" }],
      openGraph: {
        title: "BiletAra - Discover Amazing Concerts & Events",
        description: "Your ultimate destination for concert tickets and live music experiences.",
        type: "website",
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
              <body className={`${inter.variable} ${playfair.variable} font-sans antialiased min-h-screen flex flex-col`}>
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
