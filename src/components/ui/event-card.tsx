'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Users, Play, ArrowRight } from 'lucide-react'
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
    <Link href={`/events/${event._id}`} className="block h-full">
      <Card 
        className="group relative cursor-pointer h-full overflow-hidden rounded-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl bg-white/95 backdrop-blur-md border-0" 
        role="article" 
        aria-labelledby={`event-title-${event._id}`}
      >
        {/* Event Image */}
        <div className={`relative overflow-hidden ${variant === 'featured' ? 'h-80' : 'h-64'}`}>
          <OptimizedImage
            src={imageSrc}
            alt={imageAlt}
            fallbackSrc="https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/guitar-player"
            placeholder="blur"
            priority={variant === 'featured'}
            className="object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/90" />

          {/* Category Badge */}
          <Badge className="absolute top-4 left-4 bg-pink-500 text-white border-0 font-semibold shadow-lg px-3 py-1 rounded-full">
            {typeof event.category === 'object' ? event.category.name : event.category}
          </Badge>

          {/* Date Badge */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-3 text-center min-w-[70px] shadow-xl">
            <div className="text-xs font-bold text-pink-500 uppercase tracking-wider">
              {formattedDate.split(' ')[0]}
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formattedDate.split(' ')[1].replace(',', '')}
            </div>
          </div>

          {/* YouTube Trailer Indicator */}
          {event.youtubeTrailer && (
            <div className="absolute bottom-4 right-4 bg-red-600 backdrop-blur-sm rounded-full p-2 shadow-lg">
              <Play className="w-4 h-4 text-white" fill="white" />
            </div>
          )}

          {/* Price Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
            <div className="flex-1 min-w-0">
              <h3
                id={`event-title-${event._id}`}
                className={`font-bold text-white mb-1 line-clamp-2 transition-all ${variant === 'featured' ? 'text-3xl' : 'text-2xl'}`}
              >
                {event.title}
              </h3>
              {event.artists && event.artists.length > 0 && (
                <p className="text-sm text-white/90 line-clamp-1">
                  {event.artists.join(', ')}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 text-right ml-4">
              <div className="text-3xl font-bold text-white">
                {formatPrice(minPrice)}
              </div>
              {maxPrice > minPrice && (
                <div className="text-xs text-white/80">Starting from</div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-3">
          {/* Event Details */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-700">
              <Calendar className="w-4 h-4 mr-2 text-pink-500 flex-shrink-0" aria-hidden="true" />
              <span>
                <ScreenReaderOnly>Date: </ScreenReaderOnly>
                {formattedDate} at {formattedTime}
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-700">
              <MapPin className="w-4 h-4 mr-2 text-pink-500 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">
                <ScreenReaderOnly>Location: </ScreenReaderOnly>
                {event.venue}, {event.location}
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-700">
              <Users className="w-4 h-4 mr-2 text-pink-500 flex-shrink-0" aria-hidden="true" />
              <span>
                <ScreenReaderOnly>Capacity: </ScreenReaderOnly>
                {event.maxCapacity} capacity
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {event.description}
          </p>

          {/* Tags */}
          {tagsDisplay && (
            <div className="flex flex-wrap gap-2">
              {tagsDisplay}
            </div>
          )}

          {/* Action Button */}
          <Button
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 pointer-events-none mt-4"
            aria-label={`View details for ${event.title}`}
          >
            View Details
            <ArrowRight className="inline-block w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
})
