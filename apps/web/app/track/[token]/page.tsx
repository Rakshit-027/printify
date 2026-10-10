'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  Printer,
  AlertCircle,
  RefreshCw,
  QrCode,
  XCircle,
  ChevronLeft,
  Smartphone,
  SunMoon
} from 'lucide-react';
import { formatMinorToInr } from '@/lib/pricing-engine';
import { Button } from '@/components/primitives';

export default function OrderTrackingPage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${token}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch order');
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Error tracking order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrder();
      const interval = setInterval(fetchOrder, 12000);
      return () => clearInterval(interval);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <RefreshCw className="w-10 h-10 text-saffron animate-spin mx-auto" />
        <p className="font-sora font-bold text-ink">Finding your order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <AlertCircle className="w-12 h-12 text-danger mb-4" />
        <h2 className="text-xl font-sora font-bold text-ink mb-2">Order Not Found</h2>
        <p className="text-sm text-ink-soft mb-6">{error || 'Invalid or expired tracking token.'}</p>
        <Link href="/">
          <Button variant="outline">Return Home</Button>
        </Link>
      </div>
    );
  }

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'AWAITING_PAYMENT':
      case 'AWAITING_VENDOR_APPROVAL': return 0;
      case 'CONFIRMED': return 1;
      case 'PROCESSING': return 2;
      case 'READY_FOR_PICKUP': 
      case 'COMPLETED': return 3;
      default: return -1;
    }
  };

  const currentStep = getStepIndex(order.status);
  const isReady = order.status === 'READY_FOR_PICKUP' || order.status === 'COMPLETED';
  const isTerminal = order.status === 'CANCELLED' || order.status === 'REJECTED';

  const steps = [
    { title: 'Order Placed', desc: 'Received by system', icon: Clock },
    { title: 'Confirmed', desc: 'Ready for print spooler', icon: CheckCircle2 },
    { title: 'Printing', desc: 'Processing locally', icon: Printer },
    { title: 'Ready', desc: 'Available at counter', icon: QrCode },
  ];

  return (
    <div className="min-h-screen pb-20 pt-6 px-4 max-w-md mx-auto">
      <Link href={`/v/${order.vendor.slug}`} className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors mb-6 font-medium">
        <ChevronLeft className="w-4 h-4" />
        Back to {order.vendor.name}
      </Link>

      {/* TICKET PLAQUE */}
      <div className={`ticket-card transition-colors duration-500 ${isReady ? 'bg-success-tint border-success/20' : ''}`}>
        <div className="ticket-notch-left" />
        <div className="ticket-notch-right" />
        
        <div className="p-8 text-center space-y-2">
          <div className={`text-xs font-bold uppercase tracking-widest ${isReady ? 'text-success' : 'text-ink-soft'}`}>
            {isReady ? 'Your prints are ready' : 'Pickup Token'}
          </div>
          <div className="font-mono text-5xl md:text-[56px] font-bold text-ink tracking-tight py-2 tabular-nums">
            {order.orderNumber}
          </div>
          <div className="text-sm font-medium text-ink-soft">
            {order.vendor.name}
          </div>
          {isReady && (
            <div className="absolute top-4 right-4 bg-success text-white text-[10px] font-bold uppercase px-2 py-1 rounded-pill animate-stamp shadow-sm rotate-12">
              Ready
            </div>
          )}
        </div>

        <div className="ticket-divider" />

        <div className="px-8 pb-8 flex items-end justify-between">
          <div className="space-y-1">
            <div className="text-xs text-ink-soft font-medium">Total Amount</div>
            <div className="font-sora font-bold text-2xl text-ink">
              ₹{formatMinorToInr(order.totalAmountMinor)}
            </div>
          </div>
          <div>
            <span className={`px-3 py-1.5 rounded-pill text-xs font-bold uppercase ${
              order.paymentMethod === 'RAZORPAY' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            }`}>
              {order.paymentMethod === 'RAZORPAY' ? 'Paid Online' : 'Cash Due'}
            </span>
          </div>
        </div>
      </div>

      {isTerminal ? (
        <div className="mt-6 bg-danger/10 border border-danger/20 rounded-[20px] p-5 flex items-start gap-4">
          <XCircle className="w-6 h-6 text-danger shrink-0 mt-0.5" />
          <div>
            <div className="font-sora font-bold text-ink">Order Cancelled</div>
            <p className="text-sm text-ink-soft mt-1">This print order has been cancelled or rejected.</p>
          </div>
        </div>
      ) : (
        <>
          {/* VERTICAL STATUS TIMELINE */}
          <div className="mt-8 bg-surface border border-hairline rounded-[24px] p-6 shadow-ink-soft">
            <h3 className="font-sora font-bold text-ink text-lg mb-6">Status</h3>
            <div className="relative pl-3 space-y-6">
              {/* Timeline line */}
              <div className="absolute left-[27px] top-4 bottom-4 w-px bg-hairline" />
              
              {steps.map((step, idx) => {
                const isPassed = currentStep > idx;
                const isCurrent = currentStep === idx;
                const StepIcon = step.icon;
                
                return (
                  <div key={idx} className="relative flex gap-4">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-surface transition-colors ${
                      isPassed ? 'border-success text-success bg-success-tint' 
                      : isCurrent ? 'border-saffron text-saffron bg-saffron-tint ring-4 ring-saffron/10' 
                      : 'border-hairline text-ink-soft'
                    }`}>
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <div className="pt-1.5">
                      <div className={`text-sm font-bold ${isPassed || isCurrent ? 'text-ink' : 'text-ink-soft'}`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-ink-soft mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {order.status === 'AWAITING_PAYMENT' && order.paymentMethod === 'RAZORPAY' && (
              <div className="mt-8 pt-6 border-t border-hairline">
                <Button variant="saffron" className="w-full text-base" onClick={() => router.push(`/pay/${token}`)}>
                  Pay ₹{formatMinorToInr(order.totalAmountMinor)} now
                </Button>
              </div>
            )}
          </div>
          
          <div className="mt-6 flex flex-col gap-3">
             <div className="bg-paper border border-hairline rounded-[16px] p-4 flex items-center gap-3 text-sm text-ink-soft">
               <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0 shadow-sm border border-hairline">
                 <SunMoon className="w-4 h-4" />
               </div>
               <span className="font-medium">Keep screen awake while in queue</span>
             </div>
             <div className="bg-paper border border-hairline rounded-[16px] p-4 flex items-center gap-3 text-sm text-ink-soft">
               <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0 shadow-sm border border-hairline">
                 <Smartphone className="w-4 h-4" />
               </div>
               <span className="font-medium">Leave this page open to track progress</span>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
