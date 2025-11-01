'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Play, ArrowRight, Sparkles } from 'lucide-react'
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
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
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
            className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30"
          >
            {tag}
          </Badge>
        ))}
        {hiddenCount > 0 && (
          <Badge
            variant="secondary"
            className="text-xs bg-stone-900/20 text-stone-800 border border-stone-900/30"
          >
            +{hiddenCount}
          </Badge>
        )}
      </>
    )
  }, [event.tags])

  return (
    <Link href={`/events/${event._id}`} className="block h-full group perspective-1000">
      <div className="relative h-full transform-gpu transition-all duration-700 group-hover:scale-[1.02] preserve-3d">
        {/* Ultimate Glow Effects */}
        <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-amber-900/20 to-orange-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />

        <Card
          className="relative cursor-pointer h-full overflow-hidden rounded-3xl transition-all duration-700 bg-black border-2 border-orange-700/30 group-hover:border-orange-500/60 shadow-2xl group-hover:shadow-[0_30px_90px_-15px_rgba(251,191,36,0.4)]"
          role="article"
          aria-labelledby={`event-title-${event._id}`}
        >
          {/* Animated Corner Accents */}
          <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-orange-500/40 rounded-tl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-orange-500/40 rounded-br-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Flowing Gradient Animation */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[2000ms]" />
          </div>

          {/* Event Image - Full Height Design */}
          <div className={`relative overflow-hidden ${variant === 'featured' ? 'h-[500px]' : 'h-[450px]'}`}>
            <OptimizedImage
              src={imageSrc}
              alt={imageAlt}
              fallbackSrc="https://res.cloudinary.com/demo/image/upload/c_fill,w_800,h_600,q_auto/v1/samples/music/guitar-player"
              placeholder="blur"
              priority={variant === 'featured'}
              className="object-cover w-full h-full transition-all duration-[1500ms] group-hover:scale-115 brightness-90 group-hover:brightness-100"
            />

            {/* Triple-Layer Gradient Overlay for Depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-br from-orange-700/0 via-transparent to-amber-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-40" />

            {/* Floating Category Pill - Modern Design */}
            <div className="absolute top-8 left-8 group-hover:scale-110 transition-transform duration-500">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-stone-900 rounded-full blur-md opacity-70" />
                <Badge className="relative bg-black/90 backdrop-blur-xl text-orange-500 border-2 border-orange-500/60 font-black shadow-2xl px-6 py-3 rounded-full text-xs uppercase tracking-[0.2em] hover:border-orange-500 transition-all duration-300">
                  {typeof event.category === 'object' ? event.category.name : event.category}
                </Badge>
              </div>
            </div>

            {/* Elegant Date Badge - Glassmorphism */}
            <div className="absolute top-8 right-8 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-br from-orange-500/50 to-amber-900/50 rounded-2xl blur-xl" />
                <div className="relative backdrop-blur-2xl bg-gradient-to-br from-black/95 to-zinc-900/95 rounded-2xl p-4 text-center min-w-[90px] shadow-2xl border-2 border-orange-500/40">
                  <div className="text-[9px] font-black text-orange-500/80 uppercase tracking-[0.15em] mb-1">
                    {formattedDate.split(' ')[0]}
                  </div>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-300 to-stone-900 leading-none mb-1">
                    {formattedDate.split(' ')[1].replace(',', '')}
                  </div>
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-orange-500/50 to-transparent mb-1" />
                  <div className="text-[10px] font-bold text-orange-500/90 uppercase tracking-wider">
                    {formattedTime}
                  </div>
                </div>
              </div>
            </div>

            {/* YouTube Trailer - Sleek Indicator */}
            {event.youtubeTrailer && (
              <div className="absolute bottom-8 right-8 group-hover:scale-110 transition-transform duration-500">
                <div className="relative">
                  <div className="absolute -inset-1 bg-red-500 rounded-full blur-lg opacity-75 animate-pulse" />
                  <div className="relative bg-gradient-to-br from-red-500 to-red-700 backdrop-blur-sm rounded-full p-4 shadow-2xl border-2 border-white/30">
                    <Play className="w-5 h-5 text-white" fill="white" />
                  </div>
                </div>
              </div>
            )}

            {/* Title Section - Overlaid on Image Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="space-y-4">
                {/* Artists - Floating Above Title */}
                {event.artists && event.artists.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-2 backdrop-blur-xl bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-2 shadow-lg">
                      <Sparkles className="w-4 h-4 text-orange-300 animate-pulse" />
                      <span className="text-sm text-orange-200 font-bold line-clamp-1">
                        {event.artists.slice(0, 2).join(' • ')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Title - Supernova Image */}
                <div className="mb-4">
                  <img
                    src="https://res.cloudinary.com/dzwjhgycg/image/upload/v1762017859/Supernova_Title_prak5i.png"
                    alt="Supernova"
                    className={`w-auto object-contain drop-shadow-2xl ${variant === 'featured' ? 'h-20' : 'h-16'}`}
                    style={{
                      filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.8)) drop-shadow(0 0 40px rgba(251,191,36,0.3))'
                    }}
                  />
                </div>

                {/* Info Pills Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 backdrop-blur-xl bg-black/60 border border-orange-500/30 rounded-full px-4 py-2 shadow-lg">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs text-orange-100 font-bold truncate max-w-[200px]">
                      {event.venue}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section - Compact & Clean */}
          <CardContent className="p-8 space-y-6 bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
            {/* Description */}
            <div className="relative">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-amber-900 rounded-full" />
              <p className="text-sm text-orange-100/80 line-clamp-2 leading-relaxed pl-2">
                {event.description}
              </p>
            </div>

            {/* Tags */}
            {tagsDisplay && (
              <div className="flex flex-wrap gap-2">
                {tagsDisplay}
              </div>
            )}

            {/* Price & CTA Row */}
            <div className="flex items-center justify-between gap-4 pt-2">
              {/* Price Display */}
              <div className="flex-shrink-0">
                <div className="text-xs text-orange-500/70 font-bold uppercase tracking-wider mb-1">
                  {maxPrice > minPrice ? 'From' : 'Price'}
                </div>
                <div className="relative">
                  <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 to-amber-900/20 rounded-xl blur-lg" />
                  <div className="relative text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-300 via-stone-900 to-orange-500" style={{ textShadow: '0 0 30px rgba(251,191,36,0.3)' }}>
                    {formatPrice(minPrice)}
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex-1 relative group/button">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500 rounded-2xl blur opacity-40 group-hover/button:opacity-100 transition duration-500" />
                <Button
                  className="relative w-full bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500 hover:from-orange-500 hover:via-stone-900 hover:to-orange-500 text-black font-black py-6 rounded-2xl shadow-2xl transition-all duration-500 pointer-events-none border-0 text-sm uppercase tracking-[0.15em] overflow-hidden group-hover/button:scale-105"
                  aria-label={`View details for ${event.title}`}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-200%] group-hover/button:translate-x-[200%] transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-3">
                    <span>Book Now</span>
                    <ArrowRight className="w-5 h-5 group-hover/button:translate-x-2 transition-transform duration-500" />
                  </span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Link>
  )
})
