'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Users, Play, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { ScreenReaderOnly } from '@/components/ui/accessibility'
import { useCurrency } from '@/contexts/CurrencyContext'

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
  category: {
    _id: string
    name: string
    slug: string
    icon: string
    color: string
  } | string
  artists: string[]
  maxCapacity: number
  tags: string[]
  youtubeTrailer?: string
}

interface EventCardProps {
  event: Event
  variant?: 'default' | 'featured'
}

// Memoized date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Memoized time formatter
const formatTime = (timeString: string) => {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export const EventCard = memo(function EventCard({ event, variant = 'default' }: EventCardProps) {
  const { formatPrice } = useCurrency()

  // Memoize expensive calculations
  const { minPrice, maxPrice, imageSrc, imageAlt } = useMemo(() => {
    const prices = event.ticketTypes?.map(ticket => ticket.price) || [0]
    const min = Math.min(...prices)
    const max = Math.max(...prices)

    const cloudinaryImages = [
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/guitar-player',
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/people/jazz',
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/drums',
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/people/dancing',
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/sample'
    ];
    const randomImage = cloudinaryImages[Math.floor(Math.random() * cloudinaryImages.length)];

    const src = event.posterImage || event.bannerImage || randomImage

    const artists = event.artists.length > 0 ? ` featuring ${event.artists.slice(0, 2).join(' and ')}` : ''
    const date = formatDate(event.date)
    const alt = `${event.title}${artists} at ${event.venue}, ${event.location} on ${date}`

    return {
      minPrice: min,
      maxPrice: max,
      imageSrc: src,
      imageAlt: alt
    }
  }, [event.ticketTypes, event.posterImage, event.bannerImage, event.title, event.artists, event.venue, event.location, event.date])

  // Memoize formatted date and time
  const formattedDate = useMemo(() => formatDate(event.date), [event.date])
  const formattedTime = useMemo(() => formatTime(event.time), [event.time])

  // Memoize tags display
  const tagsDisplay = useMemo(() => {
    if (!event.tags || event.tags.length === 0) return null

    const visibleTags = event.tags.slice(0, 3)
    const hiddenCount = event.tags.length - 3

    return (
      <>
        {visibleTags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs bg-pink-100 text-pink-700 border-0"
          >
            {tag}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <Badge
            variant="secondary"
            className="text-xs bg-gray-100 text-gray-700 border-0"
          >
            +{hiddenCount}
          </Badge>
        )}
      </>
    )
  }, [event.tags])

  return (
    <Link href={`/events/${event._id}`} className="block h-full group">
      <Card
        className="relative cursor-pointer h-full overflow-hidden rounded-2xl transition-all duration-700 hover:-translate-y-3 hover:shadow-[0_25px_80px_-15px_rgba(236,72,153,0.5)] bg-gradient-to-br from-white via-pink-50/30 to-purple-50/30 backdrop-blur-xl border border-pink-200/20 hover:border-pink-300/40"
        role="article"
        aria-labelledby={`event-title-${event._id}`}
      >
        {/* Animated gradient border effect */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-700 -z-10" />

        {/* Sparkle overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-pulse" />
          <div className="absolute top-20 right-16 w-1 h-1 bg-pink-300 rounded-full animate-pulse delay-100" />
          <div className="absolute bottom-32 left-20 w-1 h-1 bg-purple-300 rounded-full animate-pulse delay-200" />
        </div>

        {/* Event Image */}
        <div className={`relative overflow-hidden ${variant === 'featured' ? 'h-80' : 'h-72'}`}>
          <OptimizedImage
            src={imageSrc}
            alt={imageAlt}
            fallbackSrc="https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/guitar-player"
            placeholder="blur"
            priority={variant === 'featured'}
            className="object-cover transition-all duration-1000 group-hover:scale-125 group-hover:rotate-2"
          />
          {/* Multi-layer gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-all duration-700" />
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-transparent to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Category Badge */}
          <Badge className="absolute top-5 left-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 font-bold shadow-2xl px-4 py-2 rounded-full text-xs uppercase tracking-widest backdrop-blur-sm hover:scale-110 transition-transform duration-300">
            {typeof event.category === 'object' ? event.category.name : event.category}
          </Badge>

          {/* Date Badge - Premium Glass Design */}
          <div className="absolute top-5 right-5 backdrop-blur-xl bg-white/90 rounded-3xl p-4 text-center min-w-[80px] shadow-2xl border border-white/50 group-hover:scale-110 transition-all duration-500">
            <div className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 uppercase tracking-wider">
              {formattedDate.split(' ')[0]}
            </div>
            <div className="text-3xl font-black bg-gradient-to-br from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {formattedDate.split(' ')[1].replace(',', '')}
            </div>
            <div className="h-0.5 w-8 mx-auto mt-1 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full" />
          </div>

          {/* YouTube Trailer Indicator */}
          {event.youtubeTrailer && (
            <div className="absolute bottom-6 right-6 bg-gradient-to-br from-red-500 to-red-600 backdrop-blur-sm rounded-full p-3 shadow-2xl hover:scale-110 transition-transform duration-300 border border-white/30">
              <Play className="w-5 h-5 text-white" fill="white" />
            </div>
          )}

          {/* Price & Title Overlay - Redesigned */}
          <div className="absolute bottom-0 left-0 right-0 p-7">
            <div className="backdrop-blur-md bg-gradient-to-r from-black/60 to-black/40 rounded-2xl p-5 border border-white/20 shadow-2xl group-hover:bg-black/70 transition-all duration-500">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3
                    id={`event-title-${event._id}`}
                    className={`font-black text-white mb-2 line-clamp-2 transition-all drop-shadow-2xl ${variant === 'featured' ? 'text-3xl' : 'text-2xl'}`}
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {event.title}
                  </h3>
                  {event.artists && event.artists.length > 0 && (
                    <p className="text-sm text-pink-200 font-semibold line-clamp-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {event.artists.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-300 drop-shadow-2xl">
                    {formatPrice(minPrice)}
                  </div>
                  {maxPrice > minPrice && (
                    <div className="text-xs text-pink-200 font-semibold mt-1">Starting from</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-7 space-y-4 bg-gradient-to-br from-white/80 to-pink-50/50 backdrop-blur-sm">
          {/* Event Details - Enhanced */}
          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-800 font-medium group-hover:text-pink-600 transition-colors duration-300">
              <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-2 rounded-xl mr-3 shadow-lg">
                <Calendar className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span>
                <ScreenReaderOnly>Date: </ScreenReaderOnly>
                {formattedDate} at {formattedTime}
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-800 font-medium group-hover:text-pink-600 transition-colors duration-300">
              <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-2 rounded-xl mr-3 shadow-lg">
                <MapPin className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="truncate">
                <ScreenReaderOnly>Location: </ScreenReaderOnly>
                {event.venue}, {event.location}
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-800 font-medium group-hover:text-pink-600 transition-colors duration-300">
              <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-2 rounded-xl mr-3 shadow-lg">
                <Users className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span>
                <ScreenReaderOnly>Capacity: </ScreenReaderOnly>
                {event.maxCapacity ? event.maxCapacity.toLocaleString() : '0'} capacity
              </span>
            </div>
          </div>

          {/* Description - Enhanced */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-pink-100/50">
            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Tags */}
          {tagsDisplay && (
            <div className="flex flex-wrap gap-2">
              {tagsDisplay}
            </div>
          )}

          {/* Action Button - Premium Design */}
          <div className="relative group/button">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-full blur opacity-75 group-hover/button:opacity-100 transition duration-500" />
            <Button
              className="relative w-full bg-gradient-to-r from-pink-500 via-purple-600 to-pink-500 hover:from-pink-600 hover:via-purple-700 hover:to-pink-600 text-white font-bold py-4 rounded-full shadow-2xl transition-all duration-500 pointer-events-none border-0 text-base uppercase tracking-wider"
              aria-label={`View details for ${event.title}`}
            >
              <span className="flex items-center justify-center gap-3">
                <Sparkles className="w-5 h-5" />
                View Details
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" />
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
})
