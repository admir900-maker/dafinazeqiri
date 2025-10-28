'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { QrCode, Download, Calendar, MapPin, Ticket, Clock, CreditCard, CheckCircle, XCircle, AlertCircle, Wallet, Smartphone, Mail } from 'lucide-react';
import { BackgroundWrapper } from '@/components/ui/background-wrapper';

interface BookingTicket {
  ticketId: string;
  ticketName: string;
  qrCode: string;
  price: number;
  isUsed: boolean;
  usedAt?: string;
  validatedBy?: string;
}

interface EventInfo {
  _id: string;
  title: string;
  date: string;
  endDate: string;
  location: string;
  venue: string;
  address: string;
  city: string;
  country: string;
  posterImage: string;
  category: string;
  status: string;
}

interface Booking {
  _id: string;
  bookingReference: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  totalAmount: number;
  currency: string;
  paymentMethod: 'stripe' | 'direct';
  createdAt: string;
  confirmedAt?: string;
  emailSent: boolean;
  notes?: string;
  tickets: BookingTicket[];
  event: EventInfo;
}

export default function BookingsPage() {
  const { user, isLoaded } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<{ booking: Booking; ticket: BookingTicket } | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchBookings();
    }
  }, [isLoaded, user]);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings');
      const data = await response.json();

      if (data.success) {
        setBookings(data.bookings);
      } else {
        setError(data.error || 'Failed to load bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'refunded':
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'pending':
        return 'Pending Payment';
      case 'cancelled':
        return 'Cancelled';
      case 'refunded':
        return 'Refunded';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-orange-100 text-orange-900';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const downloadQRCode = (qrCode: string, ticketId: string) => {
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `ticket-${ticketId}.png`;
    link.click();
  };

  const addToWallet = async (bookingId: string, ticketId: string, walletType: 'apple' | 'google') => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/tickets/${ticketId}/wallet/${walletType}`);
      const data = await response.json();

      if (data.success) {
        // Show informative dialog with setup instructions
        const platformName = walletType === 'apple' ? 'Apple Wallet' : 'Google Pay';
        const instructions = data.instructions;

        let message = `${platformName} Integration Status:\n\n`;
        message += `Current Status: ${data.currentStatus}\n\n`;
        message += `Setup Requirements:\n`;
        instructions.requirements.forEach((req: string, index: number) => {
          message += `${index + 1}. ${req}\n`;
        });
        message += `\nRequired Environment Variables:\n`;
        instructions.envVars.forEach((envVar: string) => {
          message += `• ${envVar}\n`;
        });
        message += `\nThe wallet pass structure is ready and can be integrated once the platform-specific setup is completed.`;

        alert(message);
      } else {
        alert('Failed to generate wallet pass. Please try again.');
      }
    } catch (error) {
      console.error('Error adding to wallet:', error);
      alert('Failed to add to wallet. Please try again.');
    }
  };

  const sendConfirmationEmail = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/send-email`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        alert(`Confirmation email sent successfully to ${data.emailAddress}`);
        fetchBookings(); // Refresh to update emailSent status
      } else {
        alert(data.error || 'Failed to send email. Please try again.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    }
  };

  if (!isLoaded || loading) {
    return (
      <BackgroundWrapper fullHeight={true}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/90 drop-shadow-md">Loading your bookings...</p>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  if (!user) {
    return (
      <BackgroundWrapper fullHeight={true}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4 drop-shadow-md">Please Sign In</h1>
            <p className="text-white/90 mb-6 drop-shadow-sm">You need to be signed in to view your bookings.</p>
            <Link href="/auth/signin" className="bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/40 transition-colors border border-white/40">
              Sign In
            </Link>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  if (error) {
    return (
      <BackgroundWrapper fullHeight={true}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <XCircle className="w-16 h-16 text-white/80 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4 drop-shadow-md">Error Loading Bookings</h1>
            <p className="text-white/90 mb-6 drop-shadow-sm">{error}</p>
            <button
              onClick={fetchBookings}
              className="bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-lg hover:bg-white/40 transition-colors border border-white/40"
            >
              Try Again
            </button>
          </div>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper fullHeight={false}>
      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
                My Bookings
              </h1>
              <p className="text-white/90 max-w-2xl mx-auto drop-shadow-md">
                View and manage all your event tickets. Download QR codes, check booking status, and access your digital tickets.
              </p>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-16">
                <Ticket className="w-24 h-24 text-gray-400 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4">No Bookings Found</h2>
                <p className="text-gray-600 mb-8">You haven&apos;t booked any tickets yet. Start exploring events!</p>
                <Link href="/events" className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Browse Events
                </Link>
              </div>
            ) : (
              <div className="grid gap-6">
                {bookings.map((booking) => (
                  <div key={booking._id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                    <div className="p-6">
                      {/* Booking Header */}
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
                        <div className="flex items-center gap-4 mb-4 lg:mb-0">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden">
                            <Image
                              src={booking.event.posterImage}
                              alt={booking.event.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">{booking.event.title}</h3>
                            <p className="text-gray-600">Booking #{booking.bookingReference}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)} flex items-center gap-1`}>
                            {getStatusIcon(booking.status)}
                            {getStatusText(booking.status)}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-800">
                              {booking.totalAmount.toFixed(2)} {booking.currency}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-1 justify-end">
                              <CreditCard className="w-4 h-4" />
                              {booking.paymentMethod}
                            </p>
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => sendConfirmationEmail(booking._id)}
                                className={`mt-2 text-xs px-3 py-1 rounded-full transition-colors flex items-center gap-1 ${booking.emailSent
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  }`}
                              >
                                <Mail className="w-3 h-3" />
                                {booking.emailSent ? 'Resend Email' : 'Send Email'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(booking.event.date), 'PPp')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{booking.event.venue}, {booking.event.city}</span>
                        </div>
                      </div>

                      {/* Tickets */}
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Ticket className="w-5 h-5" />
                          Your Tickets ({booking.tickets.length})
                        </h4>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {booking.tickets.map((ticket, index) => (
                            <div key={ticket.ticketId} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-800">{ticket.ticketName}</span>
                                <span className="text-sm font-bold text-purple-600">
                                  {ticket.price.toFixed(2)} {booking.currency}
                                </span>
                              </div>

                              <div className="mb-3">
                                <div className="text-xs text-gray-500 mb-1">Ticket ID</div>
                                <div className="text-sm font-mono text-gray-700">{ticket.ticketId.slice(0, 8)}...</div>
                              </div>

                              {ticket.isUsed ? (
                                <div className="text-center py-2">
                                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                                  <p className="text-sm text-green-600 font-medium">Used</p>
                                  {ticket.usedAt && (
                                    <p className="text-xs text-gray-500">
                                      {format(new Date(ticket.usedAt), 'PPp')}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setSelectedTicket({ booking, ticket })}
                                      className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <QrCode className="w-4 h-4" />
                                      View QR
                                    </button>
                                    <button
                                      onClick={() => downloadQRCode(ticket.qrCode, ticket.ticketId)}
                                      className="bg-gray-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => addToWallet(booking._id, ticket.ticketId, 'apple')}
                                      className="flex-1 bg-black text-white py-2 px-3 rounded-lg text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Wallet className="w-4 h-4" />
                                      Apple Wallet
                                    </button>
                                    <button
                                      onClick={() => addToWallet(booking._id, ticket.ticketId, 'google')}
                                      className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Smartphone className="w-4 h-4" />
                                      Google Pay
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Booking Info */}
                      <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
                        <div className="flex flex-wrap gap-4">
                          <span>Booked: {format(new Date(booking.createdAt), 'PPp')}</span>
                          {booking.confirmedAt && (
                            <span>Confirmed: {format(new Date(booking.confirmedAt), 'PPp')}</span>
                          )}
                          {booking.notes && (
                            <span className="text-red-600">Note: {booking.notes}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QR Code Modal */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {selectedTicket.ticket.ticketName}
                </h3>
                <p className="text-gray-600 mb-4">{selectedTicket.booking.event.title}</p>

                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 mb-4">
                  <Image
                    src={selectedTicket.ticket.qrCode}
                    alt="QR Code"
                    width={200}
                    height={200}
                    className="mx-auto"
                  />
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Show this QR code at the event entrance for validation
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => downloadQRCode(selectedTicket.ticket.qrCode, selectedTicket.ticket.ticketId)}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BackgroundWrapper>
  );
}