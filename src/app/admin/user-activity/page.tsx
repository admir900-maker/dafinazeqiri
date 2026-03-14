'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  RefreshCw, Search, Filter, Download, Clock, User, Activity,
  CheckCircle, XCircle, AlertCircle, Smartphone, Monitor, Tablet,
  Chrome, CreditCard, Calendar, BarChart3, Eye, TrendingUp,
  Trash2, ChevronDown, ChevronUp, Globe, Link2, Users, Target
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface UserActivity {
  _id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  sessionId?: string;
  action: string;
  description: string;
  eventId?: string;
  eventTitle?: string;
  ticketType?: string;
  quantity?: number;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  status: 'success' | 'failed' | 'pending' | 'cancelled';
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  location?: string;
  referrer?: string;
  duration?: number;
  metadata?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface ActivityStatistics {
  byAction: Array<{ _id: string; count: number }>;
  byStatus: Array<{ _id: string; count: number }>;
  byDevice: Array<{ _id: string; count: number }>;
  byBrowser: Array<{ _id: string; count: number }>;
  totalRevenue: number;
  recentActivity: UserActivity[];
  byReferrer: Array<{ _id: string; count: number; uniqueUsers: number }>;
  topVisitors: Array<{ _id: string; email: string; name: string; totalActions: number; lastSeen: string; firstSeen: string }>;
  entryIntents: Array<{ _id: string; count: number }>;
  topBrowsedEvents: Array<{ _id: string; eventId: string; views: number; uniqueViewers: number }>;
  topPages: Array<{ _id: string; count: number; uniqueUsers: number }>;
  uniqueUsers: number;
  uniqueSessions: number;
}

interface ActivityData {
  activities: UserActivity[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
  };
  statistics: ActivityStatistics;
}

const CHART_COLORS = ['#f97316', '#92400e', '#22c55e', '#ef4444', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

const ACTION_LABELS: Record<string, string> = {
  page_view: 'Page View',
  event_view: 'Event View',
  ticket_selection: 'Ticket Selection',
  add_to_cart: 'Add to Cart',
  remove_from_cart: 'Remove from Cart',
  checkout_started: 'Checkout Started',
  payment_method_selected: 'Payment Method Selected',
  payment_setup_successful: 'Payment Setup Successful',
  payment_redirect_successful: 'Payment Redirect Successful',
  payment_attempted: 'Payment Attempted',
  payment_successful: 'Payment Successful',
  payment_failed: 'Payment Failed',
  booking_created: 'Booking Created',
  booking_cancelled: 'Booking Cancelled',
  email_sent: 'Email Sent',
  login: 'Login',
  logout: 'Logout',
  signup: 'Sign Up',
  search: 'Search',
  filter_applied: 'Filter Applied',
  download_ticket: 'Download Ticket',
  share_event: 'Share Event',
  favorite_added: 'Favorite Added',
  favorite_removed: 'Favorite Removed',
  review_submitted: 'Review Submitted',
  contact_form_submitted: 'Contact Form Submitted',
  newsletter_signup: 'Newsletter Signup',
  error_occurred: 'Error Occurred',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-orange-500/30 rounded-lg p-3 shadow-lg">
        <p className="text-orange-100 font-medium text-sm">{label || payload[0]?.name}</p>
        <p className="text-orange-500 text-sm">{payload[0]?.value} activities</p>
      </div>
    );
  }
  return null;
};

export default function UserActivityPage() {
  const { formatPrice } = useCurrency();
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [deviceFilter, setDeviceFilter] = useState('');
  const [browserFilter, setBrowserFilter] = useState('');

  // UI state
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const fetchActivities = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (actionFilter) params.append('action', actionFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (userIdFilter) params.append('userId', userIdFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (deviceFilter) params.append('device', deviceFilter);
      if (browserFilter) params.append('browser', browserFilter);

      const response = await fetch(`/api/admin/user-activity?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setCurrentPage(page);
      } else {
        setError(result.error || 'Failed to fetch user activities');
      }
    } catch (error) {
      console.error('Error fetching user activities:', error);
      setError('Failed to fetch user activities');
    } finally {
      setLoading(false);
    }
  };

  const clearOldActivities = async (days: number) => {
    if (!confirm(`Are you sure you want to delete activities older than ${days} days? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/user-activity?days=${days}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        alert(`Successfully deleted ${result.data.deletedCount} old activities`);
        fetchActivities(currentPage);
      } else {
        alert(`Failed to delete activities: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting activities:', error);
      alert('Failed to delete activities');
    }
  };

  const exportActivities = () => {
    if (!data) return;

    const exportData = {
      activities: data.activities,
      statistics: data.statistics,
      exportDate: new Date().toISOString(),
      filters: {
        searchTerm,
        actionFilter,
        statusFilter,
        userIdFilter,
        startDate,
        endDate
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-activities-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-orange-500" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default: return <Activity className="w-4 h-4 text-orange-500" />;
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="w-4 h-4 text-orange-500" />;
      case 'tablet': return <Tablet className="w-4 h-4 text-amber-700" />;
      case 'desktop': return <Monitor className="w-4 h-4 text-green-400" />;
      default: return <Monitor className="w-4 h-4 text-gray-400" />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    switch (browser) {
      case 'Chrome': return <Chrome className="w-4 h-4 text-orange-500" />;
      case 'Firefox': return <Globe className="w-4 h-4 text-orange-400" />;
      case 'Safari': return <Globe className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'payment_successful':
      case 'payment_setup_successful':
      case 'payment_redirect_successful':
      case 'booking_created':
        return 'text-green-400';
      case 'payment_failed':
      case 'error_occurred':
      case 'booking_cancelled':
        return 'text-red-400';
      case 'checkout_started':
      case 'payment_attempted':
      case 'payment_method_selected':
        return 'text-orange-500';
      case 'page_view':
      case 'event_view':
      case 'search':
      case 'filter_applied':
        return 'text-blue-400';
      case 'add_to_cart':
      case 'ticket_selection':
        return 'text-amber-400';
      case 'remove_from_cart':
        return 'text-orange-400';
      case 'login':
      case 'signup':
        return 'text-emerald-400';
      case 'logout':
        return 'text-gray-400';
      case 'favorite_added':
      case 'share_event':
      case 'review_submitted':
      case 'newsletter_signup':
        return 'text-pink-400';
      case 'favorite_removed':
        return 'text-gray-400';
      case 'download_ticket':
        return 'text-cyan-400';
      case 'email_sent':
      case 'contact_form_submitted':
        return 'text-violet-400';
      default:
        return 'text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">User Activity Logs</h1>
          </div>
          <div className="flex items-center justify-center min-h-96 text-orange-100">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-orange-500 animate-pulse" />
              <p className="text-lg">Loading user activities...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">User Activity Logs</h1>
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-orange-100 mb-2">Error Loading Activities</h2>
              <p className="text-red-400 mb-6">{error}</p>
              <Button onClick={() => fetchActivities()} className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900 mb-2">User Activity Logs</h1>
            <p className="text-orange-100/50">
              Monitor user behavior and track ticket purchasing activities
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              onClick={() => setShowCharts(!showCharts)}
              className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showCharts ? 'Hide Charts' : 'Charts'}
            </Button>
            <Button
              onClick={() => setShowInsights(!showInsights)}
              className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {showInsights ? 'Hide Insights' : 'Insights'}
            </Button>
            <Button onClick={exportActivities} className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => fetchActivities(currentPage)} className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-black/60 border-2 border-orange-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100/70 text-sm font-medium">Total Activities</p>
                      <p className="text-2xl font-bold text-orange-100">
                        {data.pagination.totalCount.toLocaleString()}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/60 border-2 border-orange-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100/70 text-sm font-medium">Revenue from Activities</p>
                      <p className="text-2xl font-bold text-orange-100">
                        {formatPrice(data.statistics.totalRevenue)}
                      </p>
                    </div>
                    <CreditCard className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/60 border-2 border-orange-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100/70 text-sm font-medium">Success Rate</p>
                      <p className="text-2xl font-bold text-orange-100">
                        {data.statistics.byStatus.find(s => s._id === 'success')?.count ?
                          Math.round((data.statistics.byStatus.find(s => s._id === 'success')!.count / data.pagination.totalCount) * 100) : 0}%
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-black/60 border-2 border-orange-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100/70 text-sm font-medium">Top Device</p>
                      <p className="text-2xl font-bold text-orange-100">
                        {data.statistics.byDevice[0]?._id || 'N/A'}
                      </p>
                    </div>
                    {getDeviceIcon(data.statistics.byDevice[0]?._id || 'unknown')}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statistics Charts */}
            {showCharts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Activity by Status */}
                <Card className="bg-black/60 border-2 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="text-orange-100 text-lg">Activity by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={data.statistics.byStatus.filter(s => s._id).map(s => ({ name: s._id?.charAt(0).toUpperCase() + s._id?.slice(1), value: s.count }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          dataKey="value"
                        >
                          {data.statistics.byStatus.map((_, index) => (
                            <Cell key={`status-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Activity by Device */}
                <Card className="bg-black/60 border-2 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="text-orange-100 text-lg">Activity by Device</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={data.statistics.byDevice.filter(d => d._id).map(d => ({ name: d._id?.charAt(0).toUpperCase() + d._id?.slice(1), value: d.count }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          dataKey="value"
                        >
                          {data.statistics.byDevice.map((_, index) => (
                            <Cell key={`device-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Actions */}
                <Card className="bg-black/60 border-2 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="text-orange-100 text-lg">Top Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={data.statistics.byAction.slice(0, 8).map(a => ({ name: ACTION_LABELS[a._id] || a._id, count: a.count }))}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis type="number" tick={{ fill: '#fed7aa', fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#fed7aa', fontSize: 11 }} width={130} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Activity by Browser */}
                <Card className="bg-black/60 border-2 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="text-orange-100 text-lg">Activity by Browser</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={data.statistics.byBrowser.filter(b => b._id).map(b => ({ name: b._id || 'Unknown', value: b.count }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          dataKey="value"
                        >
                          {data.statistics.byBrowser.map((_, index) => (
                            <Cell key={`browser-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* User Insights */}
            {showInsights && (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-black/60 border-2 border-orange-500/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-100/70 text-sm font-medium">Unique Users</p>
                          <p className="text-2xl font-bold text-orange-100">{data.statistics.uniqueUsers?.toLocaleString() || 0}</p>
                        </div>
                        <Users className="w-8 h-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-black/60 border-2 border-orange-500/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-100/70 text-sm font-medium">Unique Sessions</p>
                          <p className="text-2xl font-bold text-orange-100">{data.statistics.uniqueSessions?.toLocaleString() || 0}</p>
                        </div>
                        <Globe className="w-8 h-8 text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-black/60 border-2 border-orange-500/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-100/70 text-sm font-medium">Avg Actions/User</p>
                          <p className="text-2xl font-bold text-orange-100">
                            {data.statistics.uniqueUsers ? (data.pagination.totalCount / data.statistics.uniqueUsers).toFixed(1) : '0'}
                          </p>
                        </div>
                        <Target className="w-8 h-8 text-emerald-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Referral Sources */}
                  <Card className="bg-black/60 border-2 border-orange-500/30">
                    <CardHeader>
                      <CardTitle className="text-orange-100 text-lg flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-orange-500" />
                        Referral Sources
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.statistics.byReferrer && data.statistics.byReferrer.length > 0 ? (
                        <div className="space-y-3">
                          {data.statistics.byReferrer.map((ref, i) => {
                            const maxCount = data.statistics.byReferrer[0]?.count || 1;
                            const domain = (() => {
                              try {
                                const url = ref._id.startsWith('http') ? ref._id : `https://${ref._id}`;
                                return new URL(url).hostname;
                              } catch { return ref._id; }
                            })();
                            return (
                              <div key={i} className="group">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-orange-100 text-sm truncate max-w-[200px]" title={ref._id}>{domain}</span>
                                  <div className="flex items-center gap-3 text-sm">
                                    <span className="text-orange-100/50">{ref.uniqueUsers} users</span>
                                    <span className="text-orange-500 font-medium">{ref.count} visits</span>
                                  </div>
                                </div>
                                <div className="w-full bg-orange-500/10 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-orange-500 to-amber-700 h-2 rounded-full transition-all"
                                    style={{ width: `${(ref.count / maxCount) * 100}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-orange-100/40 text-center py-6">No referral data available yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Entry Intents - What brought users to the site */}
                  <Card className="bg-black/60 border-2 border-orange-500/30">
                    <CardHeader>
                      <CardTitle className="text-orange-100 text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-orange-500" />
                        Entry Intents
                      </CardTitle>
                      <p className="text-orange-100/40 text-sm">First action users take when entering</p>
                    </CardHeader>
                    <CardContent>
                      {data.statistics.entryIntents && data.statistics.entryIntents.length > 0 ? (
                        <div className="space-y-3">
                          {data.statistics.entryIntents.filter(i => i._id).map((intent, i) => {
                            const maxCount = data.statistics.entryIntents[0]?.count || 1;
                            const total = data.statistics.entryIntents.reduce((sum, i) => sum + i.count, 0);
                            const pct = ((intent.count / total) * 100).toFixed(1);
                            return (
                              <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-sm font-medium ${getActionColor(intent._id)}`}>
                                    {ACTION_LABELS[intent._id] || intent._id}
                                  </span>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-orange-100/50">{pct}%</span>
                                    <span className="text-orange-500 font-medium">{intent.count}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-orange-500/10 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-orange-500 to-amber-700 h-2 rounded-full transition-all"
                                    style={{ width: `${(intent.count / maxCount) * 100}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-orange-100/40 text-center py-6">No session data available yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top Visitors */}
                  <Card className="bg-black/60 border-2 border-orange-500/30">
                    <CardHeader>
                      <CardTitle className="text-orange-100 text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        Most Active Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {data.statistics.topVisitors && data.statistics.topVisitors.length > 0 ? (
                        <div className="divide-y divide-orange-500/10">
                          {data.statistics.topVisitors.slice(0, 10).map((visitor, i) => (
                            <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-black/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-orange-500 font-bold text-sm w-6">#{i + 1}</span>
                                <div>
                                  <p className="text-orange-100 text-sm font-medium">
                                    {visitor.email || visitor.name || visitor._id?.slice(0, 12) + '...'}
                                  </p>
                                  <p className="text-orange-100/40 text-xs">
                                    First: {new Date(visitor.firstSeen).toLocaleDateString()} &middot; Last: {new Date(visitor.lastSeen).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-orange-500 font-bold text-sm">{visitor.totalActions}</p>
                                <p className="text-orange-100/40 text-xs">actions</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-orange-100/40 text-center py-6">No visitor data available yet</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Most Browsed Events */}
                  <Card className="bg-black/60 border-2 border-orange-500/30">
                    <CardHeader>
                      <CardTitle className="text-orange-100 text-lg flex items-center gap-2">
                        <Eye className="w-5 h-5 text-orange-500" />
                        Most Browsed Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {data.statistics.topBrowsedEvents && data.statistics.topBrowsedEvents.length > 0 ? (
                        <div className="divide-y divide-orange-500/10">
                          {data.statistics.topBrowsedEvents.map((event, i) => (
                            <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-black/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="text-orange-500 font-bold text-sm w-6">#{i + 1}</span>
                                <p className="text-orange-100 text-sm font-medium">{event._id}</p>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="text-right">
                                  <p className="text-blue-400 font-medium">{event.uniqueViewers}</p>
                                  <p className="text-orange-100/40 text-xs">unique</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-orange-500 font-bold">{event.views}</p>
                                  <p className="text-orange-100/40 text-xs">views</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-orange-100/40 text-center py-6">No event view data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Most Viewed Pages */}
                <Card className="bg-black/60 border-2 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="text-orange-100 text-lg flex items-center gap-2">
                      <Globe className="w-5 h-5 text-orange-500" />
                      Most Viewed Pages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.statistics.topPages && data.statistics.topPages.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {data.statistics.topPages.map((page, i) => {
                          const maxCount = data.statistics.topPages[0]?.count || 1;
                          const pagePath = page._id?.replace('User viewed page: ', '') || page._id;
                          return (
                            <div key={i} className="p-3 bg-black/30 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-orange-100 text-sm font-medium truncate max-w-[250px]" title={pagePath}>
                                  {pagePath}
                                </span>
                                <div className="flex items-center gap-2 text-xs shrink-0">
                                  <span className="text-blue-400">{page.uniqueUsers} users</span>
                                  <span className="text-orange-500 font-bold">{page.count} views</span>
                                </div>
                              </div>
                              <div className="w-full bg-orange-500/10 rounded-full h-1.5">
                                <div
                                  className="bg-gradient-to-r from-orange-500 to-amber-700 h-1.5 rounded-full"
                                  style={{ width: `${(page.count / maxCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-orange-100/40 text-center py-6">No page view data yet</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filters */}
            {showFilters && (
              <Card className="bg-black/60 border-2 border-orange-500/30">
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-orange-100/70 text-sm mb-2">Search</label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search users, events..."
                        className="w-full bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-orange-100/70 text-sm mb-2">Action</label>
                      <select
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className="w-full bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">All Actions</option>
                        <optgroup label="Browsing">
                          <option value="page_view">Page View</option>
                          <option value="event_view">Event View</option>
                          <option value="search">Search</option>
                          <option value="filter_applied">Filter Applied</option>
                        </optgroup>
                        <optgroup label="Tickets & Cart">
                          <option value="ticket_selection">Ticket Selection</option>
                          <option value="add_to_cart">Add to Cart</option>
                          <option value="remove_from_cart">Remove from Cart</option>
                          <option value="download_ticket">Download Ticket</option>
                        </optgroup>
                        <optgroup label="Checkout & Payments">
                          <option value="checkout_started">Checkout Started</option>
                          <option value="payment_method_selected">Payment Method Selected</option>
                          <option value="payment_setup_successful">Payment Setup Successful</option>
                          <option value="payment_redirect_successful">Payment Redirect Successful</option>
                          <option value="payment_attempted">Payment Attempted</option>
                          <option value="payment_successful">Payment Successful</option>
                          <option value="payment_failed">Payment Failed</option>
                        </optgroup>
                        <optgroup label="Bookings">
                          <option value="booking_created">Booking Created</option>
                          <option value="booking_cancelled">Booking Cancelled</option>
                        </optgroup>
                        <optgroup label="Account">
                          <option value="login">Login</option>
                          <option value="logout">Logout</option>
                          <option value="signup">Sign Up</option>
                        </optgroup>
                        <optgroup label="Engagement">
                          <option value="share_event">Share Event</option>
                          <option value="favorite_added">Favorite Added</option>
                          <option value="favorite_removed">Favorite Removed</option>
                          <option value="review_submitted">Review Submitted</option>
                          <option value="contact_form_submitted">Contact Form Submitted</option>
                          <option value="newsletter_signup">Newsletter Signup</option>
                        </optgroup>
                        <optgroup label="System">
                          <option value="email_sent">Email Sent</option>
                          <option value="error_occurred">Error Occurred</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-orange-100/70 text-sm mb-2">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">All Status</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-orange-100/70 text-sm mb-2">User ID</label>
                      <input
                        type="text"
                        value={userIdFilter}
                        onChange={(e) => setUserIdFilter(e.target.value)}
                        placeholder="Filter by user ID"
                        className="w-full bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-orange-100/70 text-sm mb-2">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-orange-100/70 text-sm mb-2">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-orange-100/70 text-sm mb-2">Device</label>
                      <select
                        value={deviceFilter}
                        onChange={(e) => setDeviceFilter(e.target.value)}
                        className="w-full bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">All Devices</option>
                        <option value="desktop">Desktop</option>
                        <option value="mobile">Mobile</option>
                        <option value="tablet">Tablet</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-orange-100/70 text-sm mb-2">Browser</label>
                      <select
                        value={browserFilter}
                        onChange={(e) => setBrowserFilter(e.target.value)}
                        className="w-full bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-orange-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">All Browsers</option>
                        <option value="Chrome">Chrome</option>
                        <option value="Firefox">Firefox</option>
                        <option value="Safari">Safari</option>
                        <option value="Edge">Edge</option>
                        <option value="Opera">Opera</option>
                        <option value="Samsung Internet">Samsung Internet</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => fetchActivities(1)} className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold">
                      <Search className="w-4 h-4 mr-2" />
                      Apply Filters
                    </Button>
                    <Button
                      onClick={() => {
                        setSearchTerm('');
                        setActionFilter('');
                        setStatusFilter('');
                        setUserIdFilter('');
                        setStartDate('');
                        setEndDate('');
                        setDeviceFilter('');
                        setBrowserFilter('');
                        fetchActivities(1);
                      }}
                      className="bg-black/40 border border-orange-500/30 text-orange-100 hover:bg-orange-500/10"
                    >
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activities List */}
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>User Activities</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => clearOldActivities(30)}
                      className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear 30d+
                    </Button>
                    <Button
                      onClick={() => clearOldActivities(90)}
                      className="bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 text-sm"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear 90d+
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.activities.length > 0 ? (
                  <div className="divide-y divide-orange-500/10">
                    {data.activities.map((activity) => (
                      <div key={activity._id} className="p-4 hover:bg-black/40 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusIcon(activity.status)}
                              <span className={`font-medium ${getActionColor(activity.action)}`}>
                                {ACTION_LABELS[activity.action] || activity.action.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              <span className="text-orange-100/40 text-sm">
                                {formatDate(activity.createdAt)}
                              </span>
                              {activity.duration && (
                                <span className="text-orange-100/40 text-sm">
                                  ({formatDuration(activity.duration)})
                                </span>
                              )}
                            </div>

                            <p className="text-orange-100 mb-2">{activity.description}</p>

                            <div className="flex flex-wrap gap-4 text-sm text-orange-100/70">
                              {activity.userEmail && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {activity.userEmail}
                                </span>
                              )}
                              {activity.eventTitle && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {activity.eventTitle}
                                </span>
                              )}
                              {activity.amount && (
                                <span className="flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" />
                                  {formatPrice(activity.amount)}
                                </span>
                              )}
                              {activity.device && (
                                <span className="flex items-center gap-1">
                                  {getDeviceIcon(activity.device)}
                                  {activity.device}
                                </span>
                              )}
                              {activity.browser && (
                                <span className="flex items-center gap-1">
                                  {getBrowserIcon(activity.browser)}
                                  {activity.browser}
                                </span>
                              )}
                            </div>

                            {activity.errorMessage && (
                              <div className="mt-2 p-2 bg-red-600/20 border border-red-600/30 rounded text-red-400 text-sm">
                                {activity.errorMessage}
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() => setExpandedActivity(
                              expandedActivity === activity._id ? null : activity._id
                            )}
                            className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-100/70 p-2"
                          >
                            {expandedActivity === activity._id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>

                        {expandedActivity === activity._id && (
                          <div className="mt-4 p-4 bg-black/40 rounded-lg">
                            <h4 className="text-white font-medium mb-3">Detailed Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong className="text-orange-100/80">Session ID:</strong>
                                <span className="text-orange-100/50 ml-2">{activity.sessionId || 'N/A'}</span>
                              </div>
                              <div>
                                <strong className="text-orange-100/80">IP Address:</strong>
                                <span className="text-orange-100/50 ml-2">{activity.ipAddress || 'N/A'}</span>
                              </div>
                              <div>
                                <strong className="text-orange-100/80">Location:</strong>
                                <span className="text-orange-100/50 ml-2">{activity.location || 'N/A'}</span>
                              </div>
                              <div>
                                <strong className="text-orange-100/80">Referrer:</strong>
                                <span className="text-orange-100/50 ml-2">{activity.referrer || 'N/A'}</span>
                              </div>
                              {activity.paymentMethod && (
                                <div>
                                  <strong className="text-orange-100/80">Payment Method:</strong>
                                  <span className="text-orange-100/50 ml-2">{activity.paymentMethod}</span>
                                </div>
                              )}
                              {activity.ticketType && (
                                <div>
                                  <strong className="text-orange-100/80">Ticket Type:</strong>
                                  <span className="text-orange-100/50 ml-2">{activity.ticketType}</span>
                                </div>
                              )}
                              {activity.quantity && (
                                <div>
                                  <strong className="text-orange-100/80">Quantity:</strong>
                                  <span className="text-orange-100/50 ml-2">{activity.quantity}</span>
                                </div>
                              )}
                            </div>

                            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                              <div className="mt-4">
                                <strong className="text-orange-100/80">Metadata:</strong>
                                <pre className="mt-2 p-3 bg-black/30 rounded text-orange-100/70 text-xs overflow-auto">
                                  {JSON.stringify(activity.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-orange-100/50">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-orange-100/30" />
                    <p>No user activities found</p>
                    <p className="text-sm mt-2">Activities will appear here as users interact with the platform</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-orange-100/50 text-sm">
                  Showing {((data.pagination.currentPage - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.currentPage * data.pagination.limit, data.pagination.totalCount)} of {data.pagination.totalCount} activities
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchActivities(data.pagination.currentPage - 1)}
                    disabled={!data.pagination.hasPrevPage}
                    className="bg-orange-500/10 hover:bg-orange-500/20 disabled:opacity-50"
                  >
                    Previous
                  </Button>

                  <span className="flex items-center px-4 py-2 text-orange-100">
                    Page {data.pagination.currentPage} of {data.pagination.totalPages}
                  </span>

                  <Button
                    onClick={() => fetchActivities(data.pagination.currentPage + 1)}
                    disabled={!data.pagination.hasNextPage}
                    className="bg-orange-500/10 hover:bg-orange-500/20 disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}