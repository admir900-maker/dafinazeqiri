'use client';

import { useState, useEffect } from 'react';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  RefreshCw, DollarSign, Users, Calendar, Ticket, TrendingUp, TrendingDown,
  BarChart3, PieChart, Activity, Clock, Star, Award, Download, Filter,
  Eye, ArrowUpRight, ArrowDownRight, Target, Zap, Crown, FileText
} from 'lucide-react';

interface MonthlyData {
  month: string;
  year: number;
  revenue: number;
  bookings: number;
}

interface PopularEvent {
  name: string;
  bookings: number;
  revenue: number;
}

interface CategoryStat {
  category: string;
  count: number;
}

interface TicketStat {
  type: string;
  count: number;
  revenue: number;
}

interface RecentActivity {
  id: string;
  eventName: string;
  userName: string;
  amount: number;
  status: string;
  date: string;
}

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalBookings: number;
    totalEvents: number;
    activeEvents: number;
    pastEvents: number;
    uniqueUsers: number;
    avgBookingsPerUser: number;
    revenueGrowth: number;
    bookingsGrowth: number;
  };
  monthlyRevenue: MonthlyData[];
  popularEvents: PopularEvent[];
  categoryStats: CategoryStat[];
  ticketStats: TicketStat[];
  recentActivity: RecentActivity[];
  timeframe: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function AnalyticsPage() {
  const { currencySymbol } = useCurrency();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('6months');
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchAnalytics = async (selectedTimeframe = timeframe) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/analytics?timeframe=${selectedTimeframe}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    fetchAnalytics(newTimeframe);
  };

  const exportData = () => {
    if (!data) return;

    const exportData = {
      summary: data.summary,
      monthlyRevenue: data.monthlyRevenue,
      popularEvents: data.popularEvents,
      categoryStats: data.categoryStats,
      ticketStats: data.ticketStats,
      exportDate: new Date().toISOString(),
      timeframe: data.timeframe
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${data.timeframe}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const color = isPositive ? 'text-green-400' : 'text-red-400';

    return (
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="w-4 h-4" />
        <span>{Math.abs(growth).toFixed(1)}%</span>
      </div>
    );
  };

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-white/70';
    }
  };

  const calculateConversionRate = () => {
    if (!data) return 0;
    return data.summary.totalBookings > 0 ?
      ((data.summary.totalBookings / data.summary.uniqueUsers) * 100) : 0;
  };

  const calculateAverageOrderValue = () => {
    if (!data || data.summary.totalBookings === 0) return 0;
    return data.summary.totalRevenue / data.summary.totalBookings;
  };

  const getTopPerformingCategory = () => {
    if (!data || data.categoryStats.length === 0) return 'N/A';
    return data.categoryStats[0].category;
  };

  const getMostPopularTicketType = () => {
    if (!data || data.ticketStats.length === 0) return 'N/A';
    return data.ticketStats[0].type;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
          <div className="flex gap-2">
            <Button disabled className="bg-white/10">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-96 text-white">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-pulse" />
            <p className="text-lg">Loading comprehensive analytics...</p>
            <p className="text-white/60 text-sm mt-2">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Analytics & Reports</h1>
        <AdminCard>
          <AdminCardContent className="p-8 text-center">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Analytics</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <Button onClick={() => fetchAnalytics()} className="bg-blue-600 hover:bg-blue-700">
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
          <h1 className="text-3xl font-bold text-white mb-2">Analytics & Reports</h1>
          <p className="text-white/60">
            Comprehensive insights into your event platform performance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1month">Last Month</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
            <option value="all">All Time</option>
          </select>
          <Button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Simple' : 'Advanced'}
          </Button>
          <Button onClick={exportData} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => fetchAnalytics()} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminCard>
              <AdminCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(data.summary.totalRevenue)}
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                      AOV: {formatCurrency(calculateAverageOrderValue())}
                    </p>
                  </div>
                  <div className="p-3 bg-green-600/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-white/50 text-sm">Growth</span>
                  {formatGrowth(data.summary.revenueGrowth)}
                </div>
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium">Total Bookings</p>
                    <p className="text-2xl font-bold text-white">
                      {data.summary.totalBookings.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                      Conversion: {calculateConversionRate().toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-blue-600/20 rounded-lg">
                    <Ticket className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-white/50 text-sm">Growth</span>
                  {formatGrowth(data.summary.bookingsGrowth)}
                </div>
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium">Active Events</p>
                    <p className="text-2xl font-bold text-white">
                      {data.summary.activeEvents}
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                      {data.summary.totalEvents} total, {data.summary.pastEvents} past
                    </p>
                  </div>
                  <div className="p-3 bg-purple-600/20 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-purple-400 h-2 rounded-full"
                      style={{
                        width: `${data.summary.totalEvents > 0 ? (data.summary.activeEvents / data.summary.totalEvents) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-medium">Unique Users</p>
                    <p className="text-2xl font-bold text-white">
                      {data.summary.uniqueUsers.toLocaleString()}
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                      Avg: {data.summary.avgBookingsPerUser.toFixed(1)} bookings/user
                    </p>
                  </div>
                  <div className="p-3 bg-orange-600/20 rounded-lg">
                    <Users className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <span className="text-orange-400 text-sm font-medium">
                    <Eye className="w-3 h-3 inline mr-1" />
                    User Engagement
                  </span>
                </div>
              </AdminCardContent>
            </AdminCard>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AdminCard>
                <AdminCardContent className="p-6 text-center">
                  <Target className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-white/70 text-sm">Top Category</p>
                  <p className="text-lg font-bold text-cyan-400">{getTopPerformingCategory()}</p>
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardContent className="p-6 text-center">
                  <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-white/70 text-sm">Popular Ticket</p>
                  <p className="text-lg font-bold text-yellow-400">{getMostPopularTicketType()}</p>
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardContent className="p-6 text-center">
                  <Zap className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                  <p className="text-white/70 text-sm">Efficiency Score</p>
                  <p className="text-lg font-bold text-pink-400">
                    {((calculateConversionRate() / 100) * 10).toFixed(1)}/10
                  </p>
                </AdminCardContent>
              </AdminCard>
            </div>
          )}

          {/* Tabs for different views */}
          <div className="bg-white/5 rounded-lg p-1">
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'revenue', label: 'Revenue', icon: DollarSign },
                { id: 'events', label: 'Events', icon: Calendar },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'activity', label: 'Activity', icon: Activity }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Revenue Chart */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Monthly Revenue Trend
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <div className="space-y-4">
                    {data.monthlyRevenue.length > 0 ? (
                      data.monthlyRevenue.map((month, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                            <span className="text-white font-medium">
                              {month.month} {month.year}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-semibold">
                              {formatCurrency(month.revenue)}
                            </div>
                            <div className="text-white/60 text-sm">
                              {month.bookings} bookings
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/60 text-center py-8">No revenue data available</p>
                    )}
                  </div>
                </AdminCardContent>
              </AdminCard>

              {/* Category Distribution */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-400" />
                    Event Categories
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <div className="space-y-3">
                    {data.categoryStats.length > 0 ? (
                      data.categoryStats.map((category, index) => {
                        const colors = ['bg-purple-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-pink-400'];
                        const color = colors[index % colors.length];
                        const percentage = data.summary.totalEvents > 0 ?
                          (category.count / data.summary.totalEvents * 100) : 0;

                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 ${color} rounded-full`}></div>
                              <span className="text-white">{category.category}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-semibold">{category.count}</div>
                              <div className="text-white/60 text-sm">{percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-white/60 text-center py-8">No category data available</p>
                    )}
                  </div>
                </AdminCardContent>
              </AdminCard>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ticket Type Revenue */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-green-400" />
                    Revenue by Ticket Type
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <div className="space-y-4">
                    {data.ticketStats.length > 0 ? (
                      data.ticketStats.map((ticket, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <div className="text-white font-medium">{ticket.type}</div>
                            <div className="text-white/60 text-sm">{ticket.count} sold</div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-semibold">
                              {formatCurrency(ticket.revenue)}
                            </div>
                            <div className="text-white/60 text-sm">
                              {formatCurrency(ticket.revenue / ticket.count)} avg
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/60 text-center py-8">No ticket sales data available</p>
                    )}
                  </div>
                </AdminCardContent>
              </AdminCard>

              {/* Top Events by Revenue */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    Top Performing Events
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <div className="space-y-4">
                    {data.popularEvents.length > 0 ? (
                      data.popularEvents.slice(0, 5).map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-yellow-600/20 rounded-full">
                              <span className="text-yellow-400 font-bold text-sm">#{index + 1}</span>
                            </div>
                            <div>
                              <div className="text-white font-medium truncate max-w-48">
                                {event.name}
                              </div>
                              <div className="text-white/60 text-sm">{event.bookings} bookings</div>
                            </div>
                          </div>
                          <div className="text-yellow-400 font-semibold">
                            {formatCurrency(event.revenue)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/60 text-center py-8">No events data available</p>
                    )}
                  </div>
                </AdminCardContent>
              </AdminCard>
            </div>
          )}

          {activeTab === 'events' && (
            <AdminCard>
              <AdminCardHeader>
                <AdminCardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  Event Performance Analysis
                </AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <Calendar className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{data.summary.activeEvents}</div>
                    <div className="text-white/60 text-sm">Active Events</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{data.summary.pastEvents}</div>
                    <div className="text-white/60 text-sm">Past Events</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <Award className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">
                      {data.summary.totalBookings > 0 ?
                        (data.summary.totalBookings / data.summary.totalEvents).toFixed(1) : '0'
                      }
                    </div>
                    <div className="text-white/60 text-sm">Avg Bookings/Event</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4">All Events Performance</h3>
                  {data.popularEvents.length > 0 ? (
                    data.popularEvents.map((event, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-purple-600/20 rounded-full">
                            <span className="text-purple-400 font-bold">{index + 1}</span>
                          </div>
                          <div>
                            <div className="text-white font-medium">{event.name}</div>
                            <div className="text-white/60 text-sm">{event.bookings} bookings</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-semibold">{formatCurrency(event.revenue)}</div>
                          <div className="text-white/60 text-sm">
                            {formatCurrency(event.revenue / event.bookings)} per booking
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8">No events performance data available</p>
                  )}
                </div>
              </AdminCardContent>
            </AdminCard>
          )}

          {activeTab === 'users' && (
            <AdminCard>
              <AdminCardHeader>
                <AdminCardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-400" />
                  User Analytics
                </AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <Users className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{data.summary.uniqueUsers}</div>
                    <div className="text-white/60 text-sm">Total Users</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <Target className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{data.summary.avgBookingsPerUser.toFixed(1)}</div>
                    <div className="text-white/60 text-sm">Avg Bookings/User</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <Zap className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{calculateConversionRate().toFixed(1)}%</div>
                    <div className="text-white/60 text-sm">Conversion Rate</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <DollarSign className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{formatCurrency(calculateAverageOrderValue())}</div>
                    <div className="text-white/60 text-sm">Avg Order Value</div>
                  </div>
                </div>

                <div className="text-center py-8 text-white/60">
                  <Users className="w-12 h-12 mx-auto mb-4 text-orange-400" />
                  <p>Detailed user analytics coming soon!</p>
                  <p className="text-sm mt-2">Track user behavior, segments, and lifetime value</p>
                </div>
              </AdminCardContent>
            </AdminCard>
          )}

          {activeTab === 'activity' && (
            <AdminCard>
              <AdminCardHeader>
                <AdminCardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Recent Activity
                </AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="p-6">
                <div className="space-y-4">
                  {data.recentActivity.length > 0 ? (
                    data.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-cyan-600/20 rounded-full">
                            <Ticket className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{activity.eventName}</div>
                            <div className="text-white/60 text-sm">{activity.userName}</div>
                            <div className="text-white/50 text-xs">{formatDate(activity.date)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-semibold">{formatCurrency(activity.amount)}</div>
                          <div className={`text-sm font-medium ${getStatusColor(activity.status)}`}>
                            {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-white/60">
                      <Activity className="w-12 h-12 mx-auto mb-4 text-cyan-400" />
                      <p>No recent activity found</p>
                      <p className="text-sm mt-2">Activity will appear here as users make bookings</p>
                    </div>
                  )}
                </div>
              </AdminCardContent>
            </AdminCard>
          )}
        </>
      )}

      {!data && (
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>Analytics Dashboard</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="p-8 text-center">
            <BarChart3 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Analytics Data</h2>
            <p className="text-white/70 mb-6">
              Create some events and bookings to see comprehensive analytics and insights.
            </p>
            <Button onClick={() => fetchAnalytics()} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Check Again
            </Button>
          </AdminCardContent>
        </AdminCard>
      )}
    </div>
  );
}
