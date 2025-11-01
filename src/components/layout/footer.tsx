'use client'

import { useState, useEffect } from 'react'
import { Mail, Phone, MapPin, Instagram, Twitter, Facebook, Ticket } from 'lucide-react'

interface SiteConfig {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  currency: string;
  timezone: string;
  logoUrl: string;
  faviconUrl: string;
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    siteName: 'SUPERNOVA', // fallback
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

  return (
    <footer className="mt-20 border-t-2 border-orange-700/30 shadow-2xl relative overflow-hidden backdrop-blur-md" style={{ background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 10, 10, 0.95) 50%, rgba(20, 15, 0, 0.95) 100%)' }}>
      {/* Glamorous overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-orange-700 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-amber-900 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="p-2 rounded-full" style={{ background: 'linear-gradient(135deg, #cd7f32, #b4530a)' }}>
              <Ticket className="h-10 w-10 text-black" />
            </div>
            <span className="text-4xl font-bold" style={{
              background: 'linear-gradient(135deg, #cd7f32, #b4530a, #b4530a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: "'Playfair Display', serif"
            }}>{siteConfig.siteName}</span>
          </div>
          <p className="text-orange-100/95 mb-8 text-lg font-light">
            Your ultimate destination for amazing concerts and live music experiences.
          </p>
          <div className="pt-10 border-t-2 border-orange-700/30">
            <p className="text-orange-100/90 text-base font-medium">
              © {currentYear} {siteConfig.siteName}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}