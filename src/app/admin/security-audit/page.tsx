'use client';

import { useState, useEffect } from 'react';
import {
  ShieldAlert, RefreshCw, AlertTriangle, AlertCircle, Shield, Ban,
  Trash2, Download, User, Globe, Monitor, Clock, ChevronDown, ChevronUp,
  CreditCard, Ticket, UserX, CheckCircle, XCircle, Eye, FileText,
  Activity, Lock, Unlock, Loader2, Info, Search, MapPin, Fingerprint
} from 'lucide-react';

interface Threat {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  userId?: string;
  email?: string;
  name?: string;
  evidence?: Array<{
    action: string;
    description: string;
    ip: string;
    userAgent?: string;
    country?: string;
    city?: string;
    timestamp: string;
  }>;
  [key: string]: any;
}

interface SuspiciousUser {
  userId: string;
  emails: string[];
  names: string[];
  ips: string[];
  userAgents: string[];
  countries: string[];
  cities: string[];
  threatCount: number;
}

interface AuditData {
  success: boolean;
  timestamp: string;
  summary: {
    totalThreats: number;
    critical: number;
    high: number;
    medium: number;
    suspiciousUsers: number;
    fraudulentBookings: number;
    orphanTickets: number;
  };
  threats: Threat[];
  suspiciousUsers: SuspiciousUser[];
}

const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-400', badge: 'bg-red-500', icon: AlertCircle },
  high: { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400', badge: 'bg-orange-500', icon: AlertTriangle },
  medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400', badge: 'bg-yellow-600', icon: Info },
  low: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400', badge: 'bg-blue-500', icon: Shield },
};

const THREAT_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  privilege_escalation: { label: 'Privilege Escalation', icon: Unlock, color: 'text-red-400' },
  payment_fraud: { label: 'Payment Fraud', icon: CreditCard, color: 'text-orange-400' },
  ticket_fraud: { label: 'Ticket Fraud', icon: Ticket, color: 'text-yellow-400' },
  brute_force: { label: 'Brute Force', icon: Activity, color: 'text-purple-400' },
  suspicious_ip: { label: 'Suspicious IP', icon: Globe, color: 'text-cyan-400' },
  unauthorized_access: { label: 'Unauthorized Access', icon: Lock, color: 'text-red-500' },
  role_change: { label: 'Role Change', icon: User, color: 'text-blue-400' },
};

export default function SecurityAuditPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedThreats, setExpandedThreats] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'threats' | 'users' | 'report'>('threats');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, string[]>>({});
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const runAudit = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/security-audit');
      if (!res.ok) throw new Error('Audit failed');
      const result = await res.json();
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  const executeAction = async (action: string, params: Record<string, string>) => {
    const key = `${action}-${params.targetUserId || params.bookingId || 'x'}`;
    try {
      setActionLoading(key);
      const res = await fetch('/api/admin/security-audit/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });
      const result = await res.json();
      if (result.success) {
        setActionResults(prev => ({ ...prev, [key]: result.results }));
      } else {
        setActionResults(prev => ({ ...prev, [key]: [`Error: ${result.error}`] }));
      }
    } catch (e: any) {
      setActionResults(prev => ({ ...prev, [key]: [`Error: ${e.message}`] }));
    } finally {
      setActionLoading(null);
    }
  };

  const toggleThreat = (id: string) => {
    setExpandedThreats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleUser = (id: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredThreats = (data?.threats || []).filter(t => {
    if (filterSeverity !== 'all' && t.severity !== filterSeverity) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    return true;
  });

  const generateReport = () => {
    if (!data) return;

    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('                    SECURITY FORENSIC ANALYSIS REPORT');
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Scan Timestamp: ${data.timestamp}`);
    lines.push('');
    lines.push('─── SUMMARY ──────────────────────────────────────────────────────');
    lines.push(`Total Threats:        ${data.summary.totalThreats}`);
    lines.push(`  Critical:           ${data.summary.critical}`);
    lines.push(`  High:               ${data.summary.high}`);
    lines.push(`  Medium:             ${data.summary.medium}`);
    lines.push(`Suspicious Users:     ${data.summary.suspiciousUsers}`);
    lines.push(`Fraudulent Bookings:  ${data.summary.fraudulentBookings}`);
    lines.push(`Orphan Tickets:       ${data.summary.orphanTickets}`);
    lines.push('');

    for (const threat of data.threats) {
      lines.push(`─── THREAT: ${threat.id} ──────────────────────────────────────`);
      lines.push(`  Severity: ${threat.severity.toUpperCase()}`);
      lines.push(`  Type:     ${THREAT_TYPE_CONFIG[threat.type]?.label || threat.type}`);
      lines.push(`  Title:    ${threat.title}`);
      lines.push(`  Details:  ${threat.description}`);

      if (threat.userId) lines.push(`  User ID:  ${threat.userId}`);
      if (threat.email) lines.push(`  Email:    ${threat.email}`);
      if (threat.name) lines.push(`  Name:     ${threat.name}`);
      if (threat.bookingReference) lines.push(`  Booking:  ${threat.bookingReference}`);
      if (threat.amount !== undefined) lines.push(`  Amount:   €${threat.amount}`);

      if (threat.evidence && threat.evidence.length > 0) {
        lines.push('  Evidence:');
        for (const e of threat.evidence) {
          lines.push(`    [${new Date(e.timestamp).toISOString()}] ${e.action} - ${e.description || 'N/A'}`);
          lines.push(`      IP: ${e.ip || 'N/A'} | Country: ${e.country || 'N/A'} | City: ${e.city || 'N/A'}`);
          if (e.userAgent) lines.push(`      UA: ${e.userAgent}`);
        }
      }
      lines.push('');
    }

    lines.push('─── SUSPICIOUS USERS ─────────────────────────────────────────────');
    for (const user of data.suspiciousUsers) {
      lines.push(`  User ID:      ${user.userId}`);
      lines.push(`  Emails:       ${user.emails.join(', ') || 'N/A'}`);
      lines.push(`  Names:        ${user.names.join(', ') || 'N/A'}`);
      lines.push(`  IP Addresses: ${user.ips.join(', ') || 'N/A'}`);
      lines.push(`  Countries:    ${user.countries.join(', ') || 'N/A'}`);
      lines.push(`  Cities:       ${user.cities.join(', ') || 'N/A'}`);
      lines.push(`  Threats:      ${user.threatCount}`);
      if (user.userAgents.length > 0) {
        lines.push(`  User Agents:`);
        for (const ua of user.userAgents) {
          lines.push(`    - ${ua}`);
        }
      }
      lines.push('');
    }

    lines.push('─── ACTIONS TAKEN ────────────────────────────────────────────────');
    const actionEntries = Object.entries(actionResults);
    if (actionEntries.length > 0) {
      for (const [key, results] of actionEntries) {
        lines.push(`  ${key}:`);
        for (const r of results) {
          lines.push(`    - ${r}`);
        }
      }
    } else {
      lines.push('  None');
    }

    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('                         END OF REPORT');
    lines.push('═══════════════════════════════════════════════════════════════════');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-forensic-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-black text-orange-100/90">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/40">
              <ShieldAlert className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                Security Forensics
              </h1>
              <p className="text-orange-100/50 text-sm">Detect exploitation attempts & investigate threats</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generateReport}
              disabled={!data || loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">Export Report</span>
            </button>
            <button
              onClick={runAudit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Scanning...' : 'Run Analysis'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300">
            <p className="font-semibold">Audit Error: {error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 text-red-400 animate-spin" />
            <p className="text-orange-100/60 text-lg">Running forensic analysis...</p>
            <p className="text-orange-100/40 text-sm">Scanning database for exploitation evidence</p>
          </div>
        )}

        {/* Summary Cards */}
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <SummaryCard label="Total Threats" value={data.summary.totalThreats} icon={ShieldAlert} color={data.summary.totalThreats > 0 ? 'red' : 'green'} />
              <SummaryCard label="Critical" value={data.summary.critical} icon={AlertCircle} color="red" />
              <SummaryCard label="High" value={data.summary.high} icon={AlertTriangle} color="orange" />
              <SummaryCard label="Medium" value={data.summary.medium} icon={Info} color="yellow" />
              <SummaryCard label="Suspects" value={data.summary.suspiciousUsers} icon={UserX} color="purple" />
              <SummaryCard label="Fraud Bookings" value={data.summary.fraudulentBookings} icon={CreditCard} color="red" />
              <SummaryCard label="Orphan Tickets" value={data.summary.orphanTickets} icon={Ticket} color="orange" />
            </div>

            {/* Status Banner */}
            {data.summary.totalThreats === 0 ? (
              <div className="p-6 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center gap-4">
                <CheckCircle className="w-10 h-10 text-green-400 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-green-400">All Clear</h3>
                  <p className="text-green-300/70">No exploitation evidence found. The vulnerabilities were likely not exploited before patching.</p>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center gap-4">
                <AlertCircle className="w-10 h-10 text-red-400 flex-shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-xl font-bold text-red-400">Threats Detected</h3>
                  <p className="text-red-300/70">
                    Found {data.summary.totalThreats} potential exploitation attempt(s).
                    Review each threat below and take action.
                  </p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-orange-500/20">
              {[
                { key: 'threats', label: 'Threats', icon: ShieldAlert, count: data.threats.length },
                { key: 'users', label: 'Suspects', icon: UserX, count: data.suspiciousUsers.length },
                { key: 'report', label: 'Report', icon: FileText, count: null },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${activeTab === tab.key
                    ? 'border-orange-500 text-orange-400'
                    : 'border-transparent text-orange-100/50 hover:text-orange-100/80'
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== null && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-orange-500/20">{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Threats Tab */}
            {activeTab === 'threats' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-orange-100/40" />
                    <span className="text-sm text-orange-100/50">Filter:</span>
                  </div>
                  <select
                    value={filterSeverity}
                    onChange={e => setFilterSeverity(e.target.value)}
                    className="bg-black/50 border border-orange-500/30 text-orange-100/80 rounded-lg px-3 py-1.5 text-sm"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="bg-black/50 border border-orange-500/30 text-orange-100/80 rounded-lg px-3 py-1.5 text-sm"
                  >
                    <option value="all">All Types</option>
                    {Object.entries(THREAT_TYPE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                  <span className="text-sm text-orange-100/40">
                    Showing {filteredThreats.length} of {data.threats.length}
                  </span>
                </div>

                {filteredThreats.length === 0 ? (
                  <div className="text-center py-12 text-orange-100/40">
                    <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No threats match the current filters</p>
                  </div>
                ) : (
                  filteredThreats.map(threat => (
                    <ThreatCard
                      key={threat.id}
                      threat={threat}
                      expanded={expandedThreats.has(threat.id)}
                      onToggle={() => toggleThreat(threat.id)}
                      onAction={executeAction}
                      actionLoading={actionLoading}
                      actionResults={actionResults}
                    />
                  ))
                )}
              </div>
            )}

            {/* Suspects Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                {data.suspiciousUsers.length === 0 ? (
                  <div className="text-center py-12 text-orange-100/40">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No suspicious users detected</p>
                  </div>
                ) : (
                  data.suspiciousUsers.map(user => (
                    <SuspectCard
                      key={user.userId}
                      user={user}
                      expanded={expandedUsers.has(user.userId)}
                      onToggle={() => toggleUser(user.userId)}
                      onAction={executeAction}
                      actionLoading={actionLoading}
                      actionResults={actionResults}
                    />
                  ))
                )}
              </div>
            )}

            {/* Report Tab */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                <div className="p-6 rounded-xl bg-black/50 border border-orange-500/20">
                  <h3 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Forensic Analysis Summary
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <ReportRow label="Analysis Timestamp" value={new Date(data.timestamp).toLocaleString()} />
                      <ReportRow label="Total Threats Found" value={String(data.summary.totalThreats)} highlight={data.summary.totalThreats > 0} />
                      <ReportRow label="Critical Threats" value={String(data.summary.critical)} highlight={data.summary.critical > 0} />
                      <ReportRow label="High Threats" value={String(data.summary.high)} highlight={data.summary.high > 0} />
                      <ReportRow label="Medium Threats" value={String(data.summary.medium)} />
                    </div>
                    <div className="space-y-3">
                      <ReportRow label="Suspicious Users" value={String(data.summary.suspiciousUsers)} highlight={data.summary.suspiciousUsers > 0} />
                      <ReportRow label="Fraudulent Bookings" value={String(data.summary.fraudulentBookings)} highlight={data.summary.fraudulentBookings > 0} />
                      <ReportRow label="Orphan Tickets" value={String(data.summary.orphanTickets)} highlight={data.summary.orphanTickets > 0} />
                      <ReportRow label="Actions Taken" value={String(Object.keys(actionResults).length)} />
                    </div>
                  </div>
                </div>

                {/* Threat Type Breakdown */}
                <div className="p-6 rounded-xl bg-black/50 border border-orange-500/20">
                  <h3 className="text-lg font-bold text-orange-400 mb-4">Threat Breakdown by Type</h3>
                  <div className="space-y-3">
                    {Object.entries(THREAT_TYPE_CONFIG).map(([type, cfg]) => {
                      const count = data.threats.filter(t => t.type === type).length;
                      const Icon = cfg.icon;
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${cfg.color}`} />
                          <span className="text-sm text-orange-100/60 w-40">{cfg.label}</span>
                          <div className="flex-1 bg-black/50 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${cfg.color === 'text-red-400' ? 'bg-red-500' : cfg.color === 'text-orange-400' ? 'bg-orange-500' : cfg.color === 'text-yellow-400' ? 'bg-yellow-500' : cfg.color === 'text-purple-400' ? 'bg-purple-500' : cfg.color === 'text-cyan-400' ? 'bg-cyan-500' : 'bg-red-600'}`}
                              style={{ width: `${data.threats.length > 0 ? (count / data.threats.length) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-orange-100/80 w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Unique IPs & Countries */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-6 rounded-xl bg-black/50 border border-orange-500/20">
                    <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      IP Addresses Involved
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {Array.from(new Set(data.suspiciousUsers.flatMap(u => u.ips))).filter(Boolean).map(ip => (
                        <div key={ip} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 text-sm">
                          <Monitor className="w-4 h-4 text-orange-100/40" />
                          <code className="text-orange-300">{ip}</code>
                        </div>
                      ))}
                      {data.suspiciousUsers.flatMap(u => u.ips).filter(Boolean).length === 0 && (
                        <p className="text-orange-100/40 text-sm">No IP addresses found</p>
                      )}
                    </div>
                  </div>
                  <div className="p-6 rounded-xl bg-black/50 border border-orange-500/20">
                    <h3 className="text-lg font-bold text-orange-400 mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Locations Involved
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {Array.from(new Set(data.suspiciousUsers.flatMap(u => u.cities.map((c, i) => `${c}, ${u.countries[i] || 'Unknown'}`)))).filter(Boolean).map(loc => (
                        <div key={loc} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 text-sm">
                          <MapPin className="w-4 h-4 text-orange-100/40" />
                          <span className="text-orange-300">{loc}</span>
                        </div>
                      ))}
                      {data.suspiciousUsers.flatMap(u => u.cities).filter(Boolean).length === 0 && (
                        <p className="text-orange-100/40 text-sm">No location data found</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Download */}
                <div className="flex justify-center">
                  <button
                    onClick={generateReport}
                    className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-lg hover:from-red-500 hover:to-orange-500 transition shadow-lg shadow-red-500/20"
                  >
                    <Download className="w-5 h-5" />
                    Download Full Forensic Report
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Component: Summary Card ────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    red: 'bg-red-500/20 border-red-500/40 text-red-400',
    orange: 'bg-orange-500/20 border-orange-500/40 text-orange-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
    green: 'bg-green-500/20 border-green-500/40 text-green-400',
    purple: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
  };

  return (
    <div className={`p-4 rounded-xl border ${colorMap[color] || colorMap.orange}`}>
      <Icon className="w-5 h-5 mb-2 opacity-70" />
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs opacity-60 mt-1">{label}</div>
    </div>
  );
}

// ─── Component: Report Row ──────────────────────────────────────────────
function ReportRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-orange-500/10">
      <span className="text-orange-100/50 text-sm">{label}</span>
      <span className={`font-bold text-sm ${highlight ? 'text-red-400' : 'text-orange-100/80'}`}>{value}</span>
    </div>
  );
}

// ─── Component: Threat Card ─────────────────────────────────────────────
function ThreatCard({
  threat,
  expanded,
  onToggle,
  onAction,
  actionLoading,
  actionResults,
}: {
  threat: Threat;
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: string, params: Record<string, string>) => void;
  actionLoading: string | null;
  actionResults: Record<string, string[]>;
}) {
  const config = SEVERITY_CONFIG[threat.severity];
  const typeConfig = THREAT_TYPE_CONFIG[threat.type] || { label: threat.type, icon: Shield, color: 'text-gray-400' };
  const SevIcon = config.icon;
  const TypeIcon = typeConfig.icon;

  const blockKey = `block_user-${threat.userId || 'x'}`;
  const cleanBookingsKey = `clean_bookings-${threat.userId || 'x'}`;
  const cleanTicketsKey = `clean_tickets-${threat.userId || 'x'}`;
  const cancelKey = `cancel_booking-${threat.bookingId || 'x'}`;
  const removeAdminKey = `remove_admin-${threat.userId || 'x'}`;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition"
      >
        <SevIcon className={`w-5 h-5 ${config.text} flex-shrink-0`} />
        <span className={`px-2 py-0.5 text-xs font-bold rounded ${config.badge} text-white uppercase`}>
          {threat.severity}
        </span>
        <TypeIcon className={`w-4 h-4 ${typeConfig.color} flex-shrink-0`} />
        <span className="text-xs text-orange-100/40">{typeConfig.label}</span>
        <span className="flex-1 font-semibold text-orange-100/90 truncate">{threat.title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-orange-100/40" /> : <ChevronDown className="w-4 h-4 text-orange-100/40" />}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="p-4 pt-0 space-y-4">
          <p className="text-sm text-orange-100/70 leading-relaxed">{threat.description}</p>

          {/* User info */}
          {(threat.userId || threat.email || threat.name) && (
            <div className="p-3 rounded-lg bg-black/30 border border-orange-500/10 space-y-1">
              <h4 className="text-xs font-bold text-orange-400 uppercase mb-2 flex items-center gap-2">
                <Fingerprint className="w-3.5 h-3.5" /> Suspect Information
              </h4>
              {threat.userId && (
                <div className="flex gap-2 text-sm"><span className="text-orange-100/40">User ID:</span><code className="text-orange-300 text-xs">{threat.userId}</code></div>
              )}
              {threat.email && (
                <div className="flex gap-2 text-sm"><span className="text-orange-100/40">Email:</span><span className="text-orange-100/80">{threat.email}</span></div>
              )}
              {threat.name && (
                <div className="flex gap-2 text-sm"><span className="text-orange-100/40">Name:</span><span className="text-orange-100/80">{threat.name}</span></div>
              )}
              {threat.bookingReference && (
                <div className="flex gap-2 text-sm"><span className="text-orange-100/40">Booking:</span><span className="text-orange-100/80">{threat.bookingReference}</span></div>
              )}
              {threat.amount !== undefined && (
                <div className="flex gap-2 text-sm"><span className="text-orange-100/40">Amount:</span><span className="text-red-400 font-bold">€{threat.amount}</span></div>
              )}
              {threat.ticketCount && (
                <div className="flex gap-2 text-sm"><span className="text-orange-100/40">Orphan Tickets:</span><span className="text-red-400 font-bold">{threat.ticketCount}</span></div>
              )}
            </div>
          )}

          {/* Evidence Timeline */}
          {threat.evidence && threat.evidence.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-orange-400 uppercase flex items-center gap-2">
                <Eye className="w-3.5 h-3.5" /> Evidence Timeline ({threat.evidence.length} entries)
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {threat.evidence.map((e, i) => (
                  <div key={i} className="p-2 rounded bg-black/30 border border-orange-500/10 text-xs grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                    <span className="text-orange-100/30">Time:</span>
                    <span className="text-orange-100/70">{new Date(e.timestamp).toLocaleString()}</span>
                    <span className="text-orange-100/30">Action:</span>
                    <span className="text-orange-300 font-mono">{e.action}</span>
                    {e.description && <>
                      <span className="text-orange-100/30">Detail:</span>
                      <span className="text-orange-100/60 break-all">{e.description}</span>
                    </>}
                    {e.ip && <>
                      <span className="text-orange-100/30">IP:</span>
                      <span className="text-cyan-400 font-mono">{e.ip}</span>
                    </>}
                    {(e.city || e.country) && <>
                      <span className="text-orange-100/30">Location:</span>
                      <span className="text-orange-100/60">{[e.city, e.country].filter(Boolean).join(', ')}</span>
                    </>}
                    {e.userAgent && <>
                      <span className="text-orange-100/30">UA:</span>
                      <span className="text-orange-100/40 break-all">{e.userAgent}</span>
                    </>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-orange-500/10">
            {threat.userId && (
              <>
                <ActionButton
                  label="Block User"
                  icon={Ban}
                  color="red"
                  loading={actionLoading === blockKey}
                  done={!!actionResults[blockKey]}
                  onClick={() => onAction('block_user', { targetUserId: threat.userId!, threatId: threat.id })}
                />
                {threat.type === 'privilege_escalation' && (
                  <ActionButton
                    label="Remove Admin"
                    icon={UserX}
                    color="orange"
                    loading={actionLoading === removeAdminKey}
                    done={!!actionResults[removeAdminKey]}
                    onClick={() => onAction('remove_admin', { targetUserId: threat.userId!, threatId: threat.id })}
                  />
                )}
                {threat.type === 'payment_fraud' && (
                  <ActionButton
                    label="Clean Bookings"
                    icon={Trash2}
                    color="yellow"
                    loading={actionLoading === cleanBookingsKey}
                    done={!!actionResults[cleanBookingsKey]}
                    onClick={() => onAction('clean_bookings', { targetUserId: threat.userId!, threatId: threat.id })}
                  />
                )}
                {threat.type === 'ticket_fraud' && (
                  <ActionButton
                    label="Delete Orphan Tickets"
                    icon={Trash2}
                    color="yellow"
                    loading={actionLoading === cleanTicketsKey}
                    done={!!actionResults[cleanTicketsKey]}
                    onClick={() => onAction('clean_tickets', { targetUserId: threat.userId!, threatId: threat.id })}
                  />
                )}
              </>
            )}
            {threat.bookingId && (
              <ActionButton
                label="Cancel Booking"
                icon={XCircle}
                color="red"
                loading={actionLoading === cancelKey}
                done={!!actionResults[cancelKey]}
                onClick={() => onAction('cancel_booking', { bookingId: threat.bookingId!, threatId: threat.id })}
              />
            )}
          </div>

          {/* Action Results */}
          {Object.entries(actionResults)
            .filter(([k]) => k.includes(threat.userId || '---') || k.includes(threat.bookingId || '---'))
            .map(([key, results]) => (
              <div key={key} className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                <h5 className="text-green-400 font-bold text-xs mb-1 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Action Result
                </h5>
                {results.map((r, i) => (
                  <p key={i} className="text-green-300/70">{r}</p>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Component: Suspect Card ────────────────────────────────────────────
function SuspectCard({
  user,
  expanded,
  onToggle,
  onAction,
  actionLoading,
  actionResults,
}: {
  user: SuspiciousUser;
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: string, params: Record<string, string>) => void;
  actionLoading: string | null;
  actionResults: Record<string, string[]>;
}) {
  const blockKey = `block_user-${user.userId}`;
  const cleanBKey = `clean_bookings-${user.userId}`;
  const cleanTKey = `clean_tickets-${user.userId}`;

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition"
      >
        <div className="w-10 h-10 rounded-full bg-red-500/30 border border-red-500/50 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-orange-100/90 truncate">
            {user.names.filter(Boolean)[0] || user.emails.filter(Boolean)[0] || user.userId}
          </div>
          <div className="text-xs text-orange-100/40 truncate">
            {user.threatCount} threat(s) · {user.ips.length} IP(s) · {user.countries.filter(Boolean).join(', ') || 'Unknown location'}
          </div>
        </div>
        <div className="px-2 py-1 text-xs font-bold rounded bg-red-500/30 text-red-300">
          {user.threatCount} threats
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-orange-100/40" /> : <ChevronDown className="w-4 h-4 text-orange-100/40" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <InfoSection title="Identity" icon={Fingerprint} items={[
              { label: 'User ID', value: user.userId },
              ...user.emails.map(e => ({ label: 'Email', value: e })),
              ...user.names.filter(Boolean).map(n => ({ label: 'Name', value: n })),
            ]} />
            <InfoSection title="Network" icon={Globe} items={[
              ...user.ips.map(ip => ({ label: 'IP Address', value: ip })),
              ...user.countries.filter(Boolean).map((c, i) => ({ label: 'Location', value: `${user.cities[i] || 'Unknown'}, ${c}` })),
            ]} />
          </div>

          {user.userAgents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-orange-400 uppercase flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5" /> User Agents
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {user.userAgents.filter(Boolean).map((ua, i) => (
                  <div key={i} className="p-2 rounded bg-black/30 text-xs text-orange-100/50 break-all font-mono">
                    {ua}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-orange-500/10">
            <ActionButton
              label="Block User"
              icon={Ban}
              color="red"
              loading={actionLoading === blockKey}
              done={!!actionResults[blockKey]}
              onClick={() => onAction('block_user', { targetUserId: user.userId })}
            />
            <ActionButton
              label="Clean Bookings"
              icon={Trash2}
              color="orange"
              loading={actionLoading === cleanBKey}
              done={!!actionResults[cleanBKey]}
              onClick={() => onAction('clean_bookings', { targetUserId: user.userId })}
            />
            <ActionButton
              label="Clean Tickets"
              icon={Trash2}
              color="yellow"
              loading={actionLoading === cleanTKey}
              done={!!actionResults[cleanTKey]}
              onClick={() => onAction('clean_tickets', { targetUserId: user.userId })}
            />
          </div>

          {Object.entries(actionResults)
            .filter(([k]) => k.includes(user.userId))
            .map(([key, results]) => (
              <div key={key} className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm">
                <h5 className="text-green-400 font-bold text-xs mb-1 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Action Result
                </h5>
                {results.map((r, i) => (
                  <p key={i} className="text-green-300/70">{r}</p>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── Component: Info Section ────────────────────────────────────────────
function InfoSection({ title, icon: Icon, items }: { title: string; icon: any; items: { label: string; value: string }[] }) {
  return (
    <div className="p-3 rounded-lg bg-black/30 border border-orange-500/10">
      <h4 className="text-xs font-bold text-orange-400 uppercase mb-2 flex items-center gap-2">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 text-sm">
            <span className="text-orange-100/40 whitespace-nowrap">{item.label}:</span>
            <span className="text-orange-100/80 break-all">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component: Action Button ───────────────────────────────────────────
function ActionButton({
  label,
  icon: Icon,
  color,
  loading,
  done,
  onClick,
}: {
  label: string;
  icon: any;
  color: 'red' | 'orange' | 'yellow';
  loading: boolean;
  done: boolean;
  onClick: () => void;
}) {
  const colorMap = {
    red: 'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30',
    orange: 'bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30',
    yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30',
  };

  if (done) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 text-sm">
        <CheckCircle className="w-3.5 h-3.5" /> {label} Done
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition ${colorMap[color]} disabled:opacity-50`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
