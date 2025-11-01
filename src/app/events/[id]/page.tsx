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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white/60 mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Loading event details...</p>
          {retryCount > 0 && (
            <p className="text-white/60 text-sm mt-2">Connecting to database... (attempt {retryCount})</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Ultra-Modern Hero Section - Full Screen Impact */}
      <div className="relative h-screen overflow-hidden bg-black">
        {/* Massive Background Image */}
        {event.bannerImage || event.posterImage ? (
          <Image
            src={event.bannerImage || event.posterImage || ''}
            alt={event.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-900" />
        )}

        {/* Sophisticated Multi-Layer Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-700/10 via-transparent to-stone-800/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,transparent_0%,black_100%)] opacity-60" />

        {/* Floating Navigation */}
        <div className="absolute top-0 left-0 right-0 z-50 p-6 md:p-8">
          <div className="container mx-auto flex items-center justify-between">
            {/* Back Button - Glassmorphic */}
            <Link href="/events">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/50 to-amber-900/50 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition duration-500" />
                <Button className="relative bg-black/40 backdrop-blur-2xl border-2 border-orange-500/30 text-orange-100 hover:bg-black/60 hover:border-orange-500/60 shadow-2xl transition-all duration-500 rounded-2xl px-6 py-6 font-bold group-hover:scale-105">
                  <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                  <span>Back</span>
                </Button>
              </div>
            </Link>

            {/* Share Button */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/50 to-amber-900/50 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition duration-500" />
              <Button
                onClick={handleShare}
                className="relative bg-black/40 backdrop-blur-2xl border-2 border-orange-500/30 text-orange-100 hover:bg-black/60 hover:border-orange-500/60 shadow-2xl transition-all duration-500 rounded-2xl p-6 group-hover:scale-105"
              >
                <Share2 className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Content - Bottom Anchored */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto max-w-7xl">
            {/* Category Pill */}
            <div className="mb-6 inline-block">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-stone-900 rounded-full blur-md opacity-80" />
                {/* <Badge className="relative bg-black/90 backdrop-blur-xl text-orange-500 border-2 border-orange-500/60 px-6 py-3 text-sm font-black uppercase tracking-[0.2em] rounded-full shadow-2xl">
                  <Star className="w-4 h-4 mr-2 inline animate-pulse" />
                  {typeof event.category === 'object' ? event.category.name : event.category}
                </Badge> */}
              </div>
            </div>

            {/* Massive Title */}
            <div className="mb-8">
              <img 
                src="https://res.cloudinary.com/dzwjhgycg/image/upload/v1762017859/Supernova_Title_prak5i.png" 
                alt="Supernova" 
                className="h-32 md:h-48 lg:h-56 w-auto object-contain"
                style={{
                  filter: 'drop-shadow(0 10px 40px rgba(0,0,0,0.8)) drop-shadow(0 0 60px rgba(251,191,36,0.2))',
                }}
              />
            </div>

            {/* Artists - Elegant Display */}
            {event.artists && event.artists.length > 0 && (
              <div className="flex items-center gap-4 mb-10">
                <div className="flex items-center gap-3 backdrop-blur-2xl bg-orange-500/20 border-2 border-orange-500/40 rounded-full px-6 py-4 shadow-2xl">
                  <Sparkles className="w-6 h-6 text-orange-300 animate-pulse" />
                  <span className="text-xl md:text-2xl font-bold text-orange-200">
                    {event.artists.slice(0, 3).join(' • ')}
                  </span>
                </div>
              </div>
            )}

            {/* Info Pills - Horizontal Layout */}
            <div className="flex flex-wrap gap-4 max-w-4xl">
              <div className="group hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-4 backdrop-blur-2xl bg-black/80 border-2 border-orange-500/40 rounded-2xl px-6 py-4 shadow-2xl hover:border-orange-500/70 transition-all duration-300">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-900 p-3 rounded-xl shadow-xl">
                    <Calendar className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-orange-500/80 uppercase font-black tracking-[0.15em] mb-1">Date</p>
                    <p className="text-orange-100 font-bold text-lg">{formatDate(event.date)}</p>
                  </div>
                </div>
              </div>

              <div className="group hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-4 backdrop-blur-2xl bg-black/80 border-2 border-orange-500/40 rounded-2xl px-6 py-4 shadow-2xl hover:border-orange-500/70 transition-all duration-300">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-900 p-3 rounded-xl shadow-xl">
                    <Clock className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-orange-500/80 uppercase font-black tracking-[0.15em] mb-1">Time</p>
                    <p className="text-orange-100 font-bold text-lg">{formatTime(event.time)}</p>
                  </div>
                </div>
              </div>

              <div className="group hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-4 backdrop-blur-2xl bg-black/80 border-2 border-orange-500/40 rounded-2xl px-6 py-4 shadow-2xl hover:border-orange-500/70 transition-all duration-300">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-900 p-3 rounded-xl shadow-xl">
                    <MapPin className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-orange-500/80 uppercase font-black tracking-[0.15em] mb-1">Venue</p>
                    <p className="text-orange-100 font-bold text-lg">{event.venue}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-8 h-12 border-2 border-orange-500/60 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-orange-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Content - Modern Clean Layout */}
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 md:px-6 py-16 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Modern Minimalist Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                {/* Sleek Tab Buttons */}
                <TabsList className="w-full bg-zinc-950/80 backdrop-blur-2xl border-2 border-orange-500/20 rounded-3xl p-2 shadow-2xl mb-8">
                  <TabsTrigger
                    value="overview"
                    className="flex-1 text-orange-100/70 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-900 data-[state=active]:text-black rounded-2xl font-bold transition-all duration-500 data-[state=active]:shadow-2xl py-4 uppercase tracking-wider text-sm"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="tickets"
                    className="flex-1 text-orange-100/70 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-900 data-[state=active]:text-black rounded-2xl font-bold transition-all duration-500 data-[state=active]:shadow-2xl py-4 uppercase tracking-wider text-sm"
                  >
                    Tickets
                  </TabsTrigger>
                  <TabsTrigger
                    value="details"
                    className="flex-1 text-orange-100/70 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-900 data-[state=active]:text-black rounded-2xl font-bold transition-all duration-500 data-[state=active]:shadow-2xl py-4 uppercase tracking-wider text-sm"
                  >
                    Details
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-8">
                  {/* About Section - Clean Modern Card */}
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-amber-900/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-700" />
                    <Card className="relative bg-zinc-950/90 backdrop-blur-xl border-2 border-orange-500/20 shadow-2xl rounded-3xl overflow-hidden hover:border-orange-500/40 transition-all duration-500">
                      {/* Accent Bar */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500" />

                      <CardHeader className="pt-8 pb-6 px-8">
                        <CardTitle className="text-orange-100 text-3xl font-black flex items-center gap-4">
                          <div className="bg-gradient-to-br from-orange-500 to-amber-900 p-3 rounded-2xl shadow-xl">
                            <Sparkles className="w-6 h-6 text-black" />
                          </div>
                          About This Event
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-8 pb-8">
                        <p className="text-orange-100/80 leading-[1.8] text-lg">
                          {event.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* YouTube Trailer - Modern Embed */}
                  {event.youtubeTrailer && (
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-red-600/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-700" />
                      <Card className="relative bg-zinc-950/90 backdrop-blur-xl border-2 border-orange-500/20 shadow-2xl rounded-3xl overflow-hidden hover:border-orange-500/40 transition-all duration-500">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-red-600 to-red-500" />

                        <CardHeader className="pt-8 pb-6 px-8">
                          <CardTitle className="text-orange-100 text-3xl font-black flex items-center gap-4">
                            <div className="bg-gradient-to-br from-red-500 to-red-700 p-3 rounded-2xl shadow-xl">
                              <Play className="w-6 h-6 text-white" />
                            </div>
                            Event Trailer
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl ring-2 ring-orange-500/30">
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
                    </div>
                  )}

                  {/* Artists Section - Sleek Grid */}
                  {event.artists && event.artists.length > 0 && (
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-amber-900/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-700" />
                      <Card className="relative bg-zinc-950/90 backdrop-blur-xl border-2 border-orange-500/20 shadow-2xl rounded-3xl overflow-hidden hover:border-orange-500/40 transition-all duration-500">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500" />

                        <CardHeader className="pt-8 pb-6 px-8">
                          <CardTitle className="text-orange-100 text-3xl font-black flex items-center gap-4">
                            <div className="bg-gradient-to-br from-orange-500 to-amber-900 p-3 rounded-2xl shadow-xl">
                              <Music className="w-6 h-6 text-black" />
                            </div>
                            Featured Artists
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {event.artists.map((artist, index) => (
                              <div key={index} className="group/artist hover:scale-105 transition-transform duration-300">
                                <div className="flex items-center gap-4 bg-black/60 backdrop-blur-sm border-2 border-orange-500/30 rounded-2xl px-6 py-4 shadow-lg hover:border-orange-500/60 hover:shadow-xl transition-all duration-300">
                                  <Music className="w-5 h-5 text-orange-500" />
                                  <span className="text-orange-100 font-bold text-lg">{artist}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>

                {/* Tickets Tab */}
                <TabsContent value="tickets" className="space-y-8">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-amber-900/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-700" />
                    <Card className="relative bg-zinc-950/90 backdrop-blur-xl border-2 border-orange-500/20 shadow-2xl rounded-3xl overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500" />

                      <CardHeader className="pt-8 pb-6 px-8">
                        <CardTitle className="text-orange-100 text-3xl font-black flex items-center gap-4">
                          <div className="bg-gradient-to-br from-orange-500 to-amber-900 p-3 rounded-2xl shadow-xl">
                            <ShoppingCart className="w-6 h-6 text-black" />
                          </div>
                          Available Tickets
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-8 pb-8">
                        <div className="space-y-4">
                          {event.ticketTypes.map((ticket, index) => (
                            <div
                              key={index}
                              className={`relative border-2 rounded-2xl p-6 transition-all duration-500 backdrop-blur-xl overflow-hidden group hover:shadow-2xl ${(selectedTickets[ticket.name] || 0) > 0
                                ? 'border-orange-500 shadow-[0_0_30px_-5px_rgba(251,191,36,0.5)] bg-gradient-to-br from-orange-700/20 to-amber-900/10'
                                : 'border-orange-700/30 hover:border-orange-500/50 bg-black/60'
                                }`}
                              style={{
                                borderLeftColor: (selectedTickets[ticket.name] || 0) > 0 ? '#cd7f32' : ticket.color,
                                borderLeftWidth: '6px'
                              }}
                            >
                              {/* Animated gradient on selection */}
                              {(selectedTickets[ticket.name] || 0) > 0 && (
                                <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500 rounded-2xl opacity-30 blur-sm -z-10" />
                              )}

                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <h4 className="font-black text-xl text-orange-100 mb-2">{ticket.name}</h4>
                                  {ticket.description && (
                                    <p className="text-orange-100/80 text-sm mb-3">{ticket.description}</p>
                                  )}
                                  <div className="flex items-center gap-3">
                                    <span className={`flex items-center gap-2 font-bold text-sm px-3 py-1 rounded-full ${ticket.availableTickets === 0
                                      ? 'bg-red-500/30 text-red-300 border-2 border-red-400/50'
                                      : 'bg-green-500/30 text-green-300 border-2 border-green-400/50'
                                      }`}>
                                      <Users className="w-4 h-4" />
                                      {ticket.availableTickets === 0 ? '❌ Sold Out' : '✓ Available'}
                                    </span>
                                    {ticket.availableTickets <= 10 && ticket.availableTickets > 0 && (
                                      <span className="text-xs bg-orange-500/30 text-orange-200 px-3 py-1 rounded-full font-black border-2 border-orange-500/50">
                                        ⚡ Limited
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-300 via-stone-900 to-orange-500 drop-shadow-lg">
                                    {formatPrice(ticket.price)}
                                  </div>
                                  <div className="text-xs text-orange-500 font-bold uppercase tracking-wider">per ticket</div>
                                </div>
                              </div>

                              {/* Quantity Selector for tickets tab - Elite Style */}
                              <div className="flex items-center justify-between pt-4 border-t-2 border-orange-700/30">
                                <span className="text-sm font-black text-orange-100 uppercase tracking-wider">Quantity:</span>
                                {ticket.availableTickets === 0 ? (
                                  <div className="px-4 py-2 bg-red-500/30 text-red-200 rounded-xl text-sm font-bold border-2 border-red-400/50">
                                    Sold Out
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <Button
                                      size="sm"
                                      className="bg-gradient-to-r from-orange-500 to-amber-900 border-0 text-black hover:from-orange-700 hover:to-stone-800 shadow-lg w-10 h-10 rounded-xl font-black text-lg"
                                      onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) - 1)}
                                      disabled={(selectedTickets[ticket.name] || 0) <= 0}
                                    >
                                      -
                                    </Button>
                                    <span className="w-12 text-center font-black text-2xl text-orange-100">
                                      {selectedTickets[ticket.name] || 0}
                                    </span>
                                    <Button
                                      size="sm"
                                      className="bg-gradient-to-r from-orange-500 to-amber-900 border-0 text-black hover:from-orange-700 hover:to-stone-800 shadow-lg w-10 h-10 rounded-xl font-black text-lg"
                                      onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) + 1)}
                                      disabled={(selectedTickets[ticket.name] || 0) >= Math.min(8, ticket.availableTickets)}
                                    >
                                      +
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Subtotal display - Elite */}
                              {(selectedTickets[ticket.name] || 0) > 0 && (
                                <div className="mt-4 pt-4 border-t-2 border-orange-700/30 bg-black/40 backdrop-blur-sm rounded-xl p-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-orange-100 font-bold uppercase tracking-wider text-sm">Subtotal:</span>
                                    <span className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-stone-900">
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
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-8">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-amber-900/20 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-700" />
                    <Card className="relative bg-zinc-950/90 backdrop-blur-xl border-2 border-orange-500/20 shadow-2xl rounded-3xl overflow-hidden hover:border-orange-500/40 transition-all duration-500">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500" />

                      <CardHeader className="pt-8 pb-6 px-8">
                        <CardTitle className="text-orange-100 text-3xl font-black flex items-center gap-4">
                          <div className="bg-gradient-to-br from-orange-500 to-amber-900 p-3 rounded-2xl shadow-xl">
                            <Star className="w-6 h-6 text-black" />
                          </div>
                          Event Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-8 pb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                            <h4 className="font-black text-orange-500 mb-3 flex items-center gap-2">
                              <Calendar className="w-5 h-5" />
                              Date & Time
                            </h4>
                            <p className="text-orange-100 font-bold text-lg">{formatDate(event.date)}</p>
                            <p className="text-orange-100 font-bold text-lg">{formatTime(event.time)}</p>
                            {event.endDate && (
                              <p className="text-orange-100/70 text-sm mt-2">Ends: {formatDate(event.endDate)}</p>
                            )}
                          </div>

                          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                            <h4 className="font-black text-orange-500 mb-3 flex items-center gap-2">
                              <MapPin className="w-5 h-5" />
                              Location
                            </h4>
                            <p className="text-orange-100 font-bold text-lg">{event.venue}</p>
                            <p className="text-orange-100/80">{event.location}</p>
                          </div>

                          {event.ageLimit && (
                            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                              <h4 className="font-black text-orange-500 mb-3">Age Limit</h4>
                              <p className="text-orange-100 font-black text-3xl">{event.ageLimit}+</p>
                            </div>
                          )}

                          {event.duration && (
                            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                              <h4 className="font-black text-orange-500 mb-3 flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Duration
                              </h4>
                              <p className="text-orange-100 font-black text-3xl">{event.duration} min</p>
                            </div>
                          )}

                          {event.language && (
                            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                              <h4 className="font-black text-orange-500 mb-3">Language</h4>
                              <p className="text-orange-100 font-bold text-lg">{event.language}</p>
                            </div>
                          )}

                          {event.organizer && (
                            <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                              <h4 className="font-black text-orange-500 mb-3">Organizer</h4>
                              <p className="text-orange-100 font-bold text-lg">{event.organizer}</p>
                            </div>
                          )}

                          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                            <h4 className="font-black text-orange-500 mb-3 flex items-center gap-2">
                              <Users className="w-5 h-5" />
                              Capacity
                            </h4>
                            <p className="text-orange-100 font-black text-3xl">{event.maxCapacity || 0}</p>
                            <p className="text-orange-100/70 text-sm">people</p>
                          </div>

                          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/30 hover:border-orange-500/50 transition-all duration-300">
                            <h4 className="font-black text-orange-500 mb-3">Category</h4>
                            <Badge className="bg-gradient-to-r from-orange-500 to-amber-900 text-black border-0 text-sm font-bold px-4 py-2">
                              {typeof event.category === 'object' ? event.category.name : event.category}
                            </Badge>
                          </div>
                        </div>

                        {event.tags && event.tags.length > 0 && (
                          <div className="mt-6 bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/30">
                            <h4 className="font-black text-orange-500 mb-4">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                              {event.tags.map((tag, index) => (
                                <Badge
                                  key={index}
                                  className="bg-orange-500/20 border-2 border-orange-500/40 text-orange-300 hover:bg-orange-500/30 transition-all duration-300 font-bold px-4 py-2"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Event Poster - Elite */}
              {event.posterImage && (
                <Card className="bg-black/90 backdrop-blur-xl border-2 border-orange-700/30 shadow-2xl rounded-2xl overflow-hidden hover:border-orange-500/50 transition-all duration-500 group">
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

              {/* Booking Summary - Ultra Elite */}
              <Card className="sticky top-24 bg-black/95 backdrop-blur-xl border-2 border-orange-700/40 shadow-2xl rounded-2xl overflow-hidden">
                {/* Animated border glow */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500 rounded-2xl opacity-40 animate-pulse -z-10" />

                <CardHeader className="border-b-2 border-orange-700/30 bg-gradient-to-r from-orange-700/20 to-amber-900/20">
                  <CardTitle className="text-orange-100 drop-shadow-md text-2xl font-black flex items-center gap-3">
                    <ShoppingCart className="w-6 h-6 text-orange-500" />
                    Book Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {event.ticketTypes && event.ticketTypes.length > 0 && (
                    <>
                      {/* Individual Ticket Cards - Elite */}
                      <div className="space-y-4">
                        {event.ticketTypes.map((ticket) => (
                          <div
                            key={ticket.name}
                            className="relative border-2 border-orange-700/40 rounded-xl p-5 backdrop-blur-md hover:border-orange-500/60 transition-all duration-500 group/ticket overflow-hidden bg-black/80"
                            style={{
                              borderLeftColor: '#cd7f32',
                              borderLeftWidth: '5px'
                            }}
                          >
                            {/* Hover glow effect */}
                            <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500/0 via-orange-500/30 to-amber-900/0 rounded-xl opacity-0 group-hover/ticket:opacity-100 transition-opacity duration-500 -z-10 blur" />

                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <h4 className="font-black text-orange-100 text-lg mb-1">{ticket.name}</h4>
                                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-stone-900 drop-shadow-lg">
                                  {formatPrice(ticket.price)}
                                </p>
                                {ticket.description && (
                                  <p className="text-sm text-orange-100/80 mt-2">{ticket.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <p className={`text-xs font-bold px-3 py-1 rounded-full ${ticket.availableTickets === 0
                                    ? 'bg-red-500/30 text-red-300 border-2 border-red-400/50'
                                    : 'bg-green-500/30 text-green-300 border-2 border-green-400/50'
                                    }`}>
                                    {ticket.availableTickets === 0 ? '❌ Sold Out' : '✓ Available'}
                                  </p>
                                  {ticket.availableTickets <= 10 && ticket.availableTickets > 0 && (
                                    <span className="text-xs bg-orange-500/30 text-orange-200 px-3 py-1 rounded-full font-bold border-2 border-orange-500/50">
                                      ⚡ Limited
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quantity Selector - Elite */}
                            <div className="flex items-center justify-between pt-3 border-t-2 border-orange-700/30">
                              <span className="text-sm font-bold text-orange-100 uppercase tracking-wider">Qty:</span>
                              {ticket.availableTickets === 0 ? (
                                <div className="px-4 py-2 bg-red-500/30 text-red-200 rounded-xl text-sm font-bold border-2 border-red-400/50">
                                  Sold Out
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-orange-500 to-amber-900 border-0 text-black hover:from-orange-700 hover:to-stone-800 shadow-lg w-9 h-9 rounded-lg font-black"
                                    onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) - 1)}
                                    disabled={(selectedTickets[ticket.name] || 0) <= 0}
                                  >
                                    -
                                  </Button>
                                  <span className="w-10 text-center font-black text-xl text-orange-100">
                                    {selectedTickets[ticket.name] || 0}
                                  </span>
                                  <Button
                                    size="sm"
                                    className="bg-gradient-to-r from-orange-500 to-amber-900 border-0 text-black hover:from-orange-700 hover:to-stone-800 shadow-lg w-9 h-9 rounded-lg font-black"
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
                              <div className="mt-3 pt-3 border-t-2 border-orange-700/30 bg-black/60 backdrop-blur-sm rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-orange-100 font-bold text-sm uppercase tracking-wider">Subtotal:</span>
                                  <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-stone-900">
                                    {formatPrice((selectedTickets[ticket.name] || 0) * ticket.price)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Total Summary - Ultra Elite */}
                      {getTotalTickets() > 0 && (
                        <div className="border-t-2 border-orange-700/40 pt-5 mt-5">
                          <div className="space-y-3 bg-gradient-to-r from-orange-700/20 to-amber-900/20 backdrop-blur-sm rounded-xl p-5 border-2 border-orange-500/40">
                            <div className="flex justify-between text-sm text-orange-100 font-bold">
                              <span>Total Tickets:</span>
                              <span className="text-orange-500 font-black">{getTotalTickets()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-lg font-black text-orange-100">Total:</span>
                              <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-300 via-stone-900 to-orange-500 drop-shadow-2xl">
                                {formatPrice(getTotalPrice())}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {/* Ultimate Elite Button */}
                        <div className="relative group/button">
                          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500 rounded-2xl blur-sm opacity-75 group-hover/button:opacity-100 transition duration-500 animate-pulse" />
                          <Button
                            onClick={handleBookTickets}
                            className="relative w-full overflow-hidden bg-gradient-to-r from-orange-500 via-amber-900 to-orange-500 hover:from-orange-500 hover:via-stone-900 hover:to-orange-500 text-black font-black border-0 shadow-2xl transition-all duration-500 py-7 rounded-2xl"
                            disabled={getTotalTickets() === 0 || bookingLoading}
                          >
                            <span className="relative z-10 flex flex-col items-center justify-center gap-2">
                              {bookingLoading ? (
                                <span className="text-lg flex items-center gap-2">
                                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
                                    <span className="text-sm opacity-90 font-bold">
                                      {getTotalTickets()} Ticket(s) · {formatPrice(getTotalPrice())}
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/40 to-white/0 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-700" />
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
      </div>
    </>
  )
}