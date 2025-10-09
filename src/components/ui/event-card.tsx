'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Clock, Users, Play } from 'lucide-react'
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

    const src = event.posterImage || event.bannerImage || '/placeholder-event.svg'

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
      ? 'group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl'
      : 'group cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-lg bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl'
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
              fallbackSrc="/placeholder-event.svg"
              placeholder="blur"
              priority={variant === 'featured'}
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Category Badge */}
            <Badge
              className="absolute top-4 left-4 bg-white/30 backdrop-blur-sm hover:bg-white/40 text-white border border-white/40"
            >
              {typeof event.category === 'object' ? event.category.name : event.category}
            </Badge>

            {/* Date Badge */}
            <div className="absolute top-4 right-4 bg-white/30 backdrop-blur-sm rounded-lg p-2 text-center min-w-[60px] border border-white/40">
              <div className="text-xs font-medium text-white/90">
                {formattedDate.split(' ')[0]}
              </div>
              <div className="text-lg font-bold text-white">
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
              className={`font-bold text-white mb-2 group-hover:text-white transition-colors drop-shadow-md ${variant === 'featured' ? 'text-xl' : 'text-lg'}`}
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

            {/* Action Button */}
            <Button
              className="bg-white/30 backdrop-blur-sm hover:bg-white/40 text-white border border-white/40 shadow-lg pointer-events-none"
              aria-label={`${variant === 'featured' ? 'Get tickets' : 'View details'} for ${event.title}`}
            >
              {variant === 'featured' ? 'Get Tickets' : 'View Details'}
            </Button>
          </CardFooter>
        </div>
      </Card>
    </Link>
  )
})