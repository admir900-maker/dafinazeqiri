'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Clock, Users, Play, ArrowRight, ShoppingCart } from 'lucide-react'
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

  return (
    <Link href={`/events/${event._id}`} className="block h-full">
      <Card className="group cursor-pointer transition-all duration-300 hover:shadow-lg bg-white border border-gray-200 rounded-lg overflow-hidden" role="article" aria-labelledby={`event-title-${event._id}`}>
        {/* Event Image */}
        <div className="relative h-48 overflow-hidden">
          <OptimizedImage
            src={imageSrc}
            alt={imageAlt}
            fallbackSrc="https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/guitar-player"
            placeholder="blur"
            priority={variant === 'featured'}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Session Badge (if multiple dates/times) */}
          {event.ticketTypes && event.ticketTypes.length > 1 && (
            <Badge className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-medium px-2 py-1">
              +{event.ticketTypes.length} Seans
            </Badge>
          )}
        </div>

        <CardContent className="p-4">
          {/* Title */}
          <h3
            id={`event-title-${event._id}`}
            className="font-semibold text-gray-900 mb-2 text-base line-clamp-2 group-hover:text-orange-600 transition-colors"
          >
            {event.title}
          </h3>

          {/* Venue */}
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <MapPin className="w-4 h-4 mr-1 text-gray-400" aria-hidden="true" />
            <span className="truncate">{event.venue}</span>
          </div>

          {/* Date & Time */}
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Calendar className="w-4 h-4 mr-1 text-gray-400" aria-hidden="true" />
            <span>{formattedDate} - {formattedTime}</span>
          </div>

          {/* Price and Cart Button */}
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-orange-600">
              {formatPrice(minPrice)}
            </div>
            <Button 
              size="sm" 
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full h-8 w-8 p-0"
              onClick={(e) => {
                e.preventDefault()
                // Add to cart functionality here
              }}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
})