'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Search, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'

interface HeaderProps {
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

export function Header({ }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    siteName: 'BiletAra', // fallback
    siteDescription: '',
    siteUrl: '',
    currency: 'EUR',
    timezone: 'UTC',
    logoUrl: '',
    faviconUrl: ''
  })
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { user } = useUser()

  const isAdmin = user?.publicMetadata?.role === 'admin'
  const isValidator = user?.publicMetadata?.role === 'validator'

  // Fetch site configuration
  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/site-config')
        if (response.ok) {
          const config = await response.json()
          setSiteConfig(config)
        }
      } catch (error) {
        console.error('Failed to fetch site config:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSiteConfig()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const navItems = [
    { href: '/', label: 'Home' },
    // { href: '/events', label: 'Events' },
    // { href: '/categories', label: 'Categories' },
    ...(isSignedIn ? [{ href: '/bookings', label: 'My Bookings' }] : []),
    // { href: '/about', label: 'About' },
    // { href: '/contact', label: 'Contact' },
    ...(isValidator || isAdmin ? [{ href: '/validator', label: 'Validator' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header className="sticky top-0 left-0 right-0 z-50 w-full bg-orange-500 shadow-md">
      <div className="container mx-auto px-4 py-0">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Ticket className="h-8 w-8 text-white group-hover:text-orange-100 transition-colors" />
            {isLoading ? (
              <div className="h-6 w-24 bg-orange-400 animate-pulse rounded"></div>
            ) : (
              <span className="text-2xl font-bold text-white">{siteConfig.siteName}</span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <span className="text-sm font-medium text-white">Yaklaşan Etkinlikler</span>
          </nav>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild className="h-9 rounded-lg bg-white text-orange-500 border-0 hover:bg-orange-50">
                  <Link href="/auth/signin">Kayıt Ol</Link>
                </Button>
                <Button asChild className="h-9 w-9 rounded-lg bg-white text-orange-500 hover:bg-orange-50 p-0">
                  <Link href="/auth/signup">
                    <Menu className="h-5 w-5" />
                  </Link>
                </Button>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" asChild className="h-9 rounded-lg bg-white text-orange-500 border-0 hover:bg-orange-50">
                  <Link href="/auth/signin">Kayıt Ol</Link>
                </Button>
                <Button asChild className="h-9 rounded-lg bg-white text-orange-500 hover:bg-orange-50">
                  <Link href="/auth/signup">Giriş Yap</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden h-9 w-9 bg-white text-orange-500 border-0 hover:bg-orange-50"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-orange-400 bg-orange-500"
            >
              <div className="px-4 py-4 space-y-3">
                {/* Mobile Search */}
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 rounded-lg border-0 bg-white"
                    />
                  </div>
                </form>

                {/* Mobile Navigation */}
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-sm font-medium text-white hover:text-orange-100 hover:bg-orange-600 px-3 py-2 rounded-md transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Auth */}
                {!isSignedIn && (
                  <div className="flex flex-col gap-2 pt-3 border-t border-orange-400">
                    <Button variant="outline" asChild className="w-full bg-white text-orange-500 border-0 hover:bg-orange-50">
                      <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                        Kayıt Ol
                      </Link>
                    </Button>
                    <Button asChild className="w-full bg-white text-orange-500 hover:bg-orange-50">
                      <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                        Giriş Yap
                      </Link>
                    </Button>
                  </div>
                )}
                {isSignedIn && (
                  <div className="pt-3 border-t border-orange-400 flex justify-center">
                    <UserButton afterSignOutUrl="/" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}