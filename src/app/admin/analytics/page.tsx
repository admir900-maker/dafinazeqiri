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
  Eye, ArrowUpRight, ArrowDownRight, Target, Zap, Crown, FileText,
  ShoppingCart, CreditCard, TrendingDownIcon, Percent, Heart,
  MapPin, Globe, Smartphone, Mail, Share2, MessageSquare
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartPie, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Scatter, RadialBarChart, RadialBar, Treemap
} from 'recharts';

interface MonthlyData {
  month: string;
  year: number;
  revenue: number;
  bookings: number;
  growth?: number;
  profit?: number;
}

interface PopularEvent {
  name: string;
  bookings: number;
  revenue: number;
  category?: string;
  date?: string;
}

interface CategoryStat {
  category: string;
  count: number;
  revenue?: number;
  fill?: string;
}

interface TicketStat {
  type: string;
  count: number;
  revenue: number;
  percentage?: number;
}

interface RecentActivity {
  id: string;
  eventName: string;
  userName: string;
  amount: number;
  status: string;
  date: string;
  paymentMethod?: string;
}

interface HourlyData {
  hour: string;
  bookings: number;
  revenue: number;
}

interface DailyData {
  day: string;
  bookings: number;
  revenue: number;
  users: number;
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
    pendingBookings?: number;
    cancelledBookings?: number;
    refundedAmount?: number;
    conversionRate?: number;
    averageOrderValue?: number;
    repeatCustomerRate?: number;
  };
  monthlyRevenue: MonthlyData[];
  popularEvents: PopularEvent[];
  categoryStats: CategoryStat[];
  ticketStats: TicketStat[];
  recentActivity: RecentActivity[];
  hourlyData?: HourlyData[];
  dailyData?: DailyData[];
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

  // Chart colors
  const CHART_COLORS = {
    primary: '#cd7f32',
    secondary: '#b4530a',
    success: '#10b981',
    info: '#3b82f6',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#a855f7',
    pink: '#ec4899',
    cyan: '#06b6d4',
    orange: '#f97316',
  };

  const CATEGORY_COLORS = ['#cd7f32', '#b4530a', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('Amount')
                ? formatCurrency(entry.value)
                : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'pending': return 'text-orange-500';
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
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-[#cd7f32] animate-pulse" />
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
            <Button onClick={() => fetchAnalytics()} className="bg-[#cd7f32] hover:bg-[#b4530a]">
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
            className="bg-[#cd7f32] hover:bg-[#b4530a]"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Simple' : 'Advanced'}
          </Button>
          <Button onClick={exportData} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => fetchAnalytics()} className="bg-[#cd7f32] hover:bg-[#b4530a]">
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
                  <div className="p-3 bg-[#cd7f32]/20 rounded-lg">
                    <Ticket className="w-6 h-6 text-[#cd7f32]" />
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
                  <div className="p-3 bg-[#cd7f32]/20 rounded-lg">
                    <Calendar className="w-6 h-6 text-[#cd7f32]" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-[#cd7f32] h-2 rounded-full"
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
                  <Star className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                  <p className="text-white/70 text-sm">Popular Ticket</p>
                  <p className="text-lg font-bold text-orange-500">{getMostPopularTicketType()}</p>
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
                { id: 'performance', label: 'Performance', icon: Target },
                { id: 'trends', label: 'Trends', icon: TrendingUp },
                { id: 'activity', label: 'Activity', icon: Activity }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                    ? 'bg-[#cd7f32] text-white'
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
            <div className="space-y-6">
              {/* Revenue & Bookings Trend Chart */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#cd7f32]" />
                    Revenue & Bookings Trend
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={data.monthlyRevenue}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis
                        dataKey="month"
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ color: '#ffffff' }}
                        iconType="circle"
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        fill="url(#revenueGradient)"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={3}
                        name="Revenue"
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="bookings"
                        fill={CHART_COLORS.info}
                        name="Bookings"
                        radius={[8, 8, 0, 0]}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </AdminCardContent>
              </AdminCard>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Distribution Pie Chart */}
                <AdminCard>
                  <AdminCardHeader>
                    <AdminCardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-[#cd7f32]" />
                      Event Categories Distribution
                    </AdminCardTitle>
                  </AdminCardHeader>
                  <AdminCardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartPie>
                        <Pie
                          data={data.categoryStats.map((cat, idx) => ({
                            name: cat.category,
                            value: cat.count,
                            fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {data.categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </RechartPie>
                    </ResponsiveContainer>
                  </AdminCardContent>
                </AdminCard>

                {/* Top Events Radial Bar */}
                <AdminCard>
                  <AdminCardHeader>
                    <AdminCardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-orange-500" />
                      Top 5 Events Performance
                    </AdminCardTitle>
                  </AdminCardHeader>
                  <AdminCardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="10%"
                        outerRadius="90%"
                        data={data.popularEvents.slice(0, 5).map((event, idx) => ({
                          name: event.name.substring(0, 20),
                          value: event.bookings,
                          fill: CATEGORY_COLORS[idx]
                        }))}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <RadialBar
                          label={{ position: 'insideStart', fill: '#fff', fontSize: 12 } as any}
                          background
                          dataKey="value"
                        />
                        <Legend
                          iconSize={10}
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          wrapperStyle={{ fontSize: '12px', color: '#ffffff' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </AdminCardContent>
                </AdminCard>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* Revenue Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatCurrency(data.summary.totalRevenue)}
                    </p>
                  </AdminCardContent>
                </AdminCard>
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <ShoppingCart className="w-8 h-8 text-[#cd7f32] mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Avg Order Value</p>
                    <p className="text-2xl font-bold text-[#cd7f32]">
                      {formatCurrency(calculateAverageOrderValue())}
                    </p>
                  </AdminCardContent>
                </AdminCard>
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Revenue Growth</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {data.summary.revenueGrowth.toFixed(1)}%
                    </p>
                  </AdminCardContent>
                </AdminCard>
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <CreditCard className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Per Booking Avg</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {formatCurrency(data.summary.totalRevenue / (data.summary.totalBookings || 1))}
                    </p>
                  </AdminCardContent>
                </AdminCard>
              </div>

              {/* Revenue by Month - Bar Chart */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-400" />
                    Monthly Revenue Analysis
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis
                        dataKey="month"
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <YAxis
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#ffffff' }} />
                      <Bar
                        dataKey="revenue"
                        fill={CHART_COLORS.success}
                        name="Revenue"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </AdminCardContent>
              </AdminCard>

              {/* Ticket Type Revenue */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AdminCard>
                  <AdminCardHeader>
                    <AdminCardTitle className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-green-400" />
                      Revenue by Ticket Type
                    </AdminCardTitle>
                  </AdminCardHeader>
                  <AdminCardContent className="p-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={data.ticketStats}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                        <XAxis
                          type="number"
                          stroke="#ffffff70"
                          tick={{ fill: '#ffffff70' }}
                        />
                        <YAxis
                          type="category"
                          dataKey="type"
                          stroke="#ffffff70"
                          tick={{ fill: '#ffffff70' }}
                          width={100}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="revenue"
                          fill={CHART_COLORS.success}
                          name="Revenue"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </AdminCardContent>
                </AdminCard>

                {/* Top Revenue Events */}
                <AdminCard>
                  <AdminCardHeader>
                    <AdminCardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-orange-500" />
                      Top Revenue Generators
                    </AdminCardTitle>
                  </AdminCardHeader>
                  <AdminCardContent className="p-6">
                    <div className="space-y-4">
                      {data.popularEvents.slice(0, 5).map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-orange-700/20 rounded-full">
                              <span className="text-orange-500 font-bold text-sm">#{index + 1}</span>
                            </div>
                            <div>
                              <div className="text-white font-medium truncate max-w-48">
                                {event.name}
                              </div>
                              <div className="text-white/60 text-sm">{event.bookings} sales</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-semibold">
                              {formatCurrency(event.revenue)}
                            </div>
                            <div className="text-white/60 text-xs">
                              {formatCurrency(event.revenue / event.bookings)} avg
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminCardContent>
                </AdminCard>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-6">
              {/* Event KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Calendar className="w-8 h-8 text-[#cd7f32] mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Total Events</p>
                    <p className="text-2xl font-bold text-white">{data.summary.totalEvents}</p>
                  </AdminCardContent>
                </AdminCard>
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Active Events</p>
                    <p className="text-2xl font-bold text-green-400">{data.summary.activeEvents}</p>
                  </AdminCardContent>
                </AdminCard>
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Past Events</p>
                    <p className="text-2xl font-bold text-blue-400">{data.summary.pastEvents}</p>
                  </AdminCardContent>
                </AdminCard>
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Award className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Avg Bookings/Event</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {data.summary.totalEvents > 0 ? (data.summary.totalBookings / data.summary.totalEvents).toFixed(1) : '0'}
                    </p>
                  </AdminCardContent>
                </AdminCard>
              </div>

              {/* Category Performance Chart */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#cd7f32]" />
                    Category Performance
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.categoryStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis
                        dataKey="category"
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <YAxis
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="count"
                        fill={CHART_COLORS.primary}
                        name="Event Count"
                        radius={[8, 8, 0, 0]}
                      >
                        {data.categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </AdminCardContent>
              </AdminCard>

              {/* All Events Performance List */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-orange-500" />
                    All Events Performance Ranking
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <div className="space-y-3">
                    {data.popularEvents.length > 0 ? (
                      data.popularEvents.map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 bg-[#cd7f32]/20 rounded-full">
                              <span className="text-[#cd7f32] font-bold">{index + 1}</span>
                            </div>
                            <div>
                              <div className="text-white font-medium">{event.name}</div>
                              <div className="text-white/60 text-sm">{event.bookings} tickets sold</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-semibold">{formatCurrency(event.revenue)}</div>
                            <div className="text-white/60 text-sm">
                              {formatCurrency(event.revenue / event.bookings)} per ticket
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
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* User KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Users className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-white">{data.summary.uniqueUsers}</p>
                  </AdminCardContent>
                </AdminCard>
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Target className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Avg Bookings/User</p>
                    <p className="text-2xl font-bold text-blue-400">{data.summary.avgBookingsPerUser.toFixed(1)}</p>
                  </AdminCardContent>
                </AdminCard>
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Percent className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Conversion Rate</p>
                    <p className="text-2xl font-bold text-green-400">{calculateConversionRate().toFixed(1)}%</p>
                  </AdminCardContent>
                </AdminCard>
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Heart className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Customer LTV</p>
                    <p className="text-2xl font-bold text-pink-400">
                      {formatCurrency((data.summary.totalRevenue / data.summary.uniqueUsers) || 0)}
                    </p>
                  </AdminCardContent>
                </AdminCard>
              </div>

              {/* User Engagement Chart */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-400" />
                    User Engagement Metrics
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70">Total Customers</span>
                          <span className="text-white font-bold">{data.summary.uniqueUsers}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div className="bg-orange-400 h-2 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70">Active Buyers</span>
                          <span className="text-white font-bold">{data.summary.totalBookings}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div className="bg-green-400 h-2 rounded-full"
                            style={{
                              width: `${(data.summary.totalBookings / (data.summary.uniqueUsers || 1)) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70">Conversion Rate</span>
                          <span className="text-white font-bold">{calculateConversionRate().toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div className="bg-blue-400 h-2 rounded-full"
                            style={{ width: `${calculateConversionRate()}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={200}>
                      <RadarChart data={[
                        { metric: 'Engagement', value: Math.min(data.summary.avgBookingsPerUser * 20, 100) },
                        { metric: 'Conversion', value: calculateConversionRate() },
                        { metric: 'Loyalty', value: Math.min((data.summary.avgBookingsPerUser - 1) * 30, 100) },
                        { metric: 'Activity', value: Math.min((data.summary.totalBookings / data.summary.uniqueUsers) * 25, 100) },
                        { metric: 'Satisfaction', value: 85 }
                      ]}>
                        <PolarGrid stroke="#ffffff30" />
                        <PolarAngleAxis dataKey="metric" tick={{ fill: '#ffffff70' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#ffffff70' }} />
                        <Radar
                          dataKey="value"
                          stroke={CHART_COLORS.primary}
                          fill={CHART_COLORS.primary}
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </AdminCardContent>
              </AdminCard>

              {/* User Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminCard>
                  <AdminCardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm mb-1">Customer Lifetime Value</p>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency((data.summary.totalRevenue / data.summary.uniqueUsers) || 0)}
                        </p>
                      </div>
                      <Heart className="w-10 h-10 text-pink-400" />
                    </div>
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm mb-1">Avg Ticket Spend</p>
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(calculateAverageOrderValue())}
                        </p>
                      </div>
                      <DollarSign className="w-10 h-10 text-green-400" />
                    </div>
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm mb-1">Purchase Frequency</p>
                        <p className="text-2xl font-bold text-white">
                          {data.summary.avgBookingsPerUser.toFixed(2)}x
                        </p>
                      </div>
                      <Zap className="w-10 h-10 text-orange-500" />
                    </div>
                  </AdminCardContent>
                </AdminCard>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Target className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Conversion Rate</p>
                    <p className="text-2xl font-bold text-cyan-400">{calculateConversionRate().toFixed(1)}%</p>
                    <p className="text-green-400 text-xs mt-1 flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      +{Math.abs(data.summary.bookingsGrowth).toFixed(1)}%
                    </p>
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Award className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Event Success Rate</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {data.summary.totalEvents > 0 ? ((data.popularEvents.length / data.summary.totalEvents) * 100).toFixed(0) : 0}%
                    </p>
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <Zap className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Efficiency Score</p>
                    <p className="text-2xl font-bold text-pink-400">
                      {((calculateConversionRate() / 100) * 10).toFixed(1)}/10
                    </p>
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardContent className="p-6 text-center">
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-white/70 text-sm">Growth Rate</p>
                    <p className="text-2xl font-bold text-green-400">
                      +{data.summary.revenueGrowth.toFixed(1)}%
                    </p>
                  </AdminCardContent>
                </AdminCard>
              </div>

              {/* Performance Comparison Chart */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Monthly Performance Comparison
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={data.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis
                        dataKey="month"
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#ffffff' }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="revenue"
                        stroke={CHART_COLORS.success}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.success, r: 5 }}
                        activeDot={{ r: 8 }}
                        name="Revenue"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="bookings"
                        stroke={CHART_COLORS.info}
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.info, r: 5 }}
                        activeDot={{ r: 8 }}
                        name="Bookings"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </AdminCardContent>
              </AdminCard>

              {/* Performance Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AdminCard>
                  <AdminCardHeader>
                    <AdminCardTitle className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-orange-500" />
                      Top Performers
                    </AdminCardTitle>
                  </AdminCardHeader>
                  <AdminCardContent className="p-6">
                    <div className="space-y-3">
                      <div className="p-3 bg-green-600/20 border border-green-600/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm font-semibold">Best Category</span>
                        </div>
                        <p className="text-white font-bold">{getTopPerformingCategory()}</p>
                      </div>

                      <div className="p-3 bg-blue-600/20 border border-blue-600/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-sm font-semibold">Most Popular Ticket</span>
                        </div>
                        <p className="text-white font-bold">{getMostPopularTicketType()}</p>
                      </div>

                      <div className="p-3 bg-orange-600/20 border border-orange-600/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-400 text-sm font-semibold">Top Event</span>
                        </div>
                        <p className="text-white font-bold truncate">
                          {data.popularEvents[0]?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardHeader>
                    <AdminCardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-cyan-400" />
                      Key Performance Indicators
                    </AdminCardTitle>
                  </AdminCardHeader>
                  <AdminCardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-sm">Revenue Growth</span>
                          <span className="text-green-400 font-bold">
                            {data.summary.revenueGrowth.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-green-400 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(Math.abs(data.summary.revenueGrowth), 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-sm">Bookings Growth</span>
                          <span className="text-blue-400 font-bold">
                            {data.summary.bookingsGrowth.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-blue-400 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(Math.abs(data.summary.bookingsGrowth), 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/70 text-sm">User Engagement</span>
                          <span className="text-orange-400 font-bold">
                            {(data.summary.avgBookingsPerUser * 20).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className="bg-orange-400 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(data.summary.avgBookingsPerUser * 20, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </AdminCardContent>
                </AdminCard>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="space-y-6">
              {/* Trend Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AdminCard>
                  <AdminCardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <TrendingUp className="w-8 h-8 text-green-400" />
                      <div className="text-green-400 text-xs font-semibold px-2 py-1 bg-green-400/20 rounded">
                        TRENDING UP
                      </div>
                    </div>
                    <p className="text-white/70 text-sm mb-1">Revenue Momentum</p>
                    <p className="text-2xl font-bold text-white mb-1">
                      {formatCurrency(data.summary.totalRevenue)}
                    </p>
                    <p className="text-green-400 text-sm">
                      +{data.summary.revenueGrowth.toFixed(1)}% from last period
                    </p>
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Users className="w-8 h-8 text-blue-400" />
                      <div className="text-blue-400 text-xs font-semibold px-2 py-1 bg-blue-400/20 rounded">
                        GROWING
                      </div>
                    </div>
                    <p className="text-white/70 text-sm mb-1">Customer Base</p>
                    <p className="text-2xl font-bold text-white mb-1">
                      {data.summary.uniqueUsers}
                    </p>
                    <p className="text-blue-400 text-sm">
                      {data.summary.avgBookingsPerUser.toFixed(1)} bookings per user
                    </p>
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="w-8 h-8 text-orange-500" />
                      <div className="text-orange-500 text-xs font-semibold px-2 py-1 bg-orange-500/20 rounded">
                        ACTIVE
                      </div>
                    </div>
                    <p className="text-white/70 text-sm mb-1">Booking Activity</p>
                    <p className="text-2xl font-bold text-white mb-1">
                      {data.summary.totalBookings}
                    </p>
                    <p className="text-orange-500 text-sm">
                      +{data.summary.bookingsGrowth.toFixed(1)}% growth rate
                    </p>
                  </AdminCardContent>
                </AdminCard>
              </div>

              {/* Revenue Trend with Area Chart */}
              <AdminCard>
                <AdminCardHeader>
                  <AdminCardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Revenue Trend Analysis
                  </AdminCardTitle>
                </AdminCardHeader>
                <AdminCardContent className="p-6">
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data.monthlyRevenue}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.info} stopOpacity={0.8} />
                          <stop offset="95%" stopColor={CHART_COLORS.info} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis
                        dataKey="month"
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <YAxis
                        stroke="#ffffff70"
                        tick={{ fill: '#ffffff70' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ color: '#ffffff' }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke={CHART_COLORS.success}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        strokeWidth={2}
                        name="Revenue"
                      />
                      <Area
                        type="monotone"
                        dataKey="bookings"
                        stroke={CHART_COLORS.info}
                        fillOpacity={1}
                        fill="url(#colorBookings)"
                        strokeWidth={2}
                        name="Bookings"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </AdminCardContent>
              </AdminCard>

              {/* Trend Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AdminCard>
                  <AdminCardHeader>
                    <AdminCardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#cd7f32]" />
                      Monthly Trends
                    </AdminCardTitle>
                  </AdminCardHeader>
                  <AdminCardContent className="p-6">
                    <div className="space-y-3">
                      {data.monthlyRevenue.slice(-3).reverse().map((month, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-12 rounded ${index === 0 ? 'bg-green-400' : index === 1 ? 'bg-blue-400' : 'bg-orange-400'}`}></div>
                            <div>
                              <p className="text-white font-medium">{month.month} {month.year}</p>
                              <p className="text-white/60 text-sm">{month.bookings} bookings</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">{formatCurrency(month.revenue)}</p>
                            <p className="text-green-400 text-xs flex items-center justify-end gap-1">
                              <TrendingUp className="w-3 h-3" />
                              Strong
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AdminCardContent>
                </AdminCard>

                <AdminCard>
                  <AdminCardHeader>
                    <AdminCardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-orange-500" />
                      Category Trends
                    </AdminCardTitle>
                  </AdminCardHeader>
                  <AdminCardContent className="p-6">
                    <div className="space-y-3">
                      {data.categoryStats.slice(0, 3).map((cat, index) => {
                        const percentage = (cat.count / data.summary.totalEvents) * 100;
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-white text-sm font-medium">{cat.category}</span>
                              <span className="text-white/70 text-sm">{cat.count} events</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: CATEGORY_COLORS[index]
                                }}
                              ></div>
                            </div>
                            <p className="text-white/50 text-xs">{percentage.toFixed(1)}% of total events</p>
                          </div>
                        );
                      })}
                    </div>
                  </AdminCardContent>
                </AdminCard>
              </div>
            </div>
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
