'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  Calendar,
  Ticket,
  DollarSign,
  Euro,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface DashboardStats {
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  activeUsers: number;
  pendingBookings: number;
  categories: number;
  // New API structure
  overview?: {
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
  };
  recentActivity?: Array<{
    id: string;
    title: string;
    date: string;
    category: string;
    status: string;
    createdAt: string;
  }>;
  recentBookings?: Array<{
    id: string;
    bookingReference: string;
    customerName: string;
    eventTitle: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  eventsByCategory?: Array<{
    name: string;
    count: number;
    icon: string;
    color: string;
  }>;
  monthlyTrends?: Array<{
    month: string;
    events: number;
  }>;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'error';
}

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingBookings: 0,
    categories: 0
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard stats from the new API
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success && statsData.data) {
          const data = statsData.data;

          setStats({
            totalEvents: data.overview.totalEvents,
            totalBookings: data.overview.totalBookings,
            totalRevenue: data.overview.totalRevenue,
            activeUsers: 0, // TODO: Get from users API
            pendingBookings: data.overview.pendingBookings,
            categories: data.overview.totalCategories,
            overview: data.overview,
            recentActivity: data.recentActivity,
            recentBookings: data.recentBookings,
            eventsByCategory: data.eventsByCategory,
            monthlyTrends: data.monthlyTrends
          });

          // Set activities from API
          if (data.recentActivity) {
            setActivities(data.recentActivity.map((activity: any) => ({
              id: activity.id,
              type: 'event',
              description: `Event: ${activity.title}`,
              timestamp: activity.createdAt,
              status: activity.status === 'upcoming' ? 'success' : 'pending'
            })));
          }
        }
      } else {
        // Fallback to fetch individual APIs
        const [eventsRes, categoriesRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/categories')
        ]);

        const events = eventsRes.ok ? await eventsRes.json() : { events: [] };
        const categories = categoriesRes.ok ? await categoriesRes.json() : [];

        setStats({
          totalEvents: events.events?.length || 0,
          totalBookings: 0, // TODO: Implement bookings API
          totalRevenue: 0, // TODO: Calculate from bookings
          activeUsers: 0, // TODO: Get from users API
          pendingBookings: 0, // TODO: Implement bookings API
          categories: categories.length || 0
        });

        // Mock recent activities for fallback
        setActivities([
          {
            id: '1',
            type: 'event',
            description: 'Dashboard loaded successfully',
            timestamp: new Date().toISOString(),
            status: 'success'
          }
        ]);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);

      // Set default values on error
      setStats({
        totalEvents: 0,
        totalBookings: 0,
        totalRevenue: 0,
        activeUsers: 0,
        pendingBookings: 0,
        categories: 0
      });

      setActivities([
        {
          id: 'error',
          type: 'error',
          description: 'Failed to load dashboard data',
          timestamp: new Date().toISOString(),
          status: 'error'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchDashboardData();
    }
  }, [isLoaded, user]);

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-2 text-orange-100">
          <RefreshCw className="w-5 h-5 animate-spin text-orange-500" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Events',
      value: stats.overview?.totalEvents || stats.totalEvents || 0,
      icon: Calendar,
      description: `${stats.overview?.activeEvents || 0} active events`,
      color: 'text-blue-400'
    },
    {
      title: 'Total Bookings',
      value: stats.overview?.totalBookings || stats.totalBookings || 0,
      icon: Ticket,
      description: 'All time bookings',
      color: 'text-green-400'
    },
    {
      title: 'Total Revenue',
      value: `€${(stats.overview?.totalRevenue || stats.totalRevenue || 0).toFixed(2)}`,
      icon: Euro,
      description: `+${(stats.overview?.growth?.revenue || 0).toFixed(1)}% this month`,
      color: 'text-green-600'
    },
    {
      title: 'Pending Bookings',
      value: stats.overview?.pendingBookings || stats.pendingBookings || 0,
      icon: Clock,
      description: 'Awaiting confirmation',
      color: 'text-orange-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">Dashboard</h1>
            <p className="text-orange-100/70">Welcome back, {user?.firstName || 'Admin'}</p>
          </div>
          <Button
            onClick={fetchDashboardData}
            className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="bg-black/60 border-2 border-orange-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100/70 text-sm font-bold">{stat.title}</p>
                      <p className="text-2xl font-black text-orange-500">{stat.value}</p>
                      <p className="text-orange-100/50 text-xs">{stat.description}</p>
                    </div>
                    <Icon className={`w-8 h-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-2xl font-black text-orange-500">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full justify-start bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                onClick={() => router.push('/admin/events')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Create New Event
              </Button>
              <Button
                className="w-full justify-start border-2 border-orange-500/30 bg-black/40 text-orange-100 hover:bg-orange-500/10"
                onClick={() => router.push('/admin/categories')}
              >
                <BarChart3 className="w-4 h-4 mr-2 text-orange-500" />
                Manage Categories
              </Button>
              <Button
                className="w-full justify-start bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                onClick={() => router.push('/admin/bookings')}
              >
                <Ticket className="w-4 h-4 mr-2" />
                View Bookings
              </Button>
              <Button
                className="w-full justify-start border-2 border-orange-500/30 bg-black/40 text-orange-100 hover:bg-orange-500/10"
                onClick={() => router.push('/admin/users')}
              >
                <Users className="w-4 h-4 mr-2 text-orange-500" />
                Manage Users
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity and Bookings */}
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-2xl font-black text-orange-500">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity && stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {activity.status === 'upcoming' && <Calendar className="w-4 h-4 text-blue-400" />}
                        {activity.status === 'past' && <Clock className="w-4 h-4 text-gray-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-orange-100 text-sm">Event: {activity.title}</p>
                        <p className="text-orange-100/50 text-xs">
                          {activity.category} • {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : activities.length === 0 ? (
                  <p className="text-orange-100/50 text-center py-4">No recent activity</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {activity.status === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {activity.status === 'pending' && <Clock className="w-4 h-4 text-orange-500" />}
                        {activity.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-orange-100 text-sm">{activity.description}</p>
                        <p className="text-orange-100/50 text-xs">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-2xl font-black text-orange-500">Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentBookings && stats.recentBookings.length > 0 ? (
                  stats.recentBookings.map((booking: any) => (
                    <div key={booking.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {booking.paymentStatus === 'paid' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {booking.paymentStatus === 'pending' && <Clock className="w-4 h-4 text-orange-500" />}
                        {booking.paymentStatus === 'failed' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-orange-100 text-sm">
                          {booking.bookingReference} - {booking.customerName || 'Unknown Customer'}
                        </p>
                        <p className="text-orange-100/50 text-xs">
                          {booking.eventTitle} • €{booking.totalAmount.toFixed(2)} • {booking.status}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-orange-100/50 text-center py-4">No recent bookings</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="bg-black/60 border-2 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-orange-500">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-orange-100">Database Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-orange-100">Payment Gateway Active</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-orange-100">Email Service Running</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}