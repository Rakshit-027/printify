// hallmark:v1 theme=sticker shape=workbench density=balanced
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Lock, ShieldCheck, AlertCircle, RefreshCw, ChevronLeft, Sparkles } from 'lucide-react';
import { formatMinorToInr } from '@/lib/pricing-engine';
import { Button } from '@/components/primitives';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PayTokenPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function initPayment() {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/payments/razorpay/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingToken: token, token }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to initialize payment');
        }

        setPaymentData(data);
      } catch (err: any) {
        setError(err.message || 'Payment initiation failed.');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      initPayment();
    }
  }, [token]);

  const handleLaunchRazorpay = async () => {
    if (!paymentData) return;
    setIsProcessing(true);
    setError('');

    try {
      // Load Razorpay checkout script if not present
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: paymentData.razorpayKeyId || paymentData.keyId,
        amount: paymentData.amountMinor,
        currency: 'INR',
        name: paymentData.vendorName || 'Print2Me',
        description: `Order ${paymentData.orderNumber}`,
        order_id: paymentData.razorpayOrderId,
        prefill: {
          name: paymentData.customerName || 'Customer',
          email: paymentData.customerEmail || 'orders@print2me.in',
          contact: paymentData.customerPhone || '+919999999999',
        },
        readonly: {
          contact: true,
          email: true,
          name: true,
        },
        theme: {
          color: '#FF8A1F',
        },
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
            if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');

            router.push(`/track/${token}`);
          } catch (verifyErr: any) {
            setError(verifyErr.message || 'Payment verification failed.');
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        setError(resp.error?.description || 'Payment failed. Please try again.');
        setIsProcessing(false);
      });
      rzp.open();
    } catch (launchErr: any) {
      setError(launchErr.message || 'Failed to open checkout window.');
      setIsProcessing(false);
    }
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const verifyRes = await fetch('/api/payments/razorpay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingToken: token,
          razorpayOrderId: paymentData.razorpayOrderId,
          razorpayPaymentId: `pay_sim_${Date.now()}`,
          razorpaySignature: 'simulated_signature_development',
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 text-ink">
        <RefreshCw className="w-8 h-8 text-saffron motion-safe:animate-spin" />
        <p className="text-xs text-ink-soft">Opening secure gateway…</p>
      </div>
    );
  }

  if (error && !paymentData) {
    const isCashOrder = error.toLowerCase().includes('cash') || error.toLowerCase().includes('counter');
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center space-y-4 text-ink">
        <AlertCircle className="w-10 h-10 text-saffron mx-auto" />
        <h2 className="text-lg font-bold text-ink">
          {isCashOrder ? 'Pay at counter' : 'Online payment unavailable'}
        </h2>
        <p className="text-xs text-ink-soft">{error}</p>
        <div className="pt-2">
          <Link
            href={`/track/${token}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-pill bg-saffron text-ink font-semibold text-xs shadow-sm hover:brightness-105 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
          >
            Go to order ticket &amp; pay at desk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-12 md:py-16 space-y-4 text-ink">
      <Link
        href={`/track/${token}`}
        className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to order tracking</span>
      </Link>

      <div className="bg-surface p-6 sm:p-8 rounded-24 border border-hairline shadow-ink-soft space-y-5">
        <div className="text-center space-y-1.5">
          <div className="w-10 h-10 rounded-16 bg-saffron-tint text-saffron flex items-center justify-center mx-auto">
            <CreditCard className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Checkout</h1>
          <p className="text-xs text-ink-soft">Order reference: {paymentData.orderNumber}</p>
        </div>

        {error && (
          <div className="p-3 rounded-14 bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-4 rounded-16 bg-paper border border-hairline space-y-2">
          <div className="flex justify-between text-xs text-ink-soft">
            <span>Vendor:</span>
            <span className="font-semibold text-ink">{paymentData.vendorName}</span>
          </div>
          <div className="flex justify-between text-xs text-ink-soft">
            <span>Payment mode:</span>
            <span className="font-semibold text-success">UPI / Cards / Netbanking</span>
          </div>
          <div className="pt-2 border-t border-hairline flex justify-between items-center">
            <span className="text-xs font-bold text-ink">Payable total:</span>
            <span className="text-xl font-extrabold text-ink font-sora">
              ₹{formatMinorToInr(paymentData.amountMinor)}
            </span>
          </div>
        </div>

        <Button
          onClick={handleLaunchRazorpay}
          disabled={isProcessing}
          variant="primary"
          className="w-full h-12 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
        >
          {isProcessing ? (
            <span className="inline-block motion-safe:animate-spin rounded-full h-4 w-4 border-2 border-ink border-t-transparent" />
          ) : (
            <div className="flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Pay ₹{formatMinorToInr(paymentData.amountMinor)} via Razorpay</span>
            </div>
          )}
        </Button>

        {/* Development sandbox simulation button */}
        {paymentData.isMock && (
          <div className="pt-3 border-t border-hairline text-center space-y-2">
            <div className="text-xs text-ink-soft font-semibold">
              Sandbox test mode
            </div>
            <button
              onClick={handleSimulatePayment}
              disabled={isProcessing}
              className="w-full py-2 rounded-12 bg-paper hover:bg-hairline text-ink text-xs font-semibold border border-hairline transition-colors flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <Sparkles className="w-3.5 h-3.5 text-saffron" />
              <span>Simulate payment</span>
            </button>
          </div>
        )}

        <div className="space-y-1.5 pt-1 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-ink-soft">
            <ShieldCheck className="w-3.5 h-3.5 text-success" />
            <span>256-bit SSL encrypted Razorpay gateway</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-ink-soft">
            <Link href="/privacy" target="_blank" className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">Privacy policy</Link>
            <Link href="/terms" target="_blank" className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">Terms</Link>
            <Link href="/refund" target="_blank" className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">Refund policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
