'use client';

import { useState, useEffect } from 'react';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  RefreshCw, Search, Filter, Download, Eye, Clock, User, Activity,
  CheckCircle, XCircle, AlertCircle, Smartphone, Monitor, Tablet,
  Chrome, Users, CreditCard, ShoppingCart, Calendar,
  Trash2, ChevronDown, ChevronUp, ExternalLink, Globe
} from 'lucide-react';

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

  // UI state
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default: return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone className="w-4 h-4 text-blue-400" />;
      case 'tablet': return <Tablet className="w-4 h-4 text-purple-400" />;
      case 'desktop': return <Monitor className="w-4 h-4 text-green-400" />;
      default: return <Monitor className="w-4 h-4 text-gray-400" />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    switch (browser) {
      case 'Chrome': return <Chrome className="w-4 h-4 text-yellow-400" />;
      case 'Firefox': return <Globe className="w-4 h-4 text-orange-400" />;
      case 'Safari': return <Globe className="w-4 h-4 text-blue-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'payment_successful':
      case 'booking_created':
      case 'checkout_started':
        return 'text-green-400';
      case 'payment_failed':
      case 'error_occurred':
        return 'text-red-400';
      case 'payment_attempted':
      case 'payment_method_selected':
        return 'text-yellow-400';
      case 'page_view':
      case 'event_view':
        return 'text-blue-400';
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">User Activity Logs</h1>
        </div>
        <div className="flex items-center justify-center min-h-96 text-white">
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-pulse" />
            <p className="text-lg">Loading user activities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">User Activity Logs</h1>
        <AdminCard>
          <AdminCardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Activities</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <Button onClick={() => fetchActivities()} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </AdminCardContent>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">User Activity Logs</h1>
          <p className="text-white/60">
            Monitor user behavior and track ticket purchasing activities
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button onClick={exportActivities} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => fetchActivities(currentPage)} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminCard>
              <AdminCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium">Total Activities</p>
                    <p className="text-2xl font-bold text-white">
                      {data.pagination.totalCount.toLocaleString()}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-400" />
                </div>
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium">Revenue from Activities</p>
                    <p className="text-2xl font-bold text-white">
                      {formatPrice(data.statistics.totalRevenue)}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-green-400" />
                </div>
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium">Success Rate</p>
                    <p className="text-2xl font-bold text-white">
                      {data.statistics.byStatus.find(s => s._id === 'success')?.count ?
                        Math.round((data.statistics.byStatus.find(s => s._id === 'success')!.count / data.pagination.totalCount) * 100) : 0}%
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium">Top Device</p>
                    <p className="text-2xl font-bold text-white">
                      {data.statistics.byDevice[0]?._id || 'N/A'}
                    </p>
                  </div>
                  {getDeviceIcon(data.statistics.byDevice[0]?._id || 'unknown')}
                </div>
              </AdminCardContent>
            </AdminCard>
          </div>

          {/* Filters */}
          {showFilters && (
            <AdminCard>
              <AdminCardHeader>
                <AdminCardTitle>Filters</AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Search</label>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users, events..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm mb-2">Action</label>
                    <select
                      value={actionFilter}
                      onChange={(e) => setActionFilter(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Actions</option>
                      <option value="page_view">Page View</option>
                      <option value="event_view">Event View</option>
                      <option value="checkout_started">Checkout Started</option>
                      <option value="payment_attempted">Payment Attempted</option>
                      <option value="payment_successful">Payment Successful</option>
                      <option value="payment_failed">Payment Failed</option>
                      <option value="booking_created">Booking Created</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="success">Success</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm mb-2">User ID</label>
                    <input
                      type="text"
                      value={userIdFilter}
                      onChange={(e) => setUserIdFilter(e.target.value)}
                      placeholder="Filter by user ID"
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm mb-2">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-white/70 text-sm mb-2">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button onClick={() => fetchActivities(1)} className="bg-blue-600 hover:bg-blue-700">
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
                      fetchActivities(1);
                    }}
                    className="bg-gray-600 hover:bg-gray-700"
                  >
                    Clear All
                  </Button>
                </div>
              </AdminCardContent>
            </AdminCard>
          )}

          {/* Activities List */}
          <AdminCard>
            <AdminCardHeader>
              <AdminCardTitle className="flex items-center justify-between">
                <span>User Activities</span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => clearOldActivities(30)}
                    className="bg-red-600 hover:bg-red-700 text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear 30d+
                  </Button>
                  <Button
                    onClick={() => clearOldActivities(90)}
                    className="bg-red-600 hover:bg-red-700 text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear 90d+
                  </Button>
                </div>
              </AdminCardTitle>
            </AdminCardHeader>
            <AdminCardContent className="p-0">
              {data.activities.length > 0 ? (
                <div className="divide-y divide-white/10">
                  {data.activities.map((activity) => (
                    <div key={activity._id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusIcon(activity.status)}
                            <span className={`font-medium ${getActionColor(activity.action)}`}>
                              {activity.action.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="text-white/50 text-sm">
                              {formatDate(activity.createdAt)}
                            </span>
                            {activity.duration && (
                              <span className="text-white/50 text-sm">
                                ({formatDuration(activity.duration)})
                              </span>
                            )}
                          </div>

                          <p className="text-white mb-2">{activity.description}</p>

                          <div className="flex flex-wrap gap-4 text-sm text-white/70">
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
                          className="bg-white/10 hover:bg-white/20 text-white/70 p-2"
                        >
                          {expandedActivity === activity._id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {expandedActivity === activity._id && (
                        <div className="mt-4 p-4 bg-white/5 rounded-lg">
                          <h4 className="text-white font-medium mb-3">Detailed Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong className="text-white/80">Session ID:</strong>
                              <span className="text-white/60 ml-2">{activity.sessionId || 'N/A'}</span>
                            </div>
                            <div>
                              <strong className="text-white/80">IP Address:</strong>
                              <span className="text-white/60 ml-2">{activity.ipAddress || 'N/A'}</span>
                            </div>
                            <div>
                              <strong className="text-white/80">Location:</strong>
                              <span className="text-white/60 ml-2">{activity.location || 'N/A'}</span>
                            </div>
                            <div>
                              <strong className="text-white/80">Referrer:</strong>
                              <span className="text-white/60 ml-2">{activity.referrer || 'N/A'}</span>
                            </div>
                            {activity.paymentMethod && (
                              <div>
                                <strong className="text-white/80">Payment Method:</strong>
                                <span className="text-white/60 ml-2">{activity.paymentMethod}</span>
                              </div>
                            )}
                            {activity.ticketType && (
                              <div>
                                <strong className="text-white/80">Ticket Type:</strong>
                                <span className="text-white/60 ml-2">{activity.ticketType}</span>
                              </div>
                            )}
                            {activity.quantity && (
                              <div>
                                <strong className="text-white/80">Quantity:</strong>
                                <span className="text-white/60 ml-2">{activity.quantity}</span>
                              </div>
                            )}
                          </div>

                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-4">
                              <strong className="text-white/80">Metadata:</strong>
                              <pre className="mt-2 p-3 bg-black/30 rounded text-white/70 text-xs overflow-auto">
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
                <div className="text-center py-12 text-white/60">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-white/40" />
                  <p>No user activities found</p>
                  <p className="text-sm mt-2">Activities will appear here as users interact with the platform</p>
                </div>
              )}
            </AdminCardContent>
          </AdminCard>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-white/60 text-sm">
                Showing {((data.pagination.currentPage - 1) * data.pagination.limit) + 1} to {Math.min(data.pagination.currentPage * data.pagination.limit, data.pagination.totalCount)} of {data.pagination.totalCount} activities
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => fetchActivities(data.pagination.currentPage - 1)}
                  disabled={!data.pagination.hasPrevPage}
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  Previous
                </Button>

                <span className="flex items-center px-4 py-2 text-white">
                  Page {data.pagination.currentPage} of {data.pagination.totalPages}
                </span>

                <Button
                  onClick={() => fetchActivities(data.pagination.currentPage + 1)}
                  disabled={!data.pagination.hasNextPage}
                  className="bg-white/10 hover:bg-white/20 disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}