'use client';

import { useState, useEffect } from 'react';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/contexts/CurrencyContext';
import { RefreshCw, DollarSign, Users, Calendar, Ticket, TrendingUp, TrendingDown } from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalBookings: number;
    totalEvents: number;
    activeEvents: number;
    uniqueUsers: number;
    revenueGrowth: number;
    bookingsGrowth: number;
  };
}

export default function AnalyticsPage() {
  const { currencySymbol } = useCurrency();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/analytics');
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
        <div className="flex items-center justify-center min-h-96 text-white">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p>Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
        <div className="flex items-center justify-center min-h-96 text-white">
          <div className="text-center">
            <div className="text-red-400 mb-4">Error: {error}</div>
            <Button onClick={fetchAnalytics} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Analytics & Reports</h1>
        <Button onClick={fetchAnalytics} className="bg-blue-600 hover:bg-blue-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AdminCard>
            <AdminCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-white">
                    {currencySymbol}{data.summary.totalRevenue.toLocaleString()}
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
                  <p className="text-white/70 text-sm">Total Bookings</p>
                  <p className="text-2xl font-bold text-white">
                    {data.summary.totalBookings.toLocaleString()}
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
                  <p className="text-white/70 text-sm">Active Events</p>
                  <p className="text-2xl font-bold text-white">
                    {data.summary.activeEvents}
                  </p>
                  <p className="text-white/50 text-xs">
                    {data.summary.totalEvents} total
                  </p>
                </div>
                <div className="p-3 bg-purple-600/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Unique Users</p>
                  <p className="text-2xl font-bold text-white">
                    {data.summary.uniqueUsers.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-orange-600/20 rounded-lg">
                  <Users className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </AdminCardContent>
          </AdminCard>
        </div>
      )}

      {!data && (
        <AdminCard>
          <AdminCardHeader>
            <AdminCardTitle>Analytics Dashboard</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="p-6">
            <p className="text-white/70">
              No analytics data available. Create some events and bookings to see analytics.
            </p>
          </AdminCardContent>
        </AdminCard>
      )}
    </div>
  );
}
