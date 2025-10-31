'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, Building2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BackgroundWrapper } from '@/components/ui/background-wrapper';
import { useCurrency } from '@/contexts/CurrencyContext';
import { activityLogger } from '@/lib/activityLogger';

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'raiffeisen'>('raiffeisen'); // Always RaiAccept
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

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

      // Log checkout started
      const totalAmount = parsedTickets.reduce((sum: number, ticket: any) => sum + (ticket.price * ticket.quantity), 0);
      activityLogger.logCheckoutStarted(totalAmount, 'EUR', {
        eventId,
        ticketSelections: parsedTickets,
        totalTickets: parsedTickets.reduce((sum: number, ticket: any) => sum + ticket.quantity, 0)
      });

      fetchEventAndSettings(eventId);
    } catch (err) {
      console.error('Error parsing tickets:', err);
      setError('Invalid checkout data');
      setLoading(false);

      // Log error
      activityLogger.logError('checkout_data_parse_failed', 'Failed to parse ticket data', {
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }, [searchParams, isLoaded]);

  const fetchEventAndSettings = async (eventId: string, retryCount = 0) => {
    try {
      // Fetch event details with retry logic
      const eventResponse = await fetch(`/api/events/${eventId}`);
      if (!eventResponse.ok) {
        // If event not found and we haven't retried too many times, retry
        if (retryCount < 5) {
          console.log(`⏳ Event not found, retrying in ${retryCount + 1} seconds... (attempt ${retryCount + 1}/5)`);
          setTimeout(() => fetchEventAndSettings(eventId, retryCount + 1), (retryCount + 1) * 1000);
          return;
        }
        throw new Error('Event not found after multiple attempts');
      }
      const eventData = await eventResponse.json();
      setEvent(eventData);

      // Log event view during checkout
      activityLogger.logEventView(
        eventData._id,
        eventData.title,
        { source: 'checkout_page' }
      );

      // Fetch payment settings
      const settingsResponse = await fetch('/api/payment-config');
      if (settingsResponse.ok) {
        const settings = await settingsResponse.json();
        setPaymentSettings(settings);

        // Always use RaiAccept payment method
        console.log('💳 Payment provider: RaiAccept (Raiffeisen Bank)');
        setSelectedPaymentMethod('raiffeisen');
        activityLogger.logPaymentMethodSelected('raiffeisen', getTotalAmount());
      } else {
        // If settings API fails, default to Raiffeisen
        console.log('💳 Settings API failed, defaulting to RaiAccept');
        setSelectedPaymentMethod('raiffeisen');
        activityLogger.logPaymentMethodSelected('raiffeisen', getTotalAmount());
      }
    } catch (err) {
      console.error('❌ Error fetching checkout data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load checkout data';
      console.error('Full error details:', {
        error: err,
        eventId: searchParams.get('eventId'),
        tickets: searchParams.get('tickets')
      });
      setError(errorMessage);
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

  const handleRaiffeisenCheckout = async () => {
    if (!event) return;

    setBookingLoading(true);

    // Log payment attempt
    activityLogger.logPaymentAttempted('raiffeisen', getTotalAmount(), 'EUR');

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
        // Log successful redirect to bank
        activityLogger.log({
          action: 'payment_redirect_successful',
          description: 'User redirected to Raiffeisen Bank payment page',
          eventId: event._id,
          eventTitle: event.title,
          amount: getTotalAmount(),
          currency: 'EUR',
          paymentMethod: 'raiffeisen',
          status: 'pending',
          metadata: {
            paymentUrl: data.paymentUrl,
            bookingReference: data.bookingReference
          }
        });

        // Redirect to Raiffeisen Bank payment page
        window.location.href = data.paymentUrl;
      } else {
        // Log payment failure
        activityLogger.logPaymentFailed('raiffeisen', getTotalAmount(), data.error, 'EUR');
        alert(`❌ Booking Failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating Raiffeisen booking:', error);

      // Log error
      activityLogger.logPaymentFailed(
        'raiffeisen',
        getTotalAmount(),
        error instanceof Error ? error.message : 'Network error',
        'EUR'
      );

      alert('❌ Network error. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // User authentication check
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
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-2xl font-bold text-white mb-4">Unable to Load Checkout</h1>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 mb-4">
              <p className="text-white/90 mb-2">{error || 'Checkout data not found'}</p>
              <p className="text-white/70 text-sm">
                The event you're trying to book may not be available. Please try again or select a different event.
              </p>
            </div>
            <Link href="/events">
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                Browse Events
              </Button>
            </Link>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  // Render checkout page - RaiAccept payment only
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
                {/* RaiAccept (Raiffeisen Bank) - Default Payment Method */}
                <div className="space-y-4">
                  <h4 className="text-white font-medium">Available Payment Method:</h4>
                  <div className="p-4 rounded-lg border border-purple-500 bg-purple-500/20 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-6 w-6" />
                        <div>
                          <div className="font-medium">Raiffeisen Bank Kosovo</div>
                          <div className="text-sm opacity-80">Secure Online Payment</div>
                        </div>
                      </div>
                      <div className="text-2xl">🏦</div>
                    </div>
                  </div>
                </div>

                {/* Continue Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleRaiffeisenCheckout}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-lg py-3"
                    disabled={bookingLoading}
                  >
                    {bookingLoading ? 'Processing...' : `Continue to Payment - ${formatPrice(getTotalAmount())}`}
                  </Button>
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