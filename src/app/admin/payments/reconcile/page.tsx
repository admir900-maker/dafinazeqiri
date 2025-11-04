'use client';

import { useState } from 'react';
import { AdminCard, AdminCardContent, AdminCardHeader, AdminCardTitle } from '@/components/ui/admin-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, CheckCircle, XCircle, Mail, AlertTriangle } from 'lucide-react';

interface ReconcileResult {
  success: boolean;
  local: any | null;
  remote: {
    orderId: string;
    order: any | null;
    transactions: any[];
    error?: string | null;
  };
  summary: {
    remoteStatus: string;
    statusCode?: string;
    recommendedAction: 'none' | 'markPaidAndResend' | 'markFailed';
    discrepancy: boolean;
  };
}

export default function ReconcileRaiAcceptPage() {
  const [bookingId, setBookingId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ReconcileResult[]>([]);

  const check = async () => {
    try {
      setLoading(true);
      setResult(null);
      const params = new URLSearchParams();
      if (bookingId) params.append('bookingId', bookingId.trim());
      if (orderId) params.append('orderId', orderId.trim());
      const res = await fetch(`/api/admin/reconcile/raiffeisen?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reconcile');
      setResult(data);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFix = async () => {
    if (!result?.local) return;
    try {
      setFixing(true);
      const res = await fetch('/api/admin/reconcile/raiffeisen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: result.local.id,
          action: result.summary.recommendedAction,
          resend: result.summary.recommendedAction === 'markPaidAndResend'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply fix');
      setMessage(data.message || 'Fix applied');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setFixing(false);
    }
  };

  const resend = async () => {
    if (!result?.local) return;
    try {
      setFixing(true);
      const res = await fetch(`/api/admin/bookings/${result.local.id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resend');
      setMessage('Tickets resent');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setFixing(false);
    }
  };

  const scanPending = async () => {
    try {
      setScanning(true);
      setScanResults([]);
      const res = await fetch('/api/admin/pending-bookings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load pending bookings');
      const list = data.bookings || [];
      const out: ReconcileResult[] = [];
      for (const b of list) {
        if (!b?.id) continue;
        const r = await fetch(`/api/admin/reconcile/raiffeisen?bookingId=${b.id}`);
        const rd = await r.json();
        if (rd?.summary?.discrepancy) out.push(rd);
      }
      setScanResults(out);
      setMessage(out.length ? `Found ${out.length} discrepancies` : 'No discrepancies found in recent pending bookings');
    } catch (e:any) {
      setMessage(e.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">RaiAccept Reconciliation</h1>
            <p className="text-gray-600">Cross-check local bookings against RaiAccept order and transactions</p>
          </div>
        </div>

        <AdminCard>
          <AdminCardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Booking ID</label>
                <Input value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="Mongo _id" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">RaiAccept Order ID</label>
                <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="P-..." />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={check} disabled={loading} className="min-w-[140px]">
                  {loading ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin"/>Checking...</>) : (<><Search className="h-4 w-4 mr-2"/>Check</>)}
                </Button>
                <Button variant="outline" onClick={() => { setBookingId(''); setOrderId(''); setResult(null); setMessage(null); }}>Clear</Button>
                <Button variant="outline" onClick={scanPending} disabled={scanning}>
                  {scanning ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin"/>Scanning...</>) : 'Scan recent pending'}
                </Button>
              </div>
            </div>
          </AdminCardContent>
        </AdminCard>

        {message && (
          <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4"/> {message}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminCard>
              <AdminCardHeader>
                <AdminCardTitle>Local Booking</AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="space-y-2">
                {!result.local ? (
                  <p className="text-gray-500">No local booking linked to this order.</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    <div><span className="text-gray-500">Booking Reference:</span> {result.local.bookingReference}</div>
                    <div><span className="text-gray-500">Status:</span> <Badge>{result.local.status}</Badge></div>
                    <div><span className="text-gray-500">Payment:</span> <Badge>{result.local.paymentStatus}</Badge></div>
                    <div><span className="text-gray-500">Order ID:</span> {result.local.orderId || '—'}</div>
                    <div><span className="text-gray-500">Amount:</span> €{Number(result.local.totalAmount).toFixed(2)} {result.local.currency}</div>
                    <div className="flex gap-2 pt-2">
                      {result.summary.recommendedAction === 'markPaidAndResend' && (
                        <Button onClick={applyFix} disabled={fixing} className="bg-green-600 hover:bg-green-700 text-white">
                          {fixing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <CheckCircle className="h-4 w-4 mr-2"/>}
                          Mark Paid
                        </Button>
                      )}
                      {result.summary.recommendedAction === 'markFailed' && (
                        <Button onClick={applyFix} disabled={fixing} variant="outline" className="text-red-700 border-red-700 hover:bg-red-50">
                          {fixing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin"/> : <XCircle className="h-4 w-4 mr-2"/>}
                          Mark Failed
                        </Button>
                      )}
                      {result.local && (
                        <Button onClick={resend} disabled={fixing} variant="outline" className="text-blue-700 border-blue-700 hover:bg-blue-50">
                          <Mail className="h-4 w-4 mr-2"/> Resend Tickets
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </AdminCardContent>
            </AdminCard>

            <AdminCard>
              <AdminCardHeader>
                <AdminCardTitle>RaiAccept</AdminCardTitle>
              </AdminCardHeader>
              <AdminCardContent className="space-y-2 text-sm">
                <div><span className="text-gray-500">Order ID:</span> {result.remote.orderId}</div>
                <div><span className="text-gray-500">Latest Status:</span> <Badge>{result.summary.remoteStatus || 'UNKNOWN'}</Badge> {result.summary.statusCode && <span className="text-gray-600 ml-2">(code {result.summary.statusCode})</span>}</div>
                {result.remote.error && (
                  <div className="text-red-600">API error: {result.remote.error}</div>
                )}
                <div className="pt-2">
                  <div className="font-semibold mb-1">Transactions ({result.remote.transactions?.length || 0})</div>
                  <div className="max-h-60 overflow-auto border rounded">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-2">ID</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Code</th>
                          <th className="text-right p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(result.remote.transactions || []).map((t:any, idx:number) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 whitespace-nowrap">{t.transactionId || t.id || '—'}</td>
                            <td className="p-2">{t.status || t.transactionStatus || '—'}</td>
                            <td className="p-2">{t.statusCode || t.transactionStatusCode || '—'}</td>
                            <td className="p-2 text-right">{(t.transactionAmount ?? t.amount) ? `${(t.transactionAmount ?? t.amount)/100} ${t.transactionCurrency ?? ''}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </AdminCardContent>
            </AdminCard>
          </div>
        )}

        {scanResults.length > 0 && (
          <AdminCard>
            <AdminCardHeader>
              <AdminCardTitle>Discrepancies found ({scanResults.length})</AdminCardTitle>
            </AdminCardHeader>
            <AdminCardContent className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Booking Ref</th>
                    <th className="p-2 text-left">Booking ID</th>
                    <th className="p-2 text-left">Local</th>
                    <th className="p-2 text-left">Remote</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scanResults.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-2">{r.local?.bookingReference}</td>
                      <td className="p-2">{r.local?.id}</td>
                      <td className="p-2">{r.local?.status}/{r.local?.paymentStatus}</td>
                      <td className="p-2">{r.summary.remoteStatus}{r.summary.statusCode ? ` (${r.summary.statusCode})` : ''}</td>
                      <td className="p-2">
                        {r.summary.recommendedAction === 'markPaidAndResend' && (
                          <Button size="sm" onClick={async () => {
                            setFixing(true);
                            try {
                              const resp = await fetch('/api/admin/reconcile/raiffeisen', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ bookingId: r.local.id, action: 'markPaidAndResend', resend: false })
                              });
                              if (resp.ok) setMessage('Marked paid'); else setMessage('Failed to mark paid');
                            } finally { setFixing(false); }
                          }}>
                            Mark Paid
                          </Button>
                        )}
                        {r.summary.recommendedAction === 'markFailed' && (
                          <Button size="sm" variant="outline" onClick={async () => {
                            setFixing(true);
                            try {
                              const resp = await fetch('/api/admin/reconcile/raiffeisen', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ bookingId: r.local.id, action: 'markFailed' })
                              });
                              if (resp.ok) setMessage('Marked failed'); else setMessage('Failed to mark failed');
                            } finally { setFixing(false); }
                          }}>
                            Mark Failed
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminCardContent>
          </AdminCard>
        )}
      </div>
    </div>
  );
}
