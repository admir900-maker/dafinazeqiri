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

  return (
    <footer className="mt-16 border-t border-white/30 shadow-inner relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #60a5fa 100%)' }}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1920 600" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 0 }}>
        <g opacity="0.05">
          <text x="150" y="300" fontSize="120" fontFamily="sans-serif" fill="#fff">&#9835;</text>
          <text x="800" y="200" fontSize="80" fontFamily="sans-serif" fill="#fff">&#119070;</text>
          <text x="1400" y="350" fontSize="100" fontFamily="sans-serif" fill="#fff">&#9833;</text>
        </g>
      </svg>
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Ticket className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold text-white">{siteConfig.siteName}</span>
          </div>
          <p className="text-white/90 mb-6">
            Your ultimate destination for amazing concerts and live music experiences.
          </p>
          <div className="pt-8 border-t border-white/30">
            <p className="text-white/80 text-sm">
              © {currentYear} {siteConfig.siteName}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}