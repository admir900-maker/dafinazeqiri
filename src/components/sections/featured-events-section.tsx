'use client'

import { useEffect, useState } from 'react'
import { EventCard } from '@/components/ui/event-card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Calendar, Sparkles } from 'lucide-react'

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

export function FeaturedEventsSection() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events')
        if (!response.ok) {
          throw new Error('Failed to fetch events')
        }
        const data = await response.json()
        // Get only upcoming events and sort by date
        const upcomingEvents = data
          .filter((event: Event) => new Date(event.date) >= new Date())
          .sort((a: Event, b: Event) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 4) // Get first 4 upcoming events

        setEvents(upcomingEvents)
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  if (loading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Featured Events</h2>
            <p className="text-white/90 max-w-2xl mx-auto drop-shadow-md">
              Discover the hottest upcoming concerts and live performances
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white/30 backdrop-blur-sm h-48 rounded-t-lg"></div>
                <div className="bg-white/20 backdrop-blur-lg p-4 rounded-b-lg border border-white/30">
                  <div className="h-4 bg-white/30 rounded mb-2"></div>
                  <div className="h-3 bg-white/30 rounded mb-2"></div>
                  <div className="h-3 bg-white/30 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-8 border border-white/30 shadow-xl">
              <Calendar className="w-16 h-16 text-white/80 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2 drop-shadow-md">Unable to Load Events</h3>
              <p className="text-white/90 mb-4 drop-shadow-sm">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 border border-white/40"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (events.length === 0) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-white/20 backdrop-blur-lg rounded-xl p-8 border border-white/30 shadow-xl">
              <Sparkles className="w-16 h-16 text-white/80 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2 drop-shadow-md">No Events Yet</h3>
              <p className="text-white/90 mb-4 drop-shadow-sm">
                Stay tuned! Amazing events are coming soon.
              </p>
              <Link href="/events">
                <Button className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 border border-white/40">
                  Browse All Events
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-lg rounded-full mb-4 border border-white/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
            Featured Events
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
            Discover the hottest upcoming concerts and live performances in your area
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {events.map((event) => (
            <EventCard
              key={event._id}
              event={event}
              variant="featured"
            />
          ))}
        </div>

        {/* View All Events Button */}
        <div className="text-center">
          <Link href="/events">
            <Button size="lg" className="bg-white/30 backdrop-blur-lg hover:bg-white/40 text-white border border-white/40 shadow-xl">
              View All Events
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}