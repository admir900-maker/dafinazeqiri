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
  Calendar
} from 'lucide-react';
import { AdminCard, AdminCardHeader, AdminCardTitle, AdminCardContent } from '@/components/ui/admin-card';
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
  createdAt: string;
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
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      refunded: { color: 'bg-gray-100 text-gray-800', icon: RefreshCw }
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
      pending: { color: 'bg-orange-100 text-orange-800' },
      paid: { color: 'bg-green-100 text-green-800' },
      failed: { color: 'bg-red-100 text-red-800' },
      refunded: { color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[paymentStatus as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge className={`${config.color} border-0`}>
        {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
      </Badge>
    );
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Management</h1>
          <p className="text-gray-600">Manage all event bookings and reservations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <AdminCard>
            <AdminCardContent className="flex items-center p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-4">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900">{pagination?.total || 0}</p>
                </div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="flex items-center p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Confirmed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                </div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="flex items-center p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg mr-4">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bookings.filter(b => b.status === 'pending').length}
                  </p>
                </div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="flex items-center p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-4">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${bookings.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + b.totalAmount, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </AdminCardContent>
          </AdminCard>
        </div>

        {/* Filters */}
        <AdminCard className="mb-6">
          <AdminCardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by booking reference, customer name, or event..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  setCurrentPage(1);
                  fetchBookings();
                }}
                variant="outline"
                className="px-4"
              >
                <Search className="h-4 w-4 mr-2" />
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
                className="px-4"
              >
                Clear Filters
              </Button>
            </div>
          </AdminCardContent>
        </AdminCard>

        {/* Message Display */}
        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        {/* Bookings Table */}
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Bookings ({pagination?.total || 0})
            </AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                <span>Loading bookings...</span>
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-500">No bookings match your current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Booking</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Event</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Payment</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{booking.bookingReference}</p>
                            <p className="text-sm text-gray-500">{booking.ticketCount} tickets</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {booking.customerName || booking.userDetails?.firstName + ' ' + booking.userDetails?.lastName || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {booking.customerEmail || booking.userDetails?.email || 'No email'}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{booking.eventTitle || booking.event?.title || 'Unknown Event'}</p>
                            {booking.event?.date && (
                              <p className="text-sm text-gray-500">
                                {new Date(booking.event.date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">
                            ${booking.totalAmount.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-500">{booking.currency || 'USD'}</p>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(booking.status)}
                        </td>
                        <td className="py-3 px-4">
                          {getPaymentStatusBadge(booking.paymentStatus)}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-gray-900">
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
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                {updating === booking._id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            )}

                            <Button
                              onClick={() => deleteBooking(booking._id)}
                              disabled={updating === booking._id}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
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
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {bookings.length} of {pagination.total} bookings
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={!pagination.hasPrev}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                    disabled={!pagination.hasNext}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </AdminCardContent>
        </AdminCard>
      </div>
    </div>
  );
}