// hallmark:v1 theme=sticker shape=workbench density=balanced
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
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
      title: 'Supported formats',
      value: 'PDF, JPG, PNG',
      desc: 'Native multi-page PDF rendering and high-resolution image printing up to 50MB per file.',
    },
    {
      title: 'Paper sizes',
      value: 'Standard A4, A3, Legal',
      desc: 'Crisp 75 to 100 GSM standard bond paper, legal agreement sheets, and large format prints.',
    },
    {
      title: 'Color capabilities',
      value: 'Monochrome & color',
      desc: 'Laser-sharp black and white text, or vibrant multi-tone color graphs, diagrams, and photos.',
    },
    {
      title: 'Binding & duplex',
      value: 'Single or double-sided',
      desc: 'Flexible long-edge and short-edge duplex options that cut paper consumption in half.',
    },
  ];

  const useCases = [
    {
      title: 'College assignments & reports',
      desc: 'Submit lab manuals, semester theses, research papers, and homework on time without missing deadlines.',
      badge: 'Students & academics',
    },
    {
      title: 'Resumes & job applications',
      desc: 'Print high-definition resumes, portfolios, and interview documents on clean white paper.',
      badge: 'Professionals',
    },
    {
      title: 'Govt. forms & ID proofs',
      desc: 'Aadhaar cards, flight boarding passes, utility bills, visa applications, and exam tickets printed in seconds.',
      badge: 'Everyday printing',
    },
    {
      title: 'Legal & business agreements',
      desc: 'Contracts, NDA documents, rental agreements, invoices, and business letters printed with exact margins.',
      badge: 'Commercial',
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24 text-ink">
      <JsonLd data={[breadcrumbsSchema, serviceSchema]} />

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto text-center">
        <h1 className="font-sora text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          Online document printing made simple
        </h1>
        <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
          Upload and print files online with contactless counter pickup across partner shops.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/v/speedy-express"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="primary" className="w-full sm:w-auto h-12 px-8 text-sm">
              Start printing online
            </Button>
          </Link>
          <Link
            href="/how-it-works"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="outline" className="w-full sm:w-auto h-12 px-8 text-sm">
              Learn how it works
            </Button>
          </Link>
        </div>
      </section>

      {/* Specifications Grid */}
      <section className="px-6 max-w-5xl mx-auto mb-20">
        <div className="mb-8">
          <h2 className="font-sora text-2xl font-extrabold text-ink mb-2">
            Print specifications &amp; quality
          </h2>
          <p className="text-ink-soft text-sm max-w-xl">
            Clean options for precise, professional prints straight from your phone or laptop.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {specs.map((spec, i) => (
            <div
              key={i}
              className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold text-saffron mb-1">
                  {spec.title}
                </div>
                <div className="font-sora text-lg font-bold text-ink mb-2">
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
      <section className="px-6 max-w-5xl mx-auto mb-20">
        <div className="mb-8">
          <h2 className="font-sora text-2xl font-extrabold text-ink mb-2">
            What you can print with Print2Me
          </h2>
          <p className="text-ink-soft text-sm max-w-xl">
            Designed for high-speed counter printing across colleges, offices, and neighborhood shops.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {useCases.map((uc, i) => (
            <div
              key={i}
              className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft space-y-3"
            >
              <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-pill bg-paper border border-hairline text-ink-soft">
                {uc.badge}
              </span>
              <h3 className="font-sora text-lg font-bold text-ink">
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
      <section className="px-6 max-w-4xl mx-auto mb-20">
        <div className="bg-surface rounded-24 p-8 border border-hairline shadow-ink-soft flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-16 bg-success-tint text-success flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h2 className="font-sora text-xl font-bold text-ink">
              Confidential document transfer
            </h2>
            <p className="text-ink-soft text-sm leading-relaxed">
              Print2Me does not inspect or index customer documents. Files transfer through time-limited SAS tokens and are automatically purged after fulfillment.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 max-w-3xl mx-auto text-center">
        <div className="space-y-4">
          <h2 className="font-sora text-2xl font-extrabold text-ink">
            Start printing your documents today
          </h2>
          <p className="text-ink-soft text-sm max-w-md mx-auto">
            No registration needed for customers. Scan a QR code or test the demo kiosk directly.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/v/speedy-express"
              className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
            >
              <Button variant="primary" className="w-full sm:w-auto h-12 px-8 text-sm">
                Try demo kiosk
              </Button>
            </Link>
            <Link
              href="/faq"
              className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
            >
              <Button variant="outline" className="w-full sm:w-auto h-12 px-8 text-sm">
                Read FAQ
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
