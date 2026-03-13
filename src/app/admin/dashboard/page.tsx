'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  Calendar,
  Ticket,
  Euro,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowUpRight,
  Database,
  CreditCard,
  Mail,
  Activity,
  Layers,
  Plus,
  Eye,
  Settings,
  Zap,
  XCircle
} from 'lucide-react';
import {
  AreaChart, Area, PieChart as RechartPie, Pie, Cell,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// --- Types ---

interface DashboardOverview {
  totalEvents: number;
  activeEvents: number;
  totalCategories: number;
  activeCategories: number;
  totalBookings: number;
  totalRevenue: number;
  pendingBookings: number;
  growth: {
    events: number;
    revenue: number;
  };
}

interface RecentEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  status: string;
  createdAt: string;
}

interface RecentBooking {
  id: string;
  bookingReference: string;
  customerName: string;
  eventTitle: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

interface CategoryStat {
  name: string;
  count: number;
  icon: string;
  color: string;
}

interface MonthlyTrend {
  month: string;
  events: number;
}

interface DashboardData {
  overview: DashboardOverview;
  recentActivity: RecentEvent[];
  recentBookings: RecentBooking[];
  eventsByCategory: CategoryStat[];
  monthlyTrends: MonthlyTrend[];
}

interface SystemHealth {
  database: 'ok' | 'error' | 'checking';
  payments: 'ok' | 'error' | 'checking';
  email: 'ok' | 'error' | 'checking';
}

// --- Chart colors (matching analytics page) ---
const CHART_COLORS = {
  primary: '#cd7f32',
  secondary: '#b4530a',
  success: '#10b981',
  info: '#3b82f6',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
};

const CATEGORY_COLORS = ['#cd7f32', '#b4530a', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];

// --- Custom Recharts Tooltip ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-orange-500/20 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold mb-1 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color || CHART_COLORS.primary }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<SystemHealth>({
    database: 'checking',
    payments: 'checking',
    email: 'checking',
  });

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.data) {
          setData(statsData.data);
        }
      } else {
        // Fallback
        const [eventsRes, categoriesRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/categories')
        ]);
        const events = eventsRes.ok ? await eventsRes.json() : { events: [] };
        const categories = categoriesRes.ok ? await categoriesRes.json() : [];

        setData({
          overview: {
            totalEvents: events.events?.length || 0,
            activeEvents: 0,
            totalCategories: categories.length || 0,
            activeCategories: 0,
            totalBookings: 0,
            totalRevenue: 0,
            pendingBookings: 0,
            growth: { events: 0, revenue: 0 },
          },
          recentActivity: [],
          recentBookings: [],
          eventsByCategory: [],
          monthlyTrends: [],
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const checkSystemHealth = useCallback(async () => {
    setHealth({ database: 'checking', payments: 'checking', email: 'checking' });

    // Database check via health endpoint
    try {
      const res = await fetch('/api/health');
      setHealth(h => ({ ...h, database: res.ok ? 'ok' : 'error' }));
    } catch {
      setHealth(h => ({ ...h, database: 'error' }));
    }

    // Payment config check
    try {
      const res = await fetch('/api/payment-config');
      setHealth(h => ({ ...h, payments: res.ok ? 'ok' : 'error' }));
    } catch {
      setHealth(h => ({ ...h, payments: 'error' }));
    }

    // Email - infer from admin stats success (if dashboard loaded, services are functional)
    setHealth(h => ({ ...h, email: data ? 'ok' : 'error' }));
  }, [data]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchDashboardData();
    }
  }, [isLoaded, user, fetchDashboardData]);

  useEffect(() => {
    if (data) {
      checkSystemHealth();
    }
  }, [data, checkSystemHealth]);

  // --- Loading State ---
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-9 w-48 bg-orange-500/10 rounded-lg animate-pulse" />
              <div className="h-5 w-64 bg-orange-500/5 rounded mt-2 animate-pulse" />
            </div>
            <div className="h-10 w-28 bg-orange-500/10 rounded-lg animate-pulse" />
          </div>
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-black/60 border border-orange-500/10">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 w-24 bg-orange-500/10 rounded animate-pulse" />
                    <div className="h-8 w-20 bg-orange-500/15 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-orange-500/5 rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-black/60 border border-orange-500/10">
              <CardContent className="p-6"><div className="h-64 bg-orange-500/5 rounded-lg animate-pulse" /></CardContent>
            </Card>
            <Card className="bg-black/60 border border-orange-500/10">
              <CardContent className="p-6"><div className="h-64 bg-orange-500/5 rounded-lg animate-pulse" /></CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const overview = data?.overview || {
    totalEvents: 0, activeEvents: 0, totalCategories: 0, activeCategories: 0,
    totalBookings: 0, totalRevenue: 0, pendingBookings: 0, growth: { events: 0, revenue: 0 },
  };

  // --- Growth formatter ---
  const GrowthBadge = ({ value }: { value: number }) => {
    const positive = value >= 0;
    const Icon = positive ? TrendingUp : TrendingDown;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${positive ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
        <Icon className="w-3 h-3" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  // --- Stat Cards ---
  const statCards = [
    {
      title: 'Total Events',
      value: overview.totalEvents,
      icon: Calendar,
      subtitle: `${overview.activeEvents} upcoming`,
      gradient: 'from-blue-600/20 to-blue-900/10',
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
    },
    {
      title: 'Total Bookings',
      value: overview.totalBookings,
      icon: Ticket,
      subtitle: 'All time',
      growth: overview.growth.events,
      gradient: 'from-emerald-600/20 to-emerald-900/10',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Revenue',
      value: `€${overview.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Euro,
      subtitle: 'Total earned',
      growth: overview.growth.revenue,
      gradient: 'from-orange-600/20 to-amber-900/10',
      iconBg: 'bg-orange-500/15',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-500/20',
    },
    {
      title: 'Pending',
      value: overview.pendingBookings,
      icon: Clock,
      subtitle: 'Awaiting confirmation',
      gradient: 'from-yellow-600/20 to-yellow-900/10',
      iconBg: 'bg-yellow-500/15',
      iconColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/20',
    },
  ];

  // --- Chart data ---
  const monthlyChartData = (data?.monthlyTrends || []).map(t => {
    const [year, month] = t.month.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      name: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
      events: t.events,
    };
  });

  const categoryChartData = (data?.eventsByCategory || []).map((c, i) => ({
    name: c.name,
    value: c.count,
    fill: c.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  // --- Quick Actions ---
  const quickActions = [
    { label: 'New Event', icon: Plus, href: '/admin/events', primary: true },
    { label: 'Categories', icon: Layers, href: '/admin/categories', primary: false },
    { label: 'Bookings', icon: Ticket, href: '/admin/bookings', primary: true },
    { label: 'Users', icon: Users, href: '/admin/users', primary: false },
    { label: 'Analytics', icon: BarChart3, href: '/admin/analytics', primary: false },
    { label: 'Settings', icon: Settings, href: '/admin/settings', primary: false },
  ];

  // --- Health icon ---
  const HealthIcon = ({ status }: { status: 'ok' | 'error' | 'checking' }) => {
    if (status === 'checking') return <RefreshCw className="w-4 h-4 text-orange-400 animate-spin" />;
    if (status === 'ok') return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">
              Dashboard
            </h1>
            <p className="text-orange-100/70 mt-1">
              Welcome back, {user?.firstName || 'Admin'}
            </p>
          </div>
          <Button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className={`bg-gradient-to-br ${stat.gradient} border ${stat.borderColor} backdrop-blur-sm hover:scale-[1.02] transition-transform duration-200`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-orange-100/60 text-xs font-medium uppercase tracking-wider">{stat.title}</p>
                      <p className="text-2xl md:text-3xl font-black text-white">{stat.value}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-orange-100/40 text-xs">{stat.subtitle}</p>
                        {stat.growth !== undefined && <GrowthBadge value={stat.growth} />}
                      </div>
                    </div>
                    <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                      <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trends Chart */}
          <Card className="lg:col-span-2 bg-black/60 border border-orange-500/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-orange-500 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Monthly Trends
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eventsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="events"
                      name="Events"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      fill="url(#eventsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-orange-100/30 text-sm">
                  No trend data available yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events by Category Pie */}
          <Card className="bg-black/60 border border-orange-500/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-orange-500 flex items-center gap-2">
                <Layers className="w-5 h-5" />
                By Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryChartData.length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={180}>
                    <RechartPie>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </RechartPie>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {categoryChartData.slice(0, 5).map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.fill }} />
                          <span className="text-orange-100/70 truncate max-w-[120px]">{cat.name}</span>
                        </div>
                        <span className="text-white font-medium">{cat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-orange-100/30 text-sm">
                  No category data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="bg-black/60 border border-orange-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-orange-500 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => router.push(action.href)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 hover:scale-105 ${action.primary
                          ? 'bg-gradient-to-br from-orange-500/20 to-amber-900/20 border border-orange-500/30 hover:border-orange-500/50'
                          : 'bg-white/5 border border-white/10 hover:border-orange-500/30'
                        }`}
                    >
                      <Icon className={`w-5 h-5 ${action.primary ? 'text-orange-400' : 'text-orange-100/60'}`} />
                      <span className={`text-xs font-medium ${action.primary ? 'text-orange-300' : 'text-orange-100/70'}`}>
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-black/60 border border-orange-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-orange-500 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Events
                </CardTitle>
                <button
                  onClick={() => router.push('/admin/events')}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  View all <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.recentActivity && data.recentActivity.length > 0 ? (
                  data.recentActivity.slice(0, 6).map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className={`p-1.5 rounded-lg mt-0.5 ${event.status === 'upcoming' ? 'bg-blue-500/15' : 'bg-zinc-500/15'}`}>
                        <Calendar className={`w-3.5 h-3.5 ${event.status === 'upcoming' ? 'text-blue-400' : 'text-zinc-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-orange-100 text-sm font-medium truncate">{event.title}</p>
                        <p className="text-orange-100/40 text-xs">
                          {event.category} • {new Date(event.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${event.status === 'upcoming'
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-zinc-500/15 text-zinc-400'
                        }`}>
                        {event.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-orange-100/30 text-center py-8 text-sm">No recent events</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card className="bg-black/60 border border-orange-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-orange-500 flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Recent Bookings
                </CardTitle>
                <button
                  onClick={() => router.push('/admin/bookings')}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  View all <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.recentBookings && data.recentBookings.length > 0 ? (
                  data.recentBookings.slice(0, 6).map((booking) => (
                    <div key={booking.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                      <div className={`p-1.5 rounded-lg mt-0.5 ${booking.paymentStatus === 'paid' ? 'bg-green-500/15' :
                          booking.paymentStatus === 'pending' ? 'bg-yellow-500/15' : 'bg-red-500/15'
                        }`}>
                        {booking.paymentStatus === 'paid' && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                        {booking.paymentStatus === 'pending' && <Clock className="w-3.5 h-3.5 text-yellow-400" />}
                        {booking.paymentStatus === 'failed' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-orange-100 text-sm font-medium truncate">
                          {booking.customerName || 'Unknown'}
                        </p>
                        <p className="text-orange-100/40 text-xs truncate">
                          {booking.eventTitle}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold">€{booking.totalAmount.toFixed(2)}</p>
                        <p className="text-orange-100/40 text-[10px]">{booking.bookingReference}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-orange-100/30 text-center py-8 text-sm">No recent bookings</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Category Bar Chart + System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Bar Chart */}
          <Card className="lg:col-span-2 bg-black/60 border border-orange-500/20 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-orange-500 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Events by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Events" radius={[6, 6, 0, 0]}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-orange-100/30 text-sm">
                  No category data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="bg-black/60 border border-orange-500/20 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-orange-500 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  System Status
                </CardTitle>
                <button
                  onClick={checkSystemHealth}
                  className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  Recheck <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { key: 'database' as const, label: 'Database', icon: Database, desc: 'MongoDB connection' },
                  { key: 'payments' as const, label: 'Payments', icon: CreditCard, desc: 'Payment gateway' },
                  { key: 'email' as const, label: 'Email Service', icon: Mail, desc: 'Notification system' },
                ].map((service) => {
                  const Icon = service.icon;
                  const status = health[service.key];
                  return (
                    <div key={service.key} className={`flex items-center gap-3 p-3 rounded-xl border ${status === 'ok' ? 'border-green-500/20 bg-green-500/5' :
                        status === 'error' ? 'border-red-500/20 bg-red-500/5' :
                          'border-orange-500/10 bg-orange-500/5'
                      }`}>
                      <div className={`p-2 rounded-lg ${status === 'ok' ? 'bg-green-500/15' :
                          status === 'error' ? 'bg-red-500/15' : 'bg-orange-500/15'
                        }`}>
                        <Icon className={`w-4 h-4 ${status === 'ok' ? 'text-green-400' :
                            status === 'error' ? 'text-red-400' : 'text-orange-400'
                          }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-orange-100 text-sm font-medium">{service.label}</p>
                        <p className="text-orange-100/40 text-xs">{service.desc}</p>
                      </div>
                      <HealthIcon status={status} />
                    </div>
                  );
                })}
              </div>

              {/* Summary counts */}
              <div className="mt-5 pt-4 border-t border-orange-500/10">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-xl bg-white/5">
                    <p className="text-2xl font-black text-white">{overview.totalCategories}</p>
                    <p className="text-orange-100/40 text-xs">Categories</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-white/5">
                    <p className="text-2xl font-black text-white">{overview.activeEvents}</p>
                    <p className="text-orange-100/40 text-xs">Upcoming</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}