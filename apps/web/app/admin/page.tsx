'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Store,
  Layers,
  Activity,
  HardDrive,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogOut,
  IndianRupee,
  Terminal,
  Trash2,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import { formatMinorToInr } from '@/lib/pricing-engine';
import { Button } from '@/components/primitives';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('VENDORS');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [retentionRunning, setRetentionRunning] = useState(false);

  // Load Administrative Data
  const loadData = async () => {
    try {
      setLoading(true);

      const [metricsRes, vendorsRes, logsRes, webhooksRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch(`/api/admin/vendors?filter=${vendorFilter}`),
        fetch('/api/admin/audit-logs'),
        fetch('/api/admin/webhooks'),
      ]);

      if (metricsRes.status === 401 || metricsRes.status === 403) {
        router.push('/login');
        return;
      }

      const metricsData = await metricsRes.json();
      const vendorsData = await vendorsRes.json();
      const logsData = await logsRes.json();
      const webhooksData = await webhooksRes.json();

      setMetrics(metricsData.metrics);
      setVendors(vendorsData.vendors || []);
      setAuditLogs(logsData.logs || []);
      setWebhooks(webhooksData.events || []);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [vendorFilter]);

  const handleVendorAction = async (vendorId: string, action: string) => {
    setActionInProgress(vendorId);
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error executing action');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRunRetention = async () => {
    setRetentionRunning(true);
    try {
      const res = await fetch('/api/admin/retention/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Purge failed');
      alert(`Retention cycle completed. Purged ${data.result.purged} expired document(s).`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error executing retention task');
    } finally {
      setRetentionRunning(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 text-success animate-spin" />
        <p className="font-sora font-bold text-ink">Loading Platform Administration Console...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 min-h-screen">
      {/* Admin Header */}
      <div className="bg-surface p-6 md:p-8 rounded-[32px] border border-hairline shadow-ink-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[20px] bg-ink flex items-center justify-center text-white shadow-sm border border-hairline">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-success-tint border border-success/20 text-success text-[10px] font-bold uppercase tracking-wider mb-2 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Root Administrator Command Center
            </div>
            <h1 className="text-2xl md:text-3xl font-sora font-extrabold text-ink tracking-tight">Platform Governance</h1>
            <p className="text-sm text-ink-soft mt-1">Ubuntu 24.04 VPS Node • Azure Storage • Razorpay Gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadData}
            className="flex items-center gap-2 px-5 h-12"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Stats
          </Button>

          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 h-12 text-danger border-danger/30 hover:bg-danger/10"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* High-Level Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-6 rounded-[24px] border border-hairline shadow-ink-soft space-y-3">
          <div className="flex items-center justify-between text-ink-soft text-sm font-semibold">
            Gross Platform GMV
            <div className="w-8 h-8 rounded-full bg-success-tint flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-success" />
            </div>
          </div>
          <div className="font-sora text-3xl font-extrabold text-ink">
            ₹{formatMinorToInr(metrics?.totalRevenueMinor || 0)}
          </div>
          <div className="text-[11px] text-ink-soft font-medium">From {metrics?.totalOrders || 0} total print orders</div>
        </div>

        <div className="bg-surface p-6 rounded-[24px] border border-hairline shadow-ink-soft space-y-3">
          <div className="flex items-center justify-between text-ink-soft text-sm font-semibold">
            Registered Vendors
            <div className="w-8 h-8 rounded-full bg-paper border border-hairline flex items-center justify-center">
              <Store className="w-4 h-4 text-ink" />
            </div>
          </div>
          <div className="font-sora text-3xl font-extrabold text-ink">{metrics?.vendorCount || 0}</div>
          <div className="text-[11px] text-warning font-bold">
            {metrics?.pendingVendorCount || 0} awaiting approval review
          </div>
        </div>

        <div className="bg-surface p-6 rounded-[24px] border border-hairline shadow-ink-soft space-y-3">
          <div className="flex items-center justify-between text-ink-soft text-sm font-semibold">
            Hardware Stations
            <div className="w-8 h-8 rounded-full bg-paper border border-hairline flex items-center justify-center">
              <Activity className="w-4 h-4 text-ink" />
            </div>
          </div>
          <div className="font-sora text-3xl font-extrabold text-ink">{metrics?.deviceCount || 0}</div>
          <div className="text-[11px] text-ink-soft font-medium">
            {metrics?.activePrinterCount || 0} online Windows printers
          </div>
        </div>

        <div className="bg-surface p-6 rounded-[24px] border border-hairline shadow-ink-soft space-y-3">
          <div className="flex items-center justify-between text-ink-soft text-sm font-semibold">
            Active Documents
            <div className="w-8 h-8 rounded-full bg-paper border border-hairline flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-ink" />
            </div>
          </div>
          <div className="font-sora text-3xl font-extrabold text-ink">{metrics?.documentCount || 0}</div>
          <div className="text-[11px] text-ink-soft font-medium">
            {metrics?.purgedDocumentCount || 0} expired blobs purged
          </div>
        </div>
      </div>

      {/* Main Admin Tabbed Workbench */}
      <div className="bg-surface p-6 md:p-8 rounded-[32px] border border-hairline shadow-ink-soft space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-hairline pb-6 text-xs font-semibold overflow-x-auto scrollbar-hide">
          {[
            { id: 'VENDORS', label: 'Vendor Directory & Moderation' },
            { id: 'AUDIT', label: 'Security Audit Trail' },
            { id: 'WEBHOOKS', label: 'Webhook & Job Failure Monitor' },
            { id: 'STORAGE', label: 'Document Retention & Storage Policy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-pill transition-all whitespace-nowrap border ${
                activeTab === tab.id
                  ? 'bg-ink text-white border-ink shadow-ink-soft'
                  : 'bg-paper text-ink-soft hover:bg-surface border-hairline'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Vendors Directory */}
        {activeTab === 'VENDORS' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs">
              {['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setVendorFilter(f)}
                  className={`px-4 py-2 rounded-pill font-bold transition-all border ${
                    vendorFilter === f
                      ? 'bg-surface text-ink border-ink shadow-sm'
                      : 'bg-paper text-ink-soft border-hairline hover:bg-surface'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-[24px] border border-hairline">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-paper border-b border-hairline text-ink-soft font-sora font-bold text-xs uppercase tracking-wider">
                    <th className="py-4 px-6">Business Name & Handle</th>
                    <th className="py-4 px-6">Contact Info</th>
                    <th className="py-4 px-6">Address</th>
                    <th className="py-4 px-6">Orders / Devices</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline bg-surface">
                  {vendors.map((v) => {
                    const isBusy = actionInProgress === v.id;
                    return (
                      <tr key={v.id} className="hover:bg-paper transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-ink">{v.name}</div>
                          <div className="text-xs text-saffron font-mono mt-0.5">/v/{v.slug}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-ink">{v.contactEmail}</div>
                          <div className="text-xs text-ink-soft mt-0.5">{v.contactPhone}</div>
                        </td>
                        <td className="py-4 px-6 text-ink-soft max-w-xs truncate text-xs font-medium">
                          {v.address}
                        </td>
                        <td className="py-4 px-6 text-ink-soft font-medium text-xs">
                          <span className="text-ink font-bold">{v._count?.orders || 0}</span> orders • <span className="text-ink font-bold">{v._count?.devices || 0}</span> devices
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-3 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider ${
                              !v.isApproved
                                ? 'bg-warning/20 text-warning border border-warning/30'
                                : v.isActive
                                ? 'bg-success-tint text-success border border-success/20'
                                : 'bg-danger/10 text-danger border border-danger/20'
                            }`}
                          >
                            {!v.isApproved ? 'Needs Review' : v.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            {!v.isApproved ? (
                              <Button
                                variant="primary"
                                disabled={isBusy}
                                onClick={() => handleVendorAction(v.id, 'APPROVE')}
                                className="h-8 px-4 text-xs font-bold"
                              >
                                Approve
                              </Button>
                            ) : v.isActive ? (
                              <Button
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => handleVendorAction(v.id, 'SUSPEND')}
                                className="h-8 px-4 text-xs font-bold text-danger border-danger/30 hover:bg-danger/10"
                              >
                                Suspend
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => handleVendorAction(v.id, 'ACTIVATE')}
                                className="h-8 px-4 text-xs font-bold text-success border-success/30 hover:bg-success/10"
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Security Audit Logs */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-[24px] border border-hairline">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-paper border-b border-hairline text-ink-soft font-sora font-bold text-xs uppercase tracking-wider">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Action Event</th>
                    <th className="py-4 px-6">Actor</th>
                    <th className="py-4 px-6">Resource Target</th>
                    <th className="py-4 px-6">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline font-mono text-[11px] bg-surface">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-paper transition-colors">
                      <td className="py-3 px-6 text-ink-soft">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-6 font-bold text-ink">{log.action}</td>
                      <td className="py-3 px-6 text-ink-soft font-medium">
                        {log.user ? `${log.user.fullName} (${log.user.role})` : 'System / Device'}
                      </td>
                      <td className="py-3 px-6 text-ink-soft">
                        {log.resource} {log.resourceId ? `(${log.resourceId.slice(0, 8)}...)` : ''}
                      </td>
                      <td className="py-3 px-6 text-ink-soft">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Webhooks & Background Tasks */}
        {activeTab === 'WEBHOOKS' && (
          <div className="space-y-6">
            <div className="p-6 rounded-[24px] bg-paper border border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="font-sora font-bold text-ink text-base">Automated Document Retention Worker</div>
                <div className="text-sm text-ink-soft mt-1">
                  Batch purges expired Azure Blobs (30-day retention) while protecting active print jobs.
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleRunRetention}
                disabled={retentionRunning}
                className="h-12 shrink-0"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {retentionRunning ? 'Running Purge...' : 'Trigger Purge Cycle'}
              </Button>
            </div>

            <div className="overflow-x-auto rounded-[24px] border border-hairline">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-paper border-b border-hairline text-ink-soft font-sora font-bold text-xs uppercase tracking-wider">
                    <th className="py-4 px-6">Event ID</th>
                    <th className="py-4 px-6">Provider</th>
                    <th className="py-4 px-6">Event Type</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Received At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline font-mono text-[11px] bg-surface">
                  {webhooks.map((w) => (
                    <tr key={w.id} className="hover:bg-paper transition-colors">
                      <td className="py-3 px-6 text-ink-soft">{w.eventId}</td>
                      <td className="py-3 px-6 text-saffron font-bold">{w.provider}</td>
                      <td className="py-3 px-6 text-ink font-bold">{w.eventType}</td>
                      <td className="py-3 px-6">
                        <span className={`px-2 py-0.5 rounded-pill text-[10px] font-bold border ${w.processed ? 'bg-success-tint text-success border-success/30' : 'bg-warning/20 text-warning border-warning/30'}`}>
                          {w.processed ? 'PROCESSED' : 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-ink-soft">
                        {new Date(w.receivedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Storage Policies */}
        {activeTab === 'STORAGE' && (
          <div className="space-y-6 text-sm">
            <div className="p-6 rounded-[24px] bg-paper border border-hairline space-y-4 shadow-sm">
              <div className="flex items-center gap-3 font-sora font-extrabold text-ink text-lg">
                <HardDrive className="w-6 h-6 text-success" />
                <span>Azure Blob Storage Infrastructure Health</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-hairline">
                <div>
                  <div className="text-ink-soft font-semibold text-xs uppercase tracking-wider">Service Status</div>
                  <div className="text-ink font-bold text-base mt-1">
                    {metrics?.storageHealth?.healthy ? 'Operational' : 'Attention Needed'}
                  </div>
                </div>
                <div>
                  <div className="text-ink-soft font-semibold text-xs uppercase tracking-wider">Operating Mode</div>
                  <div className="text-success font-mono font-bold text-base mt-1">{metrics?.storageHealth?.mode}</div>
                </div>
                <div>
                  <div className="text-ink-soft font-semibold text-xs uppercase tracking-wider">Diagnostic Message</div>
                  <div className="text-ink font-medium mt-1">{metrics?.storageHealth?.message}</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-[24px] bg-paper border border-hairline space-y-3 shadow-sm">
              <div className="font-sora font-extrabold text-ink text-lg">Document Expiration Policy Constraints</div>
              <p className="text-ink-soft leading-relaxed font-medium">
                By default, all customer documents uploaded to PrintFlow expire 30 days after creation.
                Documents are safely purged from private Azure Blob containers when their associated orders are
                completed, cancelled, or rejected. No documents are retained on the Linux VPS filesystem.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
