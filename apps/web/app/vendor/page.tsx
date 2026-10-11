'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { QrStandeeModal } from '@/components/QrStandeeModal';
import { VendorSettingsModal } from '@/components/VendorSettingsModal';
import { formatMinorToInr } from '@/lib/pricing-engine';
import { Button } from '@/components/primitives';

export default function VendorDashboardPage() {
  const router = useRouter();
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [deviceCode, setDeviceCode] = useState('');
  const [enrolledDevices, setEnrolledDevices] = useState<any[]>([]);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadEnrollmentData = async () => {
    try {
      const res = await fetch('/api/vendor/devices/enrollment-code');
      const data = await res.json();
      if (res.ok && data.enrollmentCode) {
        setDeviceCode(data.enrollmentCode);
        setEnrolledDevices(data.activeDevices || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateNewCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await fetch('/api/vendor/devices/enrollment-code', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.enrollmentCode) {
        setDeviceCode(data.enrollmentCode);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // If user is already loaded, only fetch orders for the active tab (instant tab switching)
      if (sessionUser) {
        const ordersRes = await fetch(`/api/vendor/orders?status=${activeTab}`);
        const ordersData = await ordersRes.json();
        if (ordersRes.ok) {
          setOrders(ordersData.orders || []);
        } else if (ordersRes.status === 401) {
          router.push('/login');
        }
        return;
      }

      // Initial load: Fetch authentication and orders in parallel
      const [meRes, ordersRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/vendor/orders?status=${activeTab}`),
      ]);

      const meData = await meRes.json();
      if (!meRes.ok || !meData.authenticated) {
        router.push('/login');
        return;
      }
      setSessionUser(meData.user);

      const ordersData = await ordersRes.json();
      if (ordersRes.ok) {
        setOrders(ordersData.orders || []);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Use an effect to periodically fetch data can be added here if needed
  }, [activeTab]);

  const handleStatusAction = async (orderId: string, action: string) => {
    setActionInProgress(orderId);
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        if (action === 'MARK_CASH_COLLECTED' || action === 'APPROVE_CASH') {
          return {
            ...o,
            paymentStatus: 'CASH_COLLECTED',
            status: o.status === 'AWAITING_VENDOR_APPROVAL' ? 'CONFIRMED' : o.status,
          };
        }
        if (action === 'APPROVE') return { ...o, status: 'CONFIRMED' };
        if (action === 'REJECT') return { ...o, status: 'REJECTED' };
        if (action === 'MARK_READY') return { ...o, status: 'READY_FOR_PICKUP' };
        if (action === 'MARK_COMPLETED') return { ...o, status: 'COMPLETED' };
        return o;
      })
    );
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update order');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating order status');
      loadData();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const totalRevenuePaise = orders
    .filter((o) => o.paymentStatus === 'SUCCESS' || o.paymentStatus === 'CASH_COLLECTED')
    .reduce((acc, o) => acc + (o.totalAmountMinor || 0), 0);
  const awaitingApprovalCount = orders.filter((o) => o.status === 'AWAITING_VENDOR_APPROVAL').length;
  const cashPendingCount = orders.filter((o) => o.paymentStatus === 'CASH_PENDING').length;
  const inSpoolerCount = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING').length;

  if (loading && !sessionUser) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-10 h-10 text-saffron animate-spin" />
        <p className="font-sora font-bold text-ink">Authenticating Vendor Session...</p>
      </div>
    );
  }

  const vendor = sessionUser?.vendor || {
    name: 'SpeedyPrint Express',
    slug: 'speedy-express',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 min-h-screen">
      {/* Top Header Card */}
      <div className="bg-surface p-6 md:p-8 rounded-[32px] border border-hairline shadow-ink-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-[20px] bg-saffron-tint flex items-center justify-center text-saffron shadow-sm border border-saffron/20">
            <Store className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-success-tint border border-success/20 text-success text-[10px] font-bold uppercase tracking-wider mb-2 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Vendor Control Station
            </div>
            <h1 className="text-2xl md:text-3xl font-sora font-extrabold text-ink tracking-tight">{vendor.name}</h1>
            <p className="text-sm text-ink-soft mt-1">
              Public QR URL: <span className="text-saffron font-mono">/v/{vendor.slug}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-[16px] bg-paper hover:bg-surface text-ink text-xs font-bold border border-hairline transition-all shadow-sm"
          >
            <IndianRupee className="w-4 h-4 text-saffron" />
            Pricing & Setup
          </button>

          <button
            onClick={() => { setShowAgentModal(true); loadEnrollmentData(); }}
            className="flex items-center gap-2 px-5 py-3 rounded-[16px] bg-paper hover:bg-surface text-ink text-xs font-bold border border-hairline transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-ink-soft" />
            Desktop Agent
          </button>

          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-[16px] bg-paper hover:bg-surface text-ink text-xs font-bold border border-hairline transition-all shadow-sm"
          >
            <QrCode className="w-4 h-4 text-ink-soft" />
            Counter Standee
          </button>

          <Link
            href={`/v/${vendor.slug}`}
            target="_blank"
            className="flex items-center gap-2 px-5 py-3 rounded-[16px] bg-paper hover:bg-surface text-ink text-xs font-bold border border-hairline transition-all shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-ink-soft" />
            Customer View
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-3 rounded-[16px] bg-danger/10 hover:bg-danger/20 text-danger text-xs font-bold border border-danger/20 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-6 rounded-[24px] border border-hairline shadow-ink-soft space-y-3">
          <div className="flex items-center justify-between text-ink-soft text-sm font-semibold">
            Collected Revenue
            <div className="w-8 h-8 rounded-full bg-success-tint flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-success" />
            </div>
          </div>
          <div className="font-sora text-3xl font-extrabold text-ink">₹{formatMinorToInr(totalRevenuePaise)}</div>
          <div className="text-[11px] text-ink-soft font-medium">Reconciled online & cash</div>
        </div>

        <div className="bg-surface p-6 rounded-[24px] border border-hairline shadow-ink-soft space-y-3">
          <div className="flex items-center justify-between text-ink-soft text-sm font-semibold">
            In Print Spooler
            <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center border border-hairline">
              <Printer className="w-4 h-4 text-ink" />
            </div>
          </div>
          <div className="font-sora text-3xl font-extrabold text-ink">{inSpoolerCount}</div>
          <div className="text-[11px] text-ink-soft font-medium">Spooling / Active queue</div>
        </div>

        <div className="bg-surface p-6 rounded-[24px] border border-warning/30 shadow-ink-soft space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-warning" />
          <div className="flex items-center justify-between text-ink-soft text-sm font-semibold">
            Awaiting Approval
            <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-warning" />
            </div>
          </div>
          <div className="font-sora text-3xl font-extrabold text-ink">{awaitingApprovalCount}</div>
          <div className="text-[11px] text-ink-soft font-medium">Pending manual review</div>
        </div>

        <div 
          onClick={() => setActiveTab('CASH_PENDING')}
          className="bg-surface p-6 rounded-[24px] border border-saffron/30 shadow-ink-soft space-y-3 cursor-pointer hover:border-saffron hover:shadow-md transition-all relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-saffron group-hover:w-2 transition-all" />
          <div className="flex items-center justify-between text-ink-soft text-sm font-semibold">
            Pending Cash on Desk
            <div className="w-8 h-8 rounded-full bg-saffron-tint flex items-center justify-center">
              <Clock className="w-4 h-4 text-saffron" />
            </div>
          </div>
          <div className="font-sora text-3xl font-extrabold text-ink">{cashPendingCount}</div>
          <div className="text-[11px] text-ink-soft font-medium">To collect at counter • Click to view</div>
        </div>
      </div>

      {/* Orders Filter Tabs */}
      <div className="bg-surface p-6 md:p-8 rounded-[32px] border border-hairline shadow-ink-soft space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-hairline pb-6">
          <div className="flex flex-wrap gap-2 text-xs font-semibold overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'CASH_PENDING', label: `Pending Cash (${cashPendingCount})` },
              { id: 'AWAITING_VENDOR_APPROVAL', label: `Needs Approval (${awaitingApprovalCount})` },
              { id: 'CONFIRMED', label: 'Ready for Print' },
              { id: 'PROCESSING', label: 'In Spooler' },
              { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
              { id: 'COMPLETED', label: 'Completed' },
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

          <button
            onClick={loadData}
            className="flex items-center justify-center gap-2 text-xs font-bold text-ink bg-paper border border-hairline px-4 py-2.5 rounded-pill hover:bg-surface transition-colors shadow-sm shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Orders Queue List */}
        {orders.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-paper border border-hairline flex items-center justify-center mx-auto shadow-sm">
              <Layers className="w-8 h-8 text-ink-soft" />
            </div>
            <h3 className="font-sora text-xl font-bold text-ink">No Orders in this View</h3>
            <p className="text-sm text-ink-soft max-w-md mx-auto">Orders placed by customers will stream here in real-time. Check back shortly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isWorking = actionInProgress === order.id;
              return (
                <div
                  key={order.id}
                  className="p-6 rounded-[24px] bg-paper border border-hairline hover:shadow-sm transition-all space-y-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-sora font-extrabold text-ink tracking-tight">{order.orderNumber}</div>
                      <span
                        className={`text-[10px] font-bold px-3 py-1 rounded-pill uppercase tracking-wider ${
                          order.status === 'CONFIRMED'
                            ? 'bg-success-tint text-success border border-success/20'
                            : order.status === 'AWAITING_VENDOR_APPROVAL'
                            ? 'bg-warning/20 text-warning border border-warning/30'
                            : order.status === 'COMPLETED'
                            ? 'bg-surface text-ink-soft border border-hairline'
                            : 'bg-saffron-tint text-saffron border border-saffron/20'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-sora text-xl font-extrabold text-ink">
                        ₹{formatMinorToInr(order.totalAmountMinor)}
                      </div>
                      <div className="text-xs text-ink-soft font-medium mt-0.5">
                        {order.paymentMethod === 'RAZORPAY' ? 'Online' : 'Cash'} •{' '}
                        <span
                          className={
                            order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'CASH_COLLECTED'
                              ? 'text-success font-bold'
                              : 'text-warning font-bold'
                          }
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info & Items */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                    <div className="col-span-1 space-y-2">
                      <div className="font-semibold text-ink">Customer Details</div>
                      <div className="text-ink-soft">
                        <span className="text-ink font-medium">{order.customerName || 'Guest'}</span>
                        {order.customerPhone && (
                          <span className="block">{order.customerPhone}</span>
                        )}
                        <span className="block text-xs mt-1">Placed: {new Date(order.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="col-span-2 space-y-2">
                      <div className="font-semibold text-ink">Print Items</div>
                      <div className="space-y-2">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface rounded-14 border border-hairline text-xs gap-2">
                            <span className="truncate max-w-xs flex items-center gap-2 font-medium text-ink">
                              <FileText className="w-4 h-4 text-ink-soft shrink-0" />
                              {item.document?.originalName || 'Document'}
                            </span>
                            <span className="text-ink-soft font-medium bg-paper px-3 py-1.5 rounded-pill border border-hairline">
                              {item.paperSize} • {item.colorMode === 'COLOR' ? 'Color' : 'B&W'} •{' '}
                              <strong className="text-ink">{item.copies}x</strong> • {item.totalSheets} sheets
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Vendor Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-hairline">
                    {order.status === 'AWAITING_VENDOR_APPROVAL' && (
                      <>
                        <Button
                          variant="outline"
                          disabled={isWorking}
                          onClick={() => handleStatusAction(order.id, 'REJECT')}
                          className="h-10 text-danger border-danger/30 hover:bg-danger/10"
                        >
                          <X className="w-4 h-4" /> Reject
                        </Button>
                        <Button
                          variant="primary"
                          disabled={isWorking}
                          onClick={() => handleStatusAction(order.id, 'APPROVE')}
                          className="h-10"
                        >
                          <Check className="w-4 h-4" /> Approve Order
                        </Button>
                      </>
                    )}

                    {(order.paymentStatus === 'CASH_PENDING' || (order.paymentMethod === 'CASH_ON_COLLECTION' && order.paymentStatus !== 'CASH_COLLECTED' && order.paymentStatus !== 'SUCCESS')) && (
                      <Button
                        variant="saffron"
                        disabled={isWorking}
                        onClick={() => handleStatusAction(order.id, 'MARK_CASH_COLLECTED')}
                        className="h-10"
                      >
                        <IndianRupee className="w-4 h-4" /> Approve Cash Received
                      </Button>
                    )}

                    {order.status === 'CONFIRMED' && (
                      <Button
                        variant="primary"
                        disabled={isWorking}
                        onClick={() => handleStatusAction(order.id, 'MARK_READY')}
                        className="h-10"
                      >
                        <Printer className="w-4 h-4" /> Mark Ready for Pickup
                      </Button>
                    )}

                    {order.status === 'READY_FOR_PICKUP' && (
                      <Button
                        variant="outline"
                        disabled={isWorking}
                        onClick={() => handleStatusAction(order.id, 'MARK_COMPLETED')}
                        className="h-10 bg-success-tint border-success/20 text-success hover:bg-success/20 hover:border-success/30"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark Order Completed
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <QrStandeeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        vendorName={vendor.name}
        vendorSlug={vendor.slug}
        address={vendor.address}
      />

      {/* Desktop Agent Enrollment Modal */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-md">
          <div className="bg-surface border border-hairline rounded-[32px] max-w-lg w-full p-8 space-y-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAgentModal(false)}
              className="absolute top-6 right-6 text-ink-soft hover:text-ink transition-colors bg-paper rounded-full p-2"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-[20px] bg-paper text-ink flex items-center justify-center border border-hairline shadow-sm">
                <Printer className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-sora text-xl font-bold text-ink">Desktop Print Agent</h3>
                <p className="text-sm text-ink-soft">Pair your PC printer with Print2Me</p>
              </div>
            </div>

            <div className="bg-paper border border-hairline rounded-[24px] p-6 space-y-4 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink uppercase tracking-wider">Device Enrollment Code</span>
                <button
                  disabled={generatingCode}
                  onClick={handleGenerateNewCode}
                  className="text-xs text-saffron hover:underline font-bold disabled:opacity-50"
                >
                  {generatingCode ? 'Generating...' : '+ New Code'}
                </button>
              </div>
              
              <div className="flex items-center justify-between bg-surface border border-hairline rounded-[16px] px-5 py-4 shadow-sm">
                <span className="font-mono text-2xl font-black text-ink tracking-widest">
                  {deviceCode || 'Loading...'}
                </span>
                <Button
                  variant="primary"
                  disabled={!deviceCode}
                  className="h-10 px-4"
                  onClick={() => {
                    if (deviceCode) {
                      navigator.clipboard.writeText(deviceCode);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }
                  }}
                >
                  {copiedCode ? 'Copied!' : 'Copy Code'}
                </Button>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed font-medium">
                Enter this 6-character code in your workstation desktop application to connect this store.
              </p>
            </div>

            {/* Enrolled Devices List */}
            {enrolledDevices.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-bold text-ink">Enrolled Workstations ({enrolledDevices.length})</div>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                  {enrolledDevices.map((dev: any) => (
                    <div key={dev.id} className="flex items-center justify-between p-4 rounded-[16px] bg-paper border border-hairline text-sm shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-sm" />
                        <span className="font-bold text-ink">{dev.deviceName || dev.name}</span>
                      </div>
                      <span className="text-xs text-ink-soft font-mono bg-surface px-2 py-1 rounded-md border border-hairline">
                        {dev.osVersion || 'Windows'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-hairline">
              <Button onClick={() => setShowAgentModal(false)} variant="outline" className="w-full h-12">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      <VendorSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onUpdated={loadData}
      />
    </div>
  );
}
