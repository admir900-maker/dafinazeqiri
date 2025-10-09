'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
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

// Memoized loading skeleton component
const LoadingSkeleton = () => (
  <section className="py-16">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">Featured Events</h2>
        <p className="text-white/90 max-w-2xl mx-auto drop-shadow-md">
          Discover the hottest upcoming concerts and live performances
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 4 }, (_, i) => (
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
);

// Memoized error component
const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <section className="py-16">
    <div className="container mx-auto px-4 text-center">
      <div className="max-w-md mx-auto">
        <div className="bg-white/20 backdrop-blur-lg rounded-xl p-8 border border-white/30 shadow-xl">
          <Calendar className="w-16 h-16 text-white/80 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2 drop-shadow-md">Unable to Load Events</h3>
          <p className="text-white/90 mb-4 drop-shadow-sm">{error}</p>
          <Button
            onClick={onRetry}
            className="bg-white/30 backdrop-blur-sm text-white hover:bg-white/40 border border-white/40"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  </section>
);

// Memoized empty state component
const EmptyState = () => (
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
);

export function FeaturedEventsSection() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/events?limit=4');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      const eventsArray = data.events || [];

      // Get only upcoming events and sort by date
      const upcomingEvents = eventsArray
        .filter((event: Event) => new Date(event.date) >= new Date())
        .sort((a: Event, b: Event) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4);

      setEvents(upcomingEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Memoized retry handler
  const handleRetry = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Memoized events grid to prevent unnecessary re-renders
  const eventsGrid = useMemo(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
      {events.map((event) => (
        <EventCard
          key={event._id}
          event={event}
          variant="featured"
        />
      ))}
    </div>
  ), [events]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={handleRetry} />;
  }

  if (events.length === 0) {
    return <EmptyState />;
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
        {eventsGrid}

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
  );
}