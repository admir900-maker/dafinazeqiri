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
    // ...(isSignedIn ? [{ href: '/bookings', label: 'My Bookings' }] : []),
    // { href: '/about', label: 'About' },
    // { href: '/contact', label: 'Contact' },
    ...(isValidator || isAdmin ? [{ href: '/validator', label: 'Validator' }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <header id="navigation" className="fixed top-0 left-0 right-0 z-50 w-full border-b border-orange-700/20 shadow-2xl overflow-hidden backdrop-blur-md" style={{ background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 10, 10, 0.95) 50%, rgba(20, 15, 0, 0.95) 100%)' }}>
      {/* Elite shimmer overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(205, 127, 50, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(217, 119, 6, 0.4) 0%, transparent 50%)' }}></div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/5 to-transparent" style={{ animation: 'shimmer 3s infinite' }}></div>
      </div>

      <div className="container mx-auto px-4 py-0 relative z-10">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Ticket className="h-9 w-9 text-orange-500 group-hover:text-orange-300 transition-all transform group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 8px rgba(205, 127, 50, 0.6))' }} />
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-7 w-32 bg-orange-500/30 animate-pulse rounded"></div>
                </div>
              ) : (
                <span className="text-3xl font-bold tracking-tight" style={{
                  background: 'linear-gradient(135deg, #cd7f32, #b4530a, #b4530a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
                  fontFamily: "'Playfair Display', serif"
                }}>{siteConfig.siteName}</span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-base font-semibold text-orange-100 hover:text-orange-300 px-3 py-2 rounded-lg transition-all relative group"
                style={{ letterSpacing: '0.5px' }}
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-900 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xs mx-6">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-300/80 group-hover:text-orange-500 transition-colors" />
                <Input
                  type="search"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 rounded-full border-2 border-orange-700/40 focus:border-orange-500/80 bg-black/40 backdrop-blur-md text-orange-100 placeholder-orange-500/60 h-11 transition-all shadow-lg group-hover:shadow-orange-500/30"
                  style={{ fontWeight: '500' }}
                />
              </div>
            </form>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2">
            {/* User Menu */}
            {isSignedIn ? (
              <div className="ring-2 ring-orange-500/50 rounded-full p-0.5 bg-gradient-to-br from-orange-500 to-amber-900">
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Button variant="outline" asChild className="border-2 border-orange-500/60 hover:border-orange-500 transition-all rounded-full bg-black/30 backdrop-blur-md shadow-lg hover:shadow-orange-500/40 text-orange-100 font-semibold px-6">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button asChild className="rounded-full font-bold px-7 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105" style={{
                  background: 'linear-gradient(135deg, #cd7f32, #b4530a)',
                  border: '2px solid rgba(205, 127, 50, 0.3)'
                }}>
                  <Link href="/auth/signup" className="text-black">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden border-2 border-orange-500/60 hover:border-orange-500 transition-all rounded-full bg-black/30 backdrop-blur-md shadow-lg"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6 text-orange-300" /> : <Menu className="h-6 w-6 text-orange-300" />}
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
              className="md:hidden border-t border-pink-400/30 shadow-2xl relative overflow-hidden backdrop-blur-lg"
              style={{ background: 'linear-gradient(135deg, rgba(45, 27, 78, 0.98) 0%, rgba(123, 44, 111, 0.98) 50%, rgba(201, 75, 139, 0.98) 100%)' }}
            >
              {/* Glamour overlay for mobile menu */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(236, 72, 153, 0.5) 0%, transparent 60%)' }}></div>

              <div className="px-4 py-4 space-y-4 relative z-10">
                {/* Mobile Search */}
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-pink-200/80" />
                    <Input
                      type="search"
                      placeholder="Search events..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 rounded-full border-2 border-pink-300/40 focus:border-pink-400/80 bg-white/20 backdrop-blur-md text-white placeholder-pink-200/60 h-11 shadow-lg"
                    />
                  </div>
                </form>

                {/* Mobile Navigation */}
                <nav className="flex flex-col gap-3">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-base font-semibold text-white/95 hover:text-pink-200 px-4 py-2.5 rounded-lg transition-all bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {/* Mobile Auth */}
                {!isSignedIn && (
                  <div className="flex flex-col gap-3 pt-4 border-t border-pink-400/30">
                    <Button variant="outline" asChild className="justify-start border-2 border-pink-300/60 hover:border-pink-400 transition-all rounded-full bg-white/20 backdrop-blur-md shadow-lg text-white font-semibold h-12">
                      <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                    <Button asChild className="justify-start rounded-full font-bold h-12 shadow-xl transition-all" style={{
                      background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                      border: '2px solid rgba(255, 255, 255, 0.3)'
                    }}>
                      <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="text-white">
                        Sign Up
                      </Link>
                    </Button>
                  </div>
                )}
                {isSignedIn && (
                  <div className="pt-4 border-t border-pink-400/30 flex justify-center">
                    <div className="ring-2 ring-pink-300/50 rounded-full p-0.5 bg-gradient-to-br from-pink-400 to-purple-500">
                      <UserButton afterSignOutUrl="/" />
                    </div>
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