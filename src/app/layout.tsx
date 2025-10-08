import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SkipLink } from "@/components/ui/accessibility";
import { ClerkProvider } from '@clerk/nextjs';
import { CurrencyProvider } from '@/contexts/CurrencyContext';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <CurrencyProvider>
        <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
          <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col main-background`}>
            {/* Skip links for accessibility */}
            <SkipLink href="#main-content">Skip to main content</SkipLink>
            <SkipLink href="#navigation">Skip to navigation</SkipLink>

            <Header />
            <main id="main-content" className="flex-1 pt-16 main-background" role="main">
              <div className="main-content">
                {children}
              </div>
            </main>
            <Footer />
          </body>
        </html>
      </CurrencyProvider>
    </ClerkProvider>
  );
}
