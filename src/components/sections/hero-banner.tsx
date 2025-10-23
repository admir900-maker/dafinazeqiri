'use client'

import { useEffect, useState } from 'react'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { Calendar } from 'lucide-react'

interface Event {
  _id: string
  title: string
  date: string
  time: string
  location: string
  venue: string
  posterImage?: string
  bannerImage?: string
}

export function HeroBanner() {
  const [featuredEvent, setFeaturedEvent] = useState<Event | null>(null)

  useEffect(() => {
    const fetchFeaturedEvent = async () => {
      try {
        const response = await fetch('/api/events?limit=1')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.events && data.events.length > 0) {
            setFeaturedEvent(data.events[0])
          }
        }
      } catch (error) {
        console.error('Failed to fetch featured event:', error)
      }
    }

    fetchFeaturedEvent()
  }, [])

  if (!featuredEvent) {
    return (
      <div className="bg-gradient-to-r from-red-900 to-red-700 h-80 animate-pulse"></div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long'
    })
  }

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5)
  }

  return (
    <div className="relative bg-gradient-to-r from-red-900 via-red-800 to-red-700 overflow-hidden">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Event Image */}
          <div className="flex-1 flex justify-center mb-8 md:mb-0">
            {featuredEvent.posterImage || featuredEvent.bannerImage ? (
              <div className="relative w-64 h-64 md:w-80 md:h-80">
                <OptimizedImage
                  src={featuredEvent.posterImage || featuredEvent.bannerImage || ''}
                  alt={featuredEvent.title}
                  fallbackSrc="https://via.placeholder.com/400x400?text=Event"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="w-64 h-64 md:w-80 md:h-80 bg-red-800 rounded-full flex items-center justify-center">
                <span className="text-6xl md:text-8xl font-bold text-white opacity-20">
                  {featuredEvent.title.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="flex-1 text-white text-center md:text-right">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 uppercase">
              {featuredEvent.title}
            </h1>
            <p className="text-lg md:text-xl mb-6">
              {featuredEvent.venue}
            </p>
            <div className="inline-block bg-orange-500 rounded-2xl px-6 py-4 border-4 border-white">
              <div className="flex items-center justify-center gap-3">
                <Calendar className="w-6 h-6" />
                <div>
                  <div className="text-2xl md:text-3xl font-bold">
                    {formatDate(featuredEvent.date)}
                  </div>
                  <div className="text-sm md:text-base">
                    {formatTime(featuredEvent.time)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
