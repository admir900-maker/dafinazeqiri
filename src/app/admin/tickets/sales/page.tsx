'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Mail, ChevronDown, ChevronRight, X } from 'lucide-react';

interface TicketItem {
  bookingId: string;
  bookingReference: string;
  customerName?: string;
  customerEmail?: string;
  ticketId?: string;
  ticketPrice: number;
  createdAt: string;
}

interface TicketGroup {
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  ticketName: string;
  count: number;
  revenue: number;
  items?: TicketItem[];
}

export default function SoldTicketsPage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<TicketGroup[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [eventId, setEventId] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Custom email states
  const [showCustomEmailDialog, setShowCustomEmailDialog] = useState(false);
  const [showCustomEmailGroupDialog, setShowCustomEmailGroupDialog] = useState(false);
  const [customEmailText, setCustomEmailText] = useState('');
  const [customEmailBookingId, setCustomEmailBookingId] = useState<string | null>(null);
  const [customEmailGroup, setCustomEmailGroup] = useState<TicketGroup | null>(null);
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (eventId) params.append('eventId', eventId);
      if (startDate) {
        // Start of day local to ISO
        const start = new Date(startDate + 'T00:00:00');
        params.append('startDate', start.toISOString());
      }
      if (endDate) {
        // End of day local to ISO
        const end = new Date(endDate + 'T23:59:59');
        params.append('endDate', end.toISOString());
      }
      params.append('includeDetails', 'true');
      const res = await fetch(`/api/admin/tickets/sales?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load sold tickets');

      let list: TicketGroup[] = data.groups || [];
      if (search) {
        const term = search.toLowerCase();
        list = list.filter(
          (g) =>
            g.eventTitle.toLowerCase().includes(term) ||
            g.ticketName.toLowerCase().includes(term)
        );
      }
      setGroups(list);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) fetchSales();
  }, [isLoaded, user, eventId]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const resend = async (bookingId: string) => {
    try {
      setResendingId(bookingId);
      const res = await fetch(`/api/admin/bookings/${bookingId}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend');
      setMessage('Tickets resent successfully');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setResendingId(null);
    }
  };

  const resendGroup = async (g: TicketGroup) => {
    if (!g.items || g.items.length === 0) return;
    try {
      const ids = Array.from(new Set(g.items.map((t) => t.bookingId)));
      setMessage(`Resending ${ids.length} booking(s)...`);
      for (const id of ids) {
        setResendingId(id);
        const res = await fetch(`/api/admin/bookings/${id}/resend`, { method: 'POST' });
        // Consume JSON to avoid body leak
        try { await res.json(); } catch { }
      }
      setMessage(`Resend complete for ${ids.length} booking(s).`);
    } catch (e: any) {
      setMessage(e.message || 'Bulk resend failed');
    } finally {
      setResendingId(null);
    }
  };

  const openCustomEmailDialog = (bookingId: string) => {
    setCustomEmailBookingId(bookingId);
    setCustomEmailText('');
    setShowCustomEmailDialog(true);
  };

  const openCustomEmailGroupDialog = (group: TicketGroup) => {
    setCustomEmailGroup(group);
    setCustomEmailText('');
    setShowCustomEmailGroupDialog(true);
  };

  const sendCustomEmail = async () => {
    if (!customEmailText.trim() || !customEmailBookingId) return;
    try {
      setSendingCustomEmail(true);
      const res = await fetch(`/api/admin/bookings/${customEmailBookingId}/send-custom-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customMessage: customEmailText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send custom email');
      setMessage('Custom email sent successfully');
      setShowCustomEmailDialog(false);
      setCustomEmailText('');
      setCustomEmailBookingId(null);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSendingCustomEmail(false);
    }
  };

  const sendCustomEmailToGroup = async () => {
    if (!customEmailText.trim() || !customEmailGroup || !customEmailGroup.items || customEmailGroup.items.length === 0) return;
    try {
      setSendingCustomEmail(true);
      const ids = Array.from(new Set(customEmailGroup.items.map((t) => t.bookingId)));
      setMessage(`Sending custom email to ${ids.length} booking(s)...`);
      
      for (const id of ids) {
        const res = await fetch(`/api/admin/bookings/${id}/send-custom-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customMessage: customEmailText })
        });
        try { await res.json(); } catch { }
      }
      
      setMessage(`Custom email sent to ${ids.length} booking(s)`);
      setShowCustomEmailGroupDialog(false);
      setCustomEmailText('');
      setCustomEmailGroup(null);
    } catch (e: any) {
      setMessage(e.message || 'Bulk custom email failed');
    } finally {
      setSendingCustomEmail(false);
    }
  };

  const exportCSV = () => {
    // Build CSV for current, visible groups and their loaded items
    const rows: string[] = [];
    rows.push(['Event', 'Event Date', 'Ticket Name', 'Booking Ref', 'Customer', 'Email', 'Price', 'Sold At'].join(','));
    for (const g of groups) {
      const evt = g.eventTitle?.replaceAll('"', '""') || '';
      const tname = g.ticketName?.replaceAll('"', '""') || '';
      if (!g.items || g.items.length === 0) {
        rows.push([`"${evt}"`, `"${formatDateTime(g.eventDate)}"`, `"${tname}"`, '', '', '', g.revenue.toFixed(2), ''].join(','));
        continue;
      }
      for (const it of g.items) {
        const cust = (it.customerName || '').replaceAll('"', '""');
        const email = (it.customerEmail || '').replaceAll('"', '""');
        rows.push([
          `"${evt}"`,
          `"${formatDateTime(g.eventDate)}"`,
          `"${tname}"`,
          `"${it.bookingReference}"`,
          `"${cust}"`,
          `"${email}"`,
          it.ticketPrice.toFixed(2),
          `"${formatDateTime(it.createdAt)}"`,
        ].join(','));
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sold-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (d?: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', hour12: false });
  };

  const formatCurrency = (n: number) => `€${n.toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sold Tickets</h1>
          <p className="text-gray-600">All confirmed and paid tickets grouped by ticket type</p>
        </div>

        {/* Filters */}
        <AdminCard>
          <AdminCardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by event or ticket name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start date</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End date</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <Button variant="outline" onClick={fetchSales}>
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => { setSearch(''); setEventId(''); setStartDate(''); setEndDate(''); fetchSales(); }}>Clear</Button>
                <Button onClick={exportCSV}>Export CSV</Button>
              </div>
            </div>
          </AdminCardContent>
        </AdminCard>

        {message && (
          <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-yellow-800">{message}</div>
        )}

        {/* Groups */}
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>Ticket sales</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-600">
                <RefreshCw className="h-5 w-5 animate-spin mr-2 text-blue-600" /> Loading sold tickets...
              </div>
            ) : groups.length === 0 ? (
              <div className="py-10 text-center text-gray-600">No sold tickets found.</div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => {
                  const key = `${g.eventId}:${g.ticketName}`;
                  const isOpen = !!expanded[key];
                  return (
                    <div key={key} className="border rounded-md bg-white">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                        onClick={() => setExpanded((prev) => ({ ...prev, [key]: !isOpen }))}
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <div>
                            <div className="font-semibold text-gray-900">{g.ticketName}</div>
                            <div className="text-sm text-gray-600">{g.eventTitle} · {formatDateTime(g.eventDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className="bg-blue-100 text-blue-800 border-0">{g.count} sold</Badge>
                          <div className="font-semibold">{formatCurrency(g.revenue)}</div>
                          {g.items && g.items.length > 0 && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-700 border-blue-700 hover:bg-blue-50"
                                onClick={(e) => { e.stopPropagation(); resendGroup(g); }}
                                disabled={!!resendingId}
                              >
                                {resendingId ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Resending all
                                  </>
                                ) : (
                                  <>
                                    <Mail className="h-4 w-4 mr-2" /> Resend all
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-purple-700 border-purple-700 hover:bg-purple-50"
                                onClick={(e) => { e.stopPropagation(); openCustomEmailGroupDialog(g); }}
                                disabled={!!resendingId || sendingCustomEmail}
                              >
                                <Mail className="h-4 w-4 mr-2" /> Send Custom to All
                              </Button>
                            </div>
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Booking Ref</th>
                                  <th className="text-left p-2">Customer</th>
                                  <th className="text-left p-2">Email</th>
                                  <th className="text-left p-2">Price</th>
                                  <th className="text-left p-2">Sold at</th>
                                  <th className="text-left p-2">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(g.items || []).map((t) => (
                                  <tr key={`${t.bookingId}:${t.ticketId}`} className="border-b hover:bg-gray-50">
                                    <td className="p-2">{t.bookingReference}</td>
                                    <td className="p-2">{t.customerName || '—'}</td>
                                    <td className="p-2">{t.customerEmail || '—'}</td>
                                    <td className="p-2">{formatCurrency(t.ticketPrice)}</td>
                                    <td className="p-2">{formatDateTime(t.createdAt)}</td>
                                    <td className="p-2">
                                      <div className="flex gap-2">
                                        <Button
                                          onClick={() => resend(t.bookingId)}
                                          size="sm"
                                          variant="outline"
                                          className="text-blue-700 border-blue-700 hover:bg-blue-50"
                                          disabled={resendingId === t.bookingId}
                                        >
                                          {resendingId === t.bookingId ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <>
                                              <Mail className="h-4 w-4 mr-1" /> Resend
                                            </>
                                          )}
                                        </Button>
                                        <Button
                                          onClick={() => openCustomEmailDialog(t.bookingId)}
                                          size="sm"
                                          variant="outline"
                                          className="text-purple-700 border-purple-700 hover:bg-purple-50"
                                          disabled={!!resendingId || sendingCustomEmail}
                                        >
                                          <Mail className="h-4 w-4 mr-1" /> Send Custom
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </AdminCardContent>
        </AdminCard>

        {/* Custom Email Dialog (Single Booking) */}
        {showCustomEmailDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Send Custom Email</h2>
                  <button
                    onClick={() => {
                      setShowCustomEmailDialog(false);
                      setCustomEmailText('');
                      setCustomEmailBookingId(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-gray-600 mb-4">
                  Enter your custom message below. This will be sent as a standalone message (tickets will NOT be included).
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Message
                  </label>
                  <textarea
                    value={customEmailText}
                    onChange={(e) => setCustomEmailText(e.target.value)}
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your custom message here..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCustomEmailDialog(false);
                      setCustomEmailText('');
                      setCustomEmailBookingId(null);
                    }}
                    disabled={sendingCustomEmail}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendCustomEmail}
                    disabled={!customEmailText.trim() || sendingCustomEmail}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {sendingCustomEmail ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" /> Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Email Dialog (Group) */}
        {showCustomEmailGroupDialog && customEmailGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Send Custom Email to All</h2>
                  <button
                    onClick={() => {
                      setShowCustomEmailGroupDialog(false);
                      setCustomEmailText('');
                      setCustomEmailGroup(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-gray-600 mb-2">
                  This will send a custom email to <strong>{customEmailGroup.items?.length || 0}</strong> booking(s) for:
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <div className="font-semibold text-blue-900">{customEmailGroup.ticketName}</div>
                  <div className="text-sm text-blue-700">{customEmailGroup.eventTitle}</div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Message
                  </label>
                  <textarea
                    value={customEmailText}
                    onChange={(e) => setCustomEmailText(e.target.value)}
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your custom message here..."
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCustomEmailGroupDialog(false);
                      setCustomEmailText('');
                      setCustomEmailGroup(null);
                    }}
                    disabled={sendingCustomEmail}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendCustomEmailToGroup}
                    disabled={!customEmailText.trim() || sendingCustomEmail}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {sendingCustomEmail ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" /> Send to All
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
