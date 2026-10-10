'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  ShieldCheck,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  Lock,
  Sparkles,
} from 'lucide-react';
import { formatMinorToInr } from '@/lib/pricing-engine';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Payment Info
  useEffect(() => {
    async function initPayment() {
      try {
        setLoading(true);
        const res = await fetch('/api/payments/razorpay/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingToken: token }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to initialize payment');
        setPaymentData(data);
      } catch (err: any) {
        setError(err.message || 'Error loading payment gateway');
      } finally {
        setLoading(false);
      }
    }

    if (token) initPayment();
  }, [token]);

  // Dynamically load Razorpay checkout script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleLaunchRazorpay = async () => {
    setIsProcessing(true);
    setError('');

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError('Could not connect to Razorpay secure checkout script.');
      setIsProcessing(false);
      return;
    }

    const options = {
      key: paymentData.razorpayKeyId,
      amount: paymentData.amountMinor,
      currency: paymentData.currency || 'INR',
      name: paymentData.vendorName || 'PrintFlow Station',
      description: `Payment for Print Order ${paymentData.orderNumber}`,
      order_id: paymentData.razorpayOrderId,
      handler: async function (response: any) {
        try {
          const verifyRes = await fetch('/api/payments/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trackingToken: token,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            throw new Error(verifyData.error || 'Payment signature verification failed');
          }

          router.push(`/track/${token}`);
        } catch (verifyErr: any) {
          setError(verifyErr.message || 'Payment verification failed.');
        }
      },
      prefill: {
        name: 'Guest Customer',
        contact: '9876543210',
      },
      theme: {
        color: '#10b981',
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (failureRes: any) {
      setError(`Payment Failed: ${failureRes.error?.description || 'Transaction declined'}`);
      setIsProcessing(false);
    });
    rzp.open();
    setIsProcessing(false);
  };

  // Sandbox simulation handler
  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      const mockPaymentId = `pay_sim_${Date.now()}`;
      const verifyRes = await fetch('/api/payments/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingToken: token,
          razorpayOrderId: paymentData.razorpayOrderId,
          razorpayPaymentId: mockPaymentId,
          razorpaySignature: 'simulated_signature',
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');
      router.push(`/track/${token}`);
    } catch (simErr: any) {
      setError(simErr.message || 'Simulation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <p className="text-sm text-slate-400">Opening Secure Razorpay Gateway...</p>
      </div>
    );
  }

  if (error && !paymentData) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Payment Unavailable</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <Link href={`/track/${token}`} className="inline-block text-xs text-emerald-400 hover:underline">
          Return to Order Tracking
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12 md:py-16 space-y-6">
      <Link
        href={`/track/${token}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Order Tracking</span>
      </Link>

      <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center mx-auto text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <CreditCard className="w-6 h-6 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Razorpay Checkout</h1>
          <p className="text-xs text-slate-400">Order Reference: {paymentData.orderNumber}</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Vendor Merchant:</span>
            <span className="font-semibold text-white">{paymentData.vendorName}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>Payment Mode:</span>
            <span className="font-semibold text-emerald-400">UPI / Cards / Netbanking</span>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs font-bold text-white">Payable Total:</span>
            <span className="text-2xl font-extrabold text-emerald-400">
              ₹{formatMinorToInr(paymentData.amountMinor)}
            </span>
          </div>
        </div>

        <button
          onClick={handleLaunchRazorpay}
          disabled={isProcessing}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
          ) : (
            <>
              <Lock className="w-4 h-4 text-slate-950" />
              <span>Open Razorpay Modal</span>
            </>
          )}
        </button>

        {/* Development sandbox simulation button */}
        {paymentData.isMock && (
          <div className="pt-4 border-t border-slate-800 text-center space-y-2">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Sandbox Test Mode
            </div>
            <button
              onClick={handleSimulatePayment}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Simulate Successful Payment</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>256-Bit SSL Encrypted Razorpay Gateway</span>
        </div>
      </div>
    </div>
  );
}
