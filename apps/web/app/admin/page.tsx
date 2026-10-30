// hallmark:v1 theme=sticker shape=workbench density=balanced
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
  Tag,
  CreditCard,
  Gift,
  Plus,
  Edit2,
  Clock,
  Sparkles,
  ExternalLink,
  Search,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatMinorToInr } from '@/lib/pricing-engine';
import { Button } from '@/components/primitives';

type AdminNavTab = 'OVERVIEW' | 'VENDORS' | 'PAYMENTS' | 'PLANS' | 'COUPONS' | 'AUDIT' | 'WEBHOOKS' | 'STORAGE';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [totalDiscountGiven, setTotalDiscountGiven] = useState(0);

  // Payment Accounts (Razorpay Technology Partner)
  const [paymentVendors, setPaymentVendors] = useState<any[]>([]);
  const [paymentStats, setPaymentStats] = useState<any>({
    totalVendors: 0,
    activatedCount: 0,
    underReviewCount: 0,
    notConnectedCount: 0,
    restrictedCount: 0,
  });
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [syncingVendorId, setSyncingVendorId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState<AdminNavTab>('OVERVIEW');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Vendor tab filters
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [vendorSearch, setVendorSearch] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [retentionRunning, setRetentionRunning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedVendorForSub, setSelectedVendorForSub] = useState<any>(null);
  const [grantDaysInput, setGrantDaysInput] = useState(30);
  const [subPlanInput, setSubPlanInput] = useState('STARTER');
  const [subNotesInput, setSubNotesInput] = useState('');
  const [subActionLoading, setSubActionLoading] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    window.location.href = '/login';
  };

  const parseJson = async (res: Response) => {
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? await res.json() : null;
  };

  // Load Administrative Data (Initial core load: Metrics & Vendors only)
  const loadData = async (filterOnly = false) => {
    try {
      if (filterOnly) {
        const vendorsRes = await fetch(`/api/admin/vendors?filter=${vendorFilter}`);
        if (vendorsRes.ok) {
          const vendorsData = await vendorsRes.json();
          setVendors(vendorsData.vendors || []);
        }
        return;
      }

      setLoading(true);

      const [metricsRes, vendorsRes] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch(`/api/admin/vendors?filter=${vendorFilter}`),
      ]);

      if (metricsRes.status === 401 || metricsRes.status === 403) {
        window.location.href = '/login';
        return;
      }

      const metricsData = await parseJson(metricsRes);
      const vendorsData = await parseJson(vendorsRes);

      setMetrics(metricsData?.metrics || null);
      setVendors(vendorsData?.vendors || []);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      const data = await parseJson(res);
      if (data?.plans) setPlans(data.plans);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const loadCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await parseJson(res);
      if (data?.coupons) {
        setCoupons(data.coupons);
        setTotalDiscountGiven(data.totalDiscountGivenMinor || 0);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await parseJson(res);
      if (data?.logs) setAuditLogs(data.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const loadWebhooks = async () => {
    try {
      const res = await fetch('/api/admin/webhooks');
      const data = await parseJson(res);
      if (data?.events) setWebhooks(data.events);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
    }
  };

  const loadPaymentAccounts = async (filter = paymentFilter) => {
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/admin/payment-accounts?filter=${filter}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentVendors(data.vendors || []);
        if (data.stats) {
          setPaymentStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load payment accounts:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleAdminSyncPayment = async (vendorId: string) => {
    setSyncingVendorId(vendorId);
    try {
      const res = await fetch(`/api/admin/payment-accounts/${vendorId}/sync`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync status');
      triggerToast('Vendor Razorpay status synchronized successfully');
      await loadPaymentAccounts(paymentFilter);
    } catch (err: any) {
      triggerToast(err.message || 'Status sync failed');
    } finally {
      setSyncingVendorId(null);
    }
  };

  useEffect(() => {
    if (!metrics) {
      loadData(false);
    } else {
      loadData(true);
    }
  }, [vendorFilter]);

  // Lazy-load secondary tabs on demand
  useEffect(() => {
    if (activeNav === 'PAYMENTS') {
      loadPaymentAccounts(paymentFilter);
    } else if (activeNav === 'PLANS' && plans.length === 0) {
      loadPlans();
    } else if (activeNav === 'COUPONS' && coupons.length === 0) {
      loadCoupons();
    } else if (activeNav === 'AUDIT' && auditLogs.length === 0) {
      loadAuditLogs();
    } else if (activeNav === 'WEBHOOKS' && webhooks.length === 0) {
      loadWebhooks();
    }
  }, [activeNav, paymentFilter]);

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
      triggerToast(`Vendor status updated: ${action}`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleTriggerRetention = async () => {
    setRetentionRunning(true);
    try {
      const res = await fetch('/api/admin/retention', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Retention task failed');
      triggerToast(`Purged ${data.task?.blobsPurged || 0} expired document blobs`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Retention task failed');
    } finally {
      setRetentionRunning(false);
    }
  };

  // Plan Management Actions
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlan),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save plan');
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      triggerToast('SaaS Plan configuration saved');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save plan');
    }
  };

  // Coupon Management Actions
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCoupon),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save coupon');
      setIsCouponModalOpen(false);
      setEditingCoupon(null);
      triggerToast('Coupon generated successfully');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save coupon');
    }
  };

  const handleToggleCoupon = async (couponId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        triggerToast(`Coupon ${!currentActive ? 'enabled' : 'disabled'}`);
        loadData();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!confirm('Are you sure you want to permanently delete this coupon?')) return;
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE' });
      if (res.ok) {
        triggerToast('Coupon deleted');
        loadData();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Vendor Subscription Override Actions
  const handleVendorSubOverride = async (action: string) => {
    if (!selectedVendorForSub) return;
    setSubActionLoading(true);
    try {
      const res = await fetch(`/api/admin/vendors/${selectedVendorForSub.id}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          days: grantDaysInput,
          planCode: subPlanInput,
          isActive: selectedVendorForSub.isSubscriptionActive,
          notes: subNotesInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Override failed');
      setIsSubModalOpen(false);
      triggerToast('Vendor subscription parameters updated');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Override failed');
    } finally {
      setSubActionLoading(false);
    }
  };

  // Filtered vendors by tab filter + search query
  const filteredVendors = vendors.filter((v) => {
    if (!vendorSearch) return true;
    const q = vendorSearch.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.slug?.toLowerCase().includes(q) ||
      v.contactEmail?.toLowerCase().includes(q) ||
      v.contactPhone?.includes(q)
    );
  });

  const pendingVendorsCount = metrics?.pendingVendors || 0;

  // Sidebar navigation categorization
  const navCategories = [
    {
      category: 'OPERATIONS & TELEMETRY',
      items: [
        {
          id: 'OVERVIEW' as AdminNavTab,
          label: 'Master Telemetry',
          icon: Activity,
        },
        {
          id: 'VENDORS' as AdminNavTab,
          label: 'Vendors & KYC',
          icon: Store,
          count: vendors.length,
          badge: pendingVendorsCount > 0 ? `${pendingVendorsCount} PENDING` : undefined,
        },
        {
          id: 'PAYMENTS' as AdminNavTab,
          label: 'Razorpay Accounts',
          icon: CreditCard,
          count: paymentVendors.length,
          badge: paymentStats.underReviewCount > 0 ? `${paymentStats.underReviewCount} PENDING` : undefined,
        },
      ],
    },
    {
      category: 'SAAS MONETIZATION',
      items: [
        {
          id: 'PLANS' as AdminNavTab,
          label: 'Subscription Plans',
          icon: CreditCard,
          count: plans.length,
        },
        {
          id: 'COUPONS' as AdminNavTab,
          label: 'Coupons & Promo Codes',
          icon: Tag,
          count: coupons.length,
        },
      ],
    },
    {
      category: 'SECURITY & CLOUD INFRA',
      items: [
        {
          id: 'AUDIT' as AdminNavTab,
          label: 'Security Audit Trail',
          icon: Terminal,
          count: auditLogs.length,
        },
        {
          id: 'WEBHOOKS' as AdminNavTab,
          label: 'Webhook Deliveries',
          icon: Layers,
          count: webhooks.length,
        },
        {
          id: 'STORAGE' as AdminNavTab,
          label: 'Blob Retention Health',
          icon: HardDrive,
        },
      ],
    },
  ];

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white/10 border-t-saffron rounded-full motion-safe:animate-spin" />
          <div className="text-white/80 text-xs font-semibold">
            Initializing super admin control plane…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row text-ink antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-ink text-white px-5 py-3 rounded-20 shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-3 border border-white/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MOBILE TOP BAR (Screens < md)                                  */}
      {/* ============================================================== */}
      <div className="md:hidden bg-ink text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 rounded-12 bg-white/10 hover:bg-white/20 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            aria-label="Toggle Navigation Drawer"
          >
            <Menu className="w-5 h-5 text-saffron" />
          </button>
          <div>
            <div className="text-xs font-sora font-extrabold text-white">
              Super Admin Console
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-success motion-safe:animate-pulse" />
              <span className="text-xs text-success font-semibold">
                Root mode
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 rounded-10 bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center gap-1.5 border border-rose-500/30"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 md:hidden animate-in fade-in"
        />
      )}

      {/* ============================================================== */}
      {/* PERMANENT COLLAPSIBLE SAAS COMMAND SIDEBAR                     */}
      {/* ============================================================== */}
      <aside
        className={`bg-ink text-white flex flex-col justify-between transition-colors duration-300 ease-in-out border-r border-white/10 shrink-0 z-50 ${
          sidebarCollapsed ? 'w-20' : 'w-64 lg:w-72'
        } ${
          mobileDrawerOpen
            ? 'fixed inset-y-0 left-0 shadow-2xl flex translate-x-0 w-72'
            : 'hidden md:flex md:sticky md:top-0 md:h-screen md:overflow-y-auto scrollbar-hide'
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Brand & Administrator Identification Header */}
          <div className="pb-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-12 bg-saffron flex items-center justify-center text-white font-black text-base shadow-md shadow-saffron/30 shrink-0">
                  P
                </div>
                {!sidebarCollapsed && (
                  <div>
                    <div className="font-sora font-extrabold text-base text-white tracking-tight leading-none">
                      Print<span className="text-saffron">2</span>Me
                    </div>
                    <div className="text-xs text-saffron font-semibold mt-0.5">
                      Platform core
                    </div>
                  </div>
                )}
              </Link>

              {/* Desktop Sidebar Collapse Toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex p-1.5 rounded-8 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              {/* Mobile Close Button */}
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="md:hidden p-1.5 rounded-8 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Super Admin Status Card */}
            {!sidebarCollapsed ? (
              <div className="p-3 rounded-16 bg-white/5 border border-white/10 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold  text-saffron font-sora">
                    Master Console
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ROOT ACTIVE
                  </span>
                </div>
                <div className="font-sora font-bold text-sm text-white truncate">
                  Platform Administrator
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate">
                  admin@print2me.in
                </div>
              </div>
            ) : (
              <div className="flex justify-center pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Root Active" />
              </div>
            )}
          </div>

          {/* Categorized Navigation Menu */}
          <nav className="space-y-5">
            {navCategories.map((group) => (
              <div key={group.category} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="px-3 text-[10px] font-extrabold  text-slate-400 font-sora">
                    {group.category}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveNav(item.id);
                        setMobileDrawerOpen(false);
                      }}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center ${
                        sidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'
                      } rounded-12 text-xs font-semibold transition-colors group ${
                        isActive
                          ? 'bg-saffron text-white font-bold shadow-md shadow-saffron/25'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-transform group-hover:scale-110 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-saffron'
                          }`}
                        />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!sidebarCollapsed && (
                        <div className="flex items-center gap-1.5">
                          {(item as any).badge && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-pill font-extrabold  ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              }`}
                            >
                              {(item as any).badge}
                            </span>
                          )}
                          {item.count !== undefined && item.count > 0 && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-pill font-bold ${
                                isActive ? 'bg-black/20 text-white' : 'bg-white/10 text-white'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer: Service Status & Master Sign Out */}
        <div className="p-4 border-t border-white/10 space-y-3">
          {!sidebarCollapsed && (
            <div className="p-3 rounded-16 bg-white/5 border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold  font-mono">
                <span>Rust Core Service</span>
                <span className="text-emerald-400 font-bold">PORT 8080</span>
              </div>
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Background Daemons Active</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {!sidebarCollapsed && (
              <button
                onClick={() => loadData(false)}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-12 bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                title="Refresh State"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-saffron ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className={`p-2.5 rounded-12 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-colors ${
                sidebarCollapsed ? 'w-full flex items-center justify-center' : ''
              }`}
              title="Sign Out of Super Admin Console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN VIEWPORT WORKBENCH                                         */}
      {/* ============================================================== */}
      <main className="flex-1 min-w-0 bg-paper overflow-y-auto">
        {/* Workspace Sticky Top Banner */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-hairline px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-sora font-extrabold text-ink tracking-tight">
              {activeNav === 'OVERVIEW' && 'Master Telemetry & Platform Overview'}
              {activeNav === 'VENDORS' && 'Vendor Directory & Partner KYC'}
              {activeNav === 'PAYMENTS' && 'Razorpay Technology Partner Accounts & Direct Settlement'}
              {activeNav === 'PLANS' && 'SaaS Subscription Plans & Quotas'}
              {activeNav === 'COUPONS' && 'Promo Coupons & Discount Codes'}
              {activeNav === 'AUDIT' && 'Security Audit Trail & Actor Logs'}
              {activeNav === 'WEBHOOKS' && 'Razorpay Webhooks & Event Monitor'}
              {activeNav === 'STORAGE' && 'Azure Blob Storage Health & Retention'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerRetention}
              disabled={retentionRunning}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-12 bg-paper hover:bg-surface border border-hairline text-xs font-bold text-ink-soft hover:text-ink transition-colors active:scale-95 disabled:opacity-50"
              title="Purge Expired Document Blobs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Purge Expired Blobs</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-12 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors active:scale-95 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Top 5 KPI Cards: Always visible across tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-20 bg-surface border border-hairline shadow-xs space-y-2 group hover:border-saffron/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">
                  Platform GMV
                </span>
                <div className="w-7 h-7 rounded-8 bg-success-tint text-success flex items-center justify-center font-bold">
                  <IndianRupee className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-sora text-ink">
                {formatMinorToInr(metrics?.totalRevenueMinor || 0)}
              </div>
              <div className="text-xs text-ink-soft font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Cumulative total volume
              </div>
            </div>

            <div className="p-5 rounded-20 bg-surface border border-hairline shadow-xs space-y-2 group hover:border-saffron/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">
                  Total Orders
                </span>
                <div className="w-7 h-7 rounded-8 bg-saffron-tint text-saffron flex items-center justify-center font-bold">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-sora text-ink">
                {metrics?.totalOrders || 0}
              </div>
              <div className="text-xs text-ink-soft font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-saffron" />
                Dispatched jobs
              </div>
            </div>

            <div className="p-5 rounded-20 bg-surface border border-hairline shadow-xs space-y-2 group hover:border-saffron/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">
                  Partner Shops
                </span>
                <div className="w-7 h-7 rounded-8 bg-saffron-tint text-saffron flex items-center justify-center font-bold">
                  <Store className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-sora text-ink">
                {metrics?.activeVendors || 0}
              </div>
              <div className="text-xs font-medium">
                {pendingVendorsCount > 0 ? (
                  <span className="text-saffron bg-saffron-tint px-1.5 py-0.5 rounded-pill font-semibold">
                    {pendingVendorsCount} pending
                  </span>
                ) : (
                  <span className="text-success bg-success-tint px-1.5 py-0.5 rounded-pill font-semibold">
                    All verified
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 rounded-20 bg-surface border border-hairline shadow-xs space-y-2 group hover:border-saffron/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">
                  SaaS Plans
                </span>
                <div className="w-7 h-7 rounded-8 bg-paper border border-hairline text-ink flex items-center justify-center font-bold">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-sora text-ink">
                {plans.filter((p) => p.isActive).length}{' '}
                <span className="text-xs font-normal text-ink-soft">active</span>
              </div>
              <div className="text-xs text-ink-soft font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Live subscription tiers
              </div>
            </div>

            <div className="p-5 rounded-20 bg-surface border border-hairline shadow-xs space-y-2 group hover:border-saffron/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">
                  Active Coupons
                </span>
                <div className="w-7 h-7 rounded-8 bg-paper border border-hairline text-ink flex items-center justify-center font-bold">
                  <Gift className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-sora text-ink">
                {coupons.length}{' '}
                <span className="text-xs font-normal text-ink-soft">Codes</span>
              </div>
              <div className="text-[10px] text-pink-700 font-bold bg-pink-50 px-1.5 py-0.5 rounded-full inline-flex self-start">
                Saved {formatMinorToInr(totalDiscountGiven)}
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* TAB CONTENT RENDER                                             */}
          {/* ============================================================== */}
          <div className="bg-surface p-6 md:p-8 rounded-[28px] border border-hairline shadow-ink-soft">
            {/* 1. OVERVIEW TAB */}
            {activeNav === 'OVERVIEW' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Shop Partners */}
                  <div className="p-6 rounded-[22px] bg-paper border border-hairline space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-sora font-extrabold text-base text-ink flex items-center gap-2">
                        <Store className="w-4 h-4 text-saffron" />
                        <span>Recent Partner Shops</span>
                      </h3>
                      <button
                        onClick={() => setActiveNav('VENDORS')}
                        className="text-xs text-saffron font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
                      >
                        View all ({vendors.length})
                      </button>
                    </div>
                    <div className="space-y-2">
                      {vendors.slice(0, 4).map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between p-3 rounded-14 bg-surface border border-hairline text-xs"
                        >
                          <div>
                            <div className="font-bold text-ink">{v.name}</div>
                            <div className="text-xs text-saffron font-semibold">/v/{v.slug}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-pill text-xs font-semibold ${
                              !v.isApproved
                                ? 'bg-saffron-tint text-saffron border border-saffron/20'
                                : 'bg-success-tint text-success border border-success/20'
                            }`}
                          >
                            {!v.isApproved ? 'Needs review' : 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Security & System Events Summary */}
                  <div className="p-6 rounded-[22px] bg-paper border border-hairline space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-sora font-extrabold text-base text-ink flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-ink" />
                        <span>Recent audit events</span>
                      </h3>
                      <button
                        onClick={() => setActiveNav('AUDIT')}
                        className="text-xs text-ink font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
                      >
                        View all logs
                      </button>
                    </div>
                    <div className="space-y-2">
                      {auditLogs.slice(0, 4).map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 rounded-14 bg-surface border border-hairline text-xs font-mono"
                        >
                          <div className="truncate max-w-[200px]">
                            <span className="font-bold text-ink">{log.action}</span>
                          </div>
                          <span className="text-[10px] text-ink-soft">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. VENDORS TAB */}
            {activeNav === 'VENDORS' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-1.5 bg-paper p-1 rounded-14 border border-hairline self-start">
                    {['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setVendorFilter(f)}
                        className={`px-3 py-1.5 rounded-10 text-xs font-bold transition-colors ${
                          vendorFilter === f
                            ? 'bg-surface text-ink shadow-xs border border-hairline'
                            : 'text-ink-soft hover:text-ink'
                        }`}
                      >
                        {f === 'PENDING' ? 'Pending Review' : f}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search name, slug, email, phone..."
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="w-full bg-paper border border-hairline rounded-14 pl-10 pr-4 py-2 text-xs font-medium text-ink focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10 transition-colors placeholder:text-ink-soft/60"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-[20px] border border-hairline shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-paper border-b border-hairline text-ink-soft font-sora font-bold text-xs ">
                        <th className="py-3.5 px-5">Partner Shop & Kiosk</th>
                        <th className="py-3.5 px-5">Contact Details</th>
                        <th className="py-3.5 px-5">Throughput</th>
                        <th className="py-3.5 px-5">Subscription Plan</th>
                        <th className="py-3.5 px-5">KYC Status</th>
                        <th className="py-3.5 px-5 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline bg-surface">
                      {filteredVendors.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-ink-soft text-xs font-medium">
                            No print vendor partners match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        filteredVendors.map((v) => {
                          const isBusy = actionInProgress === v.id;
                          const now = new Date();
                          const expDate = v.subscriptionExpiresAt ? new Date(v.subscriptionExpiresAt) : null;
                          const isSubExpired = !expDate || expDate <= now;

                          return (
                            <tr key={v.id} className="hover:bg-paper/50 transition-colors">
                              <td className="py-4 px-5">
                                <div className="font-bold text-ink font-sora text-sm">{v.name}</div>
                                {v.slug ? (
                                  <Link
                                    href={`/v/${v.slug}`}
                                    target="_blank"
                                    className="text-xs text-saffron hover:underline font-mono inline-flex items-center gap-1 mt-0.5 group"
                                    title="Open Customer Counter Upload Page in New Tab"
                                  >
                                    <span>/v/{v.slug}</span>
                                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                  </Link>
                                ) : (
                                  <span className="text-xs text-ink-soft font-mono">-</span>
                                )}
                              </td>

                              <td className="py-4 px-5">
                                <div className="font-medium text-ink text-xs">{v.contactEmail || 'No email'}</div>
                                <div className="text-[11px] text-ink-soft font-mono mt-0.5">
                                  {v.contactPhone || 'No phone'}
                                </div>
                              </td>

                              <td className="py-4 px-5 text-xs text-ink-soft font-medium">
                                <span className="text-ink font-bold">{v._count?.orders || 0}</span> orders •{' '}
                                <span className="text-ink font-bold">{v._count?.devices || 0}</span> PC(s)
                              </td>

                              <td className="py-4 px-5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-xs px-2 py-0.5 rounded-pill bg-paper text-ink border border-hairline">
                                      {v.subscriptionPlan || 'TRIAL'}
                                    </span>
                                    {isSubExpired ? (
                                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200">
                                        Expired
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-ink-soft">
                                    {expDate ? `Expires ${expDate.toLocaleDateString('en-IN')}` : 'No expiry set'}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedVendorForSub(v);
                                      setSubPlanInput(v.subscriptionPlan || 'STARTER');
                                      setGrantDaysInput(30);
                                      setSubNotesInput(v.adminSubNotes || '');
                                      setIsSubModalOpen(true);
                                    }}
                                    className="text-[11px] font-bold text-saffron hover:underline text-left mt-0.5 inline-flex items-center gap-1"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    Manage Subscription
                                  </button>
                                </div>
                              </td>

                              <td className="py-4 px-5">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold  inline-flex items-center gap-1 ${
                                    !v.isApproved
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : v.isActive
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      !v.isApproved ? 'bg-amber-500' : v.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                  />
                                  {!v.isApproved ? 'Needs Review' : v.isActive ? 'Verified Active' : 'Suspended'}
                                </span>
                              </td>

                              <td className="py-4 px-5 text-right">
                                <div className="flex justify-end gap-2">
                                  {!v.isApproved ? (
                                    <Button
                                      variant="primary"
                                      disabled={isBusy}
                                      onClick={() => handleVendorAction(v.id, 'APPROVE')}
                                      className="h-8 px-3 text-xs font-bold"
                                    >
                                      Approve KYC
                                    </Button>
                                  ) : v.isActive ? (
                                    <Button
                                      variant="outline"
                                      disabled={isBusy}
                                      onClick={() => handleVendorAction(v.id, 'SUSPEND')}
                                      className="h-8 px-3 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50"
                                    >
                                      Suspend
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="outline"
                                      disabled={isBusy}
                                      onClick={() => handleVendorAction(v.id, 'ACTIVATE')}
                                      className="h-8 px-3 text-xs font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    >
                                      Activate
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. PLANS TAB */}
            {activeNav === 'PLANS' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-sora font-extrabold text-lg text-ink">Platform Subscription Plans</h3>
                    <p className="text-xs text-ink-soft">
                      Configure partner subscription tiers, workstation limits, and feature toggles dynamically.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditingPlan({
                        code: '',
                        name: '',
                        description: '',
                        priceMonthlyMinor: 49900,
                        priceYearlyMinor: 499900,
                        maxDevices: 1,
                        maxOrdersPerMonth: 500,
                        hasAutoPrint: true,
                        hasColorRouting: false,
                        hasPrioritySupport: false,
                        isActive: true,
                        displayOrder: plans.length + 1,
                      });
                      setIsPlanModalOpen(true);
                    }}
                    className="rounded-14 text-xs font-bold px-4 h-9"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Create New Plan
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((p) => (
                    <div
                      key={p.id}
                      className={`p-6 rounded-[24px] border ${
                        p.isActive
                          ? 'border-hairline bg-surface shadow-sm'
                          : 'border-dashed border-rose-300 bg-paper opacity-75'
                      } space-y-5 relative flex flex-col justify-between`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold font-sora text-xs px-2.5 py-1 rounded-pill bg-ink text-white">
                            {p.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              p.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {p.isActive ? 'Active in Catalog' : 'Disabled'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-lg font-sora text-ink">{p.name}</h4>
                          <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                            {p.description || 'No description provided'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-hairline">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black font-sora text-ink">
                              {formatMinorToInr(p.priceMonthlyMinor)}
                            </span>
                            <span className="text-xs text-ink-soft">/ month</span>
                          </div>
                          <div className="text-xs text-saffron font-bold mt-0.5">
                            {formatMinorToInr(p.priceYearlyMinor)} / year (Annual Discount)
                          </div>
                        </div>

                        <div className="space-y-2 pt-3 border-t border-hairline text-xs font-medium">
                          <div className="flex justify-between">
                            <span className="text-ink-soft">Counter Workstations:</span>
                            <span className="font-bold text-ink">{p.maxDevices} device(s)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-soft">Monthly Order Quota:</span>
                            <span className="font-bold text-ink">
                              {p.maxOrdersPerMonth === -1 ? 'Unlimited' : `${p.maxOrdersPerMonth} orders`}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-soft">Auto-Print Spooler:</span>
                            <span className={`font-bold ${p.hasAutoPrint ? 'text-emerald-600' : 'text-ink-soft'}`}>
                              {p.hasAutoPrint ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-ink-soft">Multi-Printer Color Routing:</span>
                            <span className={`font-bold ${p.hasColorRouting ? 'text-emerald-600' : 'text-ink-soft'}`}>
                              {p.hasColorRouting ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-hairline">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingPlan(p);
                            setIsPlanModalOpen(true);
                          }}
                          className="w-full text-xs font-bold h-9 rounded-14"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                          Edit Pricing & Quotas
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. COUPONS TAB */}
            {activeNav === 'COUPONS' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-sora font-extrabold text-lg text-ink">Vendor Coupons & Vouchers</h3>
                    <p className="text-xs text-ink-soft">
                      Generate promotional discount codes, flat cash vouchers, or 100% Free Days trial passes.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditingCoupon({
                        code: '',
                        description: '',
                        discountType: 'PERCENTAGE',
                        discountValue: 20,
                        freeDays: 30,
                        minOrderMinor: 0,
                        maxDiscountMinor: 50000,
                        maxUsesTotal: 100,
                        maxUsesPerVendor: 1,
                        validTill: '',
                        isActive: true,
                        applicablePlanCodes: [],
                      });
                      setIsCouponModalOpen(true);
                    }}
                    className="rounded-14 text-xs font-bold px-4 h-9"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Create New Coupon
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-[20px] border border-hairline shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-paper border-b border-hairline text-ink-soft font-sora font-bold text-xs ">
                        <th className="py-3.5 px-5">Coupon Code</th>
                        <th className="py-3.5 px-5">Discount Benefit</th>
                        <th className="py-3.5 px-5">Redemptions</th>
                        <th className="py-3.5 px-5">Validity</th>
                        <th className="py-3.5 px-5">Status</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline bg-surface">
                      {coupons.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-ink-soft text-xs font-medium">
                            No coupons created yet. Click &quot;Create New Coupon&quot; to issue your first voucher.
                          </td>
                        </tr>
                      ) : (
                        coupons.map((c) => {
                          const isExpired = c.validTill && new Date(c.validTill) < new Date();
                          return (
                            <tr key={c.id} className="hover:bg-paper/50 transition-colors">
                              <td className="py-4 px-5">
                                <div className="font-bold text-ink font-mono text-base flex items-center gap-1.5">
                                  <Tag className="w-4 h-4 text-saffron" />
                                  <span>{c.code}</span>
                                </div>
                                <div className="text-xs text-ink-soft mt-0.5">{c.description || 'No description'}</div>
                              </td>
                              <td className="py-4 px-5">
                                {c.discountType === 'PERCENTAGE' && (
                                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full font-sora text-xs">
                                    {c.discountValue}% OFF
                                  </span>
                                )}
                                {c.discountType === 'FLAT_AMOUNT' && (
                                  <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-sora text-xs">
                                    Flat {formatMinorToInr(c.discountValue)} OFF
                                  </span>
                                )}
                                {c.discountType === 'FREE_DAYS' && (
                                  <span className="font-bold text-saffron bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-sora text-xs">
                                     {c.freeDays || 30} Days Free Pass
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5 text-xs text-ink-soft font-medium">
                                <span className="text-ink font-bold">{c.currentUsesTotal}</span> used of{' '}
                                <span className="text-ink font-bold">{c.maxUsesTotal === -1 ? '∞' : c.maxUsesTotal}</span>
                              </td>
                              <td className="py-4 px-5 text-xs text-ink-soft">
                                {c.validTill ? (
                                  isExpired ? (
                                    <span className="text-rose-600 font-bold">Expired</span>
                                  ) : (
                                    `Until ${new Date(c.validTill).toLocaleDateString('en-IN')}`
                                  )
                                ) : (
                                  'Lifetime / No Expiry'
                                )}
                              </td>
                              <td className="py-4 px-5">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold  border ${
                                    c.isActive && !isExpired
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {c.isActive && !isExpired ? 'Active' : 'Disabled'}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => handleToggleCoupon(c.id, c.isActive)}
                                    className="h-7 px-3 text-xs font-bold rounded-10"
                                  >
                                    {c.isActive ? 'Disable' : 'Enable'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => handleDeleteCoupon(c.id)}
                                    className="h-7 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200 rounded-10"
                                    title="Delete Coupon"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. AUDIT TAB */}
            {activeNav === 'AUDIT' && (
              <div className="space-y-4">
                <div className="text-xs text-ink-soft font-medium">
                  Real-time cryptographic audit log of administrative actions, plan grants, and status changes.
                </div>
                <div className="overflow-x-auto rounded-[20px] border border-hairline shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-paper border-b border-hairline text-ink-soft font-sora font-bold text-xs ">
                        <th className="py-3.5 px-5">Timestamp</th>
                        <th className="py-3.5 px-5">Action / Event</th>
                        <th className="py-3.5 px-5">Resource ID</th>
                        <th className="py-3.5 px-5">Actor / Origin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline bg-surface font-mono text-xs">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-ink-soft">
                            No security audit events recorded in current period.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-paper/50">
                            <td className="py-3 px-5 text-ink-soft">
                              {new Date(log.createdAt).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-5 text-ink font-bold">
                              <span className="px-2 py-0.5 rounded bg-paper border border-hairline">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3 px-5 text-ink-soft">{log.resourceId || '-'}</td>
                            <td className="py-3 px-5 text-ink-soft">{log.actorId || 'system-daemon'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. WEBHOOKS TAB */}
            {activeNav === 'WEBHOOKS' && (
              <div className="space-y-4">
                <div className="text-xs text-ink-soft font-medium">
                  Monitor incoming Razorpay payment webhooks and print agent state machine transactions.
                </div>
                <div className="overflow-x-auto rounded-[20px] border border-hairline shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-paper border-b border-hairline text-ink-soft font-sora font-bold text-xs ">
                        <th className="py-3.5 px-5">Timestamp</th>
                        <th className="py-3.5 px-5">Event Type</th>
                        <th className="py-3.5 px-5">Processing State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline bg-surface font-mono text-xs">
                      {webhooks.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-ink-soft">
                            No external webhook events logged.
                          </td>
                        </tr>
                      ) : (
                        webhooks.map((e, idx) => (
                          <tr key={idx} className="hover:bg-paper/50">
                            <td className="py-3 px-5 text-ink-soft">
                              {new Date(e.timestamp || Date.now()).toLocaleTimeString()}
                            </td>
                            <td className="py-3 px-5 text-ink font-bold">{e.event || 'WEBHOOK_EVENT'}</td>
                            <td className="py-3 px-5 text-emerald-600 font-bold">{e.status || 'PROCESSED'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PAYMENTS & RAZORPAY TECHNOLOGY PARTNER TAB */}
            {activeNav === 'PAYMENTS' && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="p-5 rounded-20 bg-paper border border-hairline shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-ink-soft ">Total Vendors</span>
                    <div className="text-2xl font-sora font-extrabold text-ink">{paymentStats.totalVendors}</div>
                    <span className="text-[10px] text-ink-soft">Registered shops</span>
                  </div>

                  <div className="p-5 rounded-20 bg-paper border border-hairline shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-success ">Active & Settling</span>
                    <div className="text-2xl font-sora font-extrabold text-success">{paymentStats.activatedCount}</div>
                    <span className="text-[10px] text-ink-soft">Direct payouts active</span>
                  </div>

                  <div className="p-5 rounded-20 bg-paper border border-hairline shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-amber-500 ">Under Review</span>
                    <div className="text-2xl font-sora font-extrabold text-amber-500">{paymentStats.underReviewCount}</div>
                    <span className="text-[10px] text-ink-soft">KYC verification pending</span>
                  </div>

                  <div className="p-5 rounded-20 bg-paper border border-hairline shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-ink-soft ">Not Connected</span>
                    <div className="text-2xl font-sora font-extrabold text-slate-500">{paymentStats.notConnectedCount}</div>
                    <span className="text-[10px] text-ink-soft">Onboarding not started</span>
                  </div>

                  <div className="p-5 rounded-20 bg-paper border border-hairline shadow-xs space-y-1">
                    <span className="text-[10px] font-bold text-danger ">Restricted</span>
                    <div className="text-2xl font-sora font-extrabold text-danger">{paymentStats.restrictedCount}</div>
                    <span className="text-[10px] text-ink-soft">Suspended or rejected</span>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-5 rounded-20 bg-paper border border-hairline shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'ALL', label: 'All Accounts' },
                      { id: 'ACTIVATED', label: 'Active & Verified' },
                      { id: 'PENDING', label: 'Under Review' },
                      { id: 'NOT_CONNECTED', label: 'Not Connected' },
                      { id: 'RESTRICTED', label: 'Restricted' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => {
                          setPaymentFilter(f.id);
                          loadPaymentAccounts(f.id);
                        }}
                        className={`px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                          paymentFilter === f.id
                            ? 'bg-ink text-paper shadow-xs'
                            : 'bg-surface hover:bg-hairline text-ink-soft'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search vendor or account..."
                        value={paymentSearch}
                        onChange={(e) => setPaymentSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-12 bg-surface border border-hairline text-xs text-ink placeholder:text-ink-soft focus:outline-none focus:border-saffron w-48 sm:w-60"
                      />
                    </div>

                    <button
                      onClick={() => loadPaymentAccounts(paymentFilter)}
                      disabled={paymentLoading}
                      className="p-2 rounded-12 bg-surface hover:bg-hairline border border-hairline text-ink-soft transition"
                      title="Refresh list"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${paymentLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Vendor Payment Accounts Table */}
                <div className="bg-paper border border-hairline rounded-24 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-hairline bg-surface/50 text-ink-soft font-bold text-[10px] ">
                          <th className="py-3 px-4">Store Business Name</th>
                          <th className="py-3 px-4">Razorpay Account ID</th>
                          <th className="py-3 px-4">Onboarding State</th>
                          <th className="py-3 px-4">Authoritative Status</th>
                          <th className="py-3 px-4">Orders</th>
                          <th className="py-3 px-4">Last Synced</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {paymentLoading ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-ink-soft animate-pulse">
                              Loading vendor payment accounts...
                            </td>
                          </tr>
                        ) : paymentVendors.filter((v) => {
                            if (!paymentSearch) return true;
                            const q = paymentSearch.toLowerCase();
                            return (
                              v.name?.toLowerCase().includes(q) ||
                              v.slug?.toLowerCase().includes(q) ||
                              v.paymentAccount?.razorpayAccountId?.toLowerCase().includes(q)
                            );
                          }).length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-ink-soft">
                              No vendor payment accounts matching the current filter.
                            </td>
                          </tr>
                        ) : (
                          paymentVendors
                            .filter((v) => {
                              if (!paymentSearch) return true;
                              const q = paymentSearch.toLowerCase();
                              return (
                                v.name?.toLowerCase().includes(q) ||
                                v.slug?.toLowerCase().includes(q) ||
                                v.paymentAccount?.razorpayAccountId?.toLowerCase().includes(q)
                              );
                            })
                            .map((vendor) => {
                              const acc = vendor.paymentAccount;
                              const isActivated = acc?.activationStatus === 'ACTIVATED';
                              const isUnderReview = acc?.activationStatus === 'UNDER_REVIEW';
                              const isRestricted =
                                acc?.activationStatus === 'SUSPENDED' || acc?.activationStatus === 'REJECTED';

                              return (
                                <tr key={vendor.id} className="hover:bg-surface/50 transition">
                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-ink">{vendor.name}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] font-mono text-ink-soft">/{vendor.slug}</span>
                                      <Link
                                        href={`/shop/${vendor.slug}`}
                                        target="_blank"
                                        className="text-[10px] text-saffron hover:underline flex items-center gap-0.5 font-bold"
                                      >
                                        <span>Shop Page</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </Link>
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4 font-mono text-xs">
                                    {acc?.razorpayAccountId ? (
                                      <span className="font-bold text-ink">{acc.razorpayAccountId}</span>
                                    ) : (
                                      <span className="text-ink-soft italic">Not connected</span>
                                    )}
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <span className="text-[11px] font-medium text-ink">
                                      {acc?.onboardingStatus || 'NOT_STARTED'}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4">
                                    {isActivated ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                        ACTIVATED
                                      </span>
                                    ) : isUnderReview ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        UNDER REVIEW
                                      </span>
                                    ) : isRestricted ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-danger/10 text-danger border border-danger/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                                        {acc?.activationStatus}
                                      </span>
                                    ) : acc?.authStatus === 'AUTHORIZED' ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                                        AUTHORIZED
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                        NOT CONNECTED
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3.5 px-4 font-mono font-bold text-ink">
                                    {vendor._count?.orders || 0}
                                  </td>

                                  <td className="py-3.5 px-4 text-ink-soft text-[11px]">
                                    {acc?.lastSyncedAt
                                      ? new Date(acc.lastSyncedAt).toLocaleString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : '-'}
                                  </td>

                                  <td className="py-3.5 px-4 text-right">
                                    {acc?.razorpayAccountId ? (
                                      <button
                                        onClick={() => handleAdminSyncPayment(vendor.id)}
                                        disabled={syncingVendorId === vendor.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-10 bg-surface hover:bg-hairline border border-hairline text-[11px] font-bold text-ink transition active:scale-95 disabled:opacity-50"
                                        title="Synchronize authoritative status from Razorpay"
                                      >
                                        <RefreshCw
                                          className={`w-3 h-3 ${syncingVendorId === vendor.id ? 'animate-spin' : ''}`}
                                        />
                                        <span>{syncingVendorId === vendor.id ? 'Syncing...' : 'Sync Status'}</span>
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-ink-soft italic">No account</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Compliance & Security Guard Banner */}
                <div className="p-5 rounded-20 bg-paper border border-hairline space-y-2 text-xs text-ink-soft leading-relaxed">
                  <div className="flex items-center gap-2 text-ink font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Administrator Security & Razorpay Compliance Principles</span>
                  </div>
                  <p>
                    Print2Me is registered as a Technology Partner. All vendor payouts settle directly to each vendor&apos;s
                    own bank account with 0% platform commission on print jobs. Administrators can view connection status and
                    trigger safe status synchronizations, but cannot retrieve vendor access tokens or bypass Razorpay&apos;s
                    regulatory KYC reviews.
                  </p>
                </div>
              </div>
            )}

            {/* 7. STORAGE TAB */}
            {activeNav === 'STORAGE' && (
              <div className="space-y-6">
                <div className="p-6 rounded-[24px] bg-paper border border-hairline space-y-4 shadow-xs">
                  <div className="flex items-center gap-3 font-sora font-extrabold text-ink text-lg">
                    <HardDrive className="w-6 h-6 text-emerald-600" />
                    <span>Azure Encrypted Storage & Document Retention Policies</span>
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed max-w-2xl">
                    Print2Me enforces strict ephemeral privacy: customer documents uploaded to Azure Blob Containers are
                    streamed via short-lived SAS tokens and automatically purged by the background retention cleaner
                    after printing is finalized.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-hairline">
                    <div>
                      <div className="text-ink-soft font-bold text-[11px] ">Service Status</div>
                      <div className="text-ink font-bold text-base mt-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {metrics?.storageHealth?.healthy ? 'Operational' : 'Active (Local Dev Mode)'}
                      </div>
                    </div>
                    <div>
                      <div className="text-ink-soft font-bold text-[11px] ">Storage Mode</div>
                      <div className="text-emerald-600 font-mono font-bold text-base mt-1">
                        {metrics?.storageHealth?.mode || 'AZURE_BLOB'}
                      </div>
                    </div>
                    <div>
                      <div className="text-ink-soft font-bold text-[11px] ">Diagnostic Note</div>
                      <div className="text-ink font-medium text-xs mt-1">
                        {metrics?.storageHealth?.message || 'Ready for document streaming & SAS generation'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: PLAN EDITOR                                           */}
      {/* ============================================================== */}
      {isPlanModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-hairline rounded-[28px] max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <h3 className="font-sora font-extrabold text-xl text-ink">
                {editingPlan.id ? 'Edit Plan Pricing & Quotas' : 'Create New Subscription Plan'}
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-ink-soft hover:text-ink p-1 rounded-full bg-paper"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-ink-soft">Plan Code (UPPERCASE)</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.code}
                    onChange={(e) => setEditingPlan({ ...editingPlan, code: e.target.value.toUpperCase() })}
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink font-mono text-sm font-bold"
                    placeholder="STARTER"
                  />
                </div>
                <div>
                  <label className="text-ink-soft">Display Name</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm font-bold"
                    placeholder="Starter Plan"
                  />
                </div>
              </div>

              <div>
                <label className="text-ink-soft">Plan Description</label>
                <input
                  type="text"
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm"
                  placeholder="Single-counter printing and photocopy shops"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-ink-soft">Monthly Price (₹ Rupees)</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.priceMonthlyMinor / 100}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, priceMonthlyMinor: Math.round(Number(e.target.value) * 100) })
                    }
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm font-bold"
                    placeholder="499"
                  />
                </div>
                <div>
                  <label className="text-ink-soft">Yearly Price (₹ Rupees)</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.priceYearlyMinor / 100}
                    onChange={(e) =>
                      setEditingPlan({ ...editingPlan, priceYearlyMinor: Math.round(Number(e.target.value) * 100) })
                    }
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm font-bold"
                    placeholder="4999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-ink-soft">Max Counter Workstations</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.maxDevices}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxDevices: Number(e.target.value) })}
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm"
                  />
                </div>
                <div>
                  <label className="text-ink-soft">Monthly Orders (-1 for unlimited)</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.maxOrdersPerMonth}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxOrdersPerMonth: Number(e.target.value) })}
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.hasAutoPrint}
                    onChange={(e) => setEditingPlan({ ...editingPlan, hasAutoPrint: e.target.checked })}
                  />
                  <span>Enable Auto-Print Spooler</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.hasColorRouting}
                    onChange={(e) => setEditingPlan({ ...editingPlan, hasColorRouting: e.target.checked })}
                  />
                  <span>Enable Multi-Printer Color Routing</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan.isActive}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                  />
                  <span>Plan Active in Vendor Catalog</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
                <Button variant="outline" type="button" onClick={() => setIsPlanModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: COUPON EDITOR                                         */}
      {/* ============================================================== */}
      {isCouponModalOpen && editingCoupon && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-hairline rounded-[28px] max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <h3 className="font-sora font-extrabold text-xl text-ink">Create Promo Coupon</h3>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="text-ink-soft hover:text-ink p-1 rounded-full bg-paper"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-ink-soft">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={editingCoupon.code}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink font-mono font-bold text-base"
                  placeholder="WELCOME50"
                />
              </div>

              <div>
                <label className="text-ink-soft">Description</label>
                <input
                  type="text"
                  value={editingCoupon.description}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, description: e.target.value })}
                  className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm"
                  placeholder="50% Launch Discount on first month"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-ink-soft">Discount Type</label>
                  <select
                    value={editingCoupon.discountType}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, discountType: e.target.value })}
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm font-semibold"
                  >
                    <option value="PERCENTAGE">Percentage (%) Off</option>
                    <option value="FLAT_AMOUNT">Flat Amount (₹) Off</option>
                    <option value="FREE_DAYS">100% Free Days Pass</option>
                  </select>
                </div>
                <div>
                  <label className="text-ink-soft">
                    {editingCoupon.discountType === 'PERCENTAGE'
                      ? 'Discount Percentage (%)'
                      : editingCoupon.discountType === 'FLAT_AMOUNT'
                      ? 'Flat Discount (₹)'
                      : 'Free Subscription Days'}
                  </label>
                  <input
                    type="number"
                    required
                    value={
                      editingCoupon.discountType === 'FREE_DAYS'
                        ? editingCoupon.freeDays || 30
                        : editingCoupon.discountType === 'FLAT_AMOUNT'
                        ? editingCoupon.discountValue / 100
                        : editingCoupon.discountValue
                    }
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (editingCoupon.discountType === 'FREE_DAYS') {
                        setEditingCoupon({ ...editingCoupon, freeDays: val });
                      } else if (editingCoupon.discountType === 'FLAT_AMOUNT') {
                        setEditingCoupon({ ...editingCoupon, discountValue: Math.round(val * 100) });
                      } else {
                        setEditingCoupon({ ...editingCoupon, discountValue: val });
                      }
                    }}
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-ink-soft">Total Uses Cap (-1 for unlimited)</label>
                  <input
                    type="number"
                    value={editingCoupon.maxUsesTotal}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, maxUsesTotal: Number(e.target.value) })}
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm"
                  />
                </div>
                <div>
                  <label className="text-ink-soft">Uses per Vendor</label>
                  <input
                    type="number"
                    value={editingCoupon.maxUsesPerVendor}
                    onChange={(e) => setEditingCoupon({ ...editingCoupon, maxUsesPerVendor: Number(e.target.value) })}
                    className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-ink-soft">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={editingCoupon.validTill ? editingCoupon.validTill.slice(0, 10) : ''}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, validTill: e.target.value })}
                  className="w-full mt-1.5 p-2.5 rounded-12 bg-paper border border-hairline text-ink text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-hairline">
                <Button variant="outline" type="button" onClick={() => setIsCouponModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Coupon
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: VENDOR SUBSCRIPTION OVERRIDE (ADMIN GRANT)            */}
      {/* ============================================================== */}
      {isSubModalOpen && selectedVendorForSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-hairline rounded-[28px] max-w-md w-full p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <h3 className="font-sora font-extrabold text-xl text-ink">Manage Vendor Subscription</h3>
                <div className="text-xs text-saffron font-bold mt-0.5">{selectedVendorForSub.name}</div>
              </div>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="text-ink-soft hover:text-ink p-1 rounded-full bg-paper"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="p-4 rounded-16 bg-paper border border-hairline space-y-2">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Current Plan:</span>
                  <span className="font-bold text-ink">
                    {selectedVendorForSub.subscriptionPlan || 'TRIAL'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Expires On:</span>
                  <span className="font-bold text-ink">
                    {selectedVendorForSub.subscriptionExpiresAt
                      ? new Date(selectedVendorForSub.subscriptionExpiresAt).toLocaleDateString('en-IN')
                      : 'None'}
                  </span>
                </div>
              </div>

              {/* Action 1: Grant Free Days */}
              <div className="space-y-2 pt-2">
                <label className="text-ink font-bold font-sora">Grant Free Extension Days</label>
                <div className="flex gap-2">
                  {[14, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setGrantDaysInput(d)}
                      className={`px-3 py-1.5 rounded-12 border text-xs font-bold transition-colors ${
                        grantDaysInput === d
                          ? 'bg-ink text-white border-ink'
                          : 'bg-paper text-ink-soft border-hairline hover:bg-surface'
                      }`}
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="number"
                    value={grantDaysInput}
                    onChange={(e) => setGrantDaysInput(Number(e.target.value))}
                    className="p-2 rounded-12 bg-paper border border-hairline text-ink text-xs w-28 font-bold"
                    placeholder="Custom days"
                  />
                  <Button
                    variant="primary"
                    disabled={subActionLoading}
                    onClick={() => handleVendorSubOverride('GRANT_DAYS')}
                    className="h-8 text-xs font-bold px-4"
                  >
                    Apply +{grantDaysInput} Free Days
                  </Button>
                </div>
              </div>

              {/* Action 2: Change Plan Tier */}
              <div className="space-y-2 pt-4 border-t border-hairline">
                <label className="text-ink font-bold font-sora">Change Plan Tier</label>
                <div className="flex gap-2">
                  <select
                    value={subPlanInput}
                    onChange={(e) => setSubPlanInput(e.target.value)}
                    className="p-2 rounded-12 bg-paper border border-hairline text-ink text-xs flex-1 font-bold"
                  >
                    {plans.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    disabled={subActionLoading}
                    onClick={() => handleVendorSubOverride('SET_PLAN')}
                    className="h-8 text-xs font-bold px-4"
                  >
                    Update Plan
                  </Button>
                </div>
              </div>

              {/* Admin Internal Notes */}
              <div className="pt-2">
                <label className="text-ink-soft">Admin Internal Note</label>
                <input
                  type="text"
                  value={subNotesInput}
                  onChange={(e) => setSubNotesInput(e.target.value)}
                  className="w-full mt-1.5 p-2 rounded-12 bg-paper border border-hairline text-ink text-xs"
                  placeholder="e.g. Granted 30 free days for campus partner onboard"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-hairline">
                <Button variant="outline" onClick={() => setIsSubModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
