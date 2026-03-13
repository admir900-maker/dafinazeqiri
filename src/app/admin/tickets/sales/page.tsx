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
  capacity: number | null;
  availableTickets: number | null;
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
  const [includePastEvents, setIncludePastEvents] = useState(false);
  const [groupByEmail, setGroupByEmail] = useState(true);

  // Custom email states
  const [showCustomEmailDialog, setShowCustomEmailDialog] = useState(false);
  const [showCustomEmailGroupDialog, setShowCustomEmailGroupDialog] = useState(false);
  const [customEmailText, setCustomEmailText] = useState('');
  const [customEmailBookingId, setCustomEmailBookingId] = useState<string | null>(null);
  const [customEmailGroup, setCustomEmailGroup] = useState<TicketGroup | null>(null);
  const [sendingCustomEmail, setSendingCustomEmail] = useState(false);

  // Customer detail popup state
  const [customerDetailPopup, setCustomerDetailPopup] = useState<{
    name: string;
    email: string;
    tickets: number;
    spent: number;
    items: TicketItem[];
    eventTitle: string;
    eventDate: string | null;
    ticketName: string;
  } | null>(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (eventId) params.append('eventId', eventId);
      if (includePastEvents) params.append('includePastEvents', 'true');
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
      params.append('perGroupLimit', '10000');
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
  }, [isLoaded, user, eventId, includePastEvents]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const resendForCustomer = async (items: TicketItem[]) => {
    try {
      const ids = Array.from(new Set(items.map((t) => t.bookingId)));
      setMessage(`Resending tickets for ${ids.length} booking(s)...`);
      for (const id of ids) {
        setResendingId(id);
        const res = await fetch(`/api/admin/bookings/${id}/resend`, { method: 'POST' });
        try { await res.json(); } catch { }
      }
      setMessage(`Resend complete for ${ids.length} booking(s).`);
    } catch (e: any) {
      setMessage(e.message || 'Resend failed');
    } finally {
      setResendingId(null);
    }
  };

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

  // Compute event-level summary groups
  interface EventSummary {
    eventId: string;
    eventTitle: string;
    eventDate: string | null;
    totalSold: number;
    totalRevenue: number;
    ticketTypes: { name: string; sold: number; capacity: number | null; available: number | null; revenue: number }[];
    groups: TicketGroup[];
  }

  const eventSummaries: EventSummary[] = (() => {
    const map = new Map<string, EventSummary>();
    for (const g of groups) {
      let ev = map.get(g.eventId);
      if (!ev) {
        ev = { eventId: g.eventId, eventTitle: g.eventTitle, eventDate: g.eventDate, totalSold: 0, totalRevenue: 0, ticketTypes: [], groups: [] };
        map.set(g.eventId, ev);
      }
      ev.totalSold += g.count;
      ev.totalRevenue += g.revenue;
      ev.ticketTypes.push({ name: g.ticketName, sold: g.count, capacity: g.capacity, available: g.availableTickets, revenue: g.revenue });
      ev.groups.push(g);
    }
    return Array.from(map.values());
  })();

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
                <Button variant="outline" onClick={() => { setSearch(''); setEventId(''); setStartDate(''); setEndDate(''); setIncludePastEvents(false); fetchSales(); }}>Clear</Button>
                <Button onClick={exportCSV}>Export CSV</Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includePastEvents}
                  onChange={(e) => setIncludePastEvents(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show past events
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none ml-4">
                <input
                  type="checkbox"
                  checked={groupByEmail}
                  onChange={(e) => setGroupByEmail(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Group by email
              </label>
            </div>
          </AdminCardContent>
        </AdminCard>

        {message && (
          <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-yellow-800">{message}</div>
        )}

        {/* Event Summaries & Groups */}
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>Ticket sales</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-600">
                <RefreshCw className="h-5 w-5 animate-spin mr-2 text-amber-700" /> Loading sold tickets...
              </div>
            ) : eventSummaries.length === 0 ? (
              <div className="py-10 text-center text-gray-600">No sold tickets found.</div>
            ) : (
              <div className="space-y-4">
                {eventSummaries.map((ev) => {
                  const evKey = `event:${ev.eventId}`;
                  const evOpen = !!expanded[evKey];
                  const totalCapacity = ev.ticketTypes.reduce((sum, tt) => sum + (tt.capacity || 0), 0);
                  const totalAvailable = ev.ticketTypes.reduce((sum, tt) => sum + (tt.available ?? 0), 0);
                  return (
                    <div key={evKey} className="border border-amber-200 rounded-lg overflow-hidden">
                      {/* Event Master Header */}
                      <button
                        className="w-full flex items-center justify-between px-5 py-4 text-left bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors"
                        onClick={() => setExpanded((prev) => ({ ...prev, [evKey]: !evOpen }))}
                      >
                        <div className="flex items-center gap-3">
                          {evOpen ? <ChevronDown className="h-5 w-5 text-amber-700" /> : <ChevronRight className="h-5 w-5 text-amber-700" />}
                          <div>
                            <div className="text-lg font-bold text-gray-900">{ev.eventTitle}</div>
                            <div className="text-sm text-gray-600">{formatDateTime(ev.eventDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Sold</div>
                            <div className="font-bold text-amber-800">{ev.totalSold}{totalCapacity > 0 ? ` / ${totalCapacity}` : ''}</div>
                          </div>
                          {totalCapacity > 0 && (
                            <div className="text-right">
                              <div className="text-xs text-gray-500 uppercase tracking-wider">Available</div>
                              <div className="font-bold text-green-700">{totalAvailable}</div>
                            </div>
                          )}
                          <div className="text-right">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Revenue</div>
                            <div className="font-bold text-gray-900">{formatCurrency(ev.totalRevenue)}</div>
                          </div>
                        </div>
                      </button>

                      {/* Ticket Type Summary Bar */}
                      <div className="px-5 py-2 bg-white border-t border-amber-100 flex flex-wrap gap-3">
                        {ev.ticketTypes.map((tt) => (
                          <div key={tt.name} className="flex items-center gap-1.5 text-sm">
                            <span className="font-medium text-gray-700">{tt.name}:</span>
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-semibold">{tt.sold} sold</span>
                            {tt.capacity != null && (
                              <span className="text-gray-400 text-xs">/ {tt.capacity}</span>
                            )}
                            {tt.available != null && tt.available > 0 && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">{tt.available} left</span>
                            )}
                            {tt.available != null && tt.available === 0 && (
                              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">Sold out</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Expanded: Individual Ticket Type Groups */}
                      {evOpen && (
                        <div className="border-t border-amber-100 bg-white">
                          <div className="space-y-2 p-4">
                            {ev.groups.map((g) => {
                              const key = `${g.eventId}:${g.ticketName}`;
                              const isOpen = !!expanded[key];
                              return (
                                <div key={key} className="border border-gray-200 rounded-md bg-white">
                                  <button
                                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpanded((prev) => ({ ...prev, [key]: !isOpen }))}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isOpen ? <ChevronDown className="h-4 w-4 text-amber-600" /> : <ChevronRight className="h-4 w-4 text-amber-600" />}
                                      <div>
                                        <div className="font-semibold text-gray-900">{g.ticketName}</div>
                                        <div className="text-sm text-gray-500">
                                          {g.capacity != null && <span>{g.count} / {g.capacity} sold</span>}
                                          {g.availableTickets != null && <span> &middot; {g.availableTickets} remaining</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <Badge className="bg-amber-100 text-amber-800 border-0">{g.count} sold</Badge>
                                      <div className="font-semibold">{formatCurrency(g.revenue)}</div>
                                      {g.items && g.items.length > 0 && (
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-amber-700 border-amber-700 hover:bg-amber-50"
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
                                        {groupByEmail ? (() => {
                                          const emailMap = new Map<string, { name: string; email: string; tickets: number; spent: number; items: TicketItem[] }>();
                                          for (const item of g.items || []) {
                                            const email = (item.customerEmail || 'unknown').toLowerCase();
                                            let entry = emailMap.get(email);
                                            if (!entry) {
                                              entry = { name: item.customerName || '\u2014', email, tickets: 0, spent: 0, items: [] };
                                              emailMap.set(email, entry);
                                            }
                                            entry.tickets += 1;
                                            entry.spent += item.ticketPrice;
                                            entry.items.push(item);
                                          }
                                          const emailGroups = Array.from(emailMap.values()).sort((a, b) => b.spent - a.spent);
                                          return (
                                            <table className="w-full text-sm">
                                              <thead>
                                                <tr className="border-b">
                                                  <th className="text-left p-2">Customer</th>
                                                  <th className="text-left p-2">Email</th>
                                                  <th className="text-left p-2">Tickets</th>
                                                  <th className="text-left p-2">Total Spent</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {emailGroups.map((eg) => (
                                                  <tr
                                                    key={eg.email}
                                                    className="border-b hover:bg-amber-50 cursor-pointer transition-colors"
                                                    onClick={() => setCustomerDetailPopup({
                                                      ...eg,
                                                      eventTitle: g.eventTitle,
                                                      eventDate: g.eventDate,
                                                      ticketName: g.ticketName,
                                                    })}
                                                  >
                                                    <td className="p-2 font-medium">{eg.name}</td>
                                                    <td className="p-2">{eg.email}</td>
                                                    <td className="p-2">
                                                      <Badge className="bg-amber-100 text-amber-800 border-0">{eg.tickets}</Badge>
                                                    </td>
                                                    <td className="p-2 font-semibold">{formatCurrency(eg.spent)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          );
                                        })() : (
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
                                                  <td className="p-2">{t.customerName || '\u2014'}</td>
                                                  <td className="p-2">{t.customerEmail || '\u2014'}</td>
                                                  <td className="p-2">{formatCurrency(t.ticketPrice)}</td>
                                                  <td className="p-2">{formatDateTime(t.createdAt)}</td>
                                                  <td className="p-2">
                                                    <div className="flex gap-2">
                                                      <Button
                                                        onClick={() => resend(t.bookingId)}
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-amber-700 border-amber-700 hover:bg-amber-50"
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
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
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

        {/* Customer Detail Popup */}
        {customerDetailPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Customer Booking Details</h2>
                  <button
                    onClick={() => setCustomerDetailPopup(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Customer</div>
                      <div className="font-semibold text-gray-900">{customerDetailPopup.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Email</div>
                      <div className="font-semibold text-gray-900">{customerDetailPopup.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Event</div>
                      <div className="font-semibold text-gray-900">{customerDetailPopup.eventTitle}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Event Date</div>
                      <div className="font-semibold text-gray-900">{formatDateTime(customerDetailPopup.eventDate)}</div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex gap-4 mb-4">
                  <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-amber-800">{customerDetailPopup.tickets}</div>
                    <div className="text-sm text-amber-600">Ticket{customerDetailPopup.tickets !== 1 ? 's' : ''} Purchased</div>
                  </div>
                  <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-800">{formatCurrency(customerDetailPopup.spent)}</div>
                    <div className="text-sm text-green-600">Total Spent</div>
                  </div>
                  <div className="flex-1 bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-800">{customerDetailPopup.ticketName}</div>
                    <div className="text-sm text-purple-600">Ticket Type</div>
                  </div>
                </div>

                {/* Individual Tickets */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">Booking Details</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left p-2">Booking Ref</th>
                          <th className="text-left p-2">Price</th>
                          <th className="text-left p-2">Purchased At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerDetailPopup.items.map((item, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-mono text-xs">{item.bookingReference}</td>
                            <td className="p-2">{formatCurrency(item.ticketPrice)}</td>
                            <td className="p-2">{formatDateTime(item.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCustomerDetailPopup(null)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      resendForCustomer(customerDetailPopup.items);
                      setCustomerDetailPopup(null);
                    }}
                    disabled={!!resendingId}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {resendingId ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Resending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" /> Resend Tickets to {customerDetailPopup.email}
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
