'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye
} from 'lucide-react';

interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  method: 'stripe' | 'raiffeisen' | 'direct';
  customerEmail: string;
  customerName: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  createdAt: string;
  paymentDate?: string;
  confirmedAt?: string;
  stripePaymentIntentId?: string;
  raiffeisenPaymentId?: string;
  ticketsCount: number;
  notes?: string;
}

interface PaymentStats {
  totalRevenue: number;
  pendingAmount: number;
  completedPayments: number;
  failedPayments: number;
  refundedAmount: number;
  pendingPayments: number;
}

export default function PaymentsPage() {
  const { currencySymbol } = useCurrency();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    pendingAmount: 0,
    completedPayments: 0,
    failedPayments: 0,
    refundedAmount: 0,
    pendingPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: '1',
        limit: '50'
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (methodFilter !== 'all') {
        params.append('paymentMethod', methodFilter);
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const response = await fetch(`/api/admin/payments?${params}`);
      const data = await response.json();

      if (data.success) {
        setPayments(data.payments);
        setStats(data.stats);
      } else {
        console.error('Error fetching payments:', data.error);
        // Fallback to empty data
        setPayments([]);
        setStats({
          totalRevenue: 0,
          pendingAmount: 0,
          completedPayments: 0,
          failedPayments: 0,
          refundedAmount: 0,
          pendingPayments: 0
        });
      }

    } catch (error) {
      console.error('Error fetching payments:', error);
      // Fallback to empty data
      setPayments([]);
      setStats({
        totalRevenue: 0,
        pendingAmount: 0,
        completedPayments: 0,
        failedPayments: 0,
        refundedAmount: 0,
        pendingPayments: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter]);

  // Refetch when search term changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Currency formatting function
  const formatCurrency = (amount: number, currency?: string) => {
    const symbol = currencySymbol || '€';
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Export payments to CSV
  const exportPayments = () => {
    if (payments.length === 0) {
      alert('No payments to export');
      return;
    }

    const csvData = payments.map(payment => ({
      'Booking ID': payment.bookingId,
      'Customer Name': payment.customerName,
      'Customer Email': payment.customerEmail,
      'Event Title': payment.eventTitle,
      'Amount': payment.amount,
      'Currency': payment.currency,
      'Status': payment.status,
      'Payment Method': payment.method,
      'Tickets Count': payment.ticketsCount,
      'Created At': new Date(payment.createdAt).toLocaleString(),
      'Payment Date': payment.paymentDate ? new Date(payment.paymentDate).toLocaleString() : 'N/A',
      'Transaction ID': payment.stripePaymentIntentId || payment.raiffeisenPaymentId || 'N/A',
      'Venue': payment.venue || 'N/A'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      payment.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.bookingId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, methodFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-600';
      case 'pending': return 'bg-orange-700';
      case 'failed': return 'bg-red-600';
      case 'refunded': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return CheckCircle;
      case 'pending': return Clock;
      case 'failed': return AlertCircle;
      case 'refunded': return RefreshCw;
      default: return AlertCircle;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'stripe': return 'Stripe';
      case 'raiffeisen': return 'Raiffeisen';
      case 'direct': return 'Direct';
      default: return method;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-2 text-orange-100">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading payments...
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">Payments & Transactions</h1>
        <div className="flex gap-2">
          <Button
            onClick={fetchPayments}
            className="bg-orange-500/20 text-orange-100 hover:bg-orange-500/20 border border-orange-500/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={exportPayments}
            className="bg-orange-500/20 text-orange-100 hover:bg-orange-500/20 border border-orange-500/30"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          {
            title: 'Total Revenue',
            value: formatCurrency(stats.totalRevenue),
            icon: DollarSign,
            color: 'text-green-400'
          },
          {
            title: 'Pending Amount',
            value: formatCurrency(stats.pendingAmount),
            icon: Clock,
            color: 'text-orange-500'
          },
          {
            title: 'Completed',
            value: stats.completedPayments,
            icon: CheckCircle,
            color: 'text-green-400'
          },
          {
            title: 'Pending',
            value: stats.pendingPayments || 0,
            icon: Clock,
            color: 'text-orange-500'
          },
          {
            title: 'Failed',
            value: stats.failedPayments,
            icon: AlertCircle,
            color: 'text-red-400'
          },
          {
            title: 'Refunded',
            value: formatCurrency(stats.refundedAmount),
            icon: RefreshCw,
            color: 'text-orange-500'
          }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-black/60 border-2 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100/70 text-sm">{stat.title}</p>
                    <p className="text-xl font-bold text-orange-500">{stat.value}</p>
                  </div>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="bg-black/60 border-2 border-orange-500/30">
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                placeholder="Search by customer name, email, event, or booking ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-orange-500/20 border-orange-500/30 text-orange-100 placeholder:text-orange-100/40"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 bg-orange-500/20 border border-orange-500/30 rounded-md text-orange-100"
              >
                <option value="all" className="text-black">All Status</option>
                <option value="paid" className="text-black">Paid</option>
                <option value="pending" className="text-black">Pending</option>
                <option value="failed" className="text-black">Failed</option>
                <option value="refunded" className="text-black">Refunded</option>
              </select>
            </div>
            <div>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="p-2 bg-orange-500/20 border border-orange-500/30 rounded-md text-orange-100"
              >
                <option value="all" className="text-black">All Methods</option>
                <option value="stripe" className="text-black">Stripe</option>
                <option value="raiffeisen" className="text-black">Raiffeisen</option>
                <option value="direct" className="text-black">Direct</option>
              </select>
            </div>
            <Button className="bg-orange-500/20 text-orange-100 hover:bg-orange-500/20 border border-orange-500/30">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <div className="space-y-4">
        {paginatedPayments.map((payment) => {
          const StatusIcon = getStatusIcon(payment.status);

          return (
            <Card key={payment.id} className="bg-black/60 border-2 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-5 h-5 text-orange-100/70" />
                      <div>
                        <h3 className="text-orange-100 font-semibold">{payment.eventTitle}</h3>
                        <p className="text-orange-100/70 text-sm">
                          {payment.customerName} • {payment.customerEmail}
                        </p>
                        <p className="text-orange-100/40 text-xs">
                          Booking: {payment.bookingId} • {new Date(payment.createdAt).toLocaleString()}
                        </p>
                        {payment.venue && (
                          <p className="text-orange-100/30 text-xs">
                            📍 {payment.venue}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-orange-100 font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      {payment.status === 'refunded' && (
                        <p className="text-red-400 text-sm">
                          Refunded: {formatCurrency(payment.amount)}
                        </p>
                      )}
                      <p className="text-orange-100/40 text-xs">
                        {payment.ticketsCount} ticket{payment.ticketsCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(payment.status)} text-white`}>
                        {payment.status}
                      </Badge>
                      <Badge className="bg-orange-500/20 text-orange-100">
                        {getMethodBadge(payment.method)}
                      </Badge>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowPaymentModal(true);
                      }}
                      className="bg-orange-500/20 text-orange-100 hover:bg-orange-500/20 border border-orange-500/30"
                      size="sm"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {(payment.stripePaymentIntentId || payment.raiffeisenPaymentId) && (
                  <div className="mt-2 pt-2 border-t border-orange-500/20">
                    <p className="text-orange-100/40 text-xs">
                      Transaction ID: {payment.stripePaymentIntentId || payment.raiffeisenPaymentId}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-orange-100/70 text-sm">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="bg-orange-500/20 text-orange-100 hover:bg-orange-500/20 border border-orange-500/30 disabled:opacity-50"
              size="sm"
            >
              Previous
            </Button>
            <span className="text-orange-100/70 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="bg-orange-500/20 text-orange-100 hover:bg-orange-500/20 border border-orange-500/30 disabled:opacity-50"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {filteredPayments.length === 0 && (
        <Card className="bg-black/60 border-2 border-orange-500/30">
          <CardContent className="p-8 text-center">
            <CreditCard className="w-12 h-12 text-orange-100/40 mx-auto mb-4" />
            <p className="text-orange-100/70">No payments found matching your criteria.</p>
          </CardContent>
        </Card>
      )}

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-950 border-2 border-orange-500/50 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-orange-500">Payment Details</h2>
              <Button
                onClick={() => setShowPaymentModal(false)}
                className="bg-orange-500/20 text-orange-100 hover:bg-orange-500/20"
                size="sm"
              >
                ×
              </Button>
            </div>

            <div className="space-y-6">
              {/* Payment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-orange-100 font-semibold mb-3">Payment Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Booking ID:</span>
                      <span className="text-white">{selectedPayment.bookingId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Amount:</span>
                      <span className="text-orange-100 font-semibold">
                        {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Status:</span>
                      <Badge className={`${getStatusColor(selectedPayment.status)} text-white`}>
                        {selectedPayment.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Method:</span>
                      <span className="text-white">{getMethodBadge(selectedPayment.method)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Tickets:</span>
                      <span className="text-white">{selectedPayment.ticketsCount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-orange-100 font-semibold mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Name:</span>
                      <span className="text-white">{selectedPayment.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Email:</span>
                      <span className="text-white">{selectedPayment.customerEmail}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Info */}
              <div>
                <h3 className="text-orange-100 font-semibold mb-3">Event Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-100/70">Event:</span>
                    <span className="text-white">{selectedPayment.eventTitle}</span>
                  </div>
                  {selectedPayment.venue && (
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Venue:</span>
                      <span className="text-white">{selectedPayment.venue}</span>
                    </div>
                  )}
                  {selectedPayment.eventDate && (
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Date:</span>
                      <span className="text-white">
                        {new Date(selectedPayment.eventDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Details */}
              <div>
                <h3 className="text-orange-100 font-semibold mb-3">Transaction Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-100/70">Created:</span>
                    <span className="text-white">
                      {new Date(selectedPayment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedPayment.paymentDate && (
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Payment Date:</span>
                      <span className="text-white">
                        {new Date(selectedPayment.paymentDate).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {(selectedPayment.stripePaymentIntentId || selectedPayment.raiffeisenPaymentId) && (
                    <div className="flex justify-between">
                      <span className="text-orange-100/70">Transaction ID:</span>
                      <span className="text-orange-100 font-mono text-xs">
                        {selectedPayment.stripePaymentIntentId || selectedPayment.raiffeisenPaymentId}
                      </span>
                    </div>
                  )}
                  {selectedPayment.notes && (
                    <div>
                      <span className="text-orange-100/70">Notes:</span>
                      <p className="text-orange-100 mt-1">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}