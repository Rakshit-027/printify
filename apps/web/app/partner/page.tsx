import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Store,
  Printer,
  QrCode,
  CheckCircle2,
  Zap,
  ShieldCheck,
  TrendingUp,
  Laptop,
  ArrowRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/primitives';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Partner Your Print Shop – Modern Print Kiosks & Orders | Print2Me',
  description:
    'Modernize your print shop with Print2Me. Eliminate USB drives, receive automated print jobs on your Windows spooler, and collect online UPI payments. Free setup.',
  alternates: {
    canonical: '/partner',
  },
  openGraph: {
    title: 'Partner Your Print Shop – Modern Print Kiosks & Orders | Print2Me',
    description:
      'Transform your xerox counter with QR code ordering, automated Windows print spooling, and instant customer payments.',
    url: 'https://print2me.in/partner',
    type: 'website',
  },
};

export default function PartnerPage() {
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://print2me.in',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Partner Your Print Shop',
        item: 'https://print2me.in/partner',
      },
    ],
  };

  const benefits = [
    {
      icon: <QrCode className="w-6 h-6 text-saffron" />,
      title: 'Free Custom Counter Standee',
      desc: 'We provide you with a high-resolution, branded QR standee customized specifically for your print store. Customers scan and order without crowding your desk.',
    },
    {
      icon: <Laptop className="w-6 h-6 text-emerald-600" />,
      title: 'Windows Print Spooler Agent',
      desc: 'Our lightweight Windows desktop app syncs in the background. It reads jobs in real time and submits them directly to your existing USB or network printers.',
    },
    {
      icon: <Zap className="w-6 h-6 text-blue-600" />,
      title: '3x Faster Counter Turnaround',
      desc: 'Stop wasting 5 minutes per customer opening emails, downloading WhatsApp PDFs, and asking "single or double sided?". Customer orders arrive pre-configured.',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-purple-600" />,
      title: 'Direct Bank Settlement & Cash',
      desc: 'Receive digital payments directly via UPI/Razorpay straight to your bank, or allow cash on desk collection if your walk-ins prefer paper currency.',
    },
  ];

  const steps = [
    {
      step: 'Step 1',
      title: 'Register Your Shop Online',
      desc: 'Enter your business name, address, contact details, and base pricing matrix for A4/A3 prints. Takes 2 minutes.',
    },
    {
      step: 'Step 2',
      title: 'Print Your QR Counter Standee',
      desc: 'Download your ready-to-print SVG/PDF standee artwork from your vendor portal and place it on your counter.',
    },
    {
      step: 'Step 3',
      title: 'Install the Windows Desktop Agent',
      desc: 'Download our spooler client on your Windows shop PC. Pair it using your one-time shop pairing token.',
    },
    {
      step: 'Step 4',
      title: 'Start Fulfilling High-Speed Orders',
      desc: 'Watch walk-in orders arrive in clean queues. Verify print jobs, hand them to customers, and grow your repeat walk-ins.',
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24">
      <JsonLd data={[breadcrumbsSchema]} />

      {/* Hero */}
      <section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-saffron-tint text-saffron text-xs font-bold uppercase tracking-wider mb-6">
          <Store className="w-3.5 h-3.5" />
          <span>Vendor Partnership Program</span>
        </div>
        <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight mb-6">
          Turn Your Print Shop into a High-Speed Smart Hub
        </h1>
        <p className="text-ink-soft text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Zero monthly software fees. Eliminate pen-drive viruses. Deliver printed documents to your customers in seconds.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register-vendor">
            <Button variant="primary" className="h-13 px-8 text-base">
              Register Your Store Free
            </Button>
          </Link>
          <Link href="/vendor">
            <Button variant="outline" className="h-13 px-8 text-base">
              Vendor Portal Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 max-w-6xl mx-auto mb-24">
        <div className="text-center mb-12">
          <h2 className="font-sora text-3xl font-extrabold text-ink mb-3">
            Why Print Shop Owners Choose Print2Me
          </h2>
          <p className="text-ink-soft text-base max-w-lg mx-auto">
            Engineered specifically to solve the daily bottlenecks of busy Indian print counters.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="bg-surface p-7 rounded-[24px] border border-hairline shadow-ink-soft space-y-3"
            >
              <div className="w-12 h-12 rounded-16 bg-paper border border-hairline flex items-center justify-center">
                {b.icon}
              </div>
              <h3 className="font-sora text-lg font-bold text-ink">
                {b.title}
              </h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Onboarding Flow */}
      <section className="px-6 max-w-5xl mx-auto mb-24">
        <div className="bg-surface rounded-[32px] p-8 md:p-12 border border-hairline shadow-ink-soft">
          <div className="text-center mb-12">
            <h2 className="font-sora text-3xl font-extrabold text-ink mb-3">
              How to Get Started in 4 Easy Steps
            </h2>
            <p className="text-ink-soft text-base">
              No new hardware required. Works with your current Windows PC and existing printers.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="p-5 rounded-20 bg-paper border border-hairline space-y-2">
                <div className="text-xs font-mono font-bold text-saffron uppercase">
                  {s.step}
                </div>
                <h4 className="font-sora font-bold text-ink text-base">
                  {s.title}
                </h4>
                <p className="text-ink-soft text-xs leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/register-vendor">
              <Button variant="primary" className="h-13 px-8 text-base">
                Join as a Partner Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Support Callout */}
      <section className="px-6 max-w-3xl mx-auto text-center">
        <p className="text-sm text-ink-soft">
          Need assistance or want personal onboarding help? Contact our shop partner desk at{' '}
          <a
            href="mailto:support@print2me.in"
            className="font-bold text-ink hover:text-saffron transition-colors"
          >
            support@print2me.in
          </a>
        </p>
      </section>
    </div>
  );
}
