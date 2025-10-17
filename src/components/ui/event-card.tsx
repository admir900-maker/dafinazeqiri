'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Clock, Users, Play, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
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

    // Use Cloudinary images as fallback
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

  // Memoize card classes
  const cardClasses = useMemo(() => {
    return variant === 'featured'
      ? 'group cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl bg-gradient-to-br from-pink-900/40 via-purple-900/40 to-pink-800/40 backdrop-blur-xl border-2 border-pink-400/30 shadow-2xl rounded-2xl overflow-hidden'
      : 'group cursor-pointer transition-all duration-500 hover:scale-102 hover:shadow-xl bg-gradient-to-br from-pink-900/40 via-purple-900/40 to-pink-800/40 backdrop-blur-xl border-2 border-pink-400/30 shadow-xl rounded-2xl overflow-hidden'
  }, [variant])

  // Memoize tags display
  const tagsDisplay = useMemo(() => {
    if (!event.tags || event.tags.length === 0) return null

    const visibleTags = event.tags.slice(0, 3)
    const hiddenCount = event.tags.length - 3

    return (
      <div className="flex flex-wrap gap-1 mb-4" role="list" aria-label="Event tags">
        {visibleTags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="text-xs bg-white/20 text-white border-white/30"
            role="listitem"
          >
            {tag}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <Badge
            variant="secondary"
            className="text-xs bg-white/20 text-white border-white/30"
            role="listitem"
            aria-label={`${hiddenCount} more tags`}
          >
            +{hiddenCount}
          </Badge>
        )}
      </div>
    )
  }, [event.tags])

  return (
    <Link href={`/events/${event._id}`} className="block h-full">
      <Card className={cardClasses} role="article" aria-labelledby={`event-title-${event._id}`}>
        <div className="relative overflow-hidden">
          {/* Event Image */}
          <div className={`relative ${variant === 'featured' ? 'h-64' : 'h-48'}`}>
            <OptimizedImage
              src={imageSrc}
              alt={imageAlt}
              fallbackSrc="https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/guitar-player"
              placeholder="blur"
              priority={variant === 'featured'}
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Category Badge */}
            <Badge
              className="absolute top-4 left-4 backdrop-blur-md hover:bg-pink-500/80 text-white border-2 border-pink-300/60 font-semibold shadow-lg transition-all"
              style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.7), rgba(168, 85, 247, 0.7))' }}
            >
              {typeof event.category === 'object' ? event.category.name : event.category}
            </Badge>

            {/* Date Badge */}
            <div className="absolute top-4 right-4 backdrop-blur-md rounded-xl p-3 text-center min-w-[70px] border-2 border-pink-300/60 shadow-xl" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.8), rgba(168, 85, 247, 0.8))' }}>
              <div className="text-xs font-bold text-white/95 uppercase tracking-wider">
                {formattedDate.split(' ')[0]}
              </div>
              <div className="text-2xl font-bold text-white">
                {formattedDate.split(' ')[1].replace(',', '')}
              </div>
            </div>

            {/* YouTube Trailer Indicator */}
            {event.youtubeTrailer && (
              <div className="absolute bottom-4 right-4 bg-red-600/80 backdrop-blur-sm rounded-full p-2 border border-red-400/40">
                <Play className="w-4 h-4 text-white" fill="white" />
              </div>
            )}
          </div>

          <CardContent className="p-4">
            {/* Title */}
            <h3
              id={`event-title-${event._id}`}
              className={`font-bold text-white mb-2 transition-all drop-shadow-lg ${variant === 'featured' ? 'text-2xl' : 'text-xl'}`}
              style={{ 
                fontFamily: "'Playfair Display', serif",
                letterSpacing: '0.5px'
              }}
            >
              {event.title}
            </h3>

            {/* Artists */}
            {event.artists && event.artists.length > 0 && (
              <p className="text-sm text-white/80 mb-3 drop-shadow-sm">
                <ScreenReaderOnly>Featuring artists: </ScreenReaderOnly>
                {event.artists.join(', ')}
              </p>
            )}

            {/* Event Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-white/90 drop-shadow-sm">
                <Calendar className="w-4 h-4 mr-2 text-white" aria-hidden="true" />
                <span>
                  <ScreenReaderOnly>Date: </ScreenReaderOnly>
                  {formattedDate}
                </span>
              </div>

              <div className="flex items-center text-sm text-white/90 drop-shadow-sm">
                <Clock className="w-4 h-4 mr-2 text-white" aria-hidden="true" />
                <span>
                  <ScreenReaderOnly>Time: </ScreenReaderOnly>
                  {formattedTime}
                </span>
              </div>

              <div className="flex items-center text-sm text-white/90 drop-shadow-sm">
                <MapPin className="w-4 h-4 mr-2 text-white" aria-hidden="true" />
                <span className="truncate">
                  <ScreenReaderOnly>Location: </ScreenReaderOnly>
                  {event.venue}, {event.location}
                </span>
              </div>

              <div className="flex items-center text-sm text-white/90 drop-shadow-sm">
                <Users className="w-4 h-4 mr-2 text-white" aria-hidden="true" />
                <span>
                  <ScreenReaderOnly>Capacity: </ScreenReaderOnly>
                  Max {event.maxCapacity} attendees
                </span>
              </div>
            </div>

            {/* Tags */}
            {tagsDisplay}

            {/* Description */}
            <p className="text-sm text-white/80 line-clamp-2 mb-4 drop-shadow-sm">
              {event.description}
            </p>
          </CardContent>

          <CardFooter className="p-4 pt-0 flex items-center justify-between">
            {/* Price */}
            <div>
              <div className="text-2xl font-bold text-white drop-shadow-md">
                <span aria-label={`Price starting from ${formatPrice(minPrice)}`}>
                  {formatPrice(minPrice)}
                  {maxPrice > minPrice && (
                    <span className="text-sm font-normal text-white/80"> - {formatPrice(maxPrice)}</span>
                  )}
                </span>
              </div>
              <div className="text-xs text-white/70 drop-shadow-sm">
                {event.ticketTypes?.length > 1 ? 'Multiple types available' : 'Per ticket'}
              </div>
            </div>

            {/* Fancy Action Button */}
            <Button
              className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-semibold border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 pointer-events-none group"
              aria-label={`View details for ${event.title}`}
            >
              <span className="relative z-10 flex items-center gap-2">
                Details
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            </Button>
          </CardFooter>
        </div>
      </Card>
    </Link>
  )
})