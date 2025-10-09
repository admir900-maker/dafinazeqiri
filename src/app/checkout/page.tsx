'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackgroundWrapper } from '@/components/ui/background-wrapper';
import { useCurrency } from '@/contexts/CurrencyContext';
import { StripePayment } from '@/components/StripePayment';

interface TicketSelection {
  ticketId: string;
  ticketName: string;
  quantity: number;
  price: number;
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
}

interface PaymentSettings {
  paymentProvider: 'stripe' | 'raiffeisen' | 'both';
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const { user, isLoaded, isSignedIn } = useUser();

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketSelections, setTicketSelections] = useState<TicketSelection[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'stripe' | 'raiffeisen' | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentIntentData, setPaymentIntentData] = useState<{
    clientSecret: string;
    orderSummary: any;
  } | null>(null);
  const [showStripePayment, setShowStripePayment] = useState(false);

  useEffect(() => {
    // Wait for user data to load before proceeding
    if (!isLoaded) return;

    // Get data from URL params
    const eventId = searchParams.get('eventId');
    const tickets = searchParams.get('tickets');

    if (!eventId || !tickets) {
      setError('Missing checkout data');
      setLoading(false);
      return;
    }

    try {
      const parsedTickets = JSON.parse(decodeURIComponent(tickets));
      setTicketSelections(parsedTickets);
      fetchEventAndSettings(eventId);
    } catch (err) {
      console.error('Error parsing tickets:', err);
      setError('Invalid checkout data');
      setLoading(false);
    }
  }, [searchParams, isLoaded]);

  const fetchEventAndSettings = async (eventId: string) => {
    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      if (!eventResponse.ok) {
        throw new Error('Event not found');
      }
      const eventData = await eventResponse.json();
      setEvent(eventData);

      // Fetch payment settings
      const settingsResponse = await fetch('/api/payment-config');
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        setPaymentSettings(settings);

        // Use payment method configured in admin settings for all users
        console.log('💳 Payment provider from settings:', settings.paymentProvider);
        console.log('💳 Full settings:', settings);

        // Auto-select payment method based on admin settings
        if (settings.paymentProvider === 'stripe') {
          console.log('💳 Setting Stripe as payment method');
          setSelectedPaymentMethod('stripe');
        } else if (settings.paymentProvider === 'raiffeisen') {
          console.log('💳 Setting Raiffeisen as payment method');
          setSelectedPaymentMethod('raiffeisen');
        } else if (settings.paymentProvider === 'both') {
          // If both are enabled, we can show selection or default to one
          // For now, defaulting to Raiffeisen for general users
          console.log('💳 Both providers enabled, defaulting to Raiffeisen');
          setSelectedPaymentMethod('raiffeisen');
        } else {
          // Fallback: if no valid provider is set, default to Raiffeisen
          console.log('💳 No valid provider found, defaulting to Raiffeisen');
          setSelectedPaymentMethod('raiffeisen');
        }
      } else {
        // If settings API fails, default to Raiffeisen
        console.log('💳 Settings API failed, defaulting to Raiffeisen');
        setSelectedPaymentMethod('raiffeisen');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return ticketSelections.reduce((sum, ticket) => sum + (ticket.price * ticket.quantity), 0);
  };

  const getTotalTickets = () => {
    return ticketSelections.reduce((sum, ticket) => sum + ticket.quantity, 0);
  };

  const handleStripeCheckout = async () => {
    if (!event) return;

    setBookingLoading(true);

    try {
      const ticketSelectionsMap = ticketSelections.reduce((acc, ticket) => {
        acc[ticket.ticketName] = ticket.quantity;
        return acc;
      }, {} as { [key: string]: number });

      const response = await fetch(`/api/events/${event._id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketSelections: ticketSelectionsMap
        })
      });

      const data = await response.json();

      if (response.ok && data.paymentIntent) {
        setPaymentIntentData({
          clientSecret: data.paymentIntent.client_secret,
          orderSummary: data.orderSummary
        });
        setShowStripePayment(true);
      } else {
        alert(`❌ Booking Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating Stripe booking:', error);
      alert('❌ Network error. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleRaiffeisenCheckout = async () => {
    if (!event) return;

    setBookingLoading(true);

    try {
      const tickets = ticketSelections.map(ticket => ({
        ticketId: ticket.ticketId,
        quantity: ticket.quantity
      }));

      const response = await fetch(`/api/events/${event._id}/book-raiffeisen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tickets })
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Raiffeisen Bank payment page
        window.location.href = data.paymentUrl;
      } else {
        alert(`❌ Booking Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating Raiffeisen booking:', error);
      alert('❌ Network error. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Payment successful, redirect to success page
    const bookingReference = paymentIntentData?.orderSummary?.bookingReference;

    // Optionally update booking status immediately (fallback before webhook)
    if (bookingReference) {
      try {
        await fetch(`/api/bookings/${bookingReference}/confirm-payment`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.warn('Failed to immediately update booking status:', error);
        // Don't fail the flow if this fails - webhook will handle it
      }
    }

    setShowStripePayment(false);
    setPaymentIntentData(null);

    if (bookingReference) {
      router.push(`/booking-success?bookingId=${bookingReference}`);
    } else {
      // Fallback if no booking reference found
      router.push('/booking-success');
    }
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    alert(`❌ Payment failed: ${error}`);
    setShowStripePayment(false);
    setPaymentIntentData(null);
  };

  if (!isLoaded) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto text-white animate-spin" />
            <h1 className="text-2xl font-bold text-white mt-4">Loading...</h1>
            <p className="text-white/80 mt-2">Preparing your checkout...</p>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  // Redirect to sign-in if user is not authenticated
  if (isLoaded && !isSignedIn) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-lg p-8 shadow-xl">
              <h1 className="text-2xl font-bold text-white mb-4">Please Login or Sign Up</h1>
              <p className="text-white/80 mb-6">You need to be signed in to proceed with payment and complete your booking.</p>
              <div className="space-y-3">
                <Link href="/auth/signin" className="block">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" className="block">
                  <Button variant="outline" className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20">
                    Sign Up
                  </Button>
                </Link>
              </div>
              <div className="mt-4 pt-4 border-t border-white/30">
                <Link href={`/events/${searchParams.get('eventId')}`}>
                  <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Event
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto text-white animate-spin" />
            <h1 className="text-2xl font-bold text-white mt-4">Loading...</h1>
            <p className="text-white/80 mt-2">Preparing your checkout...</p>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  if (error || !event) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Error</h1>
            <p className="text-white/80 mt-2">{error || 'Checkout data not found'}</p>
            <Link href="/events">
              <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  if (showStripePayment && paymentIntentData) {
    return (
      <BackgroundWrapper>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <Button
                onClick={() => {
                  setShowStripePayment(false);
                  setPaymentIntentData(null);
                }}
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Payment Selection
              </Button>
            </div>
            <StripePayment
              clientSecret={paymentIntentData.clientSecret}
              orderSummary={paymentIntentData.orderSummary}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href={`/events/${event._id}`}>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Event
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-white">Checkout</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Event Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-white">{event.title}</h3>
                  <div className="text-sm text-white/80 space-y-1">
                    <p>📅 {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                    <p>📍 {event.venue ? `${event.venue}, ` : ''}{event.location}</p>
                  </div>
                </div>

                {/* Tickets */}
                <div className="space-y-3">
                  <h4 className="font-medium text-white">Tickets</h4>
                  <div className="space-y-2">
                    {ticketSelections.map((ticket, index) => (
                      <div key={index} className="flex justify-between items-center py-2 px-3 bg-white/10 rounded">
                        <div>
                          <div className="text-sm font-medium text-white">{ticket.ticketName}</div>
                          <div className="text-xs text-white/70">Qty: {ticket.quantity}</div>
                        </div>
                        <div className="text-sm font-medium text-white">
                          {formatPrice(ticket.price * ticket.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-white/30 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-lg font-bold text-white">Total</div>
                      <div className="text-sm text-white/80">{getTotalTickets()} ticket(s)</div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {formatPrice(getTotalAmount())}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Settings-based payment method display */}
                {paymentSettings?.paymentProvider === 'both' && (
                  <div className="space-y-4">
                    <h4 className="text-white font-medium">Choose your payment method:</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => setSelectedPaymentMethod('stripe')}
                        className={`w-full p-4 rounded-lg border text-left transition-colors ${selectedPaymentMethod === 'stripe'
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/80 hover:bg-white/20'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-6 w-6" />
                            <div>
                              <div className="font-medium">Stripe</div>
                              <div className="text-sm opacity-80">Credit/Debit Card</div>
                            </div>
                          </div>
                          <div className="text-2xl">💳</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setSelectedPaymentMethod('raiffeisen')}
                        className={`w-full p-4 rounded-lg border text-left transition-colors ${selectedPaymentMethod === 'raiffeisen'
                          ? 'border-purple-500 bg-purple-500/20 text-white'
                          : 'border-white/30 bg-white/10 text-white/80 hover:bg-white/20'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-6 w-6" />
                            <div>
                              <div className="font-medium">Raiffeisen Bank Kosovo</div>
                              <div className="text-sm opacity-80">Bank Transfer</div>
                            </div>
                          </div>
                          <div className="text-2xl">🏦</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Single payment method display */}
                {paymentSettings?.paymentProvider !== 'both' && selectedPaymentMethod && (
                  <div className="space-y-4">
                    <h4 className="text-white font-medium">Available Payment Method:</h4>
                    <div className="p-4 rounded-lg border border-purple-500 bg-purple-500/20 text-white">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedPaymentMethod === 'stripe' ? (
                            <>
                              <CreditCard className="h-6 w-6" />
                              <div>
                                <div className="font-medium">Stripe</div>
                                <div className="text-sm opacity-80">Credit/Debit Card</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <Building2 className="h-6 w-6" />
                              <div>
                                <div className="font-medium">Raiffeisen Bank Kosovo</div>
                                <div className="text-sm opacity-80">Bank Transfer</div>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="text-2xl">{selectedPaymentMethod === 'stripe' ? '💳' : '🏦'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                <div className="pt-4">
                  {selectedPaymentMethod === 'stripe' && (
                    <Button
                      onClick={handleStripeCheckout}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
                      disabled={bookingLoading}
                    >
                      {bookingLoading ? 'Processing...' : `Continue with Stripe - ${formatPrice(getTotalAmount())}`}
                    </Button>
                  )}

                  {selectedPaymentMethod === 'raiffeisen' && (
                    <Button
                      onClick={handleRaiffeisenCheckout}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
                      disabled={bookingLoading}
                    >
                      {bookingLoading ? 'Processing...' : `Continue with Raiffeisen Bank - ${formatPrice(getTotalAmount())}`}
                    </Button>
                  )}

                  {paymentSettings?.paymentProvider === 'both' && !selectedPaymentMethod && (
                    <div className="text-center text-white/70 text-sm">
                      Please select a payment method above
                    </div>
                  )}

                  {!selectedPaymentMethod && paymentSettings?.paymentProvider !== 'both' && (
                    <div className="text-center text-white/70 text-sm">
                      Loading payment options...
                      <br />
                      <small>Payment provider: {paymentSettings?.paymentProvider || 'not loaded'}</small>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto text-white animate-spin" />
            <h1 className="text-2xl font-bold text-white mt-4">Loading...</h1>
            <p className="text-white/80 mt-2">Preparing your checkout...</p>
          </div>
        </div>
      </BackgroundWrapper>
    }>
      <CheckoutContent />
    </Suspense>
  );
}