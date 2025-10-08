'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MapPin, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
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
  category: string
  artists: string[]
  maxCapacity: number
  tags: string[]
}

interface EventCardProps {
  event: Event
  variant?: 'default' | 'featured'
}

export function EventCard({ event, variant = 'default' }: EventCardProps) {
  const { formatPrice } = useCurrency()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getMinPrice = () => {
    if (!event.ticketTypes || event.ticketTypes.length === 0) return 0
    return Math.min(...event.ticketTypes.map(ticket => ticket.price))
  }

  const getMaxPrice = () => {
    if (!event.ticketTypes || event.ticketTypes.length === 0) return 0
    return Math.max(...event.ticketTypes.map(ticket => ticket.price))
  }

  const minPrice = getMinPrice()
  const maxPrice = getMaxPrice()

  const cardClasses = variant === 'featured'
    ? 'group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl'
    : 'group cursor-pointer transition-all duration-300 hover:scale-102 hover:shadow-lg bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl'

  return (
    <Link href={`/events/${event._id}`} className="block h-full">
      <Card className={cardClasses}>
        <div className="relative overflow-hidden">
          {/* Event Image */}
          <div className={`relative ${variant === 'featured' ? 'h-64' : 'h-48'}`}>
            <Image
              src={event.posterImage || event.bannerImage || '/placeholder-event.jpg'}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Category Badge */}
            <Badge
              className="absolute top-4 left-4 bg-white/30 backdrop-blur-sm hover:bg-white/40 text-white border border-white/40"
            >
              {event.category}
            </Badge>

            {/* Date Badge */}
            <div className="absolute top-4 right-4 bg-white/30 backdrop-blur-sm rounded-lg p-2 text-center min-w-[60px] border border-white/40">
              <div className="text-xs font-medium text-white/90">
                {formatDate(event.date).split(' ')[0]}
              </div>
              <div className="text-lg font-bold text-white">
                {formatDate(event.date).split(' ')[1].replace(',', '')}
              </div>
            </div>
          </div>

          <CardContent className="p-4">
            {/* Title */}
            <h3 className={`font-bold text-white mb-2 group-hover:text-white transition-colors drop-shadow-md ${variant === 'featured' ? 'text-xl' : 'text-lg'
              }`}>
              {event.title}
            </h3>

            {/* Artists */}
            {event.artists && event.artists.length > 0 && (
              <p className="text-sm text-white/80 mb-3 drop-shadow-sm">
                {event.artists.join(', ')}
              </p>
            )}

            {/* Event Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-white/90 drop-shadow-sm">
                <Calendar className="w-4 h-4 mr-2 text-white" />
                {formatDate(event.date)}
              </div>

              <div className="flex items-center text-sm text-white/90 drop-shadow-sm">
                <Clock className="w-4 h-4 mr-2 text-white" />
                {formatTime(event.time)}
              </div>

              <div className="flex items-center text-sm text-white/90 drop-shadow-sm">
                <MapPin className="w-4 h-4 mr-2 text-white" />
                <span className="truncate">{event.venue}, {event.location}</span>
              </div>

              <div className="flex items-center text-sm text-white/90 drop-shadow-sm">
                <Users className="w-4 h-4 mr-2 text-white" />
                Max {event.maxCapacity} attendees
              </div>
            </div>

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {event.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                    {tag}
                  </Badge>
                ))}
                {event.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                    +{event.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Description */}
            <p className="text-sm text-white/80 line-clamp-2 mb-4 drop-shadow-sm">
              {event.description}
            </p>
          </CardContent>

          <CardFooter className="p-4 pt-0 flex items-center justify-between">
            {/* Price */}
            <div>
              <div className="text-2xl font-bold text-white drop-shadow-md">
                {formatPrice(minPrice)}
                {maxPrice > minPrice && (
                  <span className="text-sm font-normal text-white/80"> - {formatPrice(maxPrice)}</span>
                )}
              </div>
              <div className="text-xs text-white/70 drop-shadow-sm">
                {event.ticketTypes?.length > 1 ? 'Multiple types available' : 'Per ticket'}
              </div>
            </div>

            {/* Action Button */}
            <Button className="bg-white/30 backdrop-blur-sm hover:bg-white/40 text-white border border-white/40 shadow-lg pointer-events-none">
              {variant === 'featured' ? 'Get Tickets' : 'View Details'}
            </Button>
          </CardFooter>
        </div>
      </Card>
    </Link>
  )
}