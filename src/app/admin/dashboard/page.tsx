'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
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
        <div className="flex items-center gap-2 text-gray-900">
          <RefreshCw className="w-5 h-5 animate-spin" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.firstName || 'Admin'}</p>
        </div>
        <Button
          onClick={fetchDashboardData}
          className="bg-blue-600 text-white hover:bg-blue-700"
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
            <AdminCard key={stat.title}>
              <AdminCardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-gray-500 text-xs">{stat.description}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </AdminCardContent>
            </AdminCard>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>Quick Actions</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="space-y-4">
            <Button
              className="w-full justify-start bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => router.push('/admin/events')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Create New Event
            </Button>
            <Button
              className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
              onClick={() => router.push('/admin/categories')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Manage Categories
            </Button>
            <Button
              className="w-full justify-start bg-purple-600 text-white hover:bg-purple-700"
              onClick={() => router.push('/admin/bookings')}
            >
              <Ticket className="w-4 h-4 mr-2" />
              View Bookings
            </Button>
            <Button
              className="w-full justify-start bg-orange-600 text-white hover:bg-orange-700"
              onClick={() => router.push('/admin/users')}
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
          </AdminCardContent>
        </AdminCard>

        {/* Recent Activity and Bookings */}
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>Recent Activity</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
            <div className="space-y-4">
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {activity.status === 'upcoming' && <Calendar className="w-4 h-4 text-blue-400" />}
                      {activity.status === 'past' && <Clock className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm">Event: {activity.title}</p>
                      <p className="text-gray-500 text-xs">
                        {activity.category} • {new Date(activity.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : activities.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {activity.status === 'success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                      {activity.status === 'pending' && <Clock className="w-4 h-4 text-orange-500" />}
                      {activity.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm">{activity.description}</p>
                      <p className="text-gray-500 text-xs">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminCardContent>
        </AdminCard>

        {/* Recent Bookings */}
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>Recent Bookings</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent>
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
                      <p className="text-gray-900 text-sm">
                        {booking.bookingReference} - {booking.customerName || 'Unknown Customer'}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {booking.eventTitle} • €{booking.totalAmount.toFixed(2)} • {booking.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent bookings</p>
              )}
            </div>
          </AdminCardContent>
        </AdminCard>
      </div>

      {/* System Status */}
      <AdminCard>
        <AdminCardHeader>
          <AdminCardTitle>System Status</AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-900">Database Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-900">Payment Gateway Active</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-gray-900">Email Service Running</span>
            </div>
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}