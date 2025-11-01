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
      title: `${siteConfig.siteName} - Supernova 2025`,
      description: `Supernova 2025 ${siteConfig.siteName}.`,
      keywords: "concerts, tickets, music events, live performances, festivals",
      authors: [{ name: `${siteConfig.siteName} Team` }],
      openGraph: {
        title: `${siteConfig.siteName} - Supernova 2025`,
        description: `Supernova 2025 ${siteConfig.siteName}.`,
        type: "website",
      },
    };
  } catch (error) {
    // Fallback metadata
    return {
      title: "Supernova 2025",
      description: "Supernova 2025",
      keywords: "concerts, tickets, music events, live performances, festivals",
      authors: [{ name: "Supernova 2025" }],
      openGraph: {
        title: "Supernova 2025",
        description: "Supernova 2025.",
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
