'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface PendingBooking {
  id: string;
  bookingReference: string;
  status: string;
  totalAmount: number;
  currency: string;
  ticketCount: number;
  userId: string;
  eventTitle: string;
  eventDate: string;
  createdAt: string;
  paymentIntentId: string | null;
}

export default function BookingManagementPage() {
  const { user, isLoaded } = useUser();
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPendingBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/pending-bookings');
      const data = await response.json();

      if (data.success) {
        setPendingBookings(data.bookings);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error fetching bookings: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = async (bookingId: string) => {
    try {
      setConfirming(bookingId);
      const response = await fetch('/api/admin/confirm-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Booking ${data.booking.bookingReference} confirmed successfully!`);
        await fetchPendingBookings(); // Refresh the list
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error confirming booking: ${error}`);
    } finally {
      setConfirming(null);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchPendingBookings();
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const userRole = user?.publicMetadata?.role as string;
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-600">Admin access required to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Booking Management</h1>
              <p className="text-gray-600">Manage pending bookings and confirm payments manually</p>
            </div>
            <button
              onClick={fetchPendingBookings}
              disabled={loading}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">{message}</p>
            <button
              onClick={() => setMessage(null)}
              className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Pending Bookings */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Pending Bookings ({pendingBookings.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : pendingBookings.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No pending bookings found!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Booking Reference</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Event</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Tickets</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">#{booking.bookingReference}</div>
                        <div className="text-sm text-gray-500">{booking.id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{booking.eventTitle}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(booking.eventDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">
                          {booking.totalAmount} {booking.currency.toUpperCase()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{booking.ticketCount}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          {new Date(booking.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => confirmBooking(booking.id)}
                          disabled={confirming === booking.id}
                          className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm"
                        >
                          {confirming === booking.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                              Confirming...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Confirm
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}