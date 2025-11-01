'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Calendar, User, Ticket, MapPin, Clock, Eye, RefreshCw, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ValidationLog {
  _id: string;
  validatorId: string;
  validatorName: string;
  bookingId: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  validationType: 'entry' | 'exit' | 'general';
  status: 'validated' | 'rejected' | 'flagged';
  notes?: string;
  location?: string;
  deviceInfo?: {
    userAgent: string;
    ip: string;
  };
  metadata?: {
    ticketType: string;
    ticketQuantity: number;
    scanMethod: 'qr' | 'manual' | 'nfc';
  };
  createdAt: string;
  updatedAt: string;
}

interface ValidationStats {
  total: number;
  validated: number;
  rejected: number;
  flagged: number;
}

export default function ValidationLogsPage() {
  const [logs, setLogs] = useState<ValidationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ValidationStats>({
    total: 0,
    validated: 0,
    rejected: 0,
    flagged: 0
  });
  const [selectedLog, setSelectedLog] = useState<ValidationLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');

  useEffect(() => {
    fetchValidationLogs();
  }, [statusFilter, dateFilter]);

  const fetchValidationLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: '100',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      // Date filters
      const now = new Date();
      if (dateFilter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        params.append('startDate', startOfDay.toISOString());
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        params.append('startDate', weekAgo.toISOString());
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        params.append('startDate', monthAgo.toISOString());
      }

      const response = await fetch(`/api/validation-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs || []);
        setStats(data.data.statistics || {
          total: 0,
          validated: 0,
          rejected: 0,
          flagged: 0
        });
      }
    } catch (error) {
      console.error('Error fetching validation logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'validated': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'flagged': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'validated': return CheckCircle;
      case 'rejected': return XCircle;
      case 'flagged': return AlertTriangle;
      default: return Ticket;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const viewDetails = (log: ValidationLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">
              Validation Logs
            </h1>
            <p className="text-orange-100/70 mt-2">Monitor and review all ticket validation activities</p>
          </div>
          <Button
            onClick={fetchValidationLogs}
            className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100/70 text-sm font-bold">Total Scans</p>
                  <p className="text-3xl font-black text-orange-500">{stats.total}</p>
                </div>
                <Ticket className="w-12 h-12 text-orange-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-2 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100/70 text-sm font-bold">Validated</p>
                  <p className="text-3xl font-black text-green-500">{stats.validated}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-2 border-red-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100/70 text-sm font-bold">Rejected</p>
                  <p className="text-3xl font-black text-red-500">{stats.rejected}</p>
                </div>
                <XCircle className="w-12 h-12 text-red-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/60 border-2 border-amber-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100/70 text-sm font-bold">Flagged</p>
                  <p className="text-3xl font-black text-amber-500">{stats.flagged}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-amber-500/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-black/60 border-2 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-orange-100 text-sm font-bold mb-2">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-orange-500/30 bg-black/60 text-orange-100 focus:border-orange-500 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="validated">Validated</option>
                  <option value="rejected">Rejected</option>
                  <option value="flagged">Flagged</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-orange-100 text-sm font-bold mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date Range
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-orange-500/30 bg-black/60 text-orange-100 focus:border-orange-500 focus:outline-none"
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Validation Logs Table */}
        <Card className="bg-black/60 border-2 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-orange-500">Recent Validations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-orange-100/70">Loading validation logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Ticket className="w-16 h-16 text-orange-500/50 mx-auto mb-4" />
                <p className="text-orange-100/70 text-lg">No validation logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-orange-500/30">
                      <th className="text-left p-4 text-orange-500 font-bold">Status</th>
                      <th className="text-left p-4 text-orange-500 font-bold">Event</th>
                      <th className="text-left p-4 text-orange-500 font-bold">Customer</th>
                      <th className="text-left p-4 text-orange-500 font-bold">Validator</th>
                      <th className="text-left p-4 text-orange-500 font-bold">Time</th>
                      <th className="text-left p-4 text-orange-500 font-bold">Type</th>
                      <th className="text-left p-4 text-orange-500 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const StatusIcon = getStatusIcon(log.status);
                      return (
                        <tr key={log._id} className="border-b border-orange-500/20 hover:bg-orange-500/10 transition-colors">
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(log.status)}`}>
                              <StatusIcon className="w-4 h-4" />
                              {log.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-orange-100 font-bold">{log.eventTitle}</div>
                            <div className="text-orange-100/50 text-sm">{log.bookingId.substring(0, 10)}...</div>
                          </td>
                          <td className="p-4">
                            <div className="text-orange-100">{log.userName}</div>
                            <div className="text-orange-100/50 text-sm">{log.userId.substring(0, 10)}...</div>
                          </td>
                          <td className="p-4">
                            <div className="text-orange-100">{log.validatorName}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-orange-100 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-orange-500" />
                              {formatDate(log.createdAt)}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-orange-100 capitalize">{log.validationType}</span>
                          </td>
                          <td className="p-4">
                            <Button
                              onClick={() => viewDetails(log)}
                              size="sm"
                              className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Modal */}
        {showDetails && selectedLog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-zinc-950 border-2 border-orange-500/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader className="border-b border-orange-500/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-black text-orange-500">Validation Details</CardTitle>
                  <Button
                    onClick={() => setShowDetails(false)}
                    variant="ghost"
                    className="text-orange-500 hover:text-orange-400"
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-1">Status</p>
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border ${getStatusColor(selectedLog.status)}`}>
                      {selectedLog.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-1">Validation Type</p>
                    <p className="text-orange-100 capitalize">{selectedLog.validationType}</p>
                  </div>
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-1">Event</p>
                    <p className="text-orange-100">{selectedLog.eventTitle}</p>
                  </div>
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-1">Booking ID</p>
                    <p className="text-orange-100 text-sm font-mono">{selectedLog.bookingId}</p>
                  </div>
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-1">Customer</p>
                    <p className="text-orange-100">{selectedLog.userName}</p>
                    <p className="text-orange-100/50 text-xs">{selectedLog.userId}</p>
                  </div>
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-1">Validator</p>
                    <p className="text-orange-100">{selectedLog.validatorName}</p>
                    <p className="text-orange-100/50 text-xs">{selectedLog.validatorId}</p>
                  </div>
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-1">Scan Method</p>
                    <p className="text-orange-100 uppercase">{selectedLog.metadata?.scanMethod || 'QR'}</p>
                  </div>
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-1">Time</p>
                    <p className="text-orange-100">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {selectedLog.notes && (
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-1">Notes</p>
                    <p className="text-orange-100 bg-black/40 p-3 rounded-lg">{selectedLog.notes}</p>
                  </div>
                )}

                {selectedLog.deviceInfo && (
                  <div>
                    <p className="text-orange-500 text-sm font-bold mb-2">Device Information</p>
                    <div className="bg-black/40 p-3 rounded-lg space-y-2">
                      <p className="text-orange-100 text-sm"><span className="font-bold">IP:</span> {selectedLog.deviceInfo.ip}</p>
                      <p className="text-orange-100 text-sm"><span className="font-bold">User Agent:</span> {selectedLog.deviceInfo.userAgent}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
