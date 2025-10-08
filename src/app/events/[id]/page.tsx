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
  Play,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BackgroundWrapper } from '@/components/ui/background-wrapper'
import { useCurrency } from '@/contexts/CurrencyContext'

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
  category: string
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

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>({})
  const [bookingLoading, setBookingLoading] = useState(false)

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}`)
        if (!response.ok) {
          throw new Error('Event not found')
        }
        const data = await response.json()
        setEvent(data)
      } catch (err) {
        console.error('Error fetching event:', err)
        setError('Failed to load event details')
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      fetchEvent()
    }
  }, [eventId])

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

    // Prepare ticket data for checkout
    const ticketSelections = selectedTicketsList.map(([ticketName, quantity]) => {
      const ticketType = event.ticketTypes.find(t => t.name === ticketName)
      return {
        ticketId: ticketType?.name || ticketName, // Use name as ID for now
        ticketName,
        quantity,
        price: ticketType?.price || 0
      }
    })

    // Redirect to checkout page with ticket data
    const checkoutData = {
      eventId: event._id,
      tickets: encodeURIComponent(JSON.stringify(ticketSelections))
    }

    const checkoutUrl = `/checkout?eventId=${checkoutData.eventId}&tickets=${checkoutData.tickets}`
    router.push(checkoutUrl)
  }

  const updateTicketQuantity = (ticketName: string, quantity: number) => {
    const ticket = event?.ticketTypes.find(t => t.name === ticketName)
    const maxQuantity = ticket ? Math.min(8, ticket.availableTickets) : 0

    setSelectedTickets(prev => ({
      ...prev,
      [ticketName]: Math.max(0, Math.min(quantity, maxQuantity))
    }))
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

  if (loading) {
    return (
      <BackgroundWrapper fullHeight={true} className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white/60"></div>
      </BackgroundWrapper>
    )
  }

  if (error || !event) {
    return (
      <BackgroundWrapper fullHeight={true} className="flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-white/60 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Event Not Found</h2>
          <p className="text-white/80 mb-4">{error || 'The event you are looking for does not exist.'}</p>
          <Link href="/events">
            <Button className="bg-white/20 text-white hover:bg-white/30">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper fullHeight={false}>
      {/* Hero Section */}
      <div className="relative h-[500px] bg-gray-900">
        {event.bannerImage || event.posterImage ? (
          <Image
            src={event.bannerImage || event.posterImage || ''}
            alt={event.title}
            fill
            className="object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-80" />
        )}

        <div className="absolute inset-0 bg-black/40" />

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/events">
            <Button variant="outline" className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 hover:border-white/50 shadow-lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>

        {/* Share Button */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="outline"
            onClick={handleShare}
            className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 hover:border-white/50 shadow-lg"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <div className="flex items-end justify-between">
              <div className="flex-1">
                <Badge className="bg-purple-600 text-white mb-4">
                  {event.category}
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                  {event.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>{formatTime(event.time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{event.venue}, {event.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-white/20 backdrop-blur-lg border border-white/30 rounded-xl">
                <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Overview</TabsTrigger>
                <TabsTrigger value="tickets" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Tickets</TabsTrigger>
                <TabsTrigger value="details" className="text-white data-[state=active]:bg-white/30 data-[state=active]:text-white">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white drop-shadow-md">About This Event</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/90 leading-relaxed drop-shadow-sm">
                      {event.description}
                    </p>
                  </CardContent>
                </Card>

                {event.artists && event.artists.length > 0 && (
                  <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-white drop-shadow-md">Artists</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {event.artists.map((artist, index) => (
                          <Badge key={index} variant="secondary" className="px-3 py-1 bg-white/30 text-white">
                            <Music className="w-3 h-3 mr-1" />
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

              <TabsContent value="tickets" className="space-y-6">
                <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white drop-shadow-md">Available Tickets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {event.ticketTypes.map((ticket, index) => (
                        <div
                          key={index}
                          className={`border-2 rounded-lg p-4 transition-all backdrop-blur-md ${(selectedTickets[ticket.name] || 0) > 0
                            ? 'border-purple-400'
                            : 'border-white/30'
                            }`}
                          style={{
                            backgroundColor: `${ticket.color}50`, // Add 50% opacity to the ticket color
                            borderLeftColor: ticket.color,
                            borderLeftWidth: '14px'
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg text-white">{ticket.name}</h4>
                              {ticket.description && (
                                <p className="text-white/70 text-sm mt-1">{ticket.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className={`flex items-center gap-1 font-medium ${ticket.availableTickets === 0
                                  ? 'text-red-400'
                                  : ticket.availableTickets <= 10
                                    ? 'text-yellow-400'
                                    : 'text-green-400'
                                  }`}>
                                  <Users className="w-4 h-4" />
                                  {ticket.availableTickets === 0
                                    ? 'Sold Out'
                                    : `${ticket.availableTickets} available`
                                  }
                                </span>
                                {ticket.availableTickets <= 10 && ticket.availableTickets > 0 && (
                                  <span className="text-xs bg-yellow-600/30 text-yellow-300 px-2 py-1 rounded">
                                    Limited Stock
                                  </span>
                                )}
                                {ticket.availableTickets === 0 && (
                                  <span className="text-xs bg-red-600/30 text-red-300 px-2 py-1 rounded">
                                    Sold Out
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-white">
                                {formatPrice(ticket.price)}
                              </div>
                              <div className="text-sm text-white/60">per ticket</div>
                            </div>
                          </div>

                          {/* Quantity Selector for tickets tab */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/30">
                            <span className="text-sm font-medium text-white/90">Quantity:</span>
                            {ticket.availableTickets === 0 ? (
                              <div className="px-3 py-1 bg-red-600/30 text-red-300 rounded text-sm">
                                Sold Out
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                                  onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) - 1)}
                                  disabled={(selectedTickets[ticket.name] || 0) <= 0}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center font-medium text-white">
                                  {selectedTickets[ticket.name] || 0}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                                  onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) + 1)}
                                  disabled={(selectedTickets[ticket.name] || 0) >= Math.min(8, ticket.availableTickets)}
                                >
                                  +
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Subtotal display */}
                          {(selectedTickets[ticket.name] || 0) > 0 && (
                            <div className="mt-3 pt-3 border-t border-white/30">
                              <div className="flex justify-between text-sm">
                                <span className="text-white/90">Subtotal:</span>
                                <span className="font-medium text-white">
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

              <TabsContent value="details" className="space-y-6">
                <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-white drop-shadow-md">Event Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-white">Date & Time</h4>
                        <p className="text-white/80">{formatDate(event.date)} at {formatTime(event.time)}</p>
                        {event.endDate && (
                          <p className="text-white/80">Ends: {formatDate(event.endDate)}</p>
                        )}
                      </div>

                      <div>
                        <h4 className="font-medium text-white">Location</h4>
                        <p className="text-white/80">{event.venue}</p>
                        <p className="text-white/80">{event.location}</p>
                      </div>

                      {event.ageLimit && (
                        <div>
                          <h4 className="font-medium text-white">Age Limit</h4>
                          <p className="text-white/80">{event.ageLimit}+</p>
                        </div>
                      )}

                      {event.duration && (
                        <div>
                          <h4 className="font-medium text-white">Duration</h4>
                          <p className="text-white/80">{event.duration} minutes</p>
                        </div>
                      )}

                      {event.language && (
                        <div>
                          <h4 className="font-medium text-white">Language</h4>
                          <p className="text-white/80">{event.language}</p>
                        </div>
                      )}

                      {event.organizer && (
                        <div>
                          <h4 className="font-medium text-white">Organizer</h4>
                          <p className="text-white/80">{event.organizer}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="font-medium text-white">Capacity</h4>
                        <p className="text-white/80">{event.maxCapacity} people</p>
                      </div>

                      <div>
                        <h4 className="font-medium text-white">Category</h4>
                        <p className="text-white/80">{event.category}</p>
                      </div>
                    </div>

                    {event.tags && event.tags.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium text-white mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {event.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="border-white/30 text-white">
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
            {/* Event Poster */}
            {event.posterImage && (
              <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
                <CardContent className="p-0">
                  <Image
                    src={event.posterImage}
                    alt={event.title}
                    width={400}
                    height={600}
                    className="w-full h-auto rounded-lg"
                  />
                </CardContent>
              </Card>
            )}

            {/* Booking Summary */}
            <Card className="sticky top-4 bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white drop-shadow-md">Book Tickets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.ticketTypes && event.ticketTypes.length > 0 && (
                  <>
                    {/* Individual Ticket Cards */}
                    <div className="space-y-3">
                      {event.ticketTypes.map((ticket) => (
                        <div
                          key={ticket.name}
                          className="border border-white/30 rounded-lg p-4 backdrop-blur-md"
                          style={{
                            backgroundColor: `${ticket.color}20`, // Add 20% opacity to the ticket color
                            borderLeftColor: ticket.color,
                            borderLeftWidth: '4px'
                          }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-white">{ticket.name}</h4>
                              <p className="text-2xl font-bold text-purple-300">{formatPrice(ticket.price)}</p>
                              {ticket.description && (
                                <p className="text-sm text-white/70 mt-1">{ticket.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <p className={`text-xs font-medium ${ticket.availableTickets === 0
                                  ? 'text-red-400'
                                  : ticket.availableTickets <= 10
                                    ? 'text-yellow-400'
                                    : 'text-green-400'
                                  }`}>
                                  {ticket.availableTickets === 0
                                    ? 'Sold Out'
                                    : `${ticket.availableTickets} available`
                                  }
                                </p>
                                {ticket.availableTickets <= 10 && ticket.availableTickets > 0 && (
                                  <span className="text-xs bg-yellow-600/30 text-yellow-300 px-2 py-1 rounded">
                                    Limited
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quantity Selector */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white/90">Quantity:</span>
                            {ticket.availableTickets === 0 ? (
                              <div className="px-3 py-1 bg-red-600/30 text-red-300 rounded text-sm">
                                Sold Out
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                                  onClick={() => updateTicketQuantity(ticket.name, (selectedTickets[ticket.name] || 0) - 1)}
                                  disabled={(selectedTickets[ticket.name] || 0) <= 0}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center font-medium text-white">
                                  {selectedTickets[ticket.name] || 0}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
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
                            <div className="mt-3 pt-3 border-t border-white/30">
                              <div className="flex justify-between text-sm">
                                <span className="text-white/90">Subtotal:</span>
                                <span className="font-medium text-white">
                                  ${((selectedTickets[ticket.name] || 0) * ticket.price).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Total Summary */}
                    {getTotalTickets() > 0 && (
                      <div className="border-t border-white/30 pt-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-white/80">
                            <span>Total Tickets:</span>
                            <span>{getTotalTickets()}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold text-white">
                            <span>Total:</span>
                            <span>{formatPrice(getTotalPrice())}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Button
                        onClick={handleBookTickets}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
                        disabled={getTotalTickets() === 0 || bookingLoading}
                      >
                        {bookingLoading ? 'Processing...' : (
                          <>
                            Continue to Checkout {getTotalTickets() > 0 ? `- ${getTotalTickets()} ` : ''}
                            {getTotalTickets() > 0 && `Ticket(s) for ${formatPrice(getTotalPrice())}`}
                          </>
                        )}
                      </Button>

                      {/* Test Direct Booking Button */}
                      <Button
                        onClick={async () => {
                          const selectedTicketsList = Object.entries(selectedTickets).filter(([, quantity]) => quantity > 0)
                          if (selectedTicketsList.length === 0) {
                            alert('Please select at least one ticket')
                            return
                          }

                          setBookingLoading(true)
                          try {
                            const response = await fetch(`/api/events/${eventId}/book`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                ticketSelections: selectedTickets,
                                useWebhook: false // Direct booking for testing
                              })
                            })

                            const data = await response.json()
                            if (response.ok) {
                              alert('🎉 Test booking successful!')
                              setSelectedTickets({})
                              // Refresh event data
                              const eventResponse = await fetch(`/api/events/${eventId}`)
                              if (eventResponse.ok) {
                                const updatedEvent = await eventResponse.json()
                                setEvent(updatedEvent)
                              }
                            } else {
                              alert(`❌ Test booking failed: ${data.error}`)
                            }
                          } catch (error) {
                            alert('❌ Network error')
                          } finally {
                            setBookingLoading(false)
                          }
                        }}
                        variant="outline"
                        className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 text-sm py-2"
                        disabled={getTotalTickets() === 0 || bookingLoading}
                      >
                        Test Direct Booking (Skip Payment)
                      </Button>
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