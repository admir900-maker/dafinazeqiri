'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Search, ShoppingCart, Heart, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth, UserButton, useUser } from '@clerk/nextjs'

interface HeaderProps {
  cartCount?: number
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

export function Header({ cartCount = 0 }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/events', label: 'Events' },
    { href: '/categories', label: 'Categories' },
    ...(isSignedIn ? [{ href: '/bookings', label: 'My Bookings' }] : []),
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
    ...(isValidator || isAdmin ? [{ href: '/validator', label: 'Validator' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-white/30 shadow-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #60a5fa 100%)' }}>
      {/* Music notes background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1920 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 0 }}>
        <g opacity="0.05">
          <text x="120" y="200" fontSize="120" fontFamily="sans-serif" fill="#fff">&#9835;</text>
          <text x="800" y="150" fontSize="80" fontFamily="sans-serif" fill="#fff">&#119070;</text>
          <text x="1500" y="180" fontSize="100" fontFamily="sans-serif" fill="#fff">&#9833;</text>
          <text x="1700" y="120" fontSize="70" fontFamily="sans-serif" fill="#fff">&#119070;</text>
        </g>
      </svg>
      {/* Subtle glass effect, no music notes */}
      <div className="container mx-auto px-4 py-0 relative z-10">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Ticket className="h-8 w-8 text-white" />
              <span className="text-2xl font-bold text-white tracking-tight drop-shadow-md">{siteConfig.siteName}</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-base font-medium text-white/90 hover:text-white px-2 py-1 rounded transition-colors drop-shadow-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xs mx-6">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
                <Input
                  type="search"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 rounded border border-white/40 focus:border-white/60 bg-white/30 backdrop-blur-sm text-white placeholder-white/70"
                />
              </div>
            </form>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Button variant="outline" size="icon" className="relative border border-white/40 hover:border-white/60 transition-colors rounded-full bg-white/30 backdrop-blur-sm shadow-sm group">
              <ShoppingCart className="h-5 w-5 text-white/90 group-hover:text-white transition-colors" />
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-white/40 text-white shadow border border-white/50">
                  {cartCount}
                </Badge>
              )}
            </Button>

            {/* Wishlist */}
            <Button variant="outline" size="icon" className="border border-white/40 hover:border-white/60 transition-colors rounded-full bg-white/30 backdrop-blur-sm shadow-sm group">
              <Heart className="h-5 w-5 text-white/90 group-hover:text-white transition-colors" />
            </Button>

            {/* User Menu */}
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" asChild className="border border-white/40 hover:border-white/60 transition-colors rounded-full bg-white/30 backdrop-blur-sm shadow-sm text-white">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button asChild className="border border-white/50 hover:border-white/70 transition-colors rounded-full bg-white/40 backdrop-blur-sm text-white shadow-sm">
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden border border-white/40 hover:border-white/60 transition-colors rounded-full bg-white/30 backdrop-blur-sm shadow-sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden border-t border-white/30 shadow-xl relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #60a5fa 100%)' }}
            >
              {/* Music notes background for mobile menu */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1920 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 0 }}>
                <g opacity="0.05">
                  <text x="80" y="160" fontSize="60" fontFamily="sans-serif" fill="#fff">&#9835;</text>
                  <text x="300" y="120" fontSize="40" fontFamily="sans-serif" fill="#fff">&#119070;</text>
                  <text x="200" y="200" fontSize="50" fontFamily="sans-serif" fill="#fff">&#9833;</text>
                </g>
              </svg>
              <div className="px-4 py-4 space-y-4 relative z-10">
                {/* Mobile Search */}
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
                    <Input
                      type="search"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded border border-white/40 focus:border-white/60 bg-white/30 backdrop-blur-sm text-white placeholder-white/70"
                    />
                  </div>
                </form>

                {/* Mobile Navigation */}
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-base font-medium text-white/90 hover:text-white px-2 py-1 rounded transition-colors drop-shadow-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Auth */}
                {!isSignedIn && (
                  <div className="flex flex-col gap-2 pt-4 border-t border-white/30">
                    <Button variant="outline" asChild className="justify-start border border-white/40 hover:border-white/60 transition-colors rounded-full bg-white/30 backdrop-blur-sm shadow-sm text-white">
                      <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button asChild className="justify-start border border-white/50 hover:border-white/70 transition-colors rounded-full bg-white/40 backdrop-blur-sm text-white shadow-sm">
                      <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                        Sign Up
                      </Link>
                    </Button>
                  </div>
                )}
                {isSignedIn && (
                  <div className="pt-4 border-t border-white/30">
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