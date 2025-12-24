'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AdminCard, AdminCardHeader, AdminCardTitle, AdminCardContent } from '@/components/ui/admin-card';
import { Loader2, Gift, RefreshCw, Send, Download } from 'lucide-react';

interface GiftTicket {
  _id: string;
  recipientEmail: string;
  customerName?: string;
  ticketType: string;
  price: number;
  currency: string;
  ticketId: string;
  bookingReference: string;
  status: string;
  isValidated?: boolean;
  validatedAt?: string;
  validatedBy?: string;
  createdAt: string;
  sentAt?: string;
  eventDate?: string;
  eventTitle?: string;
  eventTime?: string;
  eventVenue?: string;
  eventLocation?: string;
}

export default function GiftTicketsPage() {
  const [tickets, setTickets] = useState<GiftTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, sent: 0, validated: 0 });
  const [filterEventDate, setFilterEventDate] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<GiftTicket | null>(null);

  // Form state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [ticketType, setTicketType] = useState('VIP Gift');
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('EUR');
  const [quantity, setQuantity] = useState('1');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/gift?limit=50', { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`List error ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      setTickets(data.tickets || []);

      // Fetch stats separately
      const statsRes = await fetch('/api/admin/gift/stats', { headers: { 'Accept': 'application/json' } });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !customerName || !ticketType || !price || !eventTitle || !eventDate || !eventTime) return;
    try {
      setCreating(true);
      setError(null);
      const res = await fetch('/api/admin/gift/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          customerName,
          ticketType,
          price: parseFloat(price),
          currency,
          quantity: parseInt(quantity) || 1,
          eventTitle,
          eventDate,
          eventTime,
          eventVenue,
          eventLocation,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `Create failed ${res.status}`);
      setRecipientEmail('');
      setCustomerName('');
      setPrice('0');
      setQuantity('1');
      setEventTitle('');
      setEventDate('');
      setEventTime('');
      setEventVenue('');
      setEventLocation('');
      await fetchTickets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  // Filter tickets by event date
  const filteredTickets = filterEventDate
    ? tickets.filter(t => {
      if (!t.eventDate) return false;
      const ticketDate = new Date(t.eventDate).toLocaleDateString('en-CA'); // YYYY-MM-DD format
      return ticketDate === filterEventDate;
    })
    : tickets;

  // Calculate filtered statistics
  const filteredStats = {
    total: filteredTickets.length,
    sent: filteredTickets.filter(t => t.status === 'sent').length,
    validated: filteredTickets.filter(t => t.isValidated).length
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/admin/gift/export', { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gift-tickets-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      alert('Failed to export: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2"><Gift className="w-7 h-7 text-[#cd7f32]" /> Gift Tickets</h1>
          <p className="text-gray-600">Generate and email standalone gift tickets (not part of normal bookings).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={fetchTickets} disabled={loading} className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Create Gift Ticket */}
      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>Create Gift Ticket</AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input
                type="text"
                required
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Concert, Party, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Time</label>
                <input
                  type="time"
                  required
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input
                  type="text"
                  value={eventVenue}
                  onChange={(e) => setEventVenue(e.target.value)}
                  placeholder="Venue name (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="City, Country (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Type</label>
                <input
                  type="text"
                  required
                  value={ticketType}
                  onChange={(e) => setTicketType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input
                  type="text"
                  required
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={creating} className="bg-[#cd7f32] hover:bg-[#b4530a]">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {creating ? 'Generating...' : 'Generate & Send'}
              </Button>
            </div>
          </form>
        </AdminCardContent>
      </AdminCard>

      {/* List */}
      <AdminCard>
        <AdminCardHeader>
          <div className="flex items-center justify-between">
            <AdminCardTitle>Recent Gift Tickets</AdminCardTitle>
            <div className="flex gap-4 text-sm">
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold">
                Total: {stats.total}
              </div>
              <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg font-semibold">
                Sent: {stats.sent}
              </div>
              <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg font-semibold">
                Validated: {stats.validated}
              </div>
              {filterEventDate && (
                <>
                  <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg font-semibold">
                    Filtered: {filteredStats.total}
                  </div>
                  <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg font-semibold">
                    Filtered Sent: {filteredStats.sent}
                  </div>
                </>
              )}
            </div>
          </div>
        </AdminCardHeader>
        <AdminCardContent>
          {/* Filter Section */}
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Event Date</label>
                <input
                  type="date"
                  value={filterEventDate}
                  onChange={(e) => setFilterEventDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {filterEventDate && (
                <button
                  onClick={() => setFilterEventDate('')}
                  className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium"
                >
                  Clear Filter
                </button>
              )}
              <div className="ml-auto text-sm text-gray-600">
                Showing {filteredTickets.length} of {tickets.length} tickets
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600"><Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin" />Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No gift tickets yet.</div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No gift tickets found for the selected event date.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Event Title</th>
                    <th className="px-3 py-2 text-left">Event Date</th>
                    <th className="px-3 py-2 text-left">Recipient</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-left">Currency</th>
                    <th className="px-3 py-2 text-left">Ticket ID</th>
                    <th className="px-3 py-2 text-left">Reference</th>
                    <th className="px-3 py-2 text-left">Email Status</th>
                    <th className="px-3 py-2 text-left">Validated</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    <th className="px-3 py-2 text-left">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map(t => (
                    <tr key={t._id} className="border-t border-gray-200 hover:bg-gray-100 cursor-pointer" onClick={() => setSelectedTicket(t)}>
                      <td className="px-3 py-2 font-medium text-gray-900">{t.eventTitle || '-'}</td>
                      <td className="px-3 py-2 text-gray-700">{t.eventDate ? new Date(t.eventDate).toLocaleDateString('en-GB') : '-'}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{t.recipientEmail}</td>
                      <td className="px-3 py-2 text-gray-700">{t.ticketType}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{t.price.toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-700">{t.currency}</td>
                      <td className="px-3 py-2 text-gray-700">{t.ticketId}</td>
                      <td className="px-3 py-2 text-gray-700">{t.bookingReference}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${t.status === 'sent' ? 'bg-green-100 text-green-700' : t.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${t.isValidated ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {t.isValidated && t.validatedAt ? `✓ ${new Date(t.validatedAt).toLocaleDateString()}` : 'Not used'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{new Date(t.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-600">{t.sentAt ? new Date(t.sentAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCardContent>
      </AdminCard>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Ticket Details</h2>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Event Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Event Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Event Title</p>
                    <p className="text-lg font-medium text-gray-900">{selectedTicket.eventTitle || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Event Date</p>
                    <p className="text-lg font-medium text-gray-900">{selectedTicket.eventDate ? new Date(selectedTicket.eventDate).toLocaleDateString('en-GB') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Event Time</p>
                    <p className="text-lg font-medium text-gray-900">{selectedTicket.eventTime || '-'}</p>
                  </div>
                  {selectedTicket.eventVenue && (
                    <div>
                      <p className="text-sm text-gray-600">Venue</p>
                      <p className="text-lg font-medium text-gray-900">{selectedTicket.eventVenue}</p>
                    </div>
                  )}
                  {selectedTicket.eventLocation && (
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="text-lg font-medium text-gray-900">{selectedTicket.eventLocation}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recipient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Customer Name</p>
                    <p className="text-lg font-medium text-gray-900">{selectedTicket.customerName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="text-lg font-medium text-gray-900">{selectedTicket.recipientEmail}</p>
                  </div>
                </div>
              </div>

              {/* Ticket Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Ticket Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Ticket ID</p>
                    <p className="text-lg font-medium text-gray-900 font-mono">{selectedTicket.ticketId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking Reference</p>
                    <p className="text-lg font-medium text-gray-900 font-mono">{selectedTicket.bookingReference}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ticket Type</p>
                    <p className="text-lg font-medium text-gray-900">{selectedTicket.ticketType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="text-lg font-medium text-gray-900">{selectedTicket.price.toFixed(2)} {selectedTicket.currency}</p>
                  </div>
                </div>
              </div>

              {/* Status Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email Status</p>
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${selectedTicket.status === 'sent' ? 'bg-green-100 text-green-700' : selectedTicket.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Validation Status</p>
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-semibold ${selectedTicket.isValidated ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {selectedTicket.isValidated ? `✓ Validated (${new Date(selectedTicket.validatedAt || '').toLocaleDateString()})` : 'Not validated'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-40 text-sm text-gray-600">Created</div>
                    <p className="text-gray-900">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedTicket.sentAt && (
                    <div className="flex items-center">
                      <div className="w-40 text-sm text-gray-600">Sent</div>
                      <p className="text-gray-900">{new Date(selectedTicket.sentAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedTicket.validatedAt && (
                    <div className="flex items-center">
                      <div className="w-40 text-sm text-gray-600">Validated</div>
                      <p className="text-gray-900">{new Date(selectedTicket.validatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setSelectedTicket(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-900"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}