'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Tag,
  Check,
  Zap,
  Printer,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { formatMinorToInr } from '@/lib/pricing-engine';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: any;
  onSubscriptionUpdated?: () => void;
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
    hasAutoPrint: true,
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
    hasAutoPrint: true,
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
    hasAutoPrint: true,
  },
];

export function VendorSubscriptionModal({
  isOpen,
  onClose,
  vendor,
  onSubscriptionUpdated,
}: SubscriptionModalProps) {
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>(vendor?.subscriptionPlan || 'PRO');
  const [plans, setPlans] = useState<any[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  // Checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Load Razorpay script if not loaded
    if (!document.getElementById('razorpay-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Fetch dynamic catalog from server
    fetchPlans();
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vendor/subscription');
      if (res.ok) {
        const json = await res.json();
        if (json.plans && json.plans.length > 0) {
          setPlans(json.plans);
        }
      }
    } catch {
      // Keep default plans on network glitch
    } finally {
      setLoading(false);
    }
  };

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
        setCouponError(resData.error || 'Invalid or expired coupon code');
      } else {
        setAppliedCoupon(resData);
      }
    } catch {
      setCouponError('Error validating coupon code');
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  const selectedPlan = plans.find((p) => p.code === selectedPlanCode) || plans[0];
  const isYearly = billingCycle === 'YEARLY';
  const rawPriceMinor = selectedPlan
    ? isYearly
      ? selectedPlan.priceYearlyMinor
      : selectedPlan.priceMonthlyMinor
    : 0;

  const discountMinor = appliedCoupon ? appliedCoupon.discountMinor : 0;
  const finalPriceMinor = Math.max(0, rawPriceMinor - discountMinor);
  const isFreeCheckout = finalPriceMinor === 0 || appliedCoupon?.isFreePass;

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
          couponCode: appliedCoupon?.code || (couponInput.trim() || undefined),
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Checkout failed');

      // Free Activation (Coupon 100% or VIP voucher)
      if (resData.activated) {
        setSuccessMessage(`🎉 ${selectedPlanCode} subscription activated successfully!`);
        if (onSubscriptionUpdated) onSubscriptionUpdated();
        setTimeout(() => {
          onClose();
        }, 1500);
        return;
      }

      const { razorpayOrder } = resData;
      const orderId = razorpayOrder?.orderId || resData.razorpayOrderId;
      const keyId = razorpayOrder?.keyId || resData.keyId;

      if (!orderId) throw new Error('Payment gateway order missing');

      // If Razorpay checkout script is loaded, open popup
      if (typeof window !== 'undefined' && window.Razorpay) {
        const options = {
          key: keyId,
          amount: finalPriceMinor,
          currency: 'INR',
          name: 'Print2Me SaaS Platform',
          description: `${selectedPlan.name} (${billingCycle})`,
          order_id: orderId,
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
              setSuccessMessage('🎉 Payment Completed! Subscription renewed successfully.');
              if (onSubscriptionUpdated) onSubscriptionUpdated();
              setTimeout(() => {
                onClose();
              }, 1500);
            } catch (vErr: any) {
              alert(vErr.message || 'Payment verification failed');
            }
          },
          prefill: {
            name: vendor?.name || 'Store Owner',
            contact: vendor?.contactPhone || '9999999999',
          },
          theme: { color: '#0F172A' },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert('Payment gateway is loading. Please try again in a moment.');
      }
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-4xl rounded-[32px] border border-hairline shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-6 md:p-8 border-b border-hairline flex items-center justify-between bg-paper/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-extrabold font-sora text-ink">
                  Store Subscription & Auto-Print Plans
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
                  ● {vendor?.isSubscriptionActive !== false ? 'Active' : 'Expired'}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Zero-Touch Auto-Printing included in all tiers • Activate customer self-service print kiosks
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-paper hover:bg-surface border border-hairline flex items-center justify-center text-ink-soft hover:text-ink transition-all shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          {successMessage && (
            <div className="p-4 rounded-2xl bg-success-tint border border-success/30 flex items-center gap-3 text-success font-sora font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Billing Cycle Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-paper border border-hairline">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-soft">Billing Period</span>
              <p className="text-xs text-ink-soft mt-0.5">Choose monthly flexibility or save 17% with annual commitment.</p>
            </div>

            <div className="inline-flex items-center p-1 rounded-full bg-surface border border-hairline shadow-sm">
              <button
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  billingCycle === 'MONTHLY' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === 'YEARLY' ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink'
                }`}
              >
                <span>Annual</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-saffron text-ink font-extrabold">Save 17%</span>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => {
              const isSelected = selectedPlanCode === p.code;
              const price = isYearly ? p.priceYearlyMinor : p.priceMonthlyMinor;

              return (
                <div
                  key={p.code}
                  onClick={() => setSelectedPlanCode(p.code)}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-saffron bg-surface shadow-md ring-2 ring-saffron/20'
                      : 'border-hairline bg-paper/60 hover:bg-surface'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-saffron text-ink text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Selected
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-soft">{p.code}</span>
                        {p.code === 'PRO' && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                            Most Popular
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold font-sora text-ink mt-0.5">{p.name}</h3>
                      <p className="text-xs text-ink-soft mt-1 leading-relaxed line-clamp-2">{p.description}</p>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black font-sora text-ink">{formatMinorToInr(price)}</span>
                        <span className="text-xs text-ink-soft">/{isYearly ? 'yr' : 'mo'}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-hairline space-y-2 text-xs">
                      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-success/10 border border-success/20 text-success">
                        <Zap className="w-3.5 h-3.5 text-success fill-success/20 shrink-0" />
                        <span className="font-extrabold text-[10px] uppercase tracking-wide">
                          ⚡ Zero-Touch Auto-Printing
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-ink text-[11px]">
                        <Printer className="w-3.5 h-3.5 text-ink-soft shrink-0" />
                        <span>Up to {p.maxDevices ?? p.deviceLimit ?? 2} Connected Print Desktops</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-ink-soft shrink-0" />
                        <span>{p.maxOrdersPerMonth === -1 ? 'Unlimited print jobs' : `${(p.maxOrdersPerMonth ?? p.quotaLimit ?? 1000).toLocaleString()} jobs/mo`}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coupon Code Section */}
          <div className="p-4 rounded-2xl bg-paper border border-hairline flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-saffron/15 text-saffron flex items-center justify-center font-bold">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-ink">Have a Promo Coupon or VIP Pass?</span>
                <p className="text-[11px] text-ink-soft">Apply vouchers like WELCOME50, VIPSTORE for instant discounts.</p>
              </div>
            </div>

            {appliedCoupon ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-success/10 border border-success/30 text-success text-xs font-bold">
                <Check className="w-4 h-4" />
                <span>
                  {appliedCoupon.coupon?.code} ({appliedCoupon.isFreePass ? '100% Free VIP Pass' : `-${formatMinorToInr(discountMinor)}`})
                </span>
                <button
                  onClick={handleRemoveCoupon}
                  className="ml-2 text-danger hover:underline text-[10px]"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Enter Coupon Code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="px-3.5 py-2 rounded-xl bg-surface border border-hairline text-xs font-bold uppercase tracking-wider text-ink focus:outline-none focus:border-ink w-44"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponValidating || !couponInput.trim()}
                  className="px-4 py-2 rounded-xl bg-ink text-white text-xs font-bold hover:bg-ink/90 transition-all disabled:opacity-50"
                >
                  {couponValidating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                </button>
              </div>
            )}
          </div>

          {couponError && (
            <p className="text-xs text-danger font-medium -mt-3">{couponError}</p>
          )}

          {/* Price Breakdown & Checkout Action Bar */}
          <div className="p-5 rounded-2xl bg-surface border border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="text-xs text-ink-soft font-bold uppercase tracking-wider">
                Total Payable ({selectedPlan.name} • {billingCycle})
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black font-sora text-ink">
                  {formatMinorToInr(finalPriceMinor)}
                </span>
                {discountMinor > 0 && (
                  <span className="text-xs line-through text-ink-soft">
                    {formatMinorToInr(rawPriceMinor)}
                  </span>
                )}
                {isFreeCheckout && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-success/20 text-success font-extrabold uppercase">
                    Free VIP Pass
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleProceedCheckout}
              disabled={checkoutLoading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sora font-extrabold text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {checkoutLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isFreeCheckout ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Activate 100% Free Store Pass
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Proceed to Pay {formatMinorToInr(finalPriceMinor)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
