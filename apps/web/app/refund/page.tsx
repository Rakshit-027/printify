// hallmark:v1 theme=sticker shape=workbench density=balanced
import type { Metadata } from 'next';
import Link from 'next/link';
import { IndianRupee, RefreshCcw, CheckCircle2, Clock, Mail } from 'lucide-react';
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
    <div className="min-h-screen bg-paper pb-24 text-ink">
      <JsonLd data={[breadcrumbSchema]} />

      {/* Header */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto text-center">
        <h1 className="font-sora text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          Refund and cancellation policy
        </h1>
        <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Automated refunds for failed print jobs and pre-print cancellation guidelines.
        </p>
      </section>

      {/* Policy Highlights Cards */}
      <section className="px-6 max-w-5xl mx-auto mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft space-y-2.5">
            <div className="w-10 h-10 rounded-16 bg-success-tint text-success flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-sora font-bold text-ink text-base">Failed print refund</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              If an online paid order cannot be spooled due to hardware issues, a full reversal is initiated automatically to your original account.
            </p>
          </div>

          <div className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft space-y-2.5">
            <div className="w-10 h-10 rounded-16 bg-saffron-tint text-saffron flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-sora font-bold text-ink text-base">Pre-print cancellation</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Customers can cancel an order on the live tracking screen at any moment before the print job begins spooling at the vendor workstation.
            </p>
          </div>

          <div className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft space-y-2.5">
            <div className="w-10 h-10 rounded-16 bg-paper text-ink flex items-center justify-center font-bold border border-hairline">
              <IndianRupee className="w-5 h-5" />
            </div>
            <h3 className="font-sora font-bold text-ink text-base">3 to 5 day settlement</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              UPI, debit card, and net banking reversals are settled via Razorpay and typically reflect in your bank account in 3 to 5 business days.
            </p>
          </div>
        </div>
      </section>

      {/* Detailed Sections */}
      <section className="px-6 max-w-4xl mx-auto">
        <div className="bg-surface p-6 sm:p-10 rounded-24 border border-hairline shadow-ink-soft space-y-6 text-sm text-ink leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">1. When refunds apply</h2>
            <p className="text-ink-soft">
              Refunds are eligible under the following specific circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-ink-soft">
              <li><strong>Technical printing failure:</strong> The shop workstation client is offline or encounters an unrecoverable spooler error.</li>
              <li><strong>Vendor order rejection:</strong> The vendor declines the order due to out-of-paper or ink shortages.</li>
              <li><strong>Customer pre-spool cancellation:</strong> The order was cancelled by the customer before the vendor claimed the print job.</li>
              <li><strong>Duplicate payment:</strong> Multiple debits caused by network dropouts during gateway redirection.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">2. Non-refundable scenarios</h2>
            <p className="text-ink-soft">
              Refunds cannot be granted once a document has physically printed matching the customer&apos;s specified page range, duplex selection, and color preference. Customers are encouraged to verify preview details before confirming payment.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">3. Cash on desk orders</h2>
            <p className="text-ink-soft">
              For orders where the customer selects &quot;Pay Cash at Counter&quot;, payment is transacted physically in person. No electronic refund is necessary as no online funds were charged.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">4. How to request resolution</h2>
            <p className="text-ink-soft">
              If your order failed or you believe you were incorrectly charged, reach out to our desk:
            </p>
            <div className="p-4 rounded-16 bg-paper border border-hairline space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-ink text-xs">
                <Mail className="w-4 h-4 text-saffron shrink-0" />
                <span>Email: </span>
                <a
                  href="mailto:support@print2me.in"
                  className="text-saffron hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
                >
                  support@print2me.in
                </a>
              </div>
              <p className="text-xs text-ink-soft">
                Please include your Order Tracking Reference (e.g. ORD-...) for expedited resolution within 24 hours.
              </p>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
