// hallmark:v1 theme=sticker shape=workbench density=balanced
import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Phone, Clock, ArrowRight } from 'lucide-react';
import { HomeContactForm } from '@/components/HomeContactForm';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Contact Us & Support – Print2Me (print2me.in)',
  description:
    'Need help with an online print order or interested in onboarding your print shop? Get in touch with the Print2Me team at support@print2me.in.',
  alternates: {
    canonical: '/contact',
  },
};

export default function ContactPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://print2me.in' },
      { '@type': 'ListItem', position: 2, name: 'Contact Us', item: 'https://print2me.in/contact' },
    ],
  };

  return (
    <div className="min-h-screen bg-paper pb-24 text-ink">
      <JsonLd data={[breadcrumbSchema]} />

      {/* Header */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto text-center">
        <h1 className="font-sora text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          Contact Print2Me support
        </h1>
        <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Get assistance with orders, shop onboarding, or campus kiosk inquiries.
        </p>
      </section>

      {/* Direct Contact Cards */}
      <section className="px-6 max-w-5xl mx-auto mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft space-y-2.5">
            <div className="w-10 h-10 rounded-16 bg-saffron-tint text-saffron flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-sora font-bold text-ink text-base">Customer support</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Order status, refund requests, and user help:
            </p>
            <a
              href="mailto:support@print2me.in"
              className="inline-block text-xs font-semibold text-saffron hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
            >
              support@print2me.in
            </a>
          </div>

          <div className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft space-y-2.5">
            <div className="w-10 h-10 rounded-16 bg-success-tint text-success flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="font-sora font-bold text-ink text-base">Shop partnerships</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Onboarding assistance for print shops and college xerox counters:
            </p>
            <Link
              href="/register-vendor"
              className="inline-flex items-center gap-1 text-xs font-semibold text-success hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
            >
              <span>Register store online</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft space-y-2.5">
            <div className="w-10 h-10 rounded-16 bg-paper border border-hairline text-ink flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-sora font-bold text-ink text-base">Operating hours</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Platform cloud: 24/7 automated queues
            </p>
            <p className="text-xs text-ink-soft">
              Support desk: Mon to Sat, 09:00 AM to 08:00 PM IST
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Form Card */}
      <section className="px-6 max-w-4xl mx-auto">
        <div className="bg-surface p-6 sm:p-10 rounded-24 border border-hairline shadow-ink-soft space-y-6">
          <div className="max-w-xl space-y-1">
            <h2 className="text-xl font-sora font-bold text-ink">Send a message</h2>
            <p className="text-xs text-ink-soft">
              Provide your details and order reference if applicable.
            </p>
          </div>

          <HomeContactForm />
        </div>
      </section>
    </div>
  );
}
