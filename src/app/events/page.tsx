'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { EventCard } from '@/components/ui/event-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BackgroundWrapper } from '@/components/ui/background-wrapper'
import { PageLoading, LoadingState } from '@/components/ui/loading'
import ErrorBoundary from '@/components/ui/error-boundary'
import { useLoading } from '@/hooks/useLoading'
import {
  Search,
  Calendar,
  Music,
  SlidersHorizontal,
  X
} from 'lucide-react'

interface TicketType {
  name: string
  price: number
  quantity: number
  description?: string
  color: string
}

interface Event {
  _id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  venue: string
  ticketTypes: TicketType[]
  posterImage?: string
  bannerImage?: string
  category: string
  artists: string[]
  maxCapacity: number
  tags: string[]
}

function EventsPageContent() {
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const { loading, error, execute } = useLoading(true)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 1000 })
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'title' | 'popularity'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Derived data for filters
  const [categories, setCategories] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])

  // Initialize search query from URL parameters
  useEffect(() => {
    const urlQuery = searchParams.get('q')
    const urlLocation = searchParams.get('location')
    if (urlQuery) {
      setSearchQuery(urlQuery)
    }
    if (urlLocation) {
      setSelectedLocation(urlLocation)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchEvents = async () => {
      await execute(async () => {
        const response = await fetch('/api/events')
        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }
        const data = await response.json()

        // Sort events by date (upcoming first)
        const sortedEvents = data.sort((a: Event, b: Event) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )

        setEvents(sortedEvents)
        setFilteredEvents(sortedEvents)

        // Extract unique categories and locations for filters
        const uniqueCategories = Array.from(new Set(data.map((event: Event) => event.category).filter(Boolean)))
        const uniqueLocations = Array.from(new Set(data.map((event: Event) => event.location).filter(Boolean)))

        setCategories(uniqueCategories as string[])
        setLocations(uniqueLocations as string[])

        return data
      })
    }

    fetchEvents()
  }, [execute])

  // Apply filters and sorting whenever filter states change
  useEffect(() => {
    let filtered = events

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.artists.some(artist => artist.toLowerCase().includes(searchQuery.toLowerCase())) ||
        event.venue.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(event => event.category === selectedCategory)
    }

    // Location filter
    if (selectedLocation) {
      filtered = filtered.filter(event => event.location === selectedLocation)
    }

    // Price filter
    filtered = filtered.filter(event => {
      if (!event.ticketTypes || event.ticketTypes.length === 0) return true
      const minEventPrice = Math.min(...event.ticketTypes.map(ticket => ticket.price))
      const maxEventPrice = Math.max(...event.ticketTypes.map(ticket => ticket.price))
      return minEventPrice >= priceRange.min && maxEventPrice <= priceRange.max
    })

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'price':
          const aMinPrice = a.ticketTypes?.length ? Math.min(...a.ticketTypes.map(t => t.price)) : 0
          const bMinPrice = b.ticketTypes?.length ? Math.min(...b.ticketTypes.map(t => t.price)) : 0
          comparison = aMinPrice - bMinPrice
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'popularity':
          // Based on available tickets (fewer available = more popular)
          const aAvailable = a.ticketTypes?.reduce((sum, t) => sum + t.quantity, 0) || 0
          const bAvailable = b.ticketTypes?.reduce((sum, t) => sum + t.quantity, 0) || 0
          comparison = aAvailable - bAvailable
          break
        default:
          comparison = 0
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

    setFilteredEvents(filtered)
  }, [events, searchQuery, selectedCategory, selectedLocation, priceRange, sortBy, sortOrder])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('')
    setSelectedLocation('')
    setPriceRange({ min: 0, max: 1000 })
    setSortBy('date')
    setSortOrder('asc')
  }

  const hasActiveFilters = searchQuery || selectedCategory || selectedLocation || priceRange.min > 0 || priceRange.max < 1000

  if (loading) {
    return (
      <BackgroundWrapper fullHeight={true}>
        <PageLoading
          title="Loading Events"
          description="Discovering amazing events for you..."
          icon="music"
        />
      </BackgroundWrapper>
    )
  }

  if (error) {
    return (
      <BackgroundWrapper fullHeight={true} className="flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-8 border border-white/30 shadow-xl">
            <Music className="w-16 h-16 text-white/90 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">Unable to Load Events</h2>
            <p className="text-white/90 mb-4 drop-shadow-md">{error?.message || 'An error occurred while loading events'}</p>
            <Button
              onClick={() => window.location.reload()}
              className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 border border-white/40"
            >
              Try Again
            </Button>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  return (
    <ErrorBoundary>
      <BackgroundWrapper fullHeight={false}>
        {/* Header */}
        <div className="bg-white/20 backdrop-blur-md shadow-lg border-b border-white/30">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">All Events</h1>
            <p className="text-xl text-white drop-shadow-md">
              Discover amazing concerts and live performances
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Search and Filter Controls */}
          <div className="bg-white/20 backdrop-blur-lg rounded-xl shadow-xl p-6 mb-8 border border-white/30">
            {/* Search Bar */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 w-5 h-5" />
                <Input
                  placeholder="Search events, artists, venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/30 backdrop-blur-sm border-white/40 text-white placeholder-white/70 focus:bg-white/40 focus:border-white/60"
                />
              </div>

              {/* Sort Controls */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'price' | 'title' | 'popularity')}
                  className="border border-white/40 rounded-md px-3 py-2 bg-white/30 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/40"
                >
                  <option value="date" className="text-gray-900 bg-white">Sort by Date</option>
                  <option value="price" className="text-gray-900 bg-white">Sort by Price</option>
                  <option value="title" className="text-gray-900 bg-white">Sort by Title</option>
                  <option value="popularity" className="text-gray-900 bg-white">Sort by Popularity</option>
                </select>

                <Button
                  variant="outline"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="bg-white/30 backdrop-blur-sm border-white/40 text-white hover:bg-white/40 hover:border-white/60"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-white/30 backdrop-blur-sm border-white/40 text-white hover:bg-white/40 hover:border-white/60"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 bg-white/40 text-white border-white/50">
                    Active
                  </Badge>
                )}
              </Button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className="border-t border-white/30 pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-white drop-shadow-sm mb-2">
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full border border-white/40 rounded-md px-3 py-2 bg-white/30 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/40"
                    >
                      <option value="" className="text-gray-900 bg-white">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category} className="text-gray-900 bg-white">{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-white drop-shadow-sm mb-2">
                      Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full border border-white/40 rounded-md px-3 py-2 bg-white/30 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/40"
                    >
                      <option value="" className="text-gray-900 bg-white">All Locations</option>
                      {locations.map(location => (
                        <option key={location} value={location} className="text-gray-900 bg-white">{location}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-white drop-shadow-sm mb-2">
                      Min Price ($)
                    </label>
                    <Input
                      type="number"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange(prev => ({
                        ...prev,
                        min: parseInt(e.target.value) || 0
                      }))}
                      min="0"
                      className="bg-white/30 backdrop-blur-sm border-white/40 text-white placeholder-white/70 focus:bg-white/40 focus:border-white/60"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white drop-shadow-sm mb-2">
                      Max Price ($)
                    </label>
                    <Input
                      type="number"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange(prev => ({
                        ...prev,
                        max: parseInt(e.target.value) || 1000
                      }))}
                      min="0"
                      className="bg-white/30 backdrop-blur-sm border-white/40 text-white placeholder-white/70 focus:bg-white/40 focus:border-white/60"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm"
                    >
                      <X className="w-4 h-4" />
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-white drop-shadow-md text-lg font-medium">
              {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Events Grid */}
          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-white/20 backdrop-blur-lg rounded-xl p-8 inline-block border border-white/30">
                <Calendar className="w-16 h-16 text-white/80 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2 drop-shadow-md">
                  No Events Found
                </h3>
                <p className="text-white/90 mb-4 drop-shadow-sm">
                  {hasActiveFilters
                    ? 'Try adjusting your filters to see more events'
                    : 'No events are currently available'
                  }
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 border border-white/40">
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </BackgroundWrapper>
    </ErrorBoundary>
  )
}

export default function EventsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <EventsPageContent />
    </Suspense>
  )
}