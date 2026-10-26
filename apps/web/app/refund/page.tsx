import type { Metadata } from 'next';
import Link from 'next/link';
import { IndianRupee, RefreshCcw, CheckCircle2, Clock, AlertTriangle, Mail } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy – Print2Me (print2me.in)',
  description:
    'Our transparent refund policy: automated refunds for failed online print jobs, cancellation window before spooling, and merchant dispute resolution.',
  alternates: {
    canonical: '/refund',
  },
};

export default function RefundPolicyPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://print2me.in' },
      { '@type': 'ListItem', position: 2, name: 'Refund Policy', item: 'https://print2me.in/refund' },
    ],
  };

  return (
    <div className="py-12 px-4 sm:px-6 max-w-5xl mx-auto space-y-12">
      <JsonLd data={breadcrumbSchema} />

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-paper border border-hairline text-ink-soft text-xs font-bold uppercase tracking-wider">
          <RefreshCcw className="w-3.5 h-3.5 text-success" />
          Buyer &amp; Merchant Protection
        </div>
        <h1 className="text-3xl sm:text-5xl font-sora font-extrabold text-ink tracking-tight">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="text-ink-soft max-w-2xl mx-auto text-sm sm:text-base">
          Clear, fair, and automated refund guidelines for online print orders placed across Print2Me partner stores.
        </p>
      </div>

      {/* Policy Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3">
          <div className="w-10 h-10 rounded-full bg-success-tint text-success flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">Failed Print Refund</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            If an online paid order fails to spool or cannot be completed due to printer hardware breakdown, an automatic full refund is credited back to your original payment method.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3">
          <div className="w-10 h-10 rounded-full bg-saffron-tint text-saffron flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">Instant Pre-Print Cancellation</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            Customers can cancel their order on their live tracking screen at any moment before the print job begins spooling or processing at the vendor workstation.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3">
          <div className="w-10 h-10 rounded-full bg-paper text-ink flex items-center justify-center font-bold border border-hairline">
            <IndianRupee className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">3 to 5 Day Settlement</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            UPI, debit card, and net banking refunds are processed via Razorpay and typically reflect in your bank account within 3 to 5 business days.
          </p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="bg-surface p-8 sm:p-10 rounded-[28px] border border-hairline shadow-ink-soft space-y-8 text-sm text-ink leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-sora font-bold text-ink">1. When Are Refunds Issued?</h2>
          <p className="text-ink-soft">
            Refunds are eligible under the following specific circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-soft">
            <li><strong>Technical Printing Failure:</strong> The vendor workstation agent is offline or encounters an unrecoverable spooler error.</li>
            <li><strong>Vendor Order Rejection:</strong> The vendor declines the order due to out-of-paper or ink stock shortages.</li>
            <li><strong>Customer Pre-Spool Cancellation:</strong> The order was cancelled by the customer before the vendor accepted or claimed the print job.</li>
            <li><strong>Duplicate Payment:</strong> Multiple debits caused by network dropouts during gateway redirection.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-sora font-bold text-ink">2. Non-Refundable Scenarios</h2>
          <p className="text-ink-soft">
            Refunds cannot be granted once a document has physically printed cleanly and correctly matching the customer&apos;s specified page range, duplex selection, and color preference. Customers are encouraged to verify preview details and page ranges before confirming payment.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-sora font-bold text-ink">3. Cash on Desk Orders</h2>
          <p className="text-ink-soft">
            For orders where the customer selects &quot;Pay Cash at Counter&quot;, payment is transacted physically in person. No electronic refund is necessary as no online funds were charged.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-sora font-bold text-ink">4. How to Request a Refund</h2>
          <p className="text-ink-soft">
            If your order failed or you believe you were incorrectly charged, you can raise an immediate resolution request:
          </p>
          <div className="p-4 rounded-14 bg-paper border border-hairline space-y-2">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <Mail className="w-4 h-4 text-saffron shrink-0" />
              Email: <a href="mailto:support@print2me.in" className="text-saffron hover:underline">support@print2me.in</a>
            </div>
            <p className="text-xs text-ink-soft">
              Please include your <strong>Order Tracking Reference (e.g. ORD-...)</strong> and payment screenshot for expedited resolution within 24 hours.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
