'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
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
  <section className="py-12 bg-gray-50">
    <div className="container mx-auto px-4">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 h-48 rounded-t-lg"></div>
            <div className="bg-white p-4 rounded-b-lg border border-gray-200">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Memoized error component
const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <section className="py-12 bg-gray-50">
    <div className="container mx-auto px-4 text-center">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Events</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={onRetry} className="bg-blue-600 hover:bg-blue-700 text-white">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  </section>
);

// Memoized empty state component
const EmptyState = () => (
  <section className="py-12 bg-gray-50">
    <div className="container mx-auto px-4 text-center">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
          <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Events Yet</h3>
          <p className="text-gray-600 mb-4">Stay tuned! Amazing events are coming soon.</p>
          <Link href="/events">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Featured Events
          </h2>
          <p className="text-gray-600 text-sm">
            {events.length} {events.length === 1 ? 'Event' : 'Events'}
          </p>
        </div>

        {/* Events Grid */}
        {eventsGrid}

        {/* View All Events Button */}
        <div className="text-center mt-8">
          <Link href="/events">
            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
              View All Events
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}