// hallmark:v1 theme=sticker shape=workbench density=balanced
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Tag,
  Check,
  Store,
  Layers,
  Printer,
  ShieldCheck,
  Gift,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/primitives';
import { formatMinorToInr } from '@/lib/pricing-engine';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const DEFAULT_PLANS = [
  {
    id: 'starter_plan',
    code: 'STARTER',
    name: 'Starter Counter Plan',
    description: 'Essential automated printing for single counter shops & Xerox kiosks.',
    priceMonthlyMinor: 49900,
    priceYearlyMinor: 499900,
    deviceLimit: 2,
    maxDevices: 2,
    quotaLimit: 1000,
    maxOrdersPerMonth: 1000,
    hasColorRouting: false,
    hasPrioritySupport: false,
  },
  {
    id: 'pro_plan',
    code: 'PRO',
    name: 'Professional Studio',
    description: 'High-volume automated printing for multi-printer Xerox and digital offset studios.',
    priceMonthlyMinor: 129900,
    priceYearlyMinor: 1299900,
    deviceLimit: 5,
    maxDevices: 5,
    quotaLimit: 5000,
    maxOrdersPerMonth: 5000,
    hasColorRouting: true,
    hasPrioritySupport: true,
  },
  {
    id: 'enterprise_plan',
    code: 'ENTERPRISE',
    name: 'Campus & Enterprise Kiosks',
    description: 'Unlimited print automation for universities, colleges, and commercial chains.',
    priceMonthlyMinor: 299900,
    priceYearlyMinor: 2999900,
    deviceLimit: 20,
    maxDevices: 20,
    quotaLimit: 50000,
    maxOrdersPerMonth: 50000,
    hasColorRouting: true,
    hasPrioritySupport: true,
  },
];

export default function VendorSubscriptionPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('STARTER');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  // Checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vendor/subscription');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.subscription?.planCode) {
          setSelectedPlanCode(json.subscription.planCode);
        } else if (json.plans?.length > 0) {
          setSelectedPlanCode(json.plans[0].code);
        }
      }
    } catch (err) {
      console.error('Failed to load subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();

    // Dynamically load Razorpay checkout script
    if (!document.getElementById('razorpay-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Validate coupon when entered or when selected plan / billing cycle changes
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponValidating(true);
    setCouponError('');
    try {
      const res = await fetch('/api/vendor/subscription/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponInput.trim(),
          planCode: selectedPlanCode,
          billingCycle,
        }),
      });
      const resData = await res.json();
      if (!res.ok || !resData.valid) {
        setAppliedCoupon(null);
        setCouponError(resData.error || 'Invalid coupon code');
      } else {
        setAppliedCoupon(resData);
      }
    } catch (err: any) {
      setCouponError('Error validating coupon');
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  // Re-validate coupon if user changes plan or billing cycle
  useEffect(() => {
    if (appliedCoupon) {
      handleApplyCoupon();
    }
  }, [selectedPlanCode, billingCycle]);

  // Plans Catalog (DB or fallback)
  const plans = (data?.plans && data.plans.length > 0) ? data.plans : DEFAULT_PLANS;

  // Selected Plan Object
  const selectedPlan = plans.find((p: any) => p.code === selectedPlanCode) || plans[0];
  const isYearly = billingCycle === 'YEARLY';
  const rawPriceMinor = selectedPlan
    ? isYearly
      ? selectedPlan.priceYearlyMinor
      : selectedPlan.priceMonthlyMinor
    : 0;

  const discountMinor = appliedCoupon ? appliedCoupon.discountMinor : 0;
  const finalPriceMinor = Math.max(0, rawPriceMinor - discountMinor);
  const isFreeCheckout = finalPriceMinor === 0 || appliedCoupon?.isFreePass;

  // Handle Checkout / Activation
  const handleProceedCheckout = async () => {
    setCheckoutLoading(true);
    setSuccessMessage('');
    try {
      const res = await fetch('/api/vendor/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode: selectedPlanCode,
          billingCycle,
          couponCode: appliedCoupon?.code || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Checkout initiation failed');

      // If Free activation (100% off or free voucher)
      if (resData.activated) {
        setSuccessMessage(resData.message || 'Subscription activated successfully!');
        loadSubscriptionData();
        return;
      }

      // If Razorpay payment required
      const { razorpayOrder } = resData;
      if (!razorpayOrder) throw new Error('Payment gateway order missing');

      if (razorpayOrder.isMock) {
        // Mock gateway verification for sandbox
        const verifyRes = await fetch('/api/vendor/subscription/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpayOrderId: razorpayOrder.orderId,
            razorpayPaymentId: `pay_mock_${Date.now()}`,
            razorpaySignature: 'mock_signature_valid',
            planCode: selectedPlanCode,
            billingCycle,
            couponCode: appliedCoupon?.code,
            originalPriceMinor: rawPriceMinor,
            discountMinor,
            finalAmountMinor: finalPriceMinor,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');
        setSuccessMessage(verifyData.message || 'Subscription renewed successfully!');
        loadSubscriptionData();
        return;
      }

      // Real Razorpay Checkout Modal
      const options = {
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amountMinor,
        currency: razorpayOrder.currency,
        name: 'Print2Me SaaS Platform',
        description: `${selectedPlan?.name || 'SaaS Plan'} (${billingCycle})`,
        order_id: razorpayOrder.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/vendor/subscription/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planCode: selectedPlanCode,
                billingCycle,
                couponCode: appliedCoupon?.code,
                originalPriceMinor: rawPriceMinor,
                discountMinor,
                finalAmountMinor: finalPriceMinor,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');
            setSuccessMessage(verifyData.message || 'Subscription renewed successfully!');
            loadSubscriptionData();
          } catch (vErr: any) {
            alert(vErr.message || 'Verification failed');
          }
        },
        theme: { color: '#0F172A' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-saffron motion-safe:animate-spin" />
        <p className="font-sora font-semibold text-ink text-sm">Loading plans…</p>
      </div>
    );
  }

  const sub = data?.subscription;
  const invoices = data?.invoices || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10 min-h-screen">
      {/* Back to Vendor Dashboard */}
      <div className="flex items-center justify-between">
        <Link
          href="/vendor"
          className="inline-flex items-center gap-2 text-xs font-bold text-ink-soft hover:text-ink transition-colors font-sora"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vendor Dashboard
        </Link>

        <span className="text-xs text-ink-soft font-mono">Store: {sub?.vendorName}</span>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-5 rounded-[24px] bg-success-tint border border-success/30 flex items-center gap-3 text-success shadow-sm">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div className="font-sora font-bold text-sm">{successMessage}</div>
        </div>
      )}

      {/* Current Subscription Status Card */}
      <div className="bg-surface p-6 md:p-8 rounded-[32px] border border-hairline shadow-ink-soft space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-hairline">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-16 bg-saffron-tint flex items-center justify-center text-saffron border border-saffron/20">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-sora font-semibold text-xs px-2.5 py-0.5 rounded-pill bg-ink text-white">
                  {sub?.planCode || 'TRIAL'}
                </span>
                {sub?.isActive ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-pill bg-success-tint text-success border border-success/20">
                    Active
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-pill bg-danger/10 text-danger border border-danger/20">
                    Expired / Inactive
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold font-sora text-ink">Store subscription status</h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-ink-soft font-semibold">Days remaining</div>
              <div className={`text-xl font-bold font-sora ${sub?.daysRemaining <= 3 ? 'text-danger' : 'text-success'}`}>
                {sub?.daysRemaining || 0} Days
              </div>
            </div>
            <div>
              <div className="text-xs text-ink-soft font-semibold">Valid until</div>
              <div className="text-xs font-bold font-sora text-ink mt-1">
                {sub?.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-IN') : 'Expired'}
              </div>
            </div>
          </div>
        </div>

        {sub?.isExpired && (
          <div className="p-4 rounded-[20px] bg-danger/10 border border-danger/30 flex items-center gap-3 text-xs text-danger font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>
              Your subscription is expired. Customer print uploads and counter auto-printing are currently blocked. Renew below to resume service instantly.
            </span>
          </div>
        )}
      </div>

      {/* Plan Selection Header & Billing Toggle */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-extrabold font-sora text-ink">Upgrade or Renew Your Plan</h2>
        <p className="text-ink-soft text-sm max-w-xl mx-auto">
          Choose a plan that fits your print station. Save with annual billing and apply promotion vouchers.
        </p>

        {/* Toggle Billing Period */}
        <div className="inline-flex items-center p-1.5 rounded-pill bg-surface border border-hairline shadow-sm">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-5 py-2 rounded-pill text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron ${
              billingCycle === 'MONTHLY' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            Monthly billing
          </button>
          <button
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-5 py-2 rounded-pill text-xs font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron ${
              billingCycle === 'YEARLY' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <span>Annual billing</span>
            <span className="px-2 py-0.5 rounded-pill text-xs bg-saffron text-ink font-bold">Save ~17%</span>
          </button>
        </div>
      </div>

      {/* Plans Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p: any) => {
          const isSelected = selectedPlanCode === p.code;
          const price = isYearly ? p.priceYearlyMinor : p.priceMonthlyMinor;

          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlanCode(p.code)}
              className={`p-6 rounded-24 border-2 transition-colors cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'border-saffron bg-surface shadow-ink-soft ring-2 ring-saffron/20'
                  : 'border-hairline bg-paper hover:bg-surface'
              }`}
            >
              {isSelected && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-pill bg-saffron text-ink text-xs font-semibold shadow-sm flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Selected plan
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-ink-soft">{p.code}</span>
                  <h3 className="text-xl font-bold font-sora text-ink mt-0.5">{p.name}</h3>
                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">{p.description}</p>
                </div>

                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-sora text-ink">{formatMinorToInr(price)}</span>
                    <span className="text-xs text-ink-soft">/{isYearly ? 'yr' : 'mo'}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-hairline space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-1.5 rounded-12 bg-success-tint border border-success/20 text-success">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span className="font-semibold text-xs">
                      Zero-touch automated printing
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-ink">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span>Up to <strong>{p.maxDevices}</strong> Counter Workstations</span>
                  </div>
                  <div className="flex items-center gap-2 text-ink">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span>
                      {p.maxOrdersPerMonth === -1 ? 'Unlimited Customer Orders' : `${p.maxOrdersPerMonth} orders / mo`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-ink">
                    {p.hasColorRouting ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <span className="w-4 h-4 text-ink-soft/40 shrink-0 text-center font-bold">-</span>
                    )}
                    <span className={p.hasColorRouting ? 'text-ink font-semibold' : 'text-ink-soft line-through'}>
                      B&W & Color Split-Routing
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-ink">
                    {p.hasPrioritySupport ? (
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    ) : (
                      <span className="w-4 h-4 text-ink-soft/40 shrink-0 text-center font-bold">-</span>
                    )}
                    <span className={p.hasPrioritySupport ? 'text-ink font-semibold' : 'text-ink-soft'}>
                      Priority Kiosk Support
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-hairline">
                <Button
                  variant={isSelected ? 'primary' : 'outline'}
                  className="w-full h-9 rounded-pill text-xs font-bold"
                >
                  {isSelected ? '✓ Selected' : 'Choose Plan'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coupon & Checkout Summary Card */}
      <div className="bg-surface p-6 md:p-8 rounded-[32px] border border-hairline shadow-ink-soft space-y-6">
        <h3 className="font-sora font-extrabold text-xl text-ink">Checkout Summary & Promotion</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left: Coupon Code Input */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-ink block">Have a coupon or voucher code?</label>

            {!appliedCoupon ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="e.g. WELCOME50 or PRINT2ME30"
                      className="w-full pl-9 pr-3 py-2.5 rounded-12 bg-paper border border-hairline text-ink text-xs font-bold placeholder:font-normal placeholder:text-ink-soft/60 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-colors"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleApplyCoupon}
                    disabled={couponValidating || !couponInput.trim()}
                    className="rounded-12 px-4 text-xs font-semibold h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  >
                    {couponValidating ? 'Checking…' : 'Apply code'}
                  </Button>
                </div>

                {couponError && (
                  <p className="text-xs text-danger font-medium flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {couponError}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs text-ink-soft">Available codes:</span>
                  <button
                    type="button"
                    onClick={() => { setCouponInput('WELCOME50'); }}
                    className="text-xs font-semibold text-saffron bg-saffron-tint px-2 py-0.5 rounded-pill hover:bg-saffron/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  >
                    WELCOME50
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCouponInput('PRINT2ME30'); }}
                    className="text-xs font-semibold text-success bg-success-tint px-2 py-0.5 rounded-pill hover:bg-success/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  >
                    PRINT2ME30
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCouponInput('FLAT200'); }}
                    className="text-xs font-semibold text-ink bg-paper border border-hairline px-2 py-0.5 rounded-pill hover:bg-hairline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  >
                    FLAT200
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-success-tint border border-success/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-success" />
                    <span className="font-mono font-extrabold text-sm text-success">{appliedCoupon.code}</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-1">{appliedCoupon.message}</p>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-xs font-bold text-danger hover:underline ml-4"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Right: Price Breakdown & Action */}
          <div className="p-6 rounded-2xl bg-paper border border-hairline space-y-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-ink-soft">
                <span>Selected Plan:</span>
                <span className="font-bold text-ink">{selectedPlan?.name} ({billingCycle})</span>
              </div>
              <div className="flex justify-between text-ink-soft">
                <span>Original Price:</span>
                <span className="font-bold text-ink">{formatMinorToInr(rawPriceMinor)}</span>
              </div>

              {discountMinor > 0 && (
                <div className="flex justify-between text-success font-semibold">
                  <span>Coupon Discount ({appliedCoupon?.code}):</span>
                  <span>- {formatMinorToInr(discountMinor)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-hairline flex justify-between items-baseline">
                <span className="text-sm font-bold text-ink font-sora">Final Amount to Pay:</span>
                <span className="text-2xl font-extrabold font-sora text-ink">
                  {isFreeCheckout ? 'FREE (₹0)' : formatMinorToInr(finalPriceMinor)}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              disabled={checkoutLoading}
              onClick={handleProceedCheckout}
              className="w-full h-11 text-sm font-bold rounded-xl mt-4"
            >
              {checkoutLoading
                ? 'Processing...'
                : isFreeCheckout
                ? '🎁 Activate Free Subscription Now'
                : `Pay ${formatMinorToInr(finalPriceMinor)} with Razorpay`}
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice History Table */}
      {invoices.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-sora font-extrabold text-xl text-ink">Billing & Invoice History</h3>
          <div className="overflow-x-auto rounded-[24px] border border-hairline">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-paper border-b border-hairline text-ink-soft font-semibold text-xs">
                  <th className="py-3 px-4">Invoice date</th>
                  <th className="py-3 px-4">Plan &amp; cycle</th>
                  <th className="py-3 px-4">Discount applied</th>
                  <th className="py-3 px-4">Amount paid</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface text-xs">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-paper">
                    <td className="py-3 px-4 text-ink-soft">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-ink">{inv.plan?.name || 'SaaS Plan'}</span>
                      <span className="text-ink-soft ml-1.5">({inv.billingCycle})</span>
                    </td>
                    <td className="py-3 px-4 text-success font-semibold">
                      {inv.couponCode ? `${inv.couponCode} (-${formatMinorToInr(inv.discountMinor)})` : 'None'}
                    </td>
                    <td className="py-3 px-4 font-bold text-ink">
                      {formatMinorToInr(inv.finalAmountMinor)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-pill text-xs font-semibold bg-success-tint text-success border border-success/20">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
