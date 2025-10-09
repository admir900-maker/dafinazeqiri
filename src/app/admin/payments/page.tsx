'use client';

import { useState, useEffect } from 'react';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
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
      case 'pending': return 'bg-yellow-600';
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
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-2 text-white">
          <RefreshCw className="w-5 h-5 animate-spin" />
          Loading payments...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Payments & Transactions</h1>
        <div className="flex gap-2">
          <Button
            onClick={fetchPayments}
            className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={exportPayments}
            className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
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
            color: 'text-yellow-400'
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
            color: 'text-yellow-400'
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
            color: 'text-blue-400'
          }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <AdminCard key={stat.title} className="bg-white/10 border-white/20 backdrop-blur-sm">
              <AdminCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm">{stat.title}</p>
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                  </div>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </AdminCardContent>
            </AdminCard>
          );
        })}
      </div>

      {/* Filters */}
      <AdminCard className="bg-white/10 border-white/20 backdrop-blur-sm">
        <AdminCardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                placeholder="Search by customer name, email, event, or booking ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 bg-white/20 border border-white/30 rounded-md text-white"
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
                className="p-2 bg-white/20 border border-white/30 rounded-md text-white"
              >
                <option value="all" className="text-black">All Methods</option>
                <option value="stripe" className="text-black">Stripe</option>
                <option value="raiffeisen" className="text-black">Raiffeisen</option>
                <option value="direct" className="text-black">Direct</option>
              </select>
            </div>
            <Button className="bg-white/20 text-white hover:bg-white/30 border border-white/30">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </AdminCardContent>
      </AdminCard>

      {/* Payments List */}
      <div className="space-y-4">
        {paginatedPayments.map((payment) => {
          const StatusIcon = getStatusIcon(payment.status);

          return (
            <AdminCard key={payment.id} className="bg-white/10 border-white/20 backdrop-blur-sm">
              <AdminCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-5 h-5 text-white/70" />
                      <div>
                        <h3 className="text-white font-semibold">{payment.eventTitle}</h3>
                        <p className="text-white/70 text-sm">
                          {payment.customerName} • {payment.customerEmail}
                        </p>
                        <p className="text-white/50 text-xs">
                          Booking: {payment.bookingId} • {new Date(payment.createdAt).toLocaleString()}
                        </p>
                        {payment.venue && (
                          <p className="text-white/40 text-xs">
                            📍 {payment.venue}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      {payment.status === 'refunded' && (
                        <p className="text-red-400 text-sm">
                          Refunded: {formatCurrency(payment.amount)}
                        </p>
                      )}
                      <p className="text-white/50 text-xs">
                        {payment.ticketsCount} ticket{payment.ticketsCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(payment.status)} text-white`}>
                        {payment.status}
                      </Badge>
                      <Badge className="bg-white/20 text-white">
                        {getMethodBadge(payment.method)}
                      </Badge>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowPaymentModal(true);
                      }}
                      className="bg-white/20 text-white hover:bg-white/30 border border-white/30"
                      size="sm"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {(payment.stripePaymentIntentId || payment.raiffeisenPaymentId) && (
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <p className="text-white/50 text-xs">
                      Transaction ID: {payment.stripePaymentIntentId || payment.raiffeisenPaymentId}
                    </p>
                  </div>
                )}
              </AdminCardContent>
            </AdminCard>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-white/70 text-sm">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="bg-white/20 text-white hover:bg-white/30 border border-white/30 disabled:opacity-50"
              size="sm"
            >
              Previous
            </Button>
            <span className="text-white/70 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="bg-white/20 text-white hover:bg-white/30 border border-white/30 disabled:opacity-50"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {filteredPayments.length === 0 && (
        <AdminCard className="bg-white/10 border-white/20 backdrop-blur-sm">
          <AdminCardContent className="p-8 text-center">
            <CreditCard className="w-12 h-12 text-white/50 mx-auto mb-4" />
            <p className="text-white/70">No payments found matching your criteria.</p>
          </AdminCardContent>
        </AdminCard>
      )}

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Payment Details</h2>
              <Button
                onClick={() => setShowPaymentModal(false)}
                className="bg-white/20 text-white hover:bg-white/30"
                size="sm"
              >
                ×
              </Button>
            </div>

            <div className="space-y-6">
              {/* Payment Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-white font-semibold mb-3">Payment Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Booking ID:</span>
                      <span className="text-white">{selectedPayment.bookingId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Amount:</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Status:</span>
                      <Badge className={`${getStatusColor(selectedPayment.status)} text-white`}>
                        {selectedPayment.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Method:</span>
                      <span className="text-white">{getMethodBadge(selectedPayment.method)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Tickets:</span>
                      <span className="text-white">{selectedPayment.ticketsCount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-semibold mb-3">Customer Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Name:</span>
                      <span className="text-white">{selectedPayment.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Email:</span>
                      <span className="text-white">{selectedPayment.customerEmail}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Info */}
              <div>
                <h3 className="text-white font-semibold mb-3">Event Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Event:</span>
                    <span className="text-white">{selectedPayment.eventTitle}</span>
                  </div>
                  {selectedPayment.venue && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Venue:</span>
                      <span className="text-white">{selectedPayment.venue}</span>
                    </div>
                  )}
                  {selectedPayment.eventDate && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Date:</span>
                      <span className="text-white">
                        {new Date(selectedPayment.eventDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Details */}
              <div>
                <h3 className="text-white font-semibold mb-3">Transaction Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Created:</span>
                    <span className="text-white">
                      {new Date(selectedPayment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedPayment.paymentDate && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Payment Date:</span>
                      <span className="text-white">
                        {new Date(selectedPayment.paymentDate).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {(selectedPayment.stripePaymentIntentId || selectedPayment.raiffeisenPaymentId) && (
                    <div className="flex justify-between">
                      <span className="text-white/70">Transaction ID:</span>
                      <span className="text-white font-mono text-xs">
                        {selectedPayment.stripePaymentIntentId || selectedPayment.raiffeisenPaymentId}
                      </span>
                    </div>
                  )}
                  {selectedPayment.notes && (
                    <div>
                      <span className="text-white/70">Notes:</span>
                      <p className="text-white mt-1">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}