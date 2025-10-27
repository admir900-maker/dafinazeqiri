'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Music,
  Share2,
  ArrowLeft,
  ArrowRight,
  Play,
  ExternalLink,
  ShoppingCart,
  CreditCard,
  Sparkles,
  Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BackgroundWrapper } from '@/components/ui/background-wrapper'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useCart } from '@/contexts/FavoritesCartContext'
import { useUser } from '@clerk/nextjs'
import { activityLogger } from '@/lib/activityLogger'

interface TicketType {
  name: string
  price: number
  quantity: number
  availableTickets: number
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
  organizer?: string
  ageLimit?: number
  duration?: number
  language?: string
  endDate?: string
  metaDescription?: string
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const { formatPrice } = useCurrency()
  const { addToCart, cartItems } = useCart()
  const { user } = useUser()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>({})
  const [bookingLoading, setBookingLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) {
          throw new Error('Event not found')
        }
        const data = await response.json()
        setEvent(data)
        setRetryCount(0) // Reset retry count on success

        // Log event view
        activityLogger.logEventView(data._id, data.title, {
          source: 'event_detail_page',
          category: data.category?.name,
          venue: data.venue,
          date: data.date
        })

        setLoading(false)
      } catch (err) {
        console.error('Error fetching event:', err)

        // Keep retrying indefinitely with exponential backoff (max 5 seconds)
        const delay = Math.min((retryCount + 1) * 1000, 5000) // 1s, 2s, 3s, 4s, 5s, then stay at 5s
        console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1})`)

        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, delay)

        // Log retry attempt
        if (retryCount === 0) {
          activityLogger.logError('event_fetch_retry', 'Retrying to fetch event', {
            eventId,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }
    }

    if (eventId) {
      fetchEvent()
    }
  }, [eventId, retryCount])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  const handleBookTickets = async () => {
    const selectedTicketsList = Object.entries(selectedTickets).filter(([, quantity]) => quantity > 0)

    if (selectedTicketsList.length === 0) {
      alert('Please select at least one ticket')
      return
    }

    if (!event) return

    setBookingLoading(true)

    try {
      // Log ticket selections before proceeding to checkout
      for (const [ticketName, quantity] of selectedTicketsList) {
        const ticketType = event.ticketTypes.find(t => t.name === ticketName)
        if (ticketType) {
          // Log individual ticket selection
          await activityLogger.logTicketSelection(
            event._id,
            event.title,
            ticketType.name,
            quantity,
            ticketType.price * quantity
          )
        }
      }

      // Log checkout initiation
      const totalAmount = getTotalPrice()
      await activityLogger.logCheckoutStarted(totalAmount, 'EUR', {
        eventId: event._id,
        eventTitle: event.title,
        selectedTickets: selectedTicketsList,
        totalTickets: getTotalTickets(),
        source: 'event_detail_page'
      })

      // Reset selected tickets
      setSelectedTickets({})

      // Prepare checkout data in the correct format
      const checkoutTickets = selectedTicketsList.map(([ticketName, quantity]) => {
        const ticketType = event.ticketTypes.find(t => t.name === ticketName);
        return {
          ticketId: ticketName.toLowerCase().replace(/\s+/g, '-'),
          ticketName: ticketName,
          quantity: quantity,
          price: ticketType?.price || 0
        };
      });

      // Redirect directly to checkout with selected tickets
      const checkoutUrl = `/checkout?eventId=${event._id}&tickets=${encodeURIComponent(JSON.stringify(checkoutTickets))}`;
      router.push(checkoutUrl);
    } catch (error) {
      console.error('Error proceeding to checkout:', error)

      // Log error
      activityLogger.logError('checkout_redirect_failed', 'Failed to proceed to checkout', {
        eventId: event._id,
        eventTitle: event.title,
        selectedTickets: selectedTicketsList,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      alert('Failed to proceed to checkout. Please try again.')
    } finally {
      setBookingLoading(false)
    }
  }

  const updateTicketQuantity = (ticketName: string, quantity: number) => {
    const ticket = event?.ticketTypes.find(t => t.name === ticketName)
    const maxQuantity = ticket ? Math.min(8, ticket.availableTickets) : 0

    const newQuantity = Math.max(0, Math.min(quantity, maxQuantity))

    setSelectedTickets(prev => ({
      ...prev,
      [ticketName]: newQuantity
    }))

    // Log ticket selection change if event is available
    if (event && ticket && newQuantity > 0) {
      activityLogger.log({
        action: 'ticket_selection',
        description: `User selected ${newQuantity} ${ticketName} ticket(s) for ${event.title}`,
        eventId: event._id,
        eventTitle: event.title,
        ticketType: ticketName,
        quantity: newQuantity,
        amount: ticket.price * newQuantity,
        status: 'success'
      })
    }
  }

  const getTotalPrice = () => {
    if (!event?.ticketTypes) return 0

    return Object.entries(selectedTickets).reduce((total, [ticketName, quantity]) => {
      const ticket = event.ticketTypes.find(t => t.name === ticketName)
      return total + (ticket?.price || 0) * quantity
    }, 0)
  }

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((total, quantity) => total + quantity, 0)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.title,
          text: event?.description,
          url: window.location.href,
        })
      } catch {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

  if (loading || !event) {
    return (
      <BackgroundWrapper fullHeight={true} className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white/60 mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading event details...</p>
          {retryCount > 0 && (
            <p className="text-white/60 text-sm mt-2">Connecting to database... (attempt {retryCount})</p>
          )}
        </div>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper fullHeight={false}>
      {/* Hero Section - Premium Design */}
      <div className="relative h-[600px] overflow-hidden">
        {event.bannerImage || event.posterImage ? (
          <Image
            src={event.bannerImage || event.posterImage || ''}
            alt={event.title}
            fill
            className="object-cover transform scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600" />
        )}

        {/* Multi-layer gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-transparent to-purple-500/20" />

        {/* Sparkle effects */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-20 left-20 w-2 h-2 bg-white rounded-full animate-pulse" />
          <div className="absolute top-32 right-40 w-1 h-1 bg-pink-300 rounded-full animate-pulse delay-100" />
          <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-purple-300 rounded-full animate-pulse delay-200" />
          <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-pulse delay-300" />
        </div>

        {/* Back Button - Premium Style */}
        <div className="absolute top-8 left-8 z-10">
          <Link href="/events">
            <Button className="bg-white/10 backdrop-blur-xl border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 shadow-2xl transition-all duration-300 rounded-2xl px-6 py-3">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="font-semibold">Back to Events</span>
            </Button>
          </Link>
        </div>

        {/* Share Button - Premium Style */}
        <div className="absolute top-8 right-8 z-10">
          <Button
            onClick={handleShare}
            className="bg-white/10 backdrop-blur-xl border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 shadow-2xl transition-all duration-300 rounded-2xl p-4"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Hero Content - Premium Layout */}
        <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12">
          <div className="container mx-auto">
            <div className="backdrop-blur-xl bg-gradient-to-r from-black/70 to-black/50 rounded-3xl p-8 border border-white/20 shadow-2xl">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div className="flex-1">
                  {/* Category Badge */}
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 mb-4 px-4 py-2 text-sm font-bold uppercase tracking-wider shadow-xl">
                    <Star className="w-4 h-4 mr-2 inline" />
                    {typeof event.category === 'object' ? event.category.name : event.category}
                  </Badge>

                  {/* Event Title */}
                  <h1 className="text-5xl md:text-7xl font-black text-white mb-6 drop-shadow-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {event.title}
                  </h1>

                  {/* Artists */}
                  {event.artists && event.artists.length > 0 && (
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles className="w-6 h-6 text-pink-300" />
                      <p className="text-xl font-semibold text-pink-200">
                        {event.artists.join(', ')}
                      </p>
                    </div>
                  )}

                  {/* Event Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                      <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-3 rounded-xl shadow-lg">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/70 uppercase font-semibold">Date</p>
                        <p className="text-white font-bold">{formatDate(event.date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                      <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-3 rounded-xl shadow-lg">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/70 uppercase font-semibold">Time</p>
                        <p className="text-white font-bold">{formatTime(event.time)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                      <div className="bg-gradient-to-br from-pink-400 to-purple-500 p-3 rounded-xl shadow-lg">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-white/70 uppercase font-semibold">Venue</p>
                        <p className="text-white font-bold truncate">{event.venue}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-2 shadow-2xl">
                <TabsTrigger
                  value="overview"
                  className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-300 data-[state=active]:shadow-xl"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="tickets"
                  className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-300 data-[state=active]:shadow-xl"
                >
                  Tickets
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-xl font-semibold transition-all duration-300 data-[state=active]:shadow-xl"
                >
                  Details
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 shadow-2xl rounded-2xl overflow-hidden hover:border-pink-300/40 transition-all duration-500">
                  <CardHeader className="border-b border-white/20 bg-white/5">
                    <CardTitle className="text-white drop-shadow-md text-2xl font-bold flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-pink-400" />
                      About This Event
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-white/90 leading-relaxed text-lg drop-shadow-sm">
                      {event.description}
                    </p>
                  </CardContent>
                </Card>

                {/* YouTube Trailer */}
                {event.youtubeTrailer && (
                  <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 shadow-2xl rounded-2xl overflow-hidden hover:border-pink-300/40 transition-all duration-500">
                    <CardHeader className="border-b border-white/20 bg-white/5">
                      <CardTitle className="text-white drop-shadow-md text-2xl font-bold flex items-center gap-3">
                        <Play className="w-6 h-6 text-pink-400" />
                        Event Trailer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl ring-2 ring-pink-400/30">
                        <iframe
                          src={event.youtubeTrailer.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                          title={`${event.title} - Event Trailer`}
                          className="w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {event.artists && event.artists.length > 0 && (
                  <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 shadow-2xl rounded-2xl overflow-hidden hover:border-pink-300/40 transition-all duration-500">
                    <CardHeader className="border-b border-white/20 bg-white/5">
                      <CardTitle className="text-white drop-shadow-md text-2xl font-bold flex items-center gap-3">
                        <Music className="w-6 h-6 text-pink-400" />
                        Artists
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex flex-wrap gap-3">
                        {event.artists.map((artist, index) => (
                          <Badge
                            key={index}
                            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 text-sm font-semibold"
                          >
                            <Music className="w-4 h-4 mr-2" />
                            {artist}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {event.youtubeTrailer && (
                  <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-white drop-shadow-md">Trailer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <a
                        href={event.youtubeTrailer}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-purple-300 hover:text-purple-200"
                      >
                        <Play className="w-5 h-5" />
                        Watch Trailer
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="tickets" className="space-y-6 mt-6">
                <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 shadow-2xl rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-white/20 bg-white/5">
                    <CardTitle className="text-white drop-shadow-md text-2xl font-bold flex items-center gap-3">
                      <ShoppingCart className="w-6 h-6 text-pink-400" />
                      Available Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {event.ticketTypes.map((ticket, index) => (
                        <div
                          key={index}
                          className={`relative border-2 rounded-2xl p-6 transition-all duration-500 backdrop-blur-xl overflow-hidden group hover:shadow-2xl ${(selectedTickets[ticket.name] || 0) > 0
                            ? 'border-pink-400 shadow-[0_0_30px_-5px_rgba(236,72,153,0.5)]'
                            : 'border-white/30 hover:border-pink-300/50'
                            }`}
                          style={{
                            background: `linear-gradient(135deg, ${ticket.color}30 0%, ${ticket.color}10 100%)`,
                            borderLeftColor: ticket.color,
                            borderLeftWidth: '6px'
                          }}
                        >
                          {/* Animated gradient on selection */}
                          {(selectedTickets[ticket.name] || 0) > 0 && (
                            <div className="absolute -inset-[1px] bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-2xl opacity-20 blur-sm -z-10" />
                          )}

                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-xl text-white mb-2">{ticket.name}</h4>
                              {ticket.description && (
                                <p className="text-white/80 text-sm mb-3">{ticket.description}</p>
                              )}
                              <div className="flex items-center gap-3">
                                <span className={`flex items-center gap-2 font-semibold text-sm px-3 py-1 rounded-full ${ticket.availableTickets === 0
                                  ? 'bg-red-500/30 text-red-300 border border-red-400/30'
                                  : 'bg-green-500/30 text-green-300 border border-green-400/30'
                                  }`}>
                                  <Users className="w-4 h-4" />
                                  {ticket.availableTickets === 0 ? 'Not Available' : 'Available'}
                                </span>
                                {ticket.availableTickets <= 10 && ticket.availableTickets > 0 && (
                                  <span className="text-xs bg-yellow-500/30 text-yellow-200 px-3 py-1 rounded-full font-bold border border-yellow-400/30">
                                    ⚡ Limited Stock
                                  </span>
                                )}
                                {ticket.availableTickets === 0 && (
                                  <span className="text-xs bg-red-500/30 text-red-200 px-3 py-1 rounded-full font-bold border border-red-400/30">
                                    ❌ Sold Out
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-300 drop-shadow-lg">
                                {formatPrice(ticket.price)}
                              </div>
                              <div className="text-sm text-white/70 font-semibold">per ticket</div>
                            </div>
                          </div>

                          {/* Quantity Selector for tickets tab - Premium Style */}
                          <div className="flex items-center justify-between pt-4 border-t border-white/30">
                            <span className="text-sm font-bold text-white/90 uppercase tracking-wide">Quantity:</span>
                            {ticket.availableTickets === 0 ? (
                              <div className="px-4 py-2 bg-red-500/30 text-red-200 rounded-xl text-sm font-bold border border-red-400/30">
                                Sold Out
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-pink-500 to-purple-600 border-0 text-white hover:from-pink-600 hover:to-purple-700 shadow-lg w-10 h-10 rounded-xl font-bold text-lg"
                                  onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) - 1)}
                                  disabled={(selectedTickets[ticket.name] || 0) <= 0}
                                >
                                  -
                                </Button>
                                <span className="w-12 text-center font-black text-2xl text-white">
                                  {selectedTickets[ticket.name] || 0}
                                </span>
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-pink-500 to-purple-600 border-0 text-white hover:from-pink-600 hover:to-purple-700 shadow-lg w-10 h-10 rounded-xl font-bold text-lg"
                                  onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) + 1)}
                                  disabled={(selectedTickets[ticket.name] || 0) >= Math.min(8, ticket.availableTickets)}
                                >
                                  +
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Subtotal display - Premium */}
                          {(selectedTickets[ticket.name] || 0) > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/30 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                              <div className="flex justify-between items-center">
                                <span className="text-white/90 font-semibold">Subtotal:</span>
                                <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
                                  {formatPrice((selectedTickets[ticket.name] || 0) * ticket.price)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-6 mt-6">
                <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 shadow-2xl rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-white/20 bg-white/5">
                    <CardTitle className="text-white drop-shadow-md text-2xl font-bold flex items-center gap-3">
                      <Star className="w-6 h-6 text-pink-400" />
                      Event Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                        <h4 className="font-bold text-pink-300 mb-2 flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Date & Time
                        </h4>
                        <p className="text-white/90 font-semibold">{formatDate(event.date)}</p>
                        <p className="text-white/90 font-semibold">{formatTime(event.time)}</p>
                        {event.endDate && (
                          <p className="text-white/80 text-sm mt-1">Ends: {formatDate(event.endDate)}</p>
                        )}
                      </div>

                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                        <h4 className="font-bold text-pink-300 mb-2 flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          Location
                        </h4>
                        <p className="text-white/90 font-semibold">{event.venue}</p>
                        <p className="text-white/80">{event.location}</p>
                      </div>

                      {event.ageLimit && (
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                          <h4 className="font-bold text-pink-300 mb-2">Age Limit</h4>
                          <p className="text-white/90 font-semibold text-2xl">{event.ageLimit}+</p>
                        </div>
                      )}

                      {event.duration && (
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                          <h4 className="font-bold text-pink-300 mb-2 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Duration
                          </h4>
                          <p className="text-white/90 font-semibold text-2xl">{event.duration} min</p>
                        </div>
                      )}

                      {event.language && (
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                          <h4 className="font-bold text-pink-300 mb-2">Language</h4>
                          <p className="text-white/90 font-semibold">{event.language}</p>
                        </div>
                      )}

                      {event.organizer && (
                        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                          <h4 className="font-bold text-pink-300 mb-2">Organizer</h4>
                          <p className="text-white/90 font-semibold">{event.organizer}</p>
                        </div>
                      )}

                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                        <h4 className="font-bold text-pink-300 mb-2 flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Capacity
                        </h4>
                        <p className="text-white/90 font-semibold text-2xl">{event.maxCapacity || 0}</p>
                        <p className="text-white/70 text-sm">people</p>
                      </div>

                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                        <h4 className="font-bold text-pink-300 mb-2">Category</h4>
                        <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white border-0 text-sm">
                          {typeof event.category === 'object' ? event.category.name : event.category}
                        </Badge>
                      </div>
                    </div>

                    {event.tags && event.tags.length > 0 && (
                      <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                        <h4 className="font-bold text-pink-300 mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {event.tags.map((tag, index) => (
                            <Badge
                              key={index}
                              className="bg-white/10 border border-white/30 text-white hover:bg-white/20 transition-all duration-300"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Poster - Premium */}
            {event.posterImage && (
              <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-white/20 shadow-2xl rounded-2xl overflow-hidden hover:border-pink-300/40 transition-all duration-500 group">
                <CardContent className="p-0 relative">
                  <div className="relative overflow-hidden rounded-2xl">
                    <Image
                      src={event.posterImage}
                      alt={event.title}
                      width={400}
                      height={600}
                      className="w-full h-auto transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Booking Summary - Ultra Premium */}
            <Card className="sticky top-24 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-2 border-pink-300/30 shadow-2xl rounded-2xl overflow-hidden">
              {/* Animated border glow */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-2xl opacity-50 blur-sm -z-10" />

              <CardHeader className="border-b border-white/20 bg-gradient-to-r from-pink-500/20 to-purple-500/20">
                <CardTitle className="text-white drop-shadow-md text-2xl font-black flex items-center gap-3">
                  <ShoppingCart className="w-6 h-6 text-pink-300" />
                  Book Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {event.ticketTypes && event.ticketTypes.length > 0 && (
                  <>
                    {/* Individual Ticket Cards - Premium */}
                    <div className="space-y-4">
                      {event.ticketTypes.map((ticket) => (
                        <div
                          key={ticket.name}
                          className="relative border-2 border-white/30 rounded-xl p-5 backdrop-blur-md hover:border-pink-300/50 transition-all duration-500 group/ticket overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${ticket.color}25 0%, ${ticket.color}10 100%)`,
                            borderLeftColor: ticket.color,
                            borderLeftWidth: '5px'
                          }}
                        >
                          {/* Hover glow effect */}
                          <div className="absolute -inset-[1px] bg-gradient-to-r from-pink-400/0 via-pink-400/30 to-purple-400/0 rounded-xl opacity-0 group-hover/ticket:opacity-100 transition-opacity duration-500 -z-10 blur" />

                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-white text-lg mb-1">{ticket.name}</h4>
                              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300 drop-shadow-lg">
                                {formatPrice(ticket.price)}
                              </p>
                              {ticket.description && (
                                <p className="text-sm text-white/80 mt-2">{ticket.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <p className={`text-xs font-bold px-3 py-1 rounded-full ${ticket.availableTickets === 0
                                  ? 'bg-red-500/30 text-red-300 border border-red-400/30'
                                  : 'bg-green-500/30 text-green-300 border border-green-400/30'
                                  }`}>
                                  {ticket.availableTickets === 0 ? '❌ Sold Out' : '✓ Available'}
                                </p>
                                {ticket.availableTickets <= 10 && ticket.availableTickets > 0 && (
                                  <span className="text-xs bg-yellow-500/30 text-yellow-200 px-3 py-1 rounded-full font-bold border border-yellow-400/30">
                                    ⚡ Limited
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quantity Selector - Premium */}
                          <div className="flex items-center justify-between pt-3 border-t border-white/30">
                            <span className="text-sm font-bold text-white/90 uppercase tracking-wide">Qty:</span>
                            {ticket.availableTickets === 0 ? (
                              <div className="px-4 py-2 bg-red-500/30 text-red-200 rounded-xl text-sm font-bold border border-red-400/30">
                                Sold Out
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-pink-500 to-purple-600 border-0 text-white hover:from-pink-600 hover:to-purple-700 shadow-lg w-9 h-9 rounded-lg font-bold"
                                  onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) - 1)}
                                  disabled={(selectedTickets[ticket.name] || 0) <= 0}
                                >
                                  -
                                </Button>
                                <span className="w-10 text-center font-black text-xl text-white">
                                  {selectedTickets[ticket.name] || 0}
                                </span>
                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-pink-500 to-purple-600 border-0 text-white hover:from-pink-600 hover:to-purple-700 shadow-lg w-9 h-9 rounded-lg font-bold"
                                  onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) + 1)}
                                  disabled={(selectedTickets[ticket.name] || 0) >= Math.min(8, ticket.availableTickets)}
                                >
                                  +
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Subtotal for this ticket type */}
                          {(selectedTickets[ticket.name] || 0) > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/30 bg-white/10 backdrop-blur-sm rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-white/90 font-semibold text-sm">Subtotal:</span>
                                <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-300">
                                  {formatPrice((selectedTickets[ticket.name] || 0) * ticket.price)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total Summary - Ultra Premium */}
                    {getTotalTickets() > 0 && (
                      <div className="border-t-2 border-pink-400/30 pt-5 mt-5">
                        <div className="space-y-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-5 border border-pink-300/30">
                          <div className="flex justify-between text-sm text-white/90 font-semibold">
                            <span>Total Tickets:</span>
                            <span className="text-pink-300 font-bold">{getTotalTickets()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-white">Total:</span>
                            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 drop-shadow-2xl">
                              {formatPrice(getTotalPrice())}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Ultimate Premium Button */}
                      <div className="relative group/button">
                        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-75 group-hover/button:opacity-100 transition duration-500 animate-pulse" />
                        <Button
                          onClick={handleBookTickets}
                          className="relative w-full overflow-hidden bg-gradient-to-r from-pink-500 via-purple-600 to-pink-500 hover:from-pink-600 hover:via-purple-700 hover:to-pink-600 text-white font-black border-0 shadow-2xl transition-all duration-500 py-7 rounded-2xl"
                          disabled={getTotalTickets() === 0 || bookingLoading}
                        >
                          <span className="relative z-10 flex flex-col items-center justify-center gap-2">
                            {bookingLoading ? (
                              <span className="text-lg flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                              </span>
                            ) : (
                              <>
                                <span className="flex items-center gap-3 text-lg uppercase tracking-wider">
                                  <Sparkles className="w-5 h-5" />
                                  Proceed to Checkout
                                  <ArrowRight className="w-5 h-5 group-hover/button:translate-x-2 transition-transform duration-500" />
                                </span>
                                {getTotalTickets() > 0 && (
                                  <span className="text-sm opacity-90 font-semibold">
                                    {getTotalTickets()} Ticket(s) · {formatPrice(getTotalPrice())}
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                          <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-700" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  )
}