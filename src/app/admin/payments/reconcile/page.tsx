'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    codeType?: 'success' | 'decline' | 'error' | 'technical' | 'unknown';
    codeDescription?: string;
    recommendedAction: 'none' | 'markPaidAndResend' | 'markFailed';
    discrepancy: boolean;
  };
}

export default function ReconcileRaiAcceptPage() {
  const [bookingId, setBookingId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [customerResults, setCustomerResults] = useState<ReconcileResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ReconcileResult[]>([]);

  const check = async () => {
    try {
      setLoading(true);
      setResult(null);
      setCustomerResults([]);
      const params = new URLSearchParams();
      if (customerName.trim()) {
        params.append('customerName', customerName.trim());
        const res = await fetch(`/api/admin/reconcile/raiffeisen?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to search');
        setCustomerResults(data.results || []);
        setMessage(data.count ? `Found ${data.count} booking(s) for "${data.customerName}"` : `No bookings found for "${data.customerName}"`);
      } else {
        if (bookingId) params.append('bookingId', bookingId.trim());
        if (orderId) params.append('orderId', orderId.trim());
        const res = await fetch(`/api/admin/reconcile/raiffeisen?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reconcile');
        setResult(data);
      }
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
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black p-2 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-900">RaiAccept Reconciliation</h1>
            <p className="text-orange-100/50">Cross-check local bookings against RaiAccept order and transactions</p>
          </div>
        </div>

        <Card className="bg-black/60 border-2 border-orange-500/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-orange-100/70 mb-1">Booking ID</label>
                <Input value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="Mongo _id" />
              </div>
              <div>
                <label className="block text-sm text-orange-100/70 mb-1">RaiAccept Order ID</label>
                <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="P-..." />
              </div>
              <div>
                <label className="block text-sm text-orange-100/70 mb-1">Customer Name</label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name Surname" />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={check} disabled={loading} className="min-w-[140px]">
                  {loading ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Checking...</>) : (<><Search className="h-4 w-4 mr-2" />Check</>)}
                </Button>
                <Button variant="outline" onClick={() => { setBookingId(''); setOrderId(''); setCustomerName(''); setResult(null); setCustomerResults([]); setMessage(null); }}>Clear</Button>
                <Button variant="outline" onClick={scanPending} disabled={scanning}>
                  {scanning ? (<><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Scanning...</>) : 'Scan recent pending'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {message && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {message}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="text-orange-500">Local Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!result.local ? (
                  <p className="text-orange-100/40">No local booking linked to this order.</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    <div><span className="text-orange-100/40">Booking Reference:</span> {result.local.bookingReference}</div>
                    <div><span className="text-orange-100/40">Status:</span> <Badge>{result.local.status}</Badge></div>
                    <div><span className="text-orange-100/40">Payment:</span> <Badge>{result.local.paymentStatus}</Badge></div>
                    <div><span className="text-orange-100/40">Order ID:</span> {result.local.orderId || 'â€”'}</div>
                    <div><span className="text-orange-100/40">Amount:</span> â‚¬{Number(result.local.totalAmount).toFixed(2)} {result.local.currency}</div>
                    <div className="flex gap-2 pt-2">
                      {result.summary.recommendedAction === 'markPaidAndResend' && (
                        <Button onClick={applyFix} disabled={fixing} className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold">
                          {fixing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                          Mark Paid
                        </Button>
                      )}
                      {result.summary.recommendedAction === 'markFailed' && (
                        <Button onClick={applyFix} disabled={fixing} variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                          {fixing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                          Mark Failed
                        </Button>
                      )}
                      {result.local && (
                        <Button onClick={resend} disabled={fixing} variant="outline" className="text-orange-100 border-orange-500/30 hover:bg-orange-500/10">
                          <Mail className="h-4 w-4 mr-2" /> Resend Tickets
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/60 border-2 border-orange-500/30">
              <CardHeader>
                <CardTitle className="text-orange-500">RaiAccept</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-orange-100/40">Order ID:</span> {result.remote.orderId}</div>
                <div>
                  <span className="text-orange-100/40">Latest Status:</span>{' '}
                  <Badge className={
                    result.summary.codeType === 'success' ? 'bg-green-500/20 text-green-400' :
                      result.summary.codeType === 'decline' ? 'bg-red-500/20 text-red-400' :
                        result.summary.codeType === 'error' ? 'bg-orange-500/20 text-orange-400' :
                          result.summary.codeType === 'technical' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-orange-500/20 text-orange-100'
                  }>
                    {result.summary.remoteStatus || 'UNKNOWN'}
                  </Badge>
                  {result.summary.statusCode && (
                    <span className="text-orange-100/50 ml-2">
                      (code {result.summary.statusCode})
                    </span>
                  )}
                </div>
                {result.summary.codeDescription && (
                  <div className="text-sm p-2 bg-orange-500/10 border border-orange-500/30 rounded">
                    <span className="font-semibold">Code {result.summary.statusCode}:</span> {result.summary.codeDescription}
                  </div>
                )}
                {result.remote.error && (
                  <div className="text-red-400">API error: {result.remote.error}</div>
                )}
                <div className="pt-2">
                  <div className="font-semibold mb-1">Transactions ({result.remote.transactions?.length || 0})</div>
                  <div className="max-h-60 overflow-auto border rounded">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-black/40">
                          <th className="text-left p-2">ID</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Code</th>
                          <th className="text-right p-2">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(result.remote.transactions || []).map((t: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 whitespace-nowrap">{t.transactionId || t.id || 'â€”'}</td>
                            <td className="p-2">{t.status || t.transactionStatus || 'â€”'}</td>
                            <td className="p-2">{t.statusCode || t.transactionStatusCode || 'â€”'}</td>
                            <td className="p-2 text-right">{(t.transactionAmount ?? t.amount) ? `${(t.transactionAmount ?? t.amount) / 100} ${t.transactionCurrency ?? ''}` : 'â€”'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {customerResults.length > 0 && (
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-orange-500">Customer Bookings ({customerResults.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-orange-500/20 bg-black/40">
                    <th className="p-2 text-left">Customer</th>
                    <th className="p-2 text-left">Booking Ref</th>
                    <th className="p-2 text-left">Order ID</th>
                    <th className="p-2 text-left">Local Status</th>
                    <th className="p-2 text-left">RaiAccept Status</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customerResults.map((r, i) => (
                    <tr key={i} className="border-b hover:bg-orange-500/10">
                      <td className="p-2">{r.local?.customerName || 'â€”'}</td>
                      <td className="p-2">{r.local?.bookingReference}</td>
                      <td className="p-2 text-xs">{r.remote?.orderId}</td>
                      <td className="p-2">
                        <Badge className={r.local?.status === 'confirmed' && r.local?.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                          {r.local?.status}/{r.local?.paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge className={
                          r.summary?.codeType === 'success' ? 'bg-green-500/20 text-green-400' :
                            r.summary?.codeType === 'decline' ? 'bg-red-500/20 text-red-400' :
                              r.summary?.codeType === 'error' ? 'bg-orange-500/20 text-orange-400' :
                                r.summary?.codeType === 'technical' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-orange-500/20 text-orange-100'
                        }>
                          {r.summary.remoteStatus} {r.summary.statusCode ? `(${r.summary.statusCode})` : ''}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-orange-100/50">
                        {r.summary?.codeDescription || 'â€”'}
                      </td>
                      <td className="p-2 text-right">â‚¬{Number(r.local?.totalAmount).toFixed(2)}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
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
                            }} className="bg-gradient-to-r from-orange-500 to-amber-900 hover:from-orange-600 hover:to-amber-950 text-black font-bold">
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
                            }} className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                              Mark Failed
                            </Button>
                          )}
                          {r.local && (
                            <Button size="sm" variant="outline" onClick={async () => {
                              setFixing(true);
                              try {
                                const resp = await fetch(`/api/admin/bookings/${r.local.id}/resend`, { method: 'POST' });
                                const data = await resp.json();
                                if (resp.ok) setMessage('Tickets resent'); else setMessage(data.error || 'Failed to resend');
                              } finally { setFixing(false); }
                            }} className="text-orange-100 border-orange-500/30 hover:bg-orange-500/10">
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {scanResults.length > 0 && (
          <Card className="bg-black/60 border-2 border-orange-500/30">
            <CardHeader>
              <CardTitle className="text-orange-500">Discrepancies found ({scanResults.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
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
                    <tr key={i} className="border-b hover:bg-orange-500/10">
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
