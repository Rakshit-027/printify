import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Globe, MapPin, Phone, MessageSquare, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
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
    <div className="py-12 px-4 sm:px-6 max-w-5xl mx-auto space-y-12">
      <JsonLd data={breadcrumbSchema} />

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-paper border border-hairline text-ink-soft text-xs font-bold uppercase tracking-wider">
          <MessageSquare className="w-3.5 h-3.5 text-saffron" />
          Always Here to Help
        </div>
        <h1 className="text-3xl sm:text-5xl font-sora font-extrabold text-ink tracking-tight">
          Contact Print2Me
        </h1>
        <p className="text-ink-soft max-w-2xl mx-auto text-sm sm:text-base">
          Have questions about your print job, need vendor onboarding assistance, or want to deploy Print2Me at your campus? We are ready to assist.
        </p>
      </div>

      {/* Direct Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3">
          <div className="w-10 h-10 rounded-full bg-saffron-tint text-saffron flex items-center justify-center font-bold">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">Customer Support</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            Order assistance, refund processing, and technical support:
          </p>
          <a
            href="mailto:support@print2me.in"
            className="inline-block text-sm font-bold text-saffron hover:underline"
          >
            support@print2me.in
          </a>
        </div>

        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Phone className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">Shop Partnerships</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            Fast-track onboarding for printing shops and college photocopy kiosks:
          </p>
          <Link
            href="/register-vendor"
            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:underline"
          >
            Register Store Online <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">Operating Hours</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            Platform Cloud: <strong>24/7 Operational</strong>
          </p>
          <p className="text-xs text-ink-soft">
            Support Desk: Mon - Sat, 09:00 AM - 08:00 PM IST
          </p>
        </div>
      </div>

      {/* Interactive Form Card */}
      <div className="bg-surface p-8 sm:p-12 rounded-[28px] border border-hairline shadow-ink-soft text-center space-y-6">
        <div className="max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-sora font-bold text-ink">Send Us a Direct Message</h2>
          <p className="text-xs sm:text-sm text-ink-soft">
            Fill in your details below and our team will get back to you promptly.
          </p>
        </div>

        <HomeContactForm />
      </div>
    </div>
  );
}
