'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, MapPin, Calendar, ArrowRight, Sparkles, Music, Users, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const heroSlides = [
  {
    title: "Experience Music Like Never Before",
    subtitle: "Discover amazing concerts and live performances from world-class artists",
    gradient: "from-orange-700 via-amber-900 to-orange-800",
    image: "/hero-1.jpg"
  },
  {
    title: "Your Front Row Seat Awaits",
    subtitle: "Get tickets to the hottest shows and festivals in your city",
    gradient: "from-amber-900 via-orange-700 to-stone-800",
    image: "/hero-2.jpg"
  },
  {
    title: "Connect Through Music",
    subtitle: "Join thousands of music lovers at unforgettable live experiences",
    gradient: "from-orange-800 via-amber-900 to-orange-700",
    image: "/hero-3.jpg"
  }
]

export function HeroSection() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')
  const [showHero, setShowHero] = useState(true)
  const [showStats, setShowStats] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [particles, setParticles] = useState<Array<{
    id: number
    left: number
    top: number
    xOffset: number
    yOffset: number
    duration: number
  }>>([])

  // Fetch homepage settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/homepage-settings')
        const data = await response.json()
        if (data.success) {
          setShowHero(data.data.showHeroSection ?? true)
          setShowStats(data.data.showStats ?? true)
        }
      } catch (error) {
        console.error('Error fetching homepage settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])
  // Generate particle data only on client side to avoid hydration mismatch
  useEffect(() => {
    const particleData = [...Array(20)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      xOffset: Math.random() * 100 - 50,
      yOffset: Math.random() * 100 - 50,
      duration: Math.random() * 10 + 10,
    }))
    setParticles(particleData)
  }, [])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    }
    if (location.trim()) {
      params.set('location', location.trim())
    }

    const queryString = params.toString()
    const url = queryString ? `/events?${queryString}` : '/events'
    router.push(url)
  }

  const stats = [
    { icon: Music, label: "Events", value: "10,000+" },
    { icon: Users, label: "Attendees", value: "500K+" },
    { icon: Star, label: "Rating", value: "4.9/5" },
    { icon: Calendar, label: "This Month", value: "250+" }
  ]

  // Don't render if hero section is disabled
  if (!showHero) {
    return null
  }

  // Show loading skeleton while fetching settings
  if (isLoading) {
    return (
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Blue music-themed background with notes */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #60a5fa 100%)', opacity: 0.92 }} />
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 0 }}>
            <g opacity="0.10">
              <text x="120" y="300" fontSize="180" fontFamily="sans-serif" fill="#fff">&#9835;</text>
              <text x="800" y="180" fontSize="120" fontFamily="sans-serif" fill="#fff">&#119070;</text>
              <text x="1500" y="600" fontSize="160" fontFamily="sans-serif" fill="#fff">&#9833;</text>
              <text x="1700" y="400" fontSize="100" fontFamily="sans-serif" fill="#fff">&#119070;</text>
            </g>
          </svg>
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-pulse">
            {/* Badge skeleton */}
            <div className="mb-6 flex justify-center">
              <div className="h-8 w-48 bg-white/20 rounded-full"></div>
            </div>

            {/* Title skeleton */}
            <div className="mb-6 space-y-4">
              <div className="h-16 bg-white/20 rounded-lg mx-auto max-w-3xl"></div>
              <div className="h-16 bg-white/20 rounded-lg mx-auto max-w-2xl"></div>
            </div>

            {/* Subtitle skeleton */}
            <div className="mb-12 mx-auto max-w-3xl">
              <div className="h-8 bg-white/20 rounded-lg"></div>
            </div>

            {/* Search box skeleton */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-4xl mx-auto border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="h-12 bg-white/20 rounded-lg"></div>
                <div className="h-12 bg-white/20 rounded-lg"></div>
                <div className="h-12 bg-white/20 rounded-lg"></div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-8 w-16 bg-white/20 rounded-full"></div>
                ))}
              </div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-2xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-8 w-8 bg-white/20 rounded-full mx-auto mb-2"></div>
                  <div className="h-8 bg-white/20 rounded-lg mb-1"></div>
                  <div className="h-4 bg-white/20 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Blue music-themed background with notes */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #60a5fa 100%)', opacity: 0.92 }} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 0 }}>
          <g opacity="0.10">
            <text x="120" y="300" fontSize="180" fontFamily="sans-serif" fill="#fff">&#9835;</text>
            <text x="800" y="180" fontSize="120" fontFamily="sans-serif" fill="#fff">&#119070;</text>
            <text x="1500" y="600" fontSize="160" fontFamily="sans-serif" fill="#fff">&#9833;</text>
            <text x="1700" y="400" fontSize="100" fontFamily="sans-serif" fill="#fff">&#119070;</text>
          </g>
        </svg>
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 bg-white/10 rounded-full"
            animate={{
              x: [0, particle.xOffset],
              y: [0, particle.yOffset],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Content (Static) */}
          <div className="mb-6">
            <Badge className="mb-4 px-4 py-2 text-sm bg-white/20 text-white border-white/30 hover:bg-white/30">
              <Sparkles className="w-4 h-4 mr-2" />
              ✨ New Events Added Daily
            </Badge>
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
            {heroSlides[0].title}
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
            {heroSlides[0].subtitle}
          </p>

          {/* Search Section */}
          <motion.div
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-4xl mx-auto border border-white/20"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
                <Input
                  type="text"
                  placeholder="Search events, artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
                <Input
                  type="text"
                  placeholder="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white/30"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-white text-black hover:bg-white/90 font-semibold"
                size="lg"
              >
                Search Events
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Popular Searches */}
            <div className="flex flex-wrap justify-center gap-2">
              {['Rock', 'Jazz', 'Electronic', 'Pop', 'Classical', 'Hip Hop'].map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSearchQuery(genre)}
                  className="px-3 py-1 text-sm text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                >
                  {genre}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          {showStats && (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 + index * 0.1, duration: 0.5 }}
                >
                  <div className="flex justify-center mb-2">
                    <stat.icon className="h-8 w-8 text-white/80" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-white/80 text-sm">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse" />
        </div>
      </motion.div>
    </section>
  )
}