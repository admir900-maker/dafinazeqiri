'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Filter, Grid, List, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackgroundWrapper } from '@/components/ui/background-wrapper';
import { useCurrency } from '@/contexts/CurrencyContext';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  image?: string;
  eventCount: number;
  metaTitle?: string;
  metaDescription?: string;
}

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  location: string;
  venue?: string;
  posterImage?: string;
  bannerImage?: string;
  ticketTypes: Array<{
    name: string;
    price: number;
    availableTickets: number;
  }>;
  category: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const slug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'name'>('date');

  useEffect(() => {
    if (slug) {
      fetchCategoryData(currentPage);
    }
  }, [slug, currentPage, sortBy]);

  const fetchCategoryData = async (page: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/categories/${slug}?includeEvents=true&page=${page}&limit=12&sort=${sortBy}`
      );

      if (!response.ok) {
        throw new Error('Category not found');
      }

      const data = await response.json();
      setCategory(data);
      setEvents(data.events || []);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching category:', err);
      setError('Failed to load category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSort: 'date' | 'price' | 'name') => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const getLowestPrice = (event: Event) => {
    if (!event.ticketTypes || event.ticketTypes.length === 0) return null;
    return Math.min(...event.ticketTypes.map(t => t.price));
  };

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-white/20 rounded mb-6 w-64"></div>
            <div className="h-32 bg-white/20 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-96 bg-white/20 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  if (error || !category) {
    return (
      <BackgroundWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Category Not Found</h1>
            <p className="text-white/80 mb-6">{error || 'The category you\'re looking for doesn\'t exist.'}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/categories">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Browse Categories
                </Button>
              </Link>
              <Link href="/events">
                <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  All Events
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-white/70 text-sm">
          <Link href="/categories" className="hover:text-white">Categories</Link>
          <span>/</span>
          <span className="text-white">{category.name}</span>
        </div>

        {/* Category Header */}
        <div className="mb-12">
          <Link href="/categories">
            <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Categories
            </Button>
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ backgroundColor: category.color + '20', border: `3px solid ${category.color}` }}
            >
              {category.icon}
            </div>

            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-xl text-white/80 mb-6 max-w-3xl">
                  {category.description}
                </p>
              )}

              <div className="flex items-center gap-6 text-white/90">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span>{category.eventCount} Events</span>
                </div>
                {events.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>Active Category</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Events Section */}
        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">{category.icon}</div>
            <h2 className="text-2xl font-bold text-white mb-4">No Events Yet</h2>
            <p className="text-white/70 mb-8 max-w-md mx-auto">
              There are currently no upcoming events in this category. Check back soon for exciting new events!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/events">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Browse All Events
                </Button>
              </Link>
              <Link href="/categories">
                <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  Other Categories
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Events Header with Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Upcoming Events
                </h2>
                <p className="text-white/70">
                  {pagination?.total} events found
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value as 'date' | 'price' | 'name')}
                    className="bg-white/10 border border-white/30 rounded-lg px-4 py-2 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="price">Sort by Price</option>
                    <option value="name">Sort by Name</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60 pointer-events-none" />
                </div>

                {/* View Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                    }
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={viewMode === 'list'
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                    }
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Events Grid/List */}
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12'
                : 'space-y-6 mb-12'
            }>
              {events.map((event) => (
                <EventCard
                  key={event._id}
                  event={event}
                  viewMode={viewMode}
                  formatPrice={formatPrice}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                      className={currentPage === page
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                      }
                    >
                      {page}
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(pagination.pages, currentPage + 1))}
                  disabled={currentPage === pagination.pages}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </BackgroundWrapper>
  );
}

interface EventCardProps {
  event: Event;
  viewMode: 'grid' | 'list';
  formatPrice: (price: number) => string;
}

function EventCard({ event, viewMode, formatPrice }: EventCardProps) {
  const lowestPrice = event.ticketTypes && event.ticketTypes.length > 0
    ? Math.min(...event.ticketTypes.map(t => t.price))
    : null;

  const eventDate = new Date(event.date);
  const isUpcoming = eventDate > new Date();

  if (viewMode === 'list') {
    return (
      <Link href={`/events/${event._id}`}>
        <Card className="bg-white/10 backdrop-blur-lg border border-white/30 hover:bg-white/20 transition-all duration-300 cursor-pointer">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative w-full md:w-48 h-32 md:h-32 rounded-lg overflow-hidden flex-shrink-0">
                {event.posterImage ? (
                  <Image
                    src={event.posterImage}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                  {event.title}
                </h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-white/70 text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>
                      {eventDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {event.time && ` at ${event.time}`}
                    </span>
                  </div>
                  <div className="flex items-center text-white/70 text-sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{event.venue ? `${event.venue}, ` : ''}{event.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {lowestPrice !== null ? (
                      <div className="text-white">
                        <span className="text-sm text-white/70">From </span>
                        <span className="text-lg font-semibold">{formatPrice(lowestPrice)}</span>
                      </div>
                    ) : (
                      <span className="text-white/70">Price TBA</span>
                    )}
                  </div>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/events/${event._id}`}>
      <Card className="group bg-white/10 backdrop-blur-lg border border-white/30 hover:bg-white/20 transition-all duration-300 cursor-pointer h-full">
        <CardHeader className="p-0">
          <div className="relative w-full h-48 rounded-t-lg overflow-hidden">
            {event.posterImage ? (
              <Image
                src={event.posterImage}
                alt={event.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <Calendar className="h-16 w-16 text-white" />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2 group-hover:text-white transition-colors">
            {event.title}
          </h3>

          <div className="space-y-2 mb-4">
            <div className="flex items-center text-white/70 text-sm">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                {eventDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
                {event.time && ` at ${event.time}`}
              </span>
            </div>
            <div className="flex items-center text-white/70 text-sm">
              <MapPin className="h-4 w-4 mr-2" />
              <span className="truncate">{event.venue || event.location}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            {lowestPrice !== null ? (
              <div className="text-white">
                <span className="text-xs text-white/70">From </span>
                <span className="font-semibold">{formatPrice(lowestPrice)}</span>
              </div>
            ) : (
              <span className="text-white/70 text-sm">Price TBA</span>
            )}

            {isUpcoming && (
              <span className="text-xs px-2 py-1 bg-green-600/30 text-green-200 rounded-full">
                Available
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}