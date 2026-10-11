import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  Printer,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Droplet,
  Layers,
  Smartphone,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/primitives';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Online Document Printing Services – Upload & Print | Print2Me',
  description:
    'Print PDF and image documents online with Print2Me. Choose color or B&W, single or double-sided, pay seamlessly, and collect prints without waiting in lines.',
  alternates: {
    canonical: '/document-printing',
  },
  openGraph: {
    title: 'Online Document Printing Services – Upload & Print | Print2Me',
    description:
      'Fast, secure online document printing for assignments, office files, and government forms. Scan QR or upload on print2me.in.',
    url: 'https://print2me.in/document-printing',
    type: 'website',
  },
};

export default function DocumentPrintingPage() {
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
        name: 'Online Document Printing',
        item: 'https://print2me.in/document-printing',
      },
    ],
  };

  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Online Document Printing Service',
    provider: {
      '@type': 'Organization',
      name: 'Print2Me',
      url: 'https://print2me.in',
    },
    serviceType: 'Document Printing',
    description:
      'Online document printing for PDFs, certificates, resumes, assignments, and presentations with mobile upload, duplex support, and instant counter pickup.',
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
  };

  const specs = [
    {
      title: 'Supported Formats',
      value: 'PDF, JPG, PNG',
      desc: 'Native multi-page PDF rendering and high-resolution image printing up to 50MB per file.',
    },
    {
      title: 'Paper Sizes',
      value: 'Standard A4, A3, Legal',
      desc: 'Crisp 75–100 GSM standard bond paper, legal agreement sheets, and large format prints.',
    },
    {
      title: 'Color Capabilities',
      value: 'Monochrome & Full Color',
      desc: 'Laser-sharp Black & White text, or vibrant multi-tone color graphs, diagrams, and photos.',
    },
    {
      title: 'Binding & Duplex',
      value: 'Single or Double-Sided',
      desc: 'Flexible Long-Edge and Short-Edge duplex options that cut paper costs in half.',
    },
  ];

  const useCases = [
    {
      title: 'College Assignments & Reports',
      desc: 'Submit your lab manuals, semester thesis, research papers, and homework on time without missing submission deadlines.',
      badge: 'Students & Academics',
    },
    {
      title: 'Resumes & Job Applications',
      desc: 'Print crisp, high-definition resumes, portfolios, and interview documents on clean white paper.',
      badge: 'Professionals',
    },
    {
      title: 'Govt. Forms & ID Proofs',
      desc: 'Aadhaar cards, flight boarding passes, utility bills, visa applications, and exam admit cards printed in seconds.',
      badge: 'Everyday Printing',
    },
    {
      title: 'Legal & Business Agreements',
      desc: 'Contracts, NDA documents, rental agreements, invoices, and company letters printed with exact margins and pagination.',
      badge: 'Commercial',
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24">
      <JsonLd data={[breadcrumbsSchema, serviceSchema]} />

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-saffron-tint text-saffron text-xs font-bold uppercase tracking-wider mb-6">
          <Printer className="w-3.5 h-3.5" />
          <span>Professional Print Standards</span>
        </div>
        <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight mb-6">
          Online Document Printing Made Easy
        </h1>
        <p className="text-ink-soft text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Upload documents from your phone, customize your print preferences, pay digitally, and collect fresh prints at nearby partner shops.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/v/speedy-express">
            <Button variant="primary" className="h-13 px-8 text-base">
              Start Printing Online
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button variant="outline" className="h-13 px-8 text-base">
              Learn How It Works
            </Button>
          </Link>
        </div>
      </section>

      {/* Specifications Grid */}
      <section className="px-6 max-w-6xl mx-auto mb-24">
        <div className="text-center mb-12">
          <h2 className="font-sora text-3xl font-extrabold text-ink mb-3">
            Print Specifications &amp; Quality
          </h2>
          <p className="text-ink-soft text-base max-w-xl mx-auto">
            Everything you need for precise, professional prints straight from your phone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {specs.map((spec, i) => (
            <div
              key={i}
              className="bg-surface p-6 rounded-[24px] border border-hairline shadow-ink-soft flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-saffron mb-2">
                  {spec.title}
                </div>
                <div className="font-sora text-xl font-bold text-ink mb-2">
                  {spec.value}
                </div>
                <p className="text-ink-soft text-sm leading-relaxed">
                  {spec.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Everyday Use Cases */}
      <section className="px-6 max-w-5xl mx-auto mb-24">
        <div className="text-center mb-12">
          <h2 className="font-sora text-3xl font-extrabold text-ink mb-3">
            What Can You Print with Print2Me?
          </h2>
          <p className="text-ink-soft text-base max-w-xl mx-auto">
            Designed for high-speed counter printing across colleges, commercial markets, and residential neighborhoods.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {useCases.map((uc, i) => (
            <div
              key={i}
              className="bg-surface p-7 rounded-[28px] border border-hairline shadow-ink-soft space-y-3 hover:border-saffron/40 transition-all"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-pill bg-paper border border-hairline text-ink-soft">
                {uc.badge}
              </span>
              <h3 className="font-sora text-xl font-bold text-ink">
                {uc.title}
              </h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                {uc.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Privacy Commitment */}
      <section className="px-6 max-w-5xl mx-auto mb-24">
        <div className="bg-surface rounded-[32px] p-8 md:p-12 border border-hairline shadow-ink-soft flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 rounded-24 bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="font-sora text-2xl font-bold text-ink">
              Your Documents Stay 100% Confidential
            </h2>
            <p className="text-ink-soft text-sm leading-relaxed">
              Print2Me does not index, inspect, or share customer documents. Files are transmitted through short-lived secure access signatures (SAS tokens) and automatically purged after print completion.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 max-w-3xl mx-auto text-center">
        <div className="space-y-6">
          <h2 className="font-sora text-3xl font-extrabold text-ink">
            Start printing your documents today
          </h2>
          <p className="text-ink-soft text-base">
            No registration needed for customers. Scan a QR code or use the demo kiosk right away.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/v/speedy-express">
              <Button variant="primary" className="h-13 px-8">
                Try Demo Kiosk
              </Button>
            </Link>
            <Link href="/faq">
              <Button variant="outline" className="h-13 px-8">
                Read FAQ
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
