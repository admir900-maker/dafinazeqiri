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
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Ticket className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">{siteConfig.siteName}</span>
          </div>
          <p className="text-gray-600 mb-6 text-sm max-w-md mx-auto">
            Your ultimate destination for amazing concerts and live music experiences.
          </p>
          <div className="pt-6 border-t border-gray-200">
            <p className="text-gray-500 text-sm">
              © {currentYear} {siteConfig.siteName}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}