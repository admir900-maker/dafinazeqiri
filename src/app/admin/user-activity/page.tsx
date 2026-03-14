'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Activity, Search, Filter, RefreshCw, ChevronDown, ChevronUp,
  Eye, Clock, ShoppingBag, CreditCard, Users, Globe, MapPin,
  Smartphone, Monitor, Tablet, TrendingUp, BarChart3, PieChart as PieChartIcon,
  Calendar, FileText, ArrowUpDown, AlertTriangle, CheckCircle, XCircle,
  ChevronLeft, ChevronRight, Trash2, Download, Star, Mail,
  MousePointerClick, LogIn, LogOut, UserPlus, Share2, Heart,
  MessageSquare, Bell, Timer, Flag, ArrowDown, ArrowUp, Radio, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('@/components/admin/LiveMap'), { ssr: false });

// Country code to flag emoji
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const offset = 127397;
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + offset));
}

// Action display config
const ACTION_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  page_view: { label: 'Page View', color: '#3b82f6', icon: '👁️' },
  event_view: { label: 'Event View', color: '#8b5cf6', icon: '🎫' },
  ticket_selection: { label: 'Ticket Select', color: '#6366f1', icon: '🎟️' },
  add_to_cart: { label: 'Add to Cart', color: '#10b981', icon: '🛒' },
  remove_from_cart: { label: 'Remove Cart', color: '#ef4444', icon: '🗑️' },
  checkout_started: { label: 'Checkout', color: '#f59e0b', icon: '💳' },
  payment_method_selected: { label: 'Payment Method', color: '#f97316', icon: '💰' },
  payment_setup_successful: { label: 'Payment Setup', color: '#22c55e', icon: '✅' },
  payment_redirect_successful: { label: 'Pay Redirect', color: '#14b8a6', icon: '↗️' },
  payment_attempted: { label: 'Pay Attempt', color: '#eab308', icon: '⏳' },
  payment_successful: { label: 'Payment OK', color: '#22c55e', icon: '✅' },
  payment_failed: { label: 'Payment Fail', color: '#ef4444', icon: '❌' },
  booking_created: { label: 'Booking', color: '#06b6d4', icon: '📋' },
  booking_cancelled: { label: 'Cancel', color: '#f43f5e', icon: '🚫' },
  email_sent: { label: 'Email', color: '#a855f7', icon: '📧' },
  login: { label: 'Login', color: '#22d3ee', icon: '🔑' },
  logout: { label: 'Logout', color: '#94a3b8', icon: '🚪' },
  signup: { label: 'Sign Up', color: '#4ade80', icon: '👤' },
  search: { label: 'Search', color: '#60a5fa', icon: '🔍' },
  filter_applied: { label: 'Filter', color: '#818cf8', icon: '🔧' },
  download_ticket: { label: 'Download', color: '#2dd4bf', icon: '📥' },
  share_event: { label: 'Share', color: '#fb923c', icon: '📤' },
  favorite_added: { label: 'Fav Added', color: '#f472b6', icon: '❤️' },
  favorite_removed: { label: 'Fav Removed', color: '#9ca3af', icon: '💔' },
  review_submitted: { label: 'Review', color: '#fbbf24', icon: '⭐' },
  contact_form_submitted: { label: 'Contact', color: '#34d399', icon: '✉️' },
  newsletter_signup: { label: 'Newsletter', color: '#c084fc', icon: '📰' },
  error_occurred: { label: 'Error', color: '#dc2626', icon: '⚠️' },
};

const ACTION_GROUPS = [
  { label: 'Navigation', actions: ['page_view', 'event_view', 'search', 'filter_applied'] },
  { label: 'Cart & Purchase', actions: ['ticket_selection', 'add_to_cart', 'remove_from_cart', 'checkout_started'] },
  { label: 'Payment', actions: ['payment_method_selected', 'payment_setup_successful', 'payment_redirect_successful', 'payment_attempted', 'payment_successful', 'payment_failed'] },
  { label: 'Booking', actions: ['booking_created', 'booking_cancelled'] },
  { label: 'Account', actions: ['login', 'logout', 'signup'] },
  { label: 'Engagement', actions: ['download_ticket', 'share_event', 'favorite_added', 'favorite_removed', 'review_submitted', 'contact_form_submitted', 'newsletter_signup'] },
  { label: 'System', actions: ['email_sent', 'error_occurred'] },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CHART_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1', '#84cc16', '#e11d48'];

// Map region labels for zoom selector
const MAP_REGION_LABELS: Record<string, { label: string; flag: string }> = {
  world:          { label: 'World',     flag: '🌍' },
  europe:         { label: 'Europe',    flag: '🇪🇺' },
  eastern_europe: { label: 'E. Europe', flag: '🏔️' },
  balkans:        { label: 'Balkans',   flag: '⛰️' },
  americas:       { label: 'Americas',  flag: '🌎' },
  asia:           { label: 'Asia',      flag: '🌏' },
  middle_east:    { label: 'Mid East',  flag: '🕌' },
  africa:         { label: 'Africa',    flag: '🌍' },
};

export default function UserActivityPage() {
  const { user } = useUser();
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [browserFilter, setBrowserFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Panels
  const [showCharts, setShowCharts] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showGeo, setShowGeo] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showLiveMap, setShowLiveMap] = useState(false);

  // Live map
  const [mapMode, setMapMode] = useState<'live' | 'today' | 'historical'>('today');
  const [liveData, setLiveData] = useState<any>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const liveInterval = useRef<any>(null);
  const [livePulse, setLivePulse] = useState(0);
  const [mapZoom, setMapZoom] = useState<string>('world');

  // Drill-down
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  // Detail modal
  const [detailModal, setDetailModal] = useState<{ type: string; data: any } | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // User demographics from Clerk
  const [userDemographics, setUserDemographics] = useState<any[]>([]);
  const [loadingDemographics, setLoadingDemographics] = useState(false);

  const fetchLiveData = useCallback(async () => {
    try {
      setLiveLoading(true);
      const res = await fetch(`/api/admin/user-activity/live?mode=${mapMode}&minutes=5`);
      const data = await res.json();
      if (data.success) {
        setLiveData(data.data);
        setLivePulse(p => p + 1);
      }
    } catch (err) {
      console.error('Failed to fetch live data:', err);
    } finally {
      setLiveLoading(false);
    }
  }, [mapMode]);

  // Start/stop live polling
  useEffect(() => {
    if (showLiveMap) {
      fetchLiveData();
      // Poll every 8s for live and today modes (to catch new live connections)
      if (mapMode === 'live' || mapMode === 'today') {
        liveInterval.current = setInterval(fetchLiveData, 8000);
        return () => { if (liveInterval.current) clearInterval(liveInterval.current); };
      }
    }
    return () => { if (liveInterval.current) clearInterval(liveInterval.current); };
  }, [showLiveMap, mapMode, fetchLiveData]);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '50' });
      if (actionFilter) params.append('action', actionFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (deviceFilter) params.append('device', deviceFilter);
      if (browserFilter) params.append('browser', browserFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/admin/user-activity?${params}`);
      const data = await res.json();
      if (data.success) {
        setActivities(data.data.activities);
        setStats(data.data.statistics);
        setPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, actionFilter, statusFilter, deviceFilter, browserFilter, searchTerm, startDate, endDate]);

  const fetchDemographics = async () => {
    try {
      setLoadingDemographics(true);
      const res = await fetch('/api/admin/users?limit=100');
      const data = await res.json();
      if (data.users) setUserDemographics(data.users);
    } catch (err) {
      console.error('Failed to fetch demographics:', err);
    } finally {
      setLoadingDemographics(false);
    }
  };

  const fetchUserDetail = async (userId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/user-activity?userId=${encodeURIComponent(userId)}&limit=100`);
      const data = await res.json();
      if (data.success) setDetailData(data.data);
    } catch (err) {
      console.error('Failed to fetch user detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openUserDetail = (userId: string, name?: string, email?: string) => {
    const demo = userDemographics.find((u: any) => u.id === userId);
    setDetailModal({
      type: 'user',
      data: {
        userId,
        name: demo ? `${demo.firstName || ''} ${demo.lastName || ''}`.trim() : (name || ''),
        email: demo?.emailAddress || email || '',
        imageUrl: demo?.imageUrl,
        bookingStats: demo?.bookingStats,
      }
    });
    fetchUserDetail(userId);
  };

  const openCountryDetail = (countryData: any) => {
    const cities = (stats?.cityDetails || []).filter((c: any) => c._id?.country === countryData._id);
    const buyers = (stats?.topBuyersByLocation || []).filter((b: any) => b._id?.country === countryData._id);
    setDetailModal({ type: 'country', data: { ...countryData, cities, buyers } });
    setDetailData(null);
  };

  const openCityDetail = (cityData: any) => {
    const buyers = (stats?.topBuyersByLocation || []).filter(
      (b: any) => b._id?.city === cityData._id?.city && b._id?.country === cityData._id?.country
    );
    setDetailModal({ type: 'city', data: { ...cityData, buyers } });
    setDetailData(null);
  };

  const resolveUser = (userId: string, fallbackName?: string, fallbackEmail?: string) => {
    const demo = userDemographics.find((u: any) => u.id === userId);
    if (demo) return { name: `${demo.firstName || ''} ${demo.lastName || ''}`.trim(), email: demo.emailAddress, imageUrl: demo.imageUrl };
    if (fallbackName) return { name: fallbackName, email: fallbackEmail || '', imageUrl: null };
    if (fallbackEmail) return { name: fallbackEmail, email: fallbackEmail, imageUrl: null };
    return { name: userId?.slice(0, 12) + '...', email: '', imageUrl: null };
  };

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const resetFilters = () => {
    setActionFilter(''); setStatusFilter(''); setDeviceFilter('');
    setBrowserFilter(''); setSearchTerm(''); setStartDate(''); setEndDate('');
    setCurrentPage(1);
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const formatDuration = (ms: number) => {
    if (!ms) return '—';
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  // Get cities for selected country from cityDetails  
  const getCitiesForCountry = (country: string) => {
    if (!stats?.cityDetails) return [];
    return stats.cityDetails.filter((c: any) => c._id?.country === country);
  };

  // Conversion funnel data
  const getFunnelData = () => {
    if (!stats?.conversionFunnel) return [];
    const order = ['page_view', 'event_view', 'add_to_cart', 'checkout_started', 'payment_successful'];
    const funnelMap = new Map(stats.conversionFunnel.map((f: any) => [f._id, f.count]));
    return order.map(action => ({
      name: ACTION_CONFIG[action]?.label || action,
      count: funnelMap.get(action) || 0,
    }));
  };

  // Top days data  
  const getDayData = () => {
    if (!stats?.byDayOfWeek) return [];
    return stats.byDayOfWeek.map((d: any) => ({
      name: DAY_NAMES[d._id - 1] || `Day ${d._id}`,
      activities: d.count,
      users: d.uniqueUsers
    })).sort((a: any, b: any) => DAY_NAMES.indexOf(a.name) - DAY_NAMES.indexOf(b.name));
  };

  // Hour data
  const getHourData = () => {
    if (!stats?.byHourOfDay) return [];
    return stats.byHourOfDay.map((h: any) => ({
      name: `${h._id.toString().padStart(2, '0')}:00`,
      activities: h.count,
      users: h.uniqueUsers
    }));
  };

  // Month data
  const getMonthData = () => {
    if (!stats?.byMonth) return [];
    return stats.byMonth.map((m: any) => ({
      name: `${MONTH_NAMES[m._id.month - 1]} ${m._id.year}`,
      activities: m.count,
      users: m.uniqueUsers,
      revenue: m.revenue || 0
    })).reverse();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Activity className="h-7 w-7 text-orange-500" /> User Activity
          </h1>
          <p className="text-zinc-400 mt-1">
            {pagination ? `${pagination.totalCount.toLocaleString()} total activities` : 'Loading...'}
            {stats?.uniqueUsers ? ` • ${stats.uniqueUsers} unique users` : ''}
            {stats?.uniqueSessions ? ` • ${stats.uniqueSessions} sessions` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${showFilters ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            <Filter className="h-4 w-4" /> Filters
          </button>
          <button onClick={() => setShowCharts(!showCharts)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${showCharts ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            <BarChart3 className="h-4 w-4" /> Charts
          </button>
          <button onClick={() => { setShowInsights(!showInsights); if (!showInsights && userDemographics.length === 0) fetchDemographics(); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${showInsights ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            <TrendingUp className="h-4 w-4" /> Insights
          </button>
          <button onClick={() => { setShowGeo(!showGeo); if (!showGeo && userDemographics.length === 0) fetchDemographics(); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${showGeo ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            <Globe className="h-4 w-4" /> Geo & Users
          </button>
          <button onClick={() => setShowReports(!showReports)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${showReports ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            <FileText className="h-4 w-4" /> Reports
          </button>
          <button onClick={() => setShowTimeline(!showTimeline)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition ${showTimeline ? 'bg-orange-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            <Calendar className="h-4 w-4" /> Timeline
          </button>
          <button onClick={() => setShowLiveMap(!showLiveMap)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${showLiveMap ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            {showLiveMap && <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span></span>}
            <Radio className="h-4 w-4" /> Live Map
          </button>
          <button onClick={() => { setCurrentPage(1); fetchActivities(); }}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center gap-1 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Email, name, event..."
                  className="w-full pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Action</label>
              <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none">
                <option value="">All Actions</option>
                {ACTION_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.actions.map(a => (
                      <option key={a} value={a}>{ACTION_CONFIG[a]?.icon} {ACTION_CONFIG[a]?.label || a}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Status</label>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none">
                <option value="">All</option>
                <option value="success">✅ Success</option>
                <option value="failed">❌ Failed</option>
                <option value="pending">⏳ Pending</option>
                <option value="cancelled">🚫 Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Device</label>
              <select value={deviceFilter} onChange={e => { setDeviceFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none">
                <option value="">All</option>
                <option value="desktop">🖥️ Desktop</option>
                <option value="mobile">📱 Mobile</option>
                <option value="tablet">📟 Tablet</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Browser</label>
              <select value={browserFilter} onChange={e => { setBrowserFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none">
                <option value="">All</option>
                <option value="Chrome">Chrome</option>
                <option value="Safari">Safari</option>
                <option value="Firefox">Firefox</option>
                <option value="Edge">Edge</option>
                <option value="Opera">Opera</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">From</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">To</label>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none" />
            </div>
            <div className="flex items-end">
              <button onClick={resetFilters} className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-600 transition">
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charts Panel */}
      {showCharts && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Actions by Status Pie */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-orange-500" /> Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.byStatus?.filter((s: any) => s._id) || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80}
                  label={(props: any) => `${props._id}: ${(props.percent * 100).toFixed(0)}%`}>
                  {(stats.byStatus || []).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Device Distribution Pie */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-500" /> Device Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.byDevice?.filter((d: any) => d._id) || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80}
                  label={(props: any) => `${props._id}: ${(props.percent * 100).toFixed(0)}%`}>
                  {(stats.byDevice || []).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Browser Distribution Pie */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-500" /> Browser Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.byBrowser?.filter((b: any) => b._id) || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80}
                  label={(props: any) => `${props._id}: ${(props.percent * 100).toFixed(0)}%`}>
                  {(stats.byBrowser || []).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Actions Bar */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" /> Top Actions
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(stats.byAction || []).slice(0, 10).map((a: any) => ({
                name: ACTION_CONFIG[a._id]?.label || a._id,
                count: a.count
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Insights Panel */}
      {showInsights && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Conversion Funnel */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" /> Conversion Funnel
            </h3>
            {(() => {
              const funnelItems = getFunnelData();
              const maxFunnel = Math.max(...funnelItems.map((d: any) => Number(d.count)), 1);
              return funnelItems.map((step: any, i: number) => {
                const pct = Math.min(100, (Number(step.count) / maxFunnel) * 100).toFixed(1);
                return (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-300">{step.name}</span>
                      <span className="text-zinc-400">{step.count.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i] }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Referral Sources */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-blue-500" /> Referral Sources
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {(stats.byReferrer || []).map((r: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-300 truncate max-w-[200px]" title={r._id}>
                    {(() => { try { return new URL(r._id).hostname; } catch { return r._id; } })()}
                  </span>
                  <div className="flex gap-2 text-xs">
                    <span className="text-orange-400">{r.count} hits</span>
                    <span className="text-zinc-500">{r.uniqueUsers} users</span>
                  </div>
                </div>
              ))}
              {(!stats.byReferrer || stats.byReferrer.length === 0) && <p className="text-zinc-500 text-sm">No referral data</p>}
            </div>
          </div>

          {/* Entry Intents */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-green-500" /> Entry Intents
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(stats.entryIntents || []).map((e: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-300">{ACTION_CONFIG[e._id]?.icon} {ACTION_CONFIG[e._id]?.label || e._id}</span>
                  <span className="text-orange-400">{e.count} sessions</span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Active Users */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" /> Most Active Users
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(stats.topVisitors || []).map((v: any, i: number) => {
                const resolved = resolveUser(v._id, v.name, v.email);
                return (
                  <button key={i} onClick={() => openUserDetail(v._id, v.name, v.email)}
                    className="w-full flex justify-between items-center text-sm bg-zinc-800/50 rounded-lg px-3 py-2 hover:bg-zinc-700/50 transition cursor-pointer text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-orange-400 font-mono text-xs w-5">#{i + 1}</span>
                      {resolved.imageUrl && <img src={resolved.imageUrl} alt="" className="h-5 w-5 rounded-full flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-zinc-200 truncate text-xs font-medium">{resolved.name}</p>
                        {resolved.email && <p className="text-zinc-500 truncate text-[10px]">{resolved.email}</p>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-orange-400 font-semibold text-xs">{v.totalActions} actions</p>
                      <p className="text-zinc-500 text-[10px]">{formatDate(v.lastSeen)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top Browsed Events */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" /> Top Events
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(stats.topBrowsedEvents || []).map((e: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-300 truncate max-w-[180px]">{e._id}</span>
                  <div className="flex gap-2 text-xs">
                    <span className="text-orange-400">{e.views} views</span>
                    <span className="text-zinc-500">{e.uniqueViewers} users</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-500" /> Top Pages
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(stats.topPages || []).map((p: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-300 truncate max-w-[180px]">{p._id}</span>
                  <div className="flex gap-2 text-xs">
                    <span className="text-orange-400">{p.count} views</span>
                    <span className="text-zinc-500">{p.uniqueUsers} users</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Geo & Users Panel */}
      {showGeo && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Countries with drill-down */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 lg:col-span-2">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-orange-500" /> Traffic by Country
              <span className="text-zinc-500 text-xs ml-auto">Click to expand</span>
            </h3>
            <div className="space-y-1 max-h-[450px] overflow-y-auto pr-1">
              {(stats.countryDetails || stats.byCountry || []).map((c: any, i: number) => {
                const countryName = c._id;
                const code = c.countryCode;
                const isExpanded = selectedCountry === countryName;
                const cities = getCitiesForCountry(countryName);
                return (
                  <div key={i}>
                    <div onClick={() => setSelectedCountry(isExpanded ? null : countryName)}
                      className={`w-full flex items-center justify-between text-sm px-3 py-2.5 rounded-lg transition cursor-pointer ${isExpanded ? 'bg-orange-900/30 border border-orange-800/50' : 'bg-zinc-800/40 hover:bg-zinc-800'}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{countryCodeToFlag(code)}</span>
                        <span className="text-zinc-200 font-medium">{countryName}</span>
                        {c.purchases > 0 && <span className="text-green-400 text-xs">💰 {c.purchases} sales</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-orange-400">{c.count} hits</span>
                        <span className="text-zinc-500">{c.uniqueUsers} users</span>
                        {c.revenue > 0 && <span className="text-green-400">€{c.revenue?.toFixed(0)}</span>}
                        {c.citiesCount > 0 && <span className="text-zinc-600">{c.citiesCount} cities</span>}
                        <button onClick={(e) => { e.stopPropagation(); openCountryDetail(c); }} className="text-orange-400 hover:text-orange-300 transition px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700" title="View details">
                          📊
                        </button>
                        {isExpanded ? <ChevronUp className="h-3 w-3 text-zinc-400" /> : <ChevronDown className="h-3 w-3 text-zinc-400" />}
                      </div>
                    </div>
                    {isExpanded && cities.length > 0 && (
                      <div className="ml-8 mt-1 mb-2 space-y-1">
                        {cities.map((city: any, j: number) => (
                          <button key={j} onClick={() => openCityDetail(city)}
                            className="w-full flex items-center justify-between text-xs px-3 py-2 bg-zinc-800/60 rounded-lg hover:bg-zinc-700/60 transition cursor-pointer text-left">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-orange-400" />
                              <span className="text-zinc-300">{city._id?.city || 'Unknown'}</span>
                            </div>
                            <div className="flex gap-3">
                              <span className="text-orange-400">{city.count} hits</span>
                              <span className="text-zinc-500">{city.uniqueUsers} users</span>
                              {city.purchases > 0 && <span className="text-green-400">{city.purchases} sales (€{city.revenue?.toFixed(0)})</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {isExpanded && cities.length === 0 && (
                      <p className="ml-8 mt-1 mb-2 text-zinc-500 text-xs px-3">No city data available</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Buyers by Location */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-green-500" /> Top Buyers by Location
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(stats.topBuyersByLocation || []).map((b: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-sm bg-zinc-800/50 rounded-lg px-3 py-2">
                  <span className="text-zinc-300 truncate">
                    <MapPin className="h-3 w-3 inline mr-1 text-orange-400" />
                    {b._id?.city || 'Unknown'}, {b._id?.country || ''}
                  </span>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-400">€{b.totalSpent?.toFixed(0)}</span>
                    <span className="text-zinc-500">{b.transactions} txns</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Overview */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Monitor className="h-4 w-4 text-blue-500" /> Platform Overview
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{stats.uniqueUsers || 0}</p>
                <p className="text-zinc-500 text-xs">Total Users</p>
              </div>
              <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.uniqueSessions || 0}</p>
                <p className="text-zinc-500 text-xs">Sessions</p>
              </div>
              <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-400">€{(stats.totalRevenue || 0).toFixed(0)}</p>
                <p className="text-zinc-500 text-xs">Revenue</p>
              </div>
              <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{formatDuration(stats.avgSessionDuration?.avgDuration || 0)}</p>
                <p className="text-zinc-500 text-xs">Avg Session</p>
              </div>
            </div>
          </div>

          {/* Registration Trends */}
          {userDemographics.length > 0 && (
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-green-500" /> Recent Signups
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userDemographics.slice(0, 10).map((u: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-zinc-800/50 rounded-lg px-3 py-2">
                    {u.imageUrl && <img src={u.imageUrl} alt="" className="h-6 w-6 rounded-full" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-zinc-200 truncate text-xs">{u.firstName} {u.lastName}</p>
                      <p className="text-zinc-500 truncate text-[10px]">{u.emailAddress}</p>
                    </div>
                    <span className="text-zinc-500 text-[10px]">{formatDate(u.createdAt)}</span>
                  </div>
                ))}
                {loadingDemographics && <p className="text-zinc-500 text-xs text-center">Loading...</p>}
              </div>
            </div>
          )}

          {/* Top Buyers Overall */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-yellow-500" /> Top Buyers
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {userDemographics
                .filter((u: any) => u.bookingStats?.totalSpent > 0)
                .sort((a: any, b: any) => (b.bookingStats?.totalSpent || 0) - (a.bookingStats?.totalSpent || 0))
                .slice(0, 10)
                .map((u: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-zinc-800/50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-orange-400 font-mono text-xs">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-zinc-200 truncate text-xs">{u.firstName} {u.lastName}</p>
                        <p className="text-zinc-500 truncate text-[10px]">{u.emailAddress}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-green-400 font-semibold text-xs">€{u.bookingStats?.totalSpent?.toFixed(0)}</p>
                      <p className="text-zinc-500 text-[10px]">{u.bookingStats?.totalBookings} bookings</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Reports Panel */}
      {showReports && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Behavior Report */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 lg:col-span-2">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" /> User Behavior Report
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {(() => {
                const funnel = getFunnelData();
                const visitors = Number(funnel[0]?.count) || 0;
                const viewers = Number(funnel[1]?.count) || 0;
                const carters = Number(funnel[2]?.count) || 0;
                const buyers = Number(funnel[4]?.count) || 0;
                return (
                  <>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-blue-400">{visitors.toLocaleString()}</p>
                      <p className="text-zinc-500 text-[10px]">Page Views</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-purple-400">{viewers.toLocaleString()}</p>
                      <p className="text-zinc-500 text-[10px]">Event Views</p>
                      <p className="text-zinc-600 text-[9px]">{visitors > 0 ? ((viewers / visitors) * 100).toFixed(1) : 0}% of visitors</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-orange-400">{carters.toLocaleString()}</p>
                      <p className="text-zinc-500 text-[10px]">Add to Cart</p>
                      <p className="text-zinc-600 text-[9px]">{viewers > 0 ? ((carters / viewers) * 100).toFixed(1) : 0}% of viewers</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-green-400">{buyers.toLocaleString()}</p>
                      <p className="text-zinc-500 text-[10px]">Purchases</p>
                      <p className="text-zinc-600 text-[9px]">{visitors > 0 ? ((buyers / visitors) * 100).toFixed(1) : 0}% conversion</p>
                    </div>
                  </>
                );
              })()}
            </div>
            {/* Funnel visualization */}
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={getFunnelData()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {getFunnelData().map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Purchases by Country */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-green-500" /> Visitors vs Buyers by Country
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(stats.countryDetails || []).map((c: any, i: number) => {
                const conversionRate = c.count > 0 ? ((c.purchases / c.count) * 100).toFixed(1) : '0';
                return (
                  <button key={i} onClick={() => openCountryDetail(c)} className="w-full bg-zinc-800/50 rounded-lg px-3 py-2 hover:bg-zinc-700/50 transition cursor-pointer text-left">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-200">{countryCodeToFlag(c.countryCode)} {c._id}</span>
                      <span className="text-zinc-500 text-xs">{conversionRate}% conv.</span>
                    </div>
                    <div className="flex gap-3 text-xs mt-1">
                      <span className="text-blue-400">{c.count} visits</span>
                      <span className="text-green-400">{c.purchases} buys</span>
                      {c.revenue > 0 && <span className="text-yellow-400">€{c.revenue?.toFixed(0)}</span>}
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-1">
                      <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${conversionRate}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Top Days of Week */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" /> Top Days of Week
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={getDayData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="activities" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Activities" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Hours */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" /> Activity by Hour
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={getHourData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 9 }} interval={2} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="activities" stroke="#8b5cf6" fill="#8b5cf680" name="Activities" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Trends */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-yellow-500" /> Monthly Trends
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={getMonthData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="activities" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Activities" />
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue (€)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Timeline Panel - Daily Trend */}
      {showTimeline && stats && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-orange-500" /> 30-Day Activity Timeline
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={(stats.dailyTrend || []).map((d: any) => ({
              date: new Date(d._id).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
              activities: d.count,
              users: d.uniqueUsers,
              purchases: d.purchases
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Area type="monotone" dataKey="activities" stroke="#f97316" fill="#f9731640" name="All Activities" />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f640" name="Unique Users" />
              <Area type="monotone" dataKey="purchases" stroke="#22c55e" fill="#22c55e40" name="Purchases" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Live Map Panel */}
      {showLiveMap && (
        <div className="bg-[#0a0a12] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
          {/* Map Header */}
          <div className="px-5 py-3.5 border-b border-zinc-800/40 flex items-center justify-between bg-[#0c0c16]/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                {mapMode !== 'historical' && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <h3 className="text-white/90 text-sm font-semibold tracking-wide uppercase">
                  {mapMode === 'live' ? 'Real-Time Traffic' : mapMode === 'today' ? "Today's Traffic" : 'Historical Overview'}
                </h3>
              </div>
              {liveData && (
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-zinc-500">{liveData.countries?.length || 0} <span className="text-zinc-600">countries</span></span>
                  <span className="text-zinc-700">|</span>
                  <span className="text-zinc-500">{liveData.activities?.length || 0} <span className="text-zinc-600">connections</span></span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Region zoom selector */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {Object.entries(MAP_REGION_LABELS).map(([key, region]) => (
                  <button key={key} onClick={() => setMapZoom(key)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap flex items-center gap-1 ${mapZoom === key
                        ? 'bg-orange-600/80 text-white shadow-lg shadow-orange-900/30'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                      }`}>
                    <span className="text-[10px]">{region.flag}</span> {region.label}
                  </button>
                ))}
              </div>
              <div className="w-px h-5 bg-zinc-800"></div>
              <div className="flex bg-zinc-900/80 rounded-lg p-0.5 border border-zinc-800/50">
                <button onClick={() => setMapMode('live')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${mapMode === 'live' ? 'bg-emerald-600/90 text-white shadow-lg shadow-emerald-900/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  Live
                </button>
                <button onClick={() => setMapMode('today')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${mapMode === 'today' ? 'bg-orange-600/90 text-white shadow-lg shadow-orange-900/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  Today
                </button>
                <button onClick={() => setMapMode('historical')}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${mapMode === 'historical' ? 'bg-blue-600/90 text-white shadow-lg shadow-blue-900/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  30 Days
                </button>
              </div>
              <button onClick={fetchLiveData} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition">
                <RefreshCw className={`h-3.5 w-3.5 ${liveLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Interactive Map */}
            <div className="flex-1 relative" style={{ minHeight: 420 }}>
              <LiveMap
                liveData={liveData}
                mapMode={mapMode}
                mapZoom={mapZoom}
                onCountryClick={(code: string) => {
                  const cd = stats?.countryDetails?.find((x: any) => x.countryCode === code);
                  if (cd) openCountryDetail(cd);
                }}
              />
              {/* Legend overlay */}
              <div className="absolute bottom-3 left-3 bg-[#0f172aee] border border-zinc-700/50 rounded-lg px-3 py-2 flex items-center gap-4 text-[10px] z-[1000]">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#60a5fa]"></div><span className="text-zinc-400">Visitors</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#34d399]"></div><span className="text-zinc-400">Buyers</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f97316]"></div><span className="text-zinc-400">Server</span></div>
                <span className="text-zinc-600">{mapMode === 'live' ? '● Live · 8s' : mapMode === 'today' ? '● Today + Live' : '● 30 days'}</span>
              </div>
            </div>

            {/* Activity Feed Sidebar */}
            <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-800/40 flex flex-col bg-[#0c0c14]">
              <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mapMode !== 'historical' && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                  )}
                  <span className="text-white/80 text-[11px] font-semibold tracking-wider uppercase">
                    {mapMode === 'live' ? 'Live Feed' : mapMode === 'today' ? "Today's Activity" : 'Recent Events'}
                  </span>
                </div>
                <span className="text-zinc-600 text-[10px] font-mono">{liveData?.activities?.length || 0}</span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[400px]">
                {(liveData?.activities || []).slice(0, 30).map((act: any, i: number) => {
                  const acfg = ACTION_CONFIG[act.action] || { label: act.action, color: '#6b7280', icon: '📌' };
                  const timeAgo = (() => {
                    const diff = Date.now() - new Date(act.createdAt).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 1) return 'just now';
                    if (mins < 60) return `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h ago`;
                    return `${Math.floor(hrs / 24)}d ago`;
                  })();
                  return (
                    <div key={i} className="px-4 py-2.5 border-b border-zinc-800/20 hover:bg-zinc-800/20 transition group">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mt-0.5"
                          style={{ background: acfg.color + '15' }}>
                          {acfg.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold tracking-wide" style={{ color: acfg.color }}>
                              {acfg.label.toUpperCase()}
                            </span>
                            <span className="text-zinc-600 text-[9px] flex-shrink-0 font-mono">{timeAgo}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-zinc-400 text-[10px] truncate">
                              {act.userName || act.userEmail || 'Anonymous'}
                            </span>
                            {act.amount > 0 && (
                              <span className="text-emerald-400 text-[10px] font-semibold">€{act.amount}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {act.countryCode && <span className="text-[10px]">{countryCodeToFlag(act.countryCode)}</span>}
                            <span className="text-zinc-600 text-[10px]">{act.city || act.country}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(!liveData?.activities || liveData.activities.length === 0) && (
                  <div className="p-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
                      <Globe className="h-5 w-5 text-zinc-600" />
                    </div>
                    <p className="text-zinc-500 text-xs">{mapMode === 'live' ? 'Waiting for connections...' : mapMode === 'today' ? 'No activity today yet' : 'No recent data'}</p>
                  </div>
                )}
              </div>

              {/* Country summary */}
              {liveData?.countries && liveData.countries.length > 0 && (
                <div className="border-t border-zinc-800/40 px-4 py-3 bg-[#080810]">
                  <p className="text-zinc-600 text-[9px] font-semibold tracking-wider uppercase mb-2">All Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {liveData.countries.map((c: any, i: number) => (
                      <button key={i} onClick={() => {
                        const cd = stats?.countryDetails?.find((x: any) => x.countryCode === c._id);
                        if (cd) openCountryDetail(cd);
                      }}
                        className="text-[10px] bg-zinc-800/60 border border-zinc-700/30 rounded-md px-2 py-1 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 transition flex items-center gap-1 font-medium">
                        {countryCodeToFlag(c._id)} <span className="text-zinc-500">{c.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-500" /> Activity Log
          </h3>
          <span className="text-zinc-500 text-xs">{pagination?.totalCount || 0} total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-6 w-6 text-orange-500 animate-spin mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-400">No activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {activities.map((a: any) => {
              const cfg = ACTION_CONFIG[a.action] || { label: a.action, color: '#6b7280', icon: '📌' };
              const isExpanded = expandedActivity === a._id;
              return (
                <div key={a._id}>
                  <button onClick={() => setExpandedActivity(isExpanded ? null : a._id)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-800/30 transition flex items-start gap-3">
                    {/* Action icon */}
                    <span className="text-lg flex-shrink-0 mt-0.5">{cfg.icon}</span>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: cfg.color + '20', color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${a.status === 'success' ? 'bg-green-900/30 text-green-400' :
                          a.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                            a.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-zinc-800 text-zinc-400'
                          }`}>{a.status}</span>
                        {a.amount > 0 && <span className="text-green-400 text-xs font-medium">€{a.amount}</span>}
                      </div>
                      <p className="text-zinc-400 text-xs mt-0.5 truncate">{a.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500 flex-wrap">
                        {/* User */}
                        <button onClick={(e) => { e.stopPropagation(); openUserDetail(a.userId, a.userName, a.userEmail); }} className="text-orange-400 hover:text-orange-300 hover:underline transition">
                          {a.userName || a.userEmail || a.userId?.slice(0, 10) + '...'}
                        </button>
                        {/* Geo flag + city */}
                        {(a.country || a.countryCode) && (
                          <button onClick={(e) => {
                            e.stopPropagation();
                            if (a.city) {
                              const cd = stats?.cityDetails?.find((c: any) => c._id?.city === a.city && c._id?.country === a.country);
                              if (cd) openCityDetail(cd); else { const cntry = stats?.countryDetails?.find((c: any) => c._id === a.country); if (cntry) openCountryDetail(cntry); }
                            } else {
                              const cntry = stats?.countryDetails?.find((c: any) => c._id === a.country);
                              if (cntry) openCountryDetail(cntry);
                            }
                          }} className="flex items-center gap-0.5 hover:text-orange-400 transition">
                            {countryCodeToFlag(a.countryCode)}
                            {a.city && <span className="hover:underline">{a.city}</span>}
                            {!a.city && a.country && <span className="hover:underline">{a.country}</span>}
                          </button>
                        )}
                        {/* Device */}
                        {a.device && (
                          <span className="flex items-center gap-0.5">
                            {a.device === 'mobile' ? <Smartphone className="h-3 w-3" /> : a.device === 'tablet' ? <Tablet className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                            {a.browser}
                          </span>
                        )}
                        {/* Time */}
                        <span>{formatDate(a.createdAt)}</span>
                      </div>
                    </div>

                    <ChevronDown className={`h-4 w-4 text-zinc-500 flex-shrink-0 transition ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-3 ml-9 space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {a.eventTitle && (
                          <div className="bg-zinc-800/60 rounded-lg p-2">
                            <p className="text-zinc-500">Event</p>
                            <p className="text-zinc-200 truncate">{a.eventTitle}</p>
                          </div>
                        )}
                        {a.ticketType && (
                          <div className="bg-zinc-800/60 rounded-lg p-2">
                            <p className="text-zinc-500">Ticket</p>
                            <p className="text-zinc-200">{a.ticketType}{a.quantity ? ` x${a.quantity}` : ''}</p>
                          </div>
                        )}
                        {a.paymentMethod && (
                          <div className="bg-zinc-800/60 rounded-lg p-2">
                            <p className="text-zinc-500">Payment</p>
                            <p className="text-zinc-200">{a.paymentMethod}</p>
                          </div>
                        )}
                        {a.ipAddress && (
                          <div className="bg-zinc-800/60 rounded-lg p-2">
                            <p className="text-zinc-500">IP</p>
                            <p className="text-zinc-200 font-mono text-[10px]">{a.ipAddress}</p>
                          </div>
                        )}
                        {a.country && (
                          <div className="bg-zinc-800/60 rounded-lg p-2">
                            <p className="text-zinc-500">Location</p>
                            <p className="text-zinc-200">{countryCodeToFlag(a.countryCode)} {a.city}{a.city && a.region ? ', ' : ''}{a.region}, {a.country}</p>
                          </div>
                        )}
                        {a.referrer && (
                          <div className="bg-zinc-800/60 rounded-lg p-2">
                            <p className="text-zinc-500">Referrer</p>
                            <p className="text-zinc-200 truncate text-[10px]">{a.referrer}</p>
                          </div>
                        )}
                        {a.duration > 0 && (
                          <div className="bg-zinc-800/60 rounded-lg p-2">
                            <p className="text-zinc-500">Duration</p>
                            <p className="text-zinc-200">{formatDuration(a.duration)}</p>
                          </div>
                        )}
                        {a.userAgent && (
                          <div className="bg-zinc-800/60 rounded-lg p-2 col-span-2">
                            <p className="text-zinc-500">User Agent</p>
                            <p className="text-zinc-200 truncate text-[10px]">{a.userAgent}</p>
                          </div>
                        )}
                        {a.errorMessage && (
                          <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-2 col-span-2">
                            <p className="text-red-400">Error</p>
                            <p className="text-red-300 text-[10px]">{a.errorMessage}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrevPage}
              className="px-3 py-1.5 rounded-lg text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <span className="text-zinc-400 text-sm">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNextPage}
              className="px-3 py-1.5 rounded-lg text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDetailModal(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {detailModal.type === 'user' && <><Users className="h-5 w-5 text-orange-500" /> User Details</>}
                {detailModal.type === 'country' && <><Globe className="h-5 w-5 text-orange-500" /> {countryCodeToFlag(detailModal.data.countryCode)} {detailModal.data._id}</>}
                {detailModal.type === 'city' && <><MapPin className="h-5 w-5 text-orange-500" /> {detailModal.data._id?.city}, {detailModal.data._id?.country}</>}
              </h2>
              <button onClick={() => setDetailModal(null)} className="text-zinc-400 hover:text-white transition">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* ── User Detail ── */}
              {detailModal.type === 'user' && (
                <>
                  <div className="flex items-center gap-4">
                    {detailModal.data.imageUrl && <img src={detailModal.data.imageUrl} alt="" className="h-14 w-14 rounded-full" />}
                    <div>
                      <p className="text-white font-semibold text-lg">{detailModal.data.name || 'Unknown User'}</p>
                      <p className="text-zinc-400 text-sm">{detailModal.data.email}</p>
                      <p className="text-zinc-500 text-xs font-mono">{detailModal.data.userId}</p>
                    </div>
                  </div>

                  {detailModal.data.bookingStats && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-orange-400">{detailModal.data.bookingStats.totalBookings || 0}</p>
                        <p className="text-zinc-500 text-xs">Bookings</p>
                      </div>
                      <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                        <p className="text-xl font-bold text-green-400">€{detailModal.data.bookingStats.totalSpent?.toFixed(0) || 0}</p>
                        <p className="text-zinc-500 text-xs">Total Spent</p>
                      </div>
                      <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                        <p className="text-sm font-bold text-blue-400">{detailModal.data.bookingStats.lastBooking ? formatDate(detailModal.data.bookingStats.lastBooking) : '—'}</p>
                        <p className="text-zinc-500 text-xs">Last Booking</p>
                      </div>
                    </div>
                  )}

                  {loadingDetail ? (
                    <div className="text-center py-6"><RefreshCw className="h-5 w-5 text-orange-500 animate-spin mx-auto" /><p className="text-zinc-400 text-sm mt-2">Loading activity data...</p></div>
                  ) : detailData && (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-orange-400">{detailData.pagination?.totalCount || 0}</p>
                          <p className="text-zinc-500 text-xs">Total Actions</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-blue-400">{detailData.statistics?.uniqueSessions || 0}</p>
                          <p className="text-zinc-500 text-xs">Sessions</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-green-400">€{(detailData.statistics?.totalRevenue || 0).toFixed(0)}</p>
                          <p className="text-zinc-500 text-xs">Revenue</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                          <p className="text-xl font-bold text-purple-400">{formatDuration(detailData.statistics?.avgSessionDuration?.avgDuration || 0)}</p>
                          <p className="text-zinc-500 text-xs">Avg Session</p>
                        </div>
                      </div>

                      {detailData.statistics?.byAction?.length > 0 && (
                        <div>
                          <h4 className="text-zinc-300 text-sm font-medium mb-2">Activity Breakdown</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
                            {detailData.statistics.byAction.slice(0, 12).map((a: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-xs bg-zinc-800/50 rounded px-2 py-1.5">
                                <span className="text-zinc-300">{ACTION_CONFIG[a._id]?.icon} {ACTION_CONFIG[a._id]?.label || a._id}</span>
                                <span className="text-orange-400 font-medium">{a.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {detailData.statistics?.byCountry?.length > 0 && (
                        <div>
                          <h4 className="text-zinc-300 text-sm font-medium mb-2">Countries Visited</h4>
                          <div className="flex flex-wrap gap-2">
                            {detailData.statistics.byCountry.map((c: any, i: number) => (
                              <button key={i} onClick={() => { const cd = stats?.countryDetails?.find((x: any) => x._id === c._id); if (cd) openCountryDetail(cd); }}
                                className="text-xs bg-zinc-800/50 rounded-full px-3 py-1 text-zinc-300 hover:bg-zinc-700/50 transition">
                                {c._id} <span className="text-orange-400">{c.count}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {detailData.statistics?.byDevice?.length > 0 && (
                        <div>
                          <h4 className="text-zinc-300 text-sm font-medium mb-2">Devices</h4>
                          <div className="flex flex-wrap gap-2">
                            {detailData.statistics.byDevice.map((d: any, i: number) => (
                              <span key={i} className="text-xs bg-zinc-800/50 rounded-full px-3 py-1 text-zinc-300">
                                {d._id === 'mobile' ? '📱' : d._id === 'tablet' ? '📟' : '🖥️'} {d._id} <span className="text-orange-400">{d.count}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {detailData.activities?.length > 0 && (
                        <div>
                          <h4 className="text-zinc-300 text-sm font-medium mb-2">Recent Activities</h4>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {detailData.activities.slice(0, 20).map((act: any, i: number) => {
                              const acfg = ACTION_CONFIG[act.action] || { label: act.action, color: '#6b7280', icon: '📌' };
                              return (
                                <div key={i} className="flex items-center justify-between text-xs bg-zinc-800/40 rounded px-3 py-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span>{acfg.icon}</span>
                                    <span className="text-zinc-300">{acfg.label}</span>
                                    {act.eventTitle && <span className="text-zinc-500 truncate">— {act.eventTitle}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {act.amount > 0 && <span className="text-green-400">€{act.amount}</span>}
                                    <span className="text-zinc-500">{formatDate(act.createdAt)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ── Country Detail ── */}
              {detailModal.type === 'country' && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-orange-400">{detailModal.data.count || 0}</p>
                      <p className="text-zinc-500 text-xs">Total Visits</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-blue-400">{detailModal.data.uniqueUsers || 0}</p>
                      <p className="text-zinc-500 text-xs">Unique Users</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-green-400">{detailModal.data.purchases || 0}</p>
                      <p className="text-zinc-500 text-xs">Purchases</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-yellow-400">€{(detailModal.data.revenue || 0).toFixed(0)}</p>
                      <p className="text-zinc-500 text-xs">Revenue</p>
                    </div>
                  </div>

                  <div className="bg-zinc-800/60 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-zinc-300 text-sm">Conversion Rate</span>
                      <span className="text-orange-400 font-semibold">
                        {detailModal.data.count > 0 ? ((detailModal.data.purchases / detailModal.data.count) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500 transition-all" style={{
                        width: `${detailModal.data.count > 0 ? Math.min(100, (detailModal.data.purchases / detailModal.data.count) * 100) : 0}%`
                      }} />
                    </div>
                  </div>

                  {detailModal.data.cities?.length > 0 && (
                    <div>
                      <h4 className="text-zinc-300 text-sm font-medium mb-2">Cities ({detailModal.data.cities.length})</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {detailModal.data.cities.map((city: any, i: number) => (
                          <button key={i} onClick={() => openCityDetail(city)}
                            className="w-full flex items-center justify-between text-xs bg-zinc-800/50 rounded-lg px-3 py-2 hover:bg-zinc-700/50 transition text-left">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-orange-400" />
                              <span className="text-zinc-200">{city._id?.city || 'Unknown'}</span>
                            </div>
                            <div className="flex gap-3">
                              <span className="text-orange-400">{city.count} visits</span>
                              <span className="text-zinc-500">{city.uniqueUsers} users</span>
                              {city.purchases > 0 && <span className="text-green-400">{city.purchases} sales</span>}
                              {city.revenue > 0 && <span className="text-yellow-400">€{city.revenue?.toFixed(0)}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailModal.data.buyers?.length > 0 && (
                    <div>
                      <h4 className="text-zinc-300 text-sm font-medium mb-2">Top Buying Locations</h4>
                      <div className="space-y-1">
                        {detailModal.data.buyers.map((b: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-zinc-800/50 rounded px-3 py-2">
                            <span className="text-zinc-300"><MapPin className="h-3 w-3 inline mr-1 text-orange-400" />{b._id?.city || 'Unknown'}</span>
                            <div className="flex gap-3">
                              <span className="text-green-400">€{b.totalSpent?.toFixed(0)}</span>
                              <span className="text-zinc-500">{b.transactions} txns</span>
                              <span className="text-zinc-500">{b.uniqueBuyers} buyers</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── City Detail ── */}
              {detailModal.type === 'city' && (
                <>
                  <div className="text-zinc-400 text-sm mb-2">
                    {countryCodeToFlag(detailModal.data._id?.countryCode)} {detailModal.data._id?.country}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-orange-400">{detailModal.data.count || 0}</p>
                      <p className="text-zinc-500 text-xs">Total Visits</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-blue-400">{detailModal.data.uniqueUsers || 0}</p>
                      <p className="text-zinc-500 text-xs">Unique Users</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-green-400">{detailModal.data.purchases || 0}</p>
                      <p className="text-zinc-500 text-xs">Purchases</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-yellow-400">€{(detailModal.data.revenue || 0).toFixed(0)}</p>
                      <p className="text-zinc-500 text-xs">Revenue</p>
                    </div>
                  </div>

                  <div className="bg-zinc-800/60 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-zinc-300 text-sm">Conversion Rate</span>
                      <span className="text-orange-400 font-semibold">
                        {detailModal.data.count > 0 ? ((detailModal.data.purchases / detailModal.data.count) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-green-500 transition-all" style={{
                        width: `${detailModal.data.count > 0 ? Math.min(100, (detailModal.data.purchases / detailModal.data.count) * 100) : 0}%`
                      }} />
                    </div>
                  </div>

                  {detailModal.data.buyers?.length > 0 && (
                    <div>
                      <h4 className="text-zinc-300 text-sm font-medium mb-2">Purchase Stats</h4>
                      <div className="space-y-1">
                        {detailModal.data.buyers.map((b: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-zinc-800/50 rounded px-3 py-2">
                            <span className="text-zinc-300">Purchases</span>
                            <div className="flex gap-3">
                              <span className="text-green-400">€{b.totalSpent?.toFixed(0)}</span>
                              <span className="text-zinc-500">{b.transactions} txns</span>
                              <span className="text-zinc-500">{b.uniqueBuyers} buyers</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
