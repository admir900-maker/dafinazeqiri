'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  DollarSign,
  Users,
  Calendar,
  Undo2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Booking {
  _id: string;
  bookingReference: string;
  customerName?: string;
  customerEmail?: string;
  eventTitle?: string;
  ticketCount: number;
  totalAmount: number;
  currency?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'stripe' | 'raiffeisen' | 'direct';
  raiffeisenPaymentId?: string;
  raiffeisenTransactionId?: string;
  createdAt: string;
  refundAmount?: number;
  refundedAt?: string;
  refundReason?: string;
  event?: {
    title: string;
    date: string;
  };
  userDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    imageUrl?: string;
  };
}

interface BookingsResponse {
  bookings: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function BookingManagementPage() {
  const { user, isLoaded } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<BookingsResponse['pagination'] | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching bookings...');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentStatusFilter) params.append('paymentStatus', paymentStatusFilter);

      const response = await fetch(`/api/admin/bookings?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data: BookingsResponse = await response.json();
      console.log('✅ Found', data.bookings.length, 'bookings');

      setBookings(data.bookings);
      setPagination(data.pagination);
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      setMessage('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string, paymentStatus?: string) => {
    try {
      setUpdating(bookingId);
      console.log('📝 Updating booking:', bookingId, 'to status:', status);

      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          ...(paymentStatus && { paymentStatus })
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking');
      }

      console.log('✅ Booking updated successfully');
      setMessage(`Booking ${status} successfully`);
      await fetchBookings();
    } catch (error) {
      console.error('❌ Error updating booking:', error);
      setMessage('Failed to update booking');
    } finally {
      setUpdating(null);
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    try {
      setUpdating(bookingId);
      console.log('🗑️ Cancelling booking:', bookingId);

      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      console.log('✅ Booking cancelled successfully');
      setMessage('Booking cancelled successfully');
      await fetchBookings();
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      setMessage('Failed to cancel booking');
    } finally {
      setUpdating(null);
    }
  };

  const initiateRefund = (booking: Booking) => {
    setSelectedBooking(booking);
    setRefundAmount(booking.totalAmount.toString());
    setRefundReason('');
    setShowRefundModal(true);
  };

  const processRefund = async () => {
    if (!selectedBooking) return;

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setMessage('Invalid refund amount');
      return;
    }

    if (amount > selectedBooking.totalAmount) {
      setMessage(`Refund amount cannot exceed ${selectedBooking.totalAmount} ${selectedBooking.currency || 'EUR'}`);
      return;
    }

    try {
      setUpdating(selectedBooking._id);
      console.log('🔄 Processing refund for booking:', selectedBooking.bookingReference);

      const response = await fetch(`/api/admin/bookings/${selectedBooking._id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          reason: refundReason || 'Refund requested by admin',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to process refund');
      }

      const result = await response.json();
      console.log('✅ Refund processed successfully:', result);

      setMessage(`Refund of €${amount} processed successfully`);
      setShowRefundModal(false);
      setSelectedBooking(null);
      setRefundAmount('');
      setRefundReason('');
      await fetchBookings();
    } catch (error) {
      console.error('❌ Error processing refund:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to process refund');
    } finally {
      setUpdating(null);
    }
  };

  const resendTickets = async (bookingId: string) => {
    try {
      setResendingId(bookingId);
      const response = await fetch(`/api/admin/bookings/${bookingId}/resend`, {
        method: 'POST'
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to resend tickets');
      }
      setMessage('Tickets resent successfully');
    } catch (error) {
      console.error('❌ Error resending tickets:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to resend tickets');
    } finally {
      setResendingId(null);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchBookings();
    }
  }, [isLoaded, user, currentPage, statusFilter, paymentStatusFilter]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-orange-500/20 text-orange-500', icon: Clock },
      confirmed: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
      cancelled: { color: 'bg-red-500/20 text-red-400', icon: AlertCircle },
      refunded: { color: 'bg-orange-100/10 text-orange-100/70', icon: RefreshCw }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusConfig = {
      pending: { color: 'bg-orange-500/20 text-orange-500' },
      paid: { color: 'bg-green-500/20 text-green-400' },
      failed: { color: 'bg-red-500/20 text-red-400' },
      refunded: { color: 'bg-orange-100/10 text-orange-100/70' }
    };

    const config = statusConfig[paymentStatus as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge className={`${config.color} border-0`}>
        {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
      </Badge>
    );
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900 mb-2">Booking Management</h1>
          </div>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-orange-100/70">Loading bookings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600">Access denied. Please sign in.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900 mb-2">Booking Management</h1>
          <p className="text-orange-100/70">Manage all event bookings and reservations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-500/20 rounded-lg mr-4">
                  <Calendar className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-100/70">Total Bookings</p>
                  <p className="text-2xl font-black text-orange-500">{pagination?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-500/20 rounded-lg mr-4">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-100/70">Confirmed</p>
                  <p className="text-2xl font-black text-orange-500">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-500/20 rounded-lg mr-4">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-100/70">Pending</p>
                  <p className="text-2xl font-black text-orange-500">
                    {bookings.filter(b => b.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-500/20 rounded-lg mr-4">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-100/70">Revenue</p>
                  <p className="text-2xl font-black text-orange-500">
                    €{bookings.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + b.totalAmount, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-black/60 border-2 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500/50 h-4 w-4" />
                  <Input
                    placeholder="Search by booking reference, customer name, or event..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-orange-500/30 bg-black/60 text-orange-100 placeholder:text-orange-100/40 focus:border-orange-500"
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  setCurrentPage(1);
                  fetchBookings();
                }}
                variant="outline"
                className="px-4 border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
              >
                <Search className="h-4 w-4 mr-2 text-orange-500" />
                Search
              </Button>

              <Button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPaymentStatusFilter('');
                  setCurrentPage(1);
                  fetchBookings();
                }}
                variant="outline"
                className="px-4 border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Message Display */}
        {message && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-md">
            <p className="text-orange-100">{message}</p>
          </div>
        )}

        {/* Bookings Table */}
        <Card className="bg-black/60 border-2 border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-orange-500">
              <Users className="h-5 w-5" />
              All Bookings ({pagination?.total || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-orange-500 mr-2" />
                <span className="text-orange-100">Loading bookings...</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-orange-500/50 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-orange-100 mb-2">No bookings found</h3>
                <p className="text-orange-100/50">No bookings match your current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-orange-500/30">
                      <th className="text-left py-3 px-4 font-bold text-orange-500">Booking</th>
                      <th className="text-left py-3 px-4 font-bold text-orange-500">Customer</th>
                      <th className="text-left py-3 px-4 font-bold text-orange-500">Event</th>
                      <th className="text-left py-3 px-4 font-bold text-orange-500">Amount</th>
                      <th className="text-left py-3 px-4 font-bold text-orange-500">Status</th>
                      <th className="text-left py-3 px-4 font-bold text-orange-500">Payment</th>
                      <th className="text-left py-3 px-4 font-bold text-orange-500">Date</th>
                      <th className="text-left py-3 px-4 font-bold text-orange-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking._id} className="border-b border-orange-500/20 hover:bg-orange-500/10">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-orange-100">{booking.bookingReference}</p>
                            <p className="text-sm text-orange-100/50">{booking.ticketCount} tickets</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-orange-100">
                              {booking.customerName || booking.userDetails?.firstName + ' ' + booking.userDetails?.lastName || 'Unknown'}
                            </p>
                            <p className="text-sm text-orange-100/50">
                              {booking.customerEmail || booking.userDetails?.email || 'No email'}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-orange-100">{booking.eventTitle || booking.event?.title || 'Unknown Event'}</p>
                            {booking.event?.date && (
                              <p className="text-sm text-orange-100/50">
                                {new Date(booking.event.date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-orange-100">
                            €{booking.totalAmount.toFixed(2)}
                          </p>
                          <p className="text-sm text-orange-100/50">{booking.currency || 'EUR'}</p>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(booking.status)}
                        </td>
                        <td className="py-3 px-4">
                          {getPaymentStatusBadge(booking.paymentStatus)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-orange-100">
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {booking.status === 'pending' && (
                              <Button
                                onClick={() => updateBookingStatus(booking._id, 'confirmed', 'paid')}
                                disabled={updating === booking._id}
                                size="sm"
                                variant="outline"
                                className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                                title="Confirm booking"
                              >
                                {updating === booking._id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            {booking.paymentStatus === 'paid' &&
                              booking.status !== 'refunded' &&
                              booking.paymentMethod === 'raiffeisen' && (
                                <Button
                                  onClick={() => initiateRefund(booking)}
                                  disabled={updating === booking._id}
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                                  title="Issue refund"
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                              )}

                            {booking.status === 'confirmed' && booking.paymentStatus === 'paid' && (
                              <Button
                                onClick={() => resendTickets(booking._id)}
                                disabled={resendingId === booking._id}
                                size="sm"
                                variant="outline"
                                className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                                title="Resend tickets via email"
                              >
                                {resendingId === booking._id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MailIcon />
                                )}
                              </Button>
                            )}

                            <Button
                              onClick={() => deleteBooking(booking._id)}
                              disabled={updating === booking._id}
                              size="sm"
                              variant="outline"
                              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                              title="Cancel booking"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-orange-500/20">
                <div className="text-sm text-orange-100/70">
                  Showing {bookings.length} of {pagination.total} bookings
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={!pagination.hasPrev}
                    variant="outline"
                    size="sm"
                    className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-orange-100/70">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={!pagination.hasNext}
                    variant="outline"
                    size="sm"
                    className="border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refund Modal */}
        {showRefundModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-950 border-2 border-orange-500/50 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-black text-orange-500 mb-4">Issue Refund</h3>

              <div className="mb-4 p-4 bg-black/60 border border-orange-500/30 rounded-md">
                <p className="text-sm text-orange-100/70">Booking: <span className="font-medium text-orange-100">{selectedBooking.bookingReference}</span></p>
                <p className="text-sm text-orange-100/70">Customer: <span className="font-medium text-orange-100">{selectedBooking.customerName || selectedBooking.customerEmail}</span></p>
                <p className="text-sm text-orange-100/70">Original Amount: <span className="font-medium text-orange-100">€{selectedBooking.totalAmount.toFixed(2)}</span></p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-orange-100/70 mb-2">
                  Refund Amount (EUR)
                </label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  min="0"
                  max={selectedBooking.totalAmount}
                  step="0.01"
                  placeholder="Enter refund amount"
                  className="w-full border-2 border-orange-500/30 bg-black/60 text-orange-100 focus:border-orange-500"
                />
                <p className="text-xs text-orange-100/50 mt-1">
                  Maximum: €{selectedBooking.totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-orange-100/70 mb-2">
                  Reason for Refund
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter reason for refund (optional)"
                  className="w-full px-3 py-2 border-2 border-orange-500/30 bg-black/60 text-orange-100 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none placeholder:text-orange-100/40"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedBooking(null);
                    setRefundAmount('');
                    setRefundReason('');
                  }}
                  variant="outline"
                  className="flex-1 border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={processRefund}
                  disabled={!refundAmount || parseFloat(refundAmount) <= 0 || updating === selectedBooking._id}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                >
                  {updating === selectedBooking._id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Undo2 className="h-4 w-4 mr-2" />
                      Issue Refund
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M1.5 6.75A2.25 2.25 0 013.75 4.5h16.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 17.25V6.75zm2.818-.75a.75.75 0 00-.568 1.26l6.75 6.75a1.5 1.5 0 002.122 0l6.75-6.75a.75.75 0 00-.568-1.26H4.318z" />
    </svg>
  );
}