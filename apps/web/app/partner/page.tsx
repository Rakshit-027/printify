// hallmark:v1 theme=sticker shape=workbench density=balanced
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Store,
  QrCode,
  Zap,
  Laptop,
  CheckCircle2,
  TrendingUp,
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
      icon: <QrCode className="w-5 h-5 text-saffron" />,
      title: 'Custom counter standee',
      desc: 'High-resolution, branded QR standee customized for your store. Customers scan and order without crowding the counter.',
    },
    {
      icon: <Laptop className="w-5 h-5 text-success" />,
      title: 'Windows spooler client',
      desc: 'Lightweight background client that receives incoming jobs in real time and routes them directly to your printers.',
    },
    {
      icon: <Zap className="w-5 h-5 text-saffron" />,
      title: 'Fast counter turnaround',
      desc: 'Save minutes per customer opening emails and WhatsApp chats. Jobs arrive already configured with color and duplex settings.',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-ink" />,
      title: 'Bank settlement & cash',
      desc: 'Receive digital payments directly via UPI to your bank, or allow cash on desk collection for cash walk-ins.',
    },
  ];

  const steps = [
    {
      step: 'Step 1',
      title: 'Register your shop online',
      desc: 'Enter business name, address, phone, and standard pricing matrix for A4 and A3 prints.',
    },
    {
      step: 'Step 2',
      title: 'Print the counter standee',
      desc: 'Download your ready-to-print standee artwork from your vendor portal and place it on the desk.',
    },
    {
      step: 'Step 3',
      title: 'Install Windows spooler',
      desc: 'Download the client on your Windows PC and pair it with your one-time verification token.',
    },
    {
      step: 'Step 4',
      title: 'Fulfill incoming jobs',
      desc: 'Review incoming customer queues, hand prints over via pickup codes, and track daily totals.',
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24 text-ink">
      <JsonLd data={[breadcrumbsSchema]} />

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto text-center">
        <h1 className="font-sora text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          Modernize your print shop counter
        </h1>
        <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
          Equip your xerox counter with QR ordering and automated desktop spooling.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register-vendor"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="primary" className="w-full sm:w-auto h-12 px-8 text-sm">
              Register your store free
            </Button>
          </Link>
          <Link
            href="/vendor"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="outline" className="w-full sm:w-auto h-12 px-8 text-sm">
              Vendor portal sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 max-w-5xl mx-auto mb-20">
        <div className="mb-8">
          <h2 className="font-sora text-2xl font-extrabold text-ink mb-2">
            Why print shop owners join Print2Me
          </h2>
          <p className="text-ink-soft text-sm max-w-lg">
            Built to handle walk-in printing jobs for busy counter print shops.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft space-y-3"
            >
              <div className="w-10 h-10 rounded-16 bg-paper border border-hairline flex items-center justify-center">
                {b.icon}
              </div>
              <h3 className="font-sora text-base font-bold text-ink">
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
      <section className="px-6 max-w-5xl mx-auto mb-20">
        <div className="bg-surface rounded-24 p-6 sm:p-8 border border-hairline shadow-ink-soft">
          <div className="mb-8">
            <h2 className="font-sora text-2xl font-extrabold text-ink mb-2">
              Get started in four steps
            </h2>
            <p className="text-ink-soft text-sm">
              No new hardware required. Works with your current Windows PC and existing printers.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => (
              <div key={i} className="p-5 rounded-20 bg-paper border border-hairline space-y-2">
                <div className="text-xs font-semibold text-saffron">
                  {s.step}
                </div>
                <h3 className="font-sora text-base font-bold text-ink">
                  {s.title}
                </h3>
                <p className="text-ink-soft text-xs leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spooler Specifications */}
      <section className="px-6 max-w-4xl mx-auto mb-20">
        <div className="bg-ink rounded-24 p-8 text-white space-y-4">
          <h2 className="font-sora text-xl font-bold text-white">
            Desktop spooler requirements
          </h2>
          <p className="text-white/80 text-sm leading-relaxed max-w-xl">
            The Print2Me Spooler runs on Windows 10 and 11 (64-bit). It consumes under 50MB of RAM and interfaces with any installed printer driver via native Windows print queues.
          </p>
          <div className="pt-2">
            <Link
              href="/register-vendor"
              className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
            >
              <Button variant="saffron" className="h-11 px-6 text-sm">
                Get free vendor access
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
