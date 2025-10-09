'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Download, Mail } from 'lucide-react';
import Link from 'next/link';

interface Booking {
  _id: string;
  bookingReference: string;
  eventId: string;
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  customerEmail: string;
  customerName: string;
  tickets: Array<{
    ticketName: string;
    ticketId: string;
    price: number;
    qrCode: string;
  }>;
  createdAt: string;
  paymentDate?: string;
}

interface Event {
  _id: string;
  title: string;
  name: string;             // Keep for backward compatibility
  description: string;
  date: string;
  location: string;
  venue?: string;
  address?: string;
  city?: string;
  country?: string;
  image?: string;
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }

    fetchBookingDetails();
  }, [bookingId]);

  // Poll for booking updates if payment is still pending
  useEffect(() => {
    if (booking && booking.paymentStatus === 'pending' && pollingCount < 10) {
      const timer = setTimeout(() => {
        setPollingCount(prev => prev + 1);
        fetchBookingDetails();
      }, 3000); // Poll every 3 seconds

      return () => clearTimeout(timer);
    }
  }, [booking, pollingCount, bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      });
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }

      const data = await response.json();
      setBooking(data.booking);
      setEvent(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const downloadTickets = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download tickets');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `tickets-${booking?.bookingReference}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const resendConfirmationEmail = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/resend-email`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Confirmation email sent successfully!');
      } else {
        throw new Error('Failed to send email');
      }
    } catch (err) {
      alert('Failed to send confirmation email. Please try again.');
    }
  };

  const manuallyConfirmPayment = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings/${bookingId}/confirm-payment`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // Refresh booking details after confirmation
        await fetchBookingDetails();
        alert('✅ Payment confirmed successfully!');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to confirm payment');
      }
    } catch (err) {
      alert(`❌ Failed to confirm payment: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Clock className="h-12 w-12 mx-auto text-yellow-500 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">Loading...</h1>
            <p className="text-gray-600 mt-2">Fetching your booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking || !event) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">Error</h1>
            <p className="text-gray-600 mt-2">{error || 'Booking not found'}</p>
            <Link
              href="/events"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (booking.paymentStatus === 'paid') {
      return <CheckCircle className="h-12 w-12 mx-auto text-green-500" />;
    } else if (booking.paymentStatus === 'failed') {
      return <XCircle className="h-12 w-12 mx-auto text-red-500" />;
    } else {
      return <Clock className="h-12 w-12 mx-auto text-yellow-500" />;
    }
  };

  const getStatusMessage = () => {
    if (booking.paymentStatus === 'paid') {
      return {
        title: 'Booking Confirmed!',
        message: 'Your payment has been processed successfully and your tickets are ready.',
        color: 'text-green-600'
      };
    } else if (booking.paymentStatus === 'failed') {
      return {
        title: 'Payment Failed',
        message: 'There was an issue processing your payment. Please try again.',
        color: 'text-red-600'
      };
    } else {
      const isPolling = pollingCount > 0 && pollingCount < 10;
      return {
        title: 'Payment Pending',
        message: isPolling
          ? 'Checking payment status... You will receive a confirmation email shortly.'
          : 'Your payment is being processed. You will receive a confirmation email shortly.',
        color: 'text-yellow-600'
      };
    }
  };

  const status = getStatusMessage();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-8">
          {/* Status Header */}
          <div className="text-center mb-8">
            {getStatusIcon()}
            <h1 className={`text-2xl font-bold mt-4 ${status.color}`}>
              {status.title}
            </h1>
            <p className="text-gray-600 mt-2">{status.message}</p>

            {/* Manual Confirmation Button for Pending Payments */}
            {booking.paymentStatus === 'pending' && (
              <div className="mt-4">
                <button
                  onClick={manuallyConfirmPayment}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {loading ? 'Confirming...' : '✅ Confirm Payment Manually'}
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Click if your payment was successful but still shows as pending
                </p>
              </div>
            )}
          </div>

          {/* Booking Details */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Booking Reference</p>
                <p className="text-lg font-mono text-gray-900">{booking.bookingReference}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Payment Method</p>
                <p className="text-lg text-gray-900 capitalize">
                  {booking.paymentMethod === 'raiffeisen' ? 'Raiffeisen Bank' : booking.paymentMethod}
                </p>
              </div>
            </div>

            {/* 📅 Event Details */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📅 Event Details
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50 w-24">Event:</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{event.title || event.name || 'undefined'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Date:</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {event.date ? new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Invalid Date'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Venue:</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{event.venue || event.location || 'undefined'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-50">Address:</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{event.address || 'undefined'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 🎟️ Ticket Summary */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                🎟️ Ticket Summary
              </h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ticket Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Quantity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {booking.tickets.map((ticket, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{ticket.ticketName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">1</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{ticket.price.toFixed(2)} {booking.currency}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-medium">
                      <td className="px-4 py-3 text-sm text-gray-900">Total</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{booking.tickets.length}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{booking.totalAmount.toFixed(2)} {booking.currency}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 📱 Your Digital Tickets */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📱 Your Digital Tickets
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Show these QR codes at the event entrance. Each QR code is unique and can only be used once.
              </p>
              <div className="space-y-4">
                {booking.tickets.map((ticket, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{ticket.ticketName}</h4>
                      <span className="text-sm font-medium text-purple-600">
                        {ticket.price.toFixed(2)} {booking.currency}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="w-32 h-32 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                        <div className="text-xs text-gray-500">QR Code</div>
                      </div>
                      <p className="text-xs text-gray-600">Ticket: {ticket.ticketName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            {booking.paymentStatus === 'paid' && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={downloadTickets}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Tickets
                </button>
                <button
                  onClick={resendConfirmationEmail}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Email
                </button>
              </div>
            )}

            {booking.paymentStatus === 'failed' && (
              <div className="text-center">
                <Link
                  href={`/events/${event._id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Try Again
                </Link>
              </div>
            )}
          </div>

          {/* ⚠️ Important Information */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              ⚠️ Important Information
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• Arrive at least 90 minutes before the event starts</li>
                <li>• Bring a valid ID for verification</li>
                <li>• Keep your tickets secure and don't share QR codes</li>
                <li>• Screenshots of QR codes are accepted</li>
                <li>• Each ticket allows one entry only</li>
                <li>• Need help? Contact our support team</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-6 mt-8 text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact our support team
            </p>
            <p className="text-sm text-gray-600 mt-2">
              📧{' '}
              <a href="mailto:support@biletara.com" className="text-indigo-600 hover:text-indigo-500">
                support@biletara.com
              </a>
              {' | '}
              🌐{' '}
              <a href="https://biletara.com" className="text-indigo-600 hover:text-indigo-500">
                biletara.com
              </a>
            </p>
            <Link
              href="/events"
              className="mt-3 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
            >
              ← Browse More Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Clock className="h-12 w-12 mx-auto text-yellow-500 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">Loading...</h1>
            <p className="text-gray-600 mt-2">Fetching your booking details...</p>
          </div>
        </div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}