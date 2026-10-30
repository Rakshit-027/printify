// hallmark:v1 theme=sticker shape=workbench density=balanced
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Store,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  QrCode,
  LogOut,
  IndianRupee,
  Layers,
  Check,
  X,
  FileText,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Zap,
  ChevronRight,
  ChevronLeft,
  Download,
  Copy,
  ExternalLink,
  Laptop,
  Smartphone,
  Search,
  Filter,
  Eye,
  Sliders,
  ShieldCheck,
  Tag,
  Menu,
  ChevronDown,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { QrStandeeModal } from '@/components/QrStandeeModal';
import { VendorSettingsModal } from '@/components/VendorSettingsModal';
import { VendorSubscriptionModal } from '@/components/VendorSubscriptionModal';
import { formatMinorToInr } from '@/lib/pricing-engine';
import { Button } from '@/components/primitives';
import { BrandLogo } from '@/components/BrandLogo';

type VendorNavTab = 
  | 'OVERVIEW'
  | 'ORDERS'
  | 'QUEUE'
  | 'PROFILE'
  | 'QR_STANDEE'
  | 'PRICING'
  | 'PAYMENTS'
  | 'DEVICES'
  | 'SUBSCRIPTION';

export default function VendorDashboardPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [activeNav, setActiveNav] = useState<VendorNavTab>('OVERVIEW');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Stats & KPIs
  const [stats, setStats] = useState<any>({
    totalOrders: 0,
    todayOrders: 0,
    completedOrders: 0,
    spoolingOrders: 0,
    pendingApproval: 0,
    cashPending: 0,
    totalRevenueMinor: 0,
    activeDevices: 0,
  });

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Store Settings & Profile
  const [settings, setSettings] = useState<any>({
    name: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    operatingHours: '',
    allowCashOnDesk: true,
    allowOnlinePayment: true,
    requireApproval: false,
    razorpayKeyId: '',
    razorpayKeySecret: '',
    upiId: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Pricing Matrix
  const [pricingList, setPricingList] = useState<any[]>([]);
  const [minOrderRupees, setMinOrderRupees] = useState(5);
  const [pricingPaperSizeFilter, setPricingPaperSizeFilter] = useState<'ALL' | 'A4' | 'A3' | 'LEGAL' | 'LETTER'>('ALL');
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMessage, setPricingMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Desktop Agent & Devices
  const [deviceCode, setDeviceCode] = useState('');
  const [enrolledDevices, setEnrolledDevices] = useState<any[]>([]);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedQrLink, setCopiedQrLink] = useState(false);

  // Modals
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Razorpay Technology Partner Payment Account State
  const [paymentAccount, setPaymentAccount] = useState<any>(null);
  const [paymentAccountLoading, setPaymentAccountLoading] = useState(false);
  const [paymentAccountSyncing, setPaymentAccountSyncing] = useState(false);
  const [connectingPayment, setConnectingPayment] = useState(false);

  const authCheckedRef = useRef(false);

  // Toast / Status notification helper
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // URL query params listener (handles callback return)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const nav = params.get('nav');
      const tab = params.get('tab');
      const onboarding = params.get('onboarding');
      const payment = params.get('payment');
      const error = params.get('error') || params.get('message');
      if (nav === 'PAYMENTS' || payment === 'connected' || tab === 'settings') {
        setActiveNav('PAYMENTS');
      }
      if (onboarding === 'success' || payment === 'connected') {
        triggerToast('Razorpay account connected successfully!');
        fetchPaymentAccount();
      } else if (error) {
        triggerToast(`Setup alert: ${error}`);
      }
    }
  }, []);

  const fetchPaymentAccount = async () => {
    setPaymentAccountLoading(true);
    try {
      const res = await fetch('/api/vendor/payments/razorpay/status');
      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentAccount(data.account);
      }
    } catch (err) {
      console.error('Error fetching payment account:', err);
    } finally {
      setPaymentAccountLoading(false);
    }
  };

  const handleConnectRazorpay = async () => {
    setConnectingPayment(true);
    try {
      const res = await fetch('/api/vendor/payments/razorpay/connect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize connection');
      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      }
    } catch (err: any) {
      triggerToast(err.message || 'Connection initiation failed');
      setConnectingPayment(false);
    }
  };

  const handleSyncPaymentStatus = async () => {
    setPaymentAccountSyncing(true);
    try {
      const res = await fetch('/api/vendor/payments/razorpay/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setPaymentAccount(data.account);
      triggerToast('Payment account status refreshed from Razorpay');
    } catch (err: any) {
      triggerToast(err.message || 'Status sync failed');
    } finally {
      setPaymentAccountSyncing(false);
    }
  };

  const handleDisconnectPayment = async () => {
    if (
      !confirm(
        'Are you sure you want to disconnect your Razorpay account? Customer online payments will be disabled for your store.'
      )
    ) {
      return;
    }
    try {
      const res = await fetch('/api/vendor/payments/razorpay/disconnect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Disconnect failed');
      triggerToast('Razorpay account disconnected');
      fetchPaymentAccount();
    } catch (err: any) {
      triggerToast(err.message || 'Disconnect failed');
    }
  };

  const safeJson = async (res: Response) => {
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        return await res.json();
      }
      const text = await res.text();
      return { error: text || `Server returned status ${res.status}` };
    } catch {
      return null;
    }
  };

  // 1. Initial Authentication Check
  useEffect(() => {
    if (authCheckedRef.current) return;
    authCheckedRef.current = true;

    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await safeJson(res);
          if (data?.authenticated && data?.user) {
            setSessionUser(data.user);
            return;
          }
        }
        router.push('/login');
      } catch {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // 2. Fetch Dashboard Data
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/vendor/stats');
      if (res.ok) {
        const data = await safeJson(res);
        if (data?.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  const fetchOrders = async (statusTab: string = orderStatusFilter) => {
    try {
      setOrdersLoading(true);
      const res = await fetch(`/api/vendor/orders?status=${statusTab}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await safeJson(res);
        setOrders(data?.orders || []);
      }
    } catch (err) {
      console.error('Orders fetch error:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await fetch('/api/vendor/settings');
      if (res.ok) {
        const data = await safeJson(res);
        if (data?.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Settings fetch error:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchPricing = async () => {
    try {
      setPricingLoading(true);
      const res = await fetch('/api/vendor/pricing');
      if (res.ok) {
        const data = await safeJson(res);
        if (data?.pricing) {
          setPricingList(data.pricing);
          const minMinor = data.minimumOrderMinor ?? data.minimum_order_minor ?? data.pricing[0]?.minimum_order_minor ?? data.pricing[0]?.minimumOrderMinor;
          if (minMinor !== undefined && minMinor !== null) {
            setMinOrderRupees(Number(minMinor) / 100);
          }
        }
      }
    } catch (err) {
      console.error('Pricing fetch error:', err);
    } finally {
      setPricingLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch('/api/vendor/devices/enrollment-code');
      if (res.ok) {
        const data = await safeJson(res);
        if (data?.enrollmentCode) {
          setDeviceCode(data.enrollmentCode);
          setEnrolledDevices(data.activeDevices || []);
        }
      }
    } catch (err) {
      console.error('Devices fetch error:', err);
    }
  };

  // Load section-specific data when active tab changes
  useEffect(() => {
    fetchStats();
    if (activeNav === 'OVERVIEW' || activeNav === 'ORDERS' || activeNav === 'QUEUE') {
      fetchOrders(orderStatusFilter);
    }
    if (activeNav === 'PROFILE' || activeNav === 'QR_STANDEE') {
      fetchSettings();
      fetchPaymentAccount();
    }
    if (activeNav === 'PAYMENTS') {
      fetchPaymentAccount();
    }
    if (activeNav === 'PRICING') {
      fetchPricing();
    }
    if (activeNav === 'DEVICES' || activeNav === 'OVERVIEW') {
      fetchDevices();
    }
  }, [activeNav, orderStatusFilter]);

  // Order Actions
  const handleStatusAction = async (orderId: string, action: string) => {
    setActionInProgress(orderId);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || 'Failed to update order');
      triggerToast(`Order status updated to: ${action.replace(/_/g, ' ')}`);
      fetchOrders(orderStatusFilter);
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Error updating order status');
    } finally {
      setActionInProgress(null);
    }
  };

  // Document Download via Secure SAS URL
  const handleDownloadDoc = async (orderId: string) => {
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/document`);
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || 'Failed to obtain document access');
      if (data?.document?.downloadUrl) {
        window.open(data.document.downloadUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'Could not download document');
    }
  };

  // Generate Device Code
  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await fetch('/api/vendor/devices/enrollment-code', { method: 'POST' });
      if (res.ok) {
        const data = await safeJson(res);
        if (data?.enrollmentCode) {
          setDeviceCode(data.enrollmentCode);
          triggerToast('New device enrollment code generated');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingCode(false);
    }
  };

  // Save Store Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/vendor/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || 'Failed to save store settings');
      setSettingsMessage({ text: 'Store profile & payment settings saved successfully!', type: 'success' });
      triggerToast('Store settings updated');
    } catch (err: any) {
      setSettingsMessage({ text: err.message || 'Error saving settings', type: 'error' });
    } finally {
      setSettingsSaving(false);
    }
  };

  // Save Pricing Matrix
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setPricingSaving(true);
    setPricingMessage(null);
    try {
      const res = await fetch('/api/vendor/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing: pricingList,
          minimumOrderMinor: Math.round(minOrderRupees * 100),
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || 'Failed to save pricing matrix');
      setPricingMessage({ text: 'Per-page pricing and paper sizes saved successfully!', type: 'success' });
      triggerToast('Pricing matrix saved');
    } catch (err: any) {
      setPricingMessage({ text: err.message || 'Error saving pricing', type: 'error' });
    } finally {
      setPricingSaving(false);
    }
  };

  const PAPER_SIZE_DEFINITIONS = [
    {
      key: 'A4',
      name: 'A4 Standard',
      dimensions: '210 × 297 mm',
      desc: 'Standard office & college documents, notes, forms and everyday prints',
      badge: 'Popular',
    },
    {
      key: 'A3',
      name: 'A3 Large Format',
      dimensions: '297 × 420 mm',
      desc: 'Architectural drawings, CAD sheets, posters, floorplans & charts',
      badge: 'Large Format',
    },
    {
      key: 'LEGAL',
      name: 'Legal / Stamp',
      dimensions: '8.5 × 14 in',
      desc: 'Court affidavits, notarized agreements, stamp paper & legal deeds',
      badge: 'Legal',
    },
    {
      key: 'LETTER',
      name: 'Letterhead',
      dimensions: '8.5 × 11 in',
      desc: 'International letterheads, corporate memos & formal correspondence',
      badge: 'Letterhead',
    },
  ];

  const isTierActive = (tier: any): boolean => {
    if (tier?.isActive !== undefined) return Boolean(tier.isActive);
    if (tier?.is_active !== undefined) return Boolean(tier.is_active);
    return true;
  };

  const isPaperSizeActive = (paperSizeKey: string): boolean => {
    const matchingTiers = pricingList.filter(
      (p) => (p.paperSize || p.paper_size || '').toUpperCase() === paperSizeKey.toUpperCase()
    );
    if (matchingTiers.length === 0) return false;
    return matchingTiers.some((t) => isTierActive(t));
  };

  const getActiveTiersCountForSize = (paperSizeKey: string): { active: number; total: number } => {
    const matchingTiers = pricingList.filter(
      (p) => (p.paperSize || p.paper_size || '').toUpperCase() === paperSizeKey.toUpperCase()
    );
    const active = matchingTiers.filter((t) => isTierActive(t)).length;
    return { active, total: matchingTiers.length };
  };

  const togglePaperSizeActive = (paperSizeKey: string, newActiveState: boolean) => {
    setPricingList((prev) =>
      prev.map((t) => {
        const size = (t.paperSize || t.paper_size || '').toUpperCase();
        if (size === paperSizeKey.toUpperCase()) {
          return {
            ...t,
            isActive: newActiveState,
            is_active: newActiveState,
          };
        }
        return t;
      })
    );
  };

  const toggleTierActive = (targetTier: any) => {
    const currentActive = isTierActive(targetTier);
    const nextActive = !currentActive;
    setPricingList((prev) =>
      prev.map((p) => {
        const pSize = (p.paperSize || p.paper_size || '').toUpperCase();
        const tSize = (targetTier.paperSize || targetTier.paper_size || '').toUpperCase();
        const pColor = (p.colorMode || p.color_mode || '').toUpperCase();
        const tColor = (targetTier.colorMode || targetTier.color_mode || '').toUpperCase();
        const pDuplex = Boolean(p.isDuplex ?? p.is_duplex);
        const tDuplex = Boolean(targetTier.isDuplex ?? targetTier.is_duplex);

        if (pSize === tSize && pColor === tColor && pDuplex === tDuplex) {
          return {
            ...p,
            isActive: nextActive,
            is_active: nextActive,
          };
        }
        return p;
      })
    );
  };

  const updateTierRate = (targetTier: any, newRateMinor: number) => {
    setPricingList((prev) =>
      prev.map((p) => {
        const pSize = (p.paperSize || p.paper_size || '').toUpperCase();
        const tSize = (targetTier.paperSize || targetTier.paper_size || '').toUpperCase();
        const pColor = (p.colorMode || p.color_mode || '').toUpperCase();
        const tColor = (targetTier.colorMode || targetTier.color_mode || '').toUpperCase();
        const pDuplex = Boolean(p.isDuplex ?? p.is_duplex);
        const tDuplex = Boolean(targetTier.isDuplex ?? targetTier.is_duplex);

        if (pSize === tSize && pColor === tColor && pDuplex === tDuplex) {
          return {
            ...p,
            pricePerSideMinor: newRateMinor,
            price_per_side_minor: newRateMinor,
          };
        }
        return p;
      })
    );
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    window.location.href = '/login';
  };

  const vendor = sessionUser?.vendor ?? {
    name: settings.name || sessionUser?.fullName || 'Print Store',
    slug: settings.slug || 'store',
    subscriptionPlan: settings.subscriptionPlan || 'STARTER',
    subscriptionExpiresAt: settings.subscriptionExpiresAt,
    isSubscriptionActive: settings.isSubscriptionActive !== false,
  };

  const publicQrUrl = vendor.slug && vendor.slug !== '—'
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://print2me.in'}/v/${vendor.slug}`
    : '';

  // Filtered Orders for search & payment filters
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !searchQuery ||
      o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone?.includes(searchQuery);

    const matchesPayment =
      paymentFilter === 'ALL' ||
      (paymentFilter === 'ONLINE' && o.paymentMethod === 'RAZORPAY') ||
      (paymentFilter === 'CASH_PENDING' && o.paymentStatus === 'CASH_PENDING') ||
      (paymentFilter === 'CASH_COLLECTED' && o.paymentStatus === 'CASH_COLLECTED');

    return matchesSearch && matchesPayment;
  });

  const queueOrders = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING');

  const navCategories: {
    category: string;
    items: { id: VendorNavTab; label: string; icon: any; count?: number; badge?: string }[];
  }[] = [
    {
      category: 'DISPATCH & QUEUE',
      items: [
        { id: 'OVERVIEW', label: 'Store Overview', icon: Store },
        { id: 'QUEUE', label: 'Live Print Queue', icon: Printer, count: stats.spoolingOrders, badge: stats.spoolingOrders > 0 ? 'SPOOLING' : undefined },
        { id: 'ORDERS', label: 'Order Management', icon: Layers, count: stats.totalOrders },
      ],
    },
    {
      category: 'COUNTER HARDWARE',
      items: [
        { id: 'QR_STANDEE', label: 'Counter Standee QR', icon: QrCode },
        { id: 'DEVICES', label: 'Desktop Agent & PC', icon: Laptop, count: stats.activeDevices },
      ],
    },
    {
      category: 'STORE & FINANCES',
      items: [
        { id: 'PRICING', label: 'Pricing & Paper Sizes', icon: IndianRupee },
        { id: 'PAYMENTS', label: 'Earnings & Desk Cash', icon: CreditCard },
        { id: 'PROFILE', label: 'Shop Profile & Hours', icon: Sliders },
        { id: 'SUBSCRIPTION', label: 'SaaS Store Plan', icon: Zap, badge: vendor.subscriptionPlan || 'STARTER' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row text-ink antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-ink text-white px-5 py-3 rounded-20 shadow-2xl flex items-center gap-3 text-xs font-bold motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-3 border border-white/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Top Header Bar (Shown only on <md screens) */}
      <div className="md:hidden bg-ink text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="p-2 rounded-12 bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Toggle Station Menu"
          >
            <Menu className="w-5 h-5 text-saffron" />
          </button>
          <div>
            <div className="text-xs font-sora font-extrabold text-white truncate max-w-[170px]">
              {vendor.name}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-300 font-bold ">
                Live Station
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrModal(true)}
            className="px-2.5 py-1.5 rounded-10 bg-saffron text-white text-[11px] font-bold flex items-center gap-1 shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Standee</span>
          </button>
          {publicQrUrl && (
            <Link
              href={publicQrUrl}
              target="_blank"
              className="p-2 rounded-10 bg-white/10 text-white hover:bg-white/20"
              title="Customer Kiosk Preview"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 md:hidden animate-in fade-in"
        />
      )}

      {/* Permanent Collapsible SaaS Command Sidebar: ALWAYS visible on md+ */}
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
          {/* Brand & Store Status Header */}
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
                      Vendor desk
                    </div>
                  </div>
                )}
              </Link>

              {/* Collapse/Expand Toggle on Desktop */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden md:flex p-1.5 rounded-8 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>

              {/* Close Mobile Drawer on Mobile */}
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="md:hidden p-1.5 rounded-8 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Store Identification Card (When Expanded) */}
            {!sidebarCollapsed ? (
              <div className="p-3 rounded-16 bg-white/5 border border-white/10 space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold  text-saffron font-sora">
                    Active Partner
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE
                  </span>
                </div>
                <h2 className="font-sora font-bold text-sm text-white truncate" title={vendor.name}>
                  {vendor.name}
                </h2>
                <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-slate-400 truncate">
                  <span className="truncate">{vendor.slug ? `/v/${vendor.slug}` : 'Print Desk'}</span>
                  {publicQrUrl && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(publicQrUrl);
                        triggerToast('Copied Kiosk URL to clipboard');
                      }}
                      className="p-1 hover:text-white"
                      title="Copy Kiosk URL"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center pt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" title="Store Online" />
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
                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded-pill font-extrabold  ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-saffron/20 text-saffron border border-saffron/30'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.count !== undefined && item.count > 0 && (
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-pill font-bold ${
                                isActive
                                  ? 'bg-black/20 text-white'
                                  : 'bg-white/10 text-white'
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

        {/* Sidebar Footer Profile & Kiosk Quick Launch */}
        <div className="p-4 border-t border-white/10 space-y-3">
          {!sidebarCollapsed && (
            <div className="p-3 rounded-16 bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-bold ">
                  Store SaaS Tier
                </div>
                <div className="text-xs font-extrabold text-white flex items-center gap-1 mt-0.5 font-sora">
                  <Zap className="w-3.5 h-3.5 text-saffron" />
                  <span>{vendor.subscriptionPlan || 'STARTER'}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveNav('SUBSCRIPTION')}
                className="text-[10px] font-bold text-saffron hover:underline"
              >
                Manage
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {!sidebarCollapsed && publicQrUrl ? (
              <Link
                href={publicQrUrl}
                target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-12 bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-saffron" />
                <span>Customer Kiosk</span>
              </Link>
            ) : null}

            <button
              onClick={handleLogout}
              className={`p-2.5 rounded-12 bg-danger/20 text-danger hover:bg-danger/30 transition-colors ${
                sidebarCollapsed ? 'w-full flex items-center justify-center' : ''
              }`}
              title="Sign Out of Station"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Operational Workspace Bar */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-hairline px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search orders (e.g. ORD-4772), customer, or token..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeNav !== 'ORDERS') setActiveNav('ORDERS');
                }}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-paper border border-hairline text-xs font-medium text-ink placeholder:text-ink-soft/60 focus:outline-hidden focus:border-saffron focus:bg-surface transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Desktop Spooler Status Pill */}
            <div
              onClick={() => setActiveNav('DEVICES')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-semibold cursor-pointer hover:bg-emerald-500/20 transition-colors"
              title="Desktop Print Spooler Connection"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Laptop className="w-3.5 h-3.5 text-emerald-600" />
              <span>Spooler Active ({stats.activeDevices || 1})</span>
            </div>

            {/* Quick Standee Button */}
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper hover:bg-surface border border-hairline text-xs font-bold text-ink transition-colors shadow-xs"
            >
              <QrCode className="w-3.5 h-3.5 text-saffron" />
              <span className="hidden md:inline">Standee</span>
            </button>

            {/* Test Customer Kiosk Link */}
            {publicQrUrl && (
              <Link
                href={publicQrUrl}
                target="_blank"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-saffron text-white hover:bg-saffron/90 text-xs font-bold transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Kiosk</span>
              </Link>
            )}

            {/* Refresh State */}
            <button
              onClick={() => {
                fetchStats();
                fetchOrders();
                triggerToast('Refreshed queue & store statistics');
              }}
              className="p-2 rounded-full bg-paper hover:bg-surface border border-hairline text-ink-soft hover:text-ink transition-colors shadow-xs"
              title="Refresh Queue & Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin text-saffron' : ''}`} />
            </button>

            {/* Store Profile Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-hairline">
              <div className="w-8 h-8 rounded-full bg-ink text-white font-sora font-extrabold text-xs flex items-center justify-center shadow-sm">
                {vendor.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-ink truncate max-w-[120px]">{vendor.name}</div>
                <div className="text-xs text-ink-soft font-medium">Vendor partner</div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* Top Section Banner Card */}
          <div className="bg-surface p-6 rounded-[24px] border border-hairline shadow-ink-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold  text-saffron font-mono">
                  {activeNav.replace(/_/g, ' ')}
                </span>
                <span className="text-hairline">•</span>
                <span className="text-[11px] text-ink-soft font-mono">
                  {vendor.slug ? `print2me.in/v/${vendor.slug}` : 'Print2Me Station'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-sora font-extrabold text-ink tracking-tight">
                {vendor.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  fetchStats();
                  fetchOrders();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-pill bg-paper hover:bg-surface border border-hairline text-xs font-bold text-ink transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-ink-soft ${ordersLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-pill bg-paper hover:bg-surface border border-hairline text-xs font-bold text-ink transition-colors shadow-sm"
              >
                <QrCode className="w-3.5 h-3.5 text-saffron" />
                <span>Print Standee</span>
              </button>

              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-pill bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-xs font-bold transition-colors shadow-sm"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                <span>SaaS Subscription</span>
              </button>
            </div>
          </div>

        {/* =========================================================================
            VIEW 1: OVERVIEW
        ========================================================================= */}
        {activeNav === 'OVERVIEW' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* KPI Metric Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface p-5 rounded-20 border border-hairline shadow-ink-soft space-y-2">
                <div className="flex items-center justify-between text-ink-soft text-xs font-semibold">
                  <span>Collected Revenue</span>
                  <div className="w-7 h-7 rounded-full bg-success-tint flex items-center justify-center text-success">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="font-sora text-2xl font-black text-ink">
                  ₹{formatMinorToInr(stats.totalRevenueMinor)}
                </div>
                <div className="text-[11px] text-ink-soft">Reconciled online &amp; cash</div>
              </div>

              <div 
                onClick={() => setActiveNav('QUEUE')}
                className="bg-surface p-5 rounded-20 border border-hairline shadow-ink-soft space-y-2 cursor-pointer hover:border-ink/30 transition-colors"
              >
                <div className="flex items-center justify-between text-ink-soft text-xs font-semibold">
                  <span>Active Spooler Queue</span>
                  <div className="w-7 h-7 rounded-full bg-paper border border-hairline flex items-center justify-center text-ink">
                    <Printer className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="font-sora text-2xl font-black text-ink">
                  {stats.spoolingOrders}
                </div>
                <div className="text-[11px] text-ink-soft">Ready for pickup &amp; printing</div>
              </div>

              <div 
                onClick={() => {
                  setActiveNav('ORDERS');
                  setOrderStatusFilter('AWAITING_VENDOR_APPROVAL');
                }}
                className="bg-surface p-5 rounded-20 border border-warning/30 shadow-ink-soft space-y-2 cursor-pointer hover:border-warning transition-colors relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-warning" />
                <div className="flex items-center justify-between text-ink-soft text-xs font-semibold">
                  <span>Needs Manual Approval</span>
                  <div className="w-7 h-7 rounded-full bg-warning/20 flex items-center justify-center text-warning">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="font-sora text-2xl font-black text-ink">
                  {stats.pendingApproval}
                </div>
                <div className="text-[11px] text-ink-soft">Custom jobs to verify</div>
              </div>

              <div 
                onClick={() => {
                  setActiveNav('ORDERS');
                  setOrderStatusFilter('CASH_PENDING');
                }}
                className="bg-surface p-5 rounded-20 border border-saffron/30 shadow-ink-soft space-y-2 cursor-pointer hover:border-saffron transition-colors relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-saffron" />
                <div className="flex items-center justify-between text-ink-soft text-xs font-semibold">
                  <span>Pending Cash on Desk</span>
                  <div className="w-7 h-7 rounded-full bg-saffron-tint flex items-center justify-center text-saffron">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="font-sora text-2xl font-black text-ink">
                  {stats.cashPending}
                </div>
                <div className="text-[11px] text-ink-soft">Collect before release</div>
              </div>
            </div>

            {/* Live QR Standee Banner */}
            <div className="p-6 rounded-24 bg-ink text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-sora font-extrabold text-white">
                  Your express upload URL is live
                </h3>
                <p className="text-xs text-white/70 max-w-lg font-mono">
                  {publicQrUrl}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(publicQrUrl);
                    setCopiedQrLink(true);
                    setTimeout(() => setCopiedQrLink(false), 2000);
                  }}
                  className="px-4 py-2.5 rounded-pill bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-saffron" />
                  <span>{copiedQrLink ? 'Copied URL!' : 'Copy Link'}</span>
                </button>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-5 py-2.5 rounded-pill bg-saffron hover:bg-saffron/90 text-ink text-xs font-extrabold transition-colors shadow-md flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Standee</span>
                </button>
              </div>
            </div>

            {/* Recent Orders Preview */}
            <div className="bg-surface p-6 rounded-[24px] border border-hairline shadow-ink-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sora font-bold text-base text-ink">Recent Counter Orders</h3>
                  <p className="text-xs text-ink-soft">Latest print jobs streaming to your counter</p>
                </div>
                <button
                  onClick={() => setActiveNav('ORDERS')}
                  className="text-xs font-bold text-saffron hover:underline flex items-center gap-1"
                >
                  <span>View All Orders</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {ordersLoading ? (
                <div className="py-8 text-center text-xs text-ink-soft animate-pulse">Loading live order stream...</div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink-soft">No recent orders. Customers scanning your QR code will appear here instantly.</div>
              ) : (
                <div className="divide-y divide-hairline">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-ink text-sm">{o.orderNumber}</span>
                        <span className="px-2.5 py-0.5 rounded-pill bg-paper border border-hairline font-semibold text-ink-soft text-xs">
                          {o.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-ink-soft">{o.customerName || 'Customer'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-ink">₹{formatMinorToInr(o.totalAmountMinor)}</span>
                        <span className="text-ink-soft font-mono text-[10px]">
                          {new Date(o.createdAt).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={() => handleDownloadDoc(o.id)}
                          className="p-1.5 rounded-lg bg-paper hover:bg-surface border border-hairline text-ink-soft hover:text-ink"
                          title="Download Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 2: ORDERS MANAGEMENT
        ========================================================================= */}
        {activeNav === 'ORDERS' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Search & Filter Bar */}
            <div className="bg-surface p-5 rounded-[24px] border border-hairline shadow-ink-soft space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by Order ID, Customer Name, or Phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-paper border border-hairline rounded-pill pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-soft focus:outline-none focus:border-saffron"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="bg-paper border border-hairline rounded-pill px-4 py-2.5 text-xs font-semibold text-ink focus:outline-none focus:border-saffron"
                  >
                    <option value="ALL">All Payment Statuses</option>
                    <option value="ONLINE">Online Paid (Razorpay)</option>
                    <option value="CASH_PENDING">Cash on Desk Pending</option>
                    <option value="CASH_COLLECTED">Cash Collected</option>
                  </select>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex flex-wrap gap-2 text-xs font-semibold border-t border-hairline pt-3">
                {[
                  { id: 'ALL', label: 'All Orders' },
                  { id: 'CASH_PENDING', label: `Pending Cash (${stats.cashPending})` },
                  { id: 'AWAITING_VENDOR_APPROVAL', label: `Needs Review (${stats.pendingApproval})` },
                  { id: 'CONFIRMED', label: 'Ready for Print' },
                  { id: 'PROCESSING', label: 'In Spooler' },
                  { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
                  { id: 'COMPLETED', label: 'Completed' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setOrderStatusFilter(tab.id);
                      fetchOrders(tab.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-pill transition-colors whitespace-nowrap border text-xs font-bold ${
                      orderStatusFilter === tab.id
                        ? 'bg-ink text-white border-ink shadow-sm'
                        : 'bg-paper text-ink-soft hover:bg-surface border-hairline'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6 rounded-20 bg-surface border border-hairline animate-pulse h-28" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-surface p-12 rounded-[24px] border border-hairline text-center space-y-3">
                <Layers className="w-10 h-10 text-ink-soft mx-auto" />
                <h3 className="font-sora font-bold text-lg text-ink">No Matching Orders</h3>
                <p className="text-xs text-ink-soft max-w-sm mx-auto">
                  No orders match your selected filters. Try choosing a different status tab or search query.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => {
                  const isActionActive = actionInProgress === order.id;
                  return (
                    <div
                      key={order.id}
                      className="p-6 rounded-[24px] bg-surface border border-hairline shadow-ink-soft hover:shadow-md transition-colors space-y-4"
                    >
                      {/* Top Header of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
                        <div className="flex items-center gap-3">
                          <span className="font-sora font-extrabold text-lg text-ink tracking-tight">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-pill bg-paper border border-hairline text-ink">
                            {order.status.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-ink-soft font-mono">
                            {new Date(order.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-sora text-xl font-extrabold text-ink">
                            ₹{formatMinorToInr(order.totalAmountMinor)}
                          </span>
                          <span className="block text-[11px] font-semibold text-ink-soft">
                            {order.paymentMethod === 'RAZORPAY' ? 'Online' : 'Cash on Desk'} •{' '}
                            <strong className={order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'CASH_COLLECTED' ? 'text-success' : 'text-warning'}>
                              {order.paymentStatus}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {/* Items & Customer Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-ink">Customer Reference</span>
                          <p className="text-ink-soft font-medium">
                            {order.customerName || 'Walk-in Guest'}
                            {order.customerPhone && <span className="block">{order.customerPhone}</span>}
                          </p>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <span className="font-bold text-ink">Document &amp; Print Options</span>
                          <div className="space-y-1.5">
                            {order.items?.map((item: any) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2.5 rounded-14 bg-paper border border-hairline"
                              >
                                <div className="flex items-center gap-2 truncate max-w-xs font-medium text-ink">
                                  <FileText className="w-3.5 h-3.5 text-saffron shrink-0" />
                                  <span className="truncate">{item.document?.originalName || 'Document'}</span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-[11px]">
                                  <span className="px-2 py-0.5 rounded bg-surface border border-hairline">
                                    {item.paperSize} · {item.colorMode === 'COLOR' ? 'Color' : 'B&W'} · {item.duplexMode?.includes('DOUBLE') ? 'Duplex' : 'Single'}
                                  </span>
                                  <span className="font-bold text-ink">{item.copies}x copies</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-hairline">
                        <button
                          onClick={() => handleDownloadDoc(order.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-14 bg-paper hover:bg-surface border border-hairline text-xs font-bold text-ink transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-saffron" />
                          <span>View / Download Document</span>
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          {order.status === 'AWAITING_VENDOR_APPROVAL' && (
                            <>
                              <Button
                                variant="outline"
                                disabled={isActionActive}
                                onClick={() => handleStatusAction(order.id, 'REJECT')}
                                className="h-9 px-4 text-xs text-danger border-danger/30"
                              >
                                Reject
                              </Button>
                              <Button
                                variant="primary"
                                disabled={isActionActive}
                                onClick={() => handleStatusAction(order.id, 'APPROVE')}
                                className="h-9 px-4 text-xs"
                              >
                                Approve Order
                              </Button>
                            </>
                          )}

                          {order.paymentStatus === 'CASH_PENDING' && (
                            <Button
                              variant="saffron"
                              disabled={isActionActive}
                              onClick={() => handleStatusAction(order.id, 'MARK_CASH_COLLECTED')}
                              className="h-9 px-4 text-xs font-bold"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve Cash Received
                            </Button>
                          )}

                          {order.status === 'CONFIRMED' && (
                            <Button
                              variant="primary"
                              disabled={isActionActive}
                              onClick={() => handleStatusAction(order.id, 'MARK_READY')}
                              className="h-9 px-4 text-xs font-bold"
                            >
                              <Printer className="w-3.5 h-3.5" /> Mark Ready for Pickup
                            </Button>
                          )}

                          {order.status === 'READY_FOR_PICKUP' && (
                            <Button
                              variant="outline"
                              disabled={isActionActive}
                              onClick={() => handleStatusAction(order.id, 'MARK_COMPLETED')}
                              className="h-9 px-4 text-xs font-bold text-success border-success/30 bg-success-tint"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Handed Over / Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VIEW 3: LIVE PRINT QUEUE
        ========================================================================= */}
        {activeNav === 'QUEUE' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-5 rounded-[22px] bg-gradient-to-r bg-surface border border-blue-500/20 flex items-center justify-between">
              <div>
                <h3 className="font-sora font-extrabold text-lg text-ink">Active Spooler Queue</h3>
                <p className="text-xs text-ink-soft">
                  Jobs claimed by connected desktop agents or ready for counter execution.
                </p>
              </div>
              <span className="px-3 py-1 rounded-pill bg-blue-500/10 text-blue-700 font-mono text-xs font-bold border border-blue-500/20">
                {queueOrders.length} In Queue
              </span>
            </div>

            {queueOrders.length === 0 ? (
              <div className="bg-surface p-12 rounded-[24px] border border-hairline text-center space-y-3">
                <Printer className="w-10 h-10 text-success mx-auto" />
                <h3 className="font-sora font-bold text-lg text-ink">Print Queue is Empty</h3>
                <p className="text-xs text-ink-soft max-w-sm mx-auto">
                  All confirmed print jobs have been dispatched or completed. New jobs will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queueOrders.map((order, idx) => (
                  <div
                    key={order.id}
                    className="p-5 rounded-20 bg-surface border border-hairline shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-paper font-mono text-xs font-extrabold flex items-center justify-center border border-hairline">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-sora font-bold text-sm text-ink">{order.orderNumber}</div>
                        <div className="text-xs text-ink-soft">
                          {order.items?.length || 1} Document(s) • Total: ₹{formatMinorToInr(order.totalAmountMinor)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDownloadDoc(order.id)}
                        className="px-3 py-1.5 rounded-14 bg-paper hover:bg-surface border border-hairline text-xs font-bold text-ink flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-saffron" />
                        <span>Document</span>
                      </button>

                      <Button
                        variant="primary"
                        onClick={() => handleStatusAction(order.id, 'MARK_READY')}
                        className="h-9 px-4 text-xs font-bold"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Ready for Pickup
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VIEW 4: SHOP PROFILE & DESK SETTINGS
        ========================================================================= */}
        {activeNav === 'PROFILE' && (
          <div className="bg-surface p-6 sm:p-8 rounded-[28px] border border-hairline shadow-ink-soft space-y-6 animate-in fade-in duration-150">
            <div>
              <h3 className="text-xl font-sora font-bold text-ink">Store Profile &amp; Payment Desk</h3>
              <p className="text-xs text-ink-soft">
                Manage your physical store details, operating hours, and payment preferences.
              </p>
            </div>

            {settingsMessage && (
              <div
                className={`p-4 rounded-14 text-xs font-semibold ${
                  settingsMessage.type === 'success'
                    ? 'bg-success-tint text-success border border-success/30'
                    : 'bg-danger/10 text-danger border border-danger/30'
                }`}
              >
                {settingsMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">Store Name</label>
                  <input
                    type="text"
                    required
                    value={settings.name || ''}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    className="w-full bg-paper border border-hairline rounded-14 px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-saffron"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">Public Store Slug</label>
                  <input
                    type="text"
                    disabled
                    value={settings.slug || ''}
                    className="w-full bg-paper border border-hairline rounded-14 px-4 py-2.5 text-xs text-ink-soft font-mono opacity-70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">Contact Phone Number</label>
                  <input
                    type="text"
                    required
                    value={settings.contactPhone || ''}
                    onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                    className="w-full bg-paper border border-hairline rounded-14 px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-saffron"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">Operating Hours</label>
                  <input
                    type="text"
                    placeholder="e.g. Mon-Sat: 09:00 AM - 09:00 PM"
                    value={settings.operatingHours || ''}
                    onChange={(e) => setSettings({ ...settings, operatingHours: e.target.value })}
                    className="w-full bg-paper border border-hairline rounded-14 px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-saffron"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">Physical Store Address</label>
                <textarea
                  rows={2}
                  required
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full bg-paper border border-hairline rounded-14 px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-saffron resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="pt-4 border-t border-hairline grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-3 p-4 rounded-14 bg-paper border border-hairline cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowCashOnDesk)}
                    onChange={(e) => setSettings({ ...settings, allowCashOnDesk: e.target.checked })}
                    className="rounded text-saffron focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink block">Accept Cash at Counter</span>
                    <span className="text-[10px] text-ink-soft">Customers can pay physically</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-14 bg-paper border border-hairline cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.allowOnlinePayment)}
                    onChange={(e) => setSettings({ ...settings, allowOnlinePayment: e.target.checked })}
                    className="rounded text-saffron focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink block">Accept Online UPI / Cards</span>
                    <span className="text-[10px] text-ink-soft">Direct gateway checkout</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 rounded-14 bg-paper border border-hairline cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.requireApproval)}
                    onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                    className="rounded text-saffron focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink block">Require Manual Approval</span>
                    <span className="text-[10px] text-ink-soft">Review orders before spooling</span>
                  </div>
                </label>
              </div>

              {/* Razorpay Partner Onboarding Callout */}
              <div className="pt-4 border-t border-hairline space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-ink">Razorpay Partner Payment Account (Direct Bank Settlement)</h4>
                  <p className="text-xs text-ink-soft">
                    Customer payments settle directly into your verified bank account with 0% platform commission.
                  </p>
                </div>

                <div className="p-4 rounded-16 bg-paper border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CreditCard className="w-5 h-5 text-saffron shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-ink">
                        {paymentAccount?.authStatus === 'AUTHORIZED'
                          ? `Connected Account: ${paymentAccount.razorpayAccountId}`
                          : 'No Razorpay Account Connected'}
                      </div>
                      <div className="text-[11px] text-ink-soft">
                        {paymentAccount?.authStatus === 'AUTHORIZED'
                          ? `Status: ${paymentAccount.activationStatus || 'Active'}`
                          : 'Connect your account securely via Razorpay OAuth in the Payments section.'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => setActiveNav('PAYMENTS')}
                    className="text-xs font-bold shrink-0 h-9 px-4"
                  >
                    Open Payments Setup
                  </Button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button variant="primary" type="submit" disabled={settingsSaving} className="h-11 px-6 font-bold text-xs">
                  {settingsSaving ? 'Saving Changes...' : 'Save Profile & Settings'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            VIEW 5: QR CODE & COUNTER STANDEE
        ========================================================================= */}
        {activeNav === 'QR_STANDEE' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-surface p-8 rounded-[28px] border border-hairline shadow-ink-soft text-center space-y-6 max-w-2xl mx-auto">
              <div>
                <h3 className="text-2xl font-sora font-extrabold text-ink">
                  Place this QR code at your counter
                </h3>
                <p className="text-xs text-ink-soft max-w-md mx-auto mt-1">
                  Customers scan with Google Lens, Paytm, PhonePe, or camera to upload documents in seconds.
                </p>
              </div>

              {/* QR Image Box */}
              <div className="p-6 rounded-[24px] bg-paper border border-hairline inline-block shadow-inner">
                {vendor.slug && (
                  <img
                    src={`/api/qr/${vendor.slug}?format=svg`}
                    alt={`${vendor.name} Print2Me QR Code`}
                    className="w-56 h-56 mx-auto rounded-14"
                  />
                )}
                <div className="mt-4 font-mono text-xs font-bold text-ink">
                  {publicQrUrl}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(publicQrUrl);
                    setCopiedQrLink(true);
                    setTimeout(() => setCopiedQrLink(false), 2000);
                  }}
                  className="px-5 py-2.5 rounded-pill bg-paper hover:bg-surface border border-hairline text-xs font-bold text-ink transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-saffron" />
                  <span>{copiedQrLink ? 'Link Copied!' : 'Copy Kiosk Link'}</span>
                </button>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-6 py-2.5 rounded-pill bg-ink hover:bg-ink/90 text-white text-xs font-extrabold transition-colors shadow-md flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-saffron" />
                  <span>Open Printable Standee</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 6: PRICING MATRIX & PRINT SETTINGS
        ========================================================================= */}
        {activeNav === 'PRICING' && (
          <div className="bg-surface p-6 sm:p-8 rounded-[28px] border border-hairline shadow-ink-soft space-y-8 animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-hairline">
              <div>
                <h3 className="text-xl font-sora font-bold text-ink">Pricing &amp; Paper Sizes</h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Enable or disable paper sizes for your store, set per-page rates, and define minimum cart order.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-paper px-4 py-2 rounded-pill border border-hairline">
                <span className="text-xs font-bold text-ink">Min Order: ₹</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={minOrderRupees}
                  onChange={(e) => setMinOrderRupees(Number(e.target.value))}
                  className="w-16 bg-surface border border-hairline rounded-lg px-2 py-1 text-xs font-bold text-ink text-center focus:outline-none focus:border-saffron"
                />
              </div>
            </div>

            {pricingMessage && (
              <div
                className={`p-4 rounded-14 text-xs font-semibold ${
                  pricingMessage.type === 'success'
                    ? 'bg-success-tint text-success border border-success/30'
                    : 'bg-danger/10 text-danger border border-danger/30'
                }`}
              >
                {pricingMessage.text}
              </div>
            )}

            {pricingLoading ? (
              <div className="py-12 text-center text-xs text-ink-soft animate-pulse">Loading pricing matrix &amp; paper sizes...</div>
            ) : (
              <form onSubmit={handleSavePricing} className="space-y-8">
                {/* 1. PAPER SIZES AVAILABILITY CARDS */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                      <FileText className="w-4 h-4 text-saffron" />
                      <span>Supported Paper Sizes</span>
                    </h4>
                    <p className="text-[11px] text-ink-soft">
                      Toggle paper sizes ON or OFF. Disabled sizes are instantly hidden from customer upload and storefronts.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {PAPER_SIZE_DEFINITIONS.map((def) => {
                      const active = isPaperSizeActive(def.key);
                      const { active: activeCount, total: totalCount } = getActiveTiersCountForSize(def.key);
                      return (
                        <div
                          key={def.key}
                          className={`p-4 rounded-20 border transition-all flex flex-col justify-between gap-3 ${
                            active
                              ? 'bg-paper/70 border-hairline shadow-xs hover:border-saffron/40'
                              : 'bg-paper/30 border-hairline/60 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-sora font-extrabold text-sm text-ink">{def.name}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-pill ${
                                  active
                                    ? 'bg-success-tint text-success'
                                    : 'bg-paper text-ink-soft/60 border border-hairline'
                                }`}
                              >
                                {active ? `${activeCount}/${totalCount} Active` : 'Disabled'}
                              </span>
                            </div>
                            <div className="text-[10px] font-mono text-saffron font-semibold">{def.dimensions}</div>
                            <p className="text-[11px] text-ink-soft leading-snug line-clamp-2">{def.desc}</p>
                          </div>

                          <div className="pt-2 border-t border-hairline/70 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-ink-soft">
                              {active ? 'Store Enabled' : 'Store Disabled'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePaperSizeActive(def.key, !active)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                active ? 'bg-saffron' : 'bg-ink-soft/30'
                              }`}
                              role="switch"
                              aria-checked={active}
                              title={active ? `Disable ${def.name}` : `Enable ${def.name}`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  active ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. DETAILED RATE MATRIX TABLE */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-ink">Per-Page Rate Matrix &amp; Tier Status</h4>
                      <p className="text-[11px] text-ink-soft">
                        Fine-tune per-side print rates or toggle individual color / duplex modes.
                      </p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-paper rounded-pill border border-hairline overflow-x-auto">
                      {(['ALL', 'A4', 'A3', 'LEGAL', 'LETTER'] as const).map((filter) => {
                        const isSelected = pricingPaperSizeFilter === filter;
                        return (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => setPricingPaperSizeFilter(filter)}
                            className={`px-3 py-1 rounded-pill text-[11px] font-bold transition-colors whitespace-nowrap cursor-pointer ${
                              isSelected
                                ? 'bg-ink text-white shadow-xs'
                                : 'text-ink-soft hover:text-ink'
                            }`}
                          >
                            {filter === 'ALL' ? 'All Sizes' : filter}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-hairline rounded-20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-hairline bg-paper/60 text-ink-soft font-bold">
                          <th className="py-3 px-4">Paper Size</th>
                          <th className="py-3 px-4">Color Mode</th>
                          <th className="py-3 px-4">Side Setup</th>
                          <th className="py-3 px-4">Rate per Side (₹)</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {pricingList
                          .filter((tier) => {
                            if (pricingPaperSizeFilter === 'ALL') return true;
                            const size = (tier.paper_size || tier.paperSize || '').toUpperCase();
                            return size === pricingPaperSizeFilter;
                          })
                          .map((tier, idx) => {
                            const active = isTierActive(tier);
                            const currentRateRupees = (
                              (tier.price_per_side_minor || tier.pricePerSideMinor || 200) / 100
                            ).toFixed(2);

                            return (
                              <tr
                                key={idx}
                                className={`transition-colors ${
                                  active ? 'hover:bg-paper/50' : 'bg-paper/25 opacity-60 hover:opacity-90'
                                }`}
                              >
                                <td className="py-3.5 px-4 font-bold text-ink">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono">{tier.paper_size || tier.paperSize}</span>
                                    {!active && (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-paper border border-hairline text-ink-soft/70">
                                        Off
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-medium">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      (tier.color_mode || tier.colorMode) === 'COLOR'
                                        ? 'bg-saffron-tint text-saffron'
                                        : 'bg-paper text-ink border border-hairline'
                                    }`}
                                  >
                                    {(tier.color_mode || tier.colorMode) === 'COLOR' ? 'Color' : 'B&W'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-ink-soft">
                                  {(tier.is_duplex ?? tier.isDuplex) ? 'Double Sided' : 'Single Sided'}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-1 font-bold">
                                    <span className="text-ink-soft">₹</span>
                                    <input
                                      type="number"
                                      step="0.25"
                                      min="0.5"
                                      value={currentRateRupees}
                                      onChange={(e) => {
                                        const newValPaise = Math.round(parseFloat(e.target.value || '0') * 100);
                                        updateTierRate(tier, newValPaise);
                                      }}
                                      className={`w-24 bg-paper border border-hairline rounded-10 px-2.5 py-1 text-xs font-bold text-ink focus:outline-none focus:border-saffron ${
                                        !active ? 'opacity-70' : ''
                                      }`}
                                    />
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleTierActive(tier)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-xs cursor-pointer ${
                                      active
                                        ? 'bg-success-tint text-success border border-success/30 hover:bg-success/20'
                                        : 'bg-paper text-ink-soft/70 border border-hairline hover:border-ink-soft/40 hover:text-ink'
                                    }`}
                                    title={active ? 'Click to disable this option' : 'Click to enable this option'}
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full transition-colors ${
                                        active ? 'bg-success shadow-xs shadow-success/50' : 'bg-ink-soft/40'
                                      }`}
                                    />
                                    <span>{active ? 'Enabled' : 'Disabled'}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-hairline">
                  <p className="text-[11px] text-ink-soft">
                    Changes to paper sizes and per-page rates sync immediately with backend validation.
                  </p>
                  <Button variant="primary" type="submit" disabled={pricingSaving} className="h-11 px-6 font-bold text-xs shrink-0">
                    {pricingSaving ? 'Saving Pricing & Sizes...' : 'Save Pricing & Paper Sizes'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            VIEW 7: PAYMENTS & EARNINGS
        ========================================================================= */}
        {activeNav === 'PAYMENTS' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header & Description */}
            <div className="bg-surface p-6 sm:p-8 rounded-[28px] border border-hairline shadow-ink-soft space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-sora font-extrabold text-ink">
                    Razorpay payment setup &amp; bank settlement
                  </h3>
                  <p className="text-xs text-ink-soft max-w-2xl mt-1">
                    Connect your own approved Razorpay account so 100% of customer printing revenue settles directly
                    into your bank account. Print2Me operates on a subscription model and{' '}
                    <strong className="text-ink">never charges commission on printing orders</strong>.
                  </p>
                </div>

                {vendor.slug && (
                  <Link
                    href={`/shop/${vendor.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-paper border border-hairline rounded-12 text-xs font-bold text-ink hover:border-saffron transition shrink-0"
                  >
                    <span>View Public Shop Page</span>
                    <ExternalLink className="w-3.5 h-3.5 text-saffron" />
                  </Link>
                )}
              </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-2">
                <span className="text-xs text-ink-soft font-semibold">Total Revenue</span>
                <div className="font-sora text-3xl font-black text-ink">
                  ₹{formatMinorToInr(stats.totalRevenueMinor)}
                </div>
                <span className="text-[11px] text-ink-soft">Lifetime printing volume</span>
              </div>

              <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-2">
                <span className="text-xs text-ink-soft font-semibold">Settlement Routing</span>
                <div className="font-sora text-lg font-extrabold text-ink flex items-center gap-2">
                  {(paymentAccount?.authStatus === 'AUTHORIZED' || paymentAccount?.authStatus === 'CONNECTED') ? (
                    paymentAccount?.activationStatus === 'ACTIVATED' ? (
                      <span className="text-success flex items-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        Direct to Vendor Bank
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1.5">
                        <Clock className="w-5 h-5 text-amber-500" />
                        Under Verification
                      </span>
                    )
                  ) : (
                    <span className="text-ink-soft flex items-center gap-1.5">
                      <AlertTriangle className="w-5 h-5 text-ink-soft" />
                      Not Connected
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-ink-soft font-mono">
                  {paymentAccount?.razorpayAccountId
                    ? `Account: ${paymentAccount.razorpayAccountId}`
                    : 'Online payments disabled'}
                </span>
              </div>

              <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-2">
                <span className="text-xs text-ink-soft font-semibold">Pending Cash on Desk</span>
                <div className="font-sora text-3xl font-black text-saffron">
                  {stats.cashPending} Orders
                </div>
                <span className="text-[11px] text-ink-soft">Collect before customer leaves shop</span>
              </div>
            </div>

            {/* Razorpay Partner Integration Card */}
            <div className="bg-surface p-6 sm:p-8 rounded-[28px] border border-hairline shadow-ink-soft space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-16 bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-sora font-extrabold text-ink">
                      Razorpay Technology Partner Onboarding
                    </h4>
                    <p className="text-xs text-ink-soft">
                      Application: <strong className="text-ink">Print2me</strong> • RBI Authorized Payment Aggregator Partner
                    </p>
                  </div>
                </div>

                {/* Connection Status Badge */}
                <div>
                  {paymentAccountLoading ? (
                    <span className="text-xs text-ink-soft animate-pulse">Loading status...</span>
                  ) : (paymentAccount?.authStatus === 'AUTHORIZED' || paymentAccount?.authStatus === 'CONNECTED') ? (
                    paymentAccount.activationStatus === 'ACTIVATED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        Active & Verified
                      </span>
                    ) : paymentAccount.activationStatus === 'UNDER_REVIEW' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Pending Verification
                      </span>
                    ) : paymentAccount.activationStatus === 'SUSPENDED' || paymentAccount.activationStatus === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                        <span className="w-2 h-2 rounded-full bg-danger" />
                        Restricted ({paymentAccount.activationStatus})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                        Authorized ({paymentAccount.activationStatus || 'In Progress'})
                      </span>
                    )
                  ) : paymentAccount?.authStatus === 'DISCONNECTED' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 border border-slate-500/20">
                      Disconnected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-paper text-ink-soft border border-hairline">
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              {/* Status Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-16 bg-paper border border-hairline space-y-1">
                  <span className="text-[10px] font-bold text-ink-soft ">
                    Merchant Account ID
                  </span>
                  <div className="text-xs font-bold text-ink font-mono truncate">
                    {paymentAccount?.razorpayAccountId || '—'}
                  </div>
                  <span className="text-[10px] text-ink-soft">Assigned by Razorpay</span>
                </div>

                <div className="p-4 rounded-16 bg-paper border border-hairline space-y-1">
                  <span className="text-[10px] font-bold text-ink-soft ">
                    Onboarding State
                  </span>
                  <div className="text-xs font-bold text-ink">
                    {paymentAccount?.onboardingStatus || 'NOT_STARTED'}
                  </div>
                  <span className="text-[10px] text-ink-soft">OAuth Authorization</span>
                </div>

                <div className="p-4 rounded-16 bg-paper border border-hairline space-y-1">
                  <span className="text-[10px] font-bold text-ink-soft ">
                    Activation Status
                  </span>
                  <div className="text-xs font-bold text-ink">
                    {paymentAccount?.activationStatus || 'NOT_ACTIVATED'}
                  </div>
                  <span className="text-[10px] text-ink-soft">KYC & Bank Verification</span>
                </div>

                <div className="p-4 rounded-16 bg-paper border border-hairline space-y-1">
                  <span className="text-[10px] font-bold text-ink-soft ">
                    Last Synchronized
                  </span>
                  <div className="text-xs font-bold text-ink">
                    {paymentAccount?.lastSyncedAt
                      ? new Date(paymentAccount.lastSyncedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </div>
                  <span className="text-[10px] text-ink-soft">Authoritative provider sync</span>
                </div>
              </div>

              {/* Alert / Guidance Box */}
              {paymentAccount?.lastError && (
                <div className="p-4 rounded-16 bg-danger/10 border border-danger/20 text-xs text-danger flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Status Notification:</strong>
                    <span>{paymentAccount.lastError}</span>
                  </div>
                </div>
              )}

              {paymentAccount?.requirements && (
                <div className="p-4 rounded-16 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <strong className="block font-bold">Pending Actions from Razorpay:</strong>
                    <pre className="text-[11px] mt-1 font-mono whitespace-pre-wrap">
                      {typeof paymentAccount.requirements === 'string'
                        ? paymentAccount.requirements
                        : JSON.stringify(paymentAccount.requirements, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  {(!paymentAccount || (paymentAccount.authStatus !== 'AUTHORIZED' && paymentAccount.authStatus !== 'CONNECTED')) ? (
                    <Button
                      variant="primary"
                      type="button"
                      disabled={connectingPayment}
                      onClick={handleConnectRazorpay}
                      className="h-11 px-6 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{connectingPayment ? 'Initiating Razorpay...' : 'Connect Razorpay Account'}</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        type="button"
                        disabled={paymentAccountSyncing}
                        onClick={handleSyncPaymentStatus}
                        className="h-10 px-4 font-bold text-xs flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${paymentAccountSyncing ? 'animate-spin' : ''}`} />
                        <span>{paymentAccountSyncing ? 'Synchronizing...' : 'Re-sync Status from Razorpay'}</span>
                      </Button>

                      <button
                        type="button"
                        onClick={handleDisconnectPayment}
                        className="h-10 px-4 rounded-12 text-xs font-semibold text-danger hover:bg-danger/10 border border-danger/20 transition"
                      >
                        Disconnect Account
                      </button>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-ink-soft">
                  Secure OAuth 2.0 flow • Razorpay hosted onboarding
                </div>
              </div>

              {/* Security & Zero Commission Policy Callout */}
              <div className="p-5 rounded-20 bg-paper border border-hairline space-y-2 text-xs text-ink-soft leading-relaxed">
                <div className="flex items-center gap-2 text-ink font-bold">
                  <ShieldCheck className="w-4 h-4 text-success" />
                  <span>Transparent Fee Disclosure & Print2Me Zero-Commission Guarantee</span>
                </div>
                <p>
                  Print2Me never takes a commission or percentage cut from your printing orders. Customer payments settle
                  directly into your connected bank account according to Razorpay&apos;s standard settlement cycle (T+2
                  business days). Standard gateway processing fees charged by Razorpay apply as per your direct merchant agreement.
                </p>
                <p className="text-[11px]">
                  <strong>Security Note:</strong> Print2Me never asks you to enter or paste your Razorpay API secret keys.
                  All authorization occurs securely on Razorpay&apos;s hosted consent screen.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 8: DEVICES & DESKTOP AGENT
        ========================================================================= */}
        {activeNav === 'DEVICES' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-surface p-6 sm:p-8 rounded-[28px] border border-hairline shadow-ink-soft space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-sora font-bold text-ink">Windows Desktop Print Agent</h3>
                  <p className="text-xs text-ink-soft">
                    Automate printing directly to Canon, HP, Epson, or Brother spoolers without touching PDF files.
                  </p>
                </div>
                <button
                  disabled={generatingCode}
                  onClick={handleGenerateCode}
                  className="px-4 py-2 rounded-pill bg-paper hover:bg-surface border border-hairline text-xs font-bold text-ink transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-saffron ${generatingCode ? 'animate-spin' : ''}`} />
                  <span>Generate New Enrollment Code</span>
                </button>
              </div>

              {/* Enrollment Code Box */}
              <div className="p-6 rounded-[22px] bg-paper border border-hairline shadow-inner max-w-md space-y-3">
                <span className="text-[10px] font-extrabold  text-ink-soft">
                  One-Time Workstation Pair Code
                </span>
                <div className="flex items-center justify-between bg-surface border border-hairline rounded-14 px-4 py-3">
                  <span className="font-mono text-2xl font-black text-ink tracking-widest">
                    {deviceCode || 'Loading...'}
                  </span>
                  <button
                    onClick={() => {
                      if (deviceCode) {
                        navigator.clipboard.writeText(deviceCode);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }
                    }}
                    className="text-xs font-bold text-saffron hover:underline"
                  >
                    {copiedCode ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-ink-soft">
                  Open the Print2Me Windows Desktop Agent on your shop computer and enter this code to connect your printers.
                </p>
              </div>

              {/* Enrolled Hardware List */}
              <div className="space-y-3 pt-4 border-t border-hairline">
                <h4 className="text-sm font-bold text-ink">Connected Printers &amp; Workstations</h4>
                {enrolledDevices.length === 0 ? (
                  <div className="p-6 rounded-14 bg-paper border border-hairline text-xs text-ink-soft text-center">
                    No desktop agents enrolled yet. Install the Print2Me Desktop Agent on your Windows PC and pair using the code above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {enrolledDevices.map((dev: any) => (
                      <div key={dev.id} className="p-4 rounded-14 bg-paper border border-hairline flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                          <div>
                            <span className="font-bold text-xs text-ink block">{dev.deviceName || dev.name}</span>
                            <span className="text-[10px] text-ink-soft font-mono">{dev.osVersion || 'Windows 11'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
                          Active Spooler
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 9: SAAS SUBSCRIPTION & PLANS
        ========================================================================= */}
        {activeNav === 'SUBSCRIPTION' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-[24px] bg-gradient-to-r bg-surface border border-blue-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold  text-blue-400">Current Plan Status</span>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${vendor.isSubscriptionActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    ● {vendor.isSubscriptionActive ? 'ACTIVE' : 'EXPIRED'}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-sora text-ink">
                  {vendor.subscriptionPlan || 'STARTER'} Tier •{' '}
                  {vendor.subscriptionExpiresAt
                    ? `Renews on ${new Date(vendor.subscriptionExpiresAt).toLocaleDateString()}`
                    : 'Free Store Trial'}
                </h3>
                <p className="text-xs text-ink-soft mt-1">
                  Hero Feature: Zero-Touch Auto-Printing Active across counter workstations.
                </p>
              </div>

              <button
                onClick={() => setShowSubscriptionModal(true)}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sora font-extrabold text-xs transition-colors shadow-lg shadow-blue-500/25 flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Open Plan Checkout &amp; Pay
              </button>
            </div>
          </div>
        )}
        </main>

        {/* Mobile Sticky Bottom Quick-Nav Bar (< md) */}
        <div className="md:hidden sticky bottom-0 z-40 bg-ink text-white border-t border-white/10 px-2 py-2 flex items-center justify-around shadow-2xl">
          <button
            onClick={() => setActiveNav('OVERVIEW')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-8 text-[10px] font-semibold transition-colors ${
              activeNav === 'OVERVIEW' ? 'text-saffron font-bold' : 'text-slate-400'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveNav('QUEUE')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-8 text-[10px] font-semibold transition-colors relative ${
              activeNav === 'QUEUE' ? 'text-saffron font-bold' : 'text-slate-400'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Queue</span>
            {stats.spoolingOrders > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-saffron animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveNav('ORDERS')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-8 text-[10px] font-semibold transition-colors ${
              activeNav === 'ORDERS' ? 'text-saffron font-bold' : 'text-slate-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Orders</span>
          </button>

          <button
            onClick={() => setActiveNav('DEVICES')}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-8 text-[10px] font-semibold transition-colors ${
              activeNav === 'DEVICES' ? 'text-saffron font-bold' : 'text-slate-400'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Spooler</span>
          </button>

          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center gap-1 p-1.5 rounded-8 text-[10px] font-semibold text-slate-400 hover:text-white"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>
      </div>

      {/* Reusable Modals */}
      <QrStandeeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        vendorName={vendor.name}
        vendorSlug={vendor.slug}
        address={vendor.address}
      />

      <VendorSubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => {
          setShowSubscriptionModal(false);
          fetchStats();
        }}
        vendor={vendor}
        onSubscriptionUpdated={() => {
          fetchStats();
          fetchSettings();
        }}
      />
    </div>
  );
}
