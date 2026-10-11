import type { Metadata } from 'next';
import Link from 'next/link';
import {
  QrCode,
  UploadCloud,
  CreditCard,
  Printer,
  ShieldCheck,
  Zap,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/primitives';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'How Print2Me Works – Instant QR & Mobile Document Printing',
  description:
    'Learn how Print2Me works: scan a QR code at your local print shop, upload documents from your phone, pay securely, and collect your prints without waiting.',
  alternates: {
    canonical: '/how-it-works',
  },
  openGraph: {
    title: 'How Print2Me Works – Instant QR & Mobile Document Printing',
    description:
      'Skip the line at your campus or local print shop. 4 simple steps to upload from your phone and print in seconds.',
    url: 'https://print2me.in/how-it-works',
    type: 'website',
  },
};

export default function HowItWorksPage() {
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
        name: 'How It Works',
        item: 'https://print2me.in/how-it-works',
      },
    ],
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Print Documents with Print2Me',
    description:
      'A step-by-step guide to uploading documents from your phone and printing them at a nearby Print2Me partner counter.',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Scan the Shop QR Code',
        text: 'Walk up to any partnered print shop or campus kiosk and scan the counter standee QR code with your phone camera. No mobile app download required.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Upload and Configure Your Documents',
        text: 'Select your PDF or image files. Choose color or black-and-white, single or double-sided printing, and copy count with real-time price preview.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Choose Payment Method',
        text: 'Pay digitally via UPI (Google Pay, PhonePe, Paytm), debit/credit cards, or select cash on counter collection.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Collect Your Printed Documents',
        text: 'Show your short digital pickup token at the counter. The automated Windows spooler releases your job immediately without USB drives.',
      },
    ],
  };

  const steps = [
    {
      num: '01',
      icon: <QrCode className="w-8 h-8 text-saffron" />,
      title: 'Scan the Shop QR Standee',
      subtitle: 'Zero app installs or account signups required',
      desc: 'Simply open your default smartphone camera or scanner. Point it at the Print2Me standee placed on the shop counter. You are instantly directed to the print shop’s verified web kiosk.',
      details: [
        'Works on iPhone, Android, and tablets',
        'No phone memory wasted on single-use apps',
        'Direct connection to the specific counter printer',
      ],
    },
    {
      num: '02',
      icon: <UploadCloud className="w-8 h-8 text-saffron" />,
      title: 'Upload Documents & Choose Preferences',
      subtitle: 'Instant page count & transparent pricing',
      desc: 'Pick your PDF, JPG, or PNG files from your phone files or cloud drive. Configure page range, color mode (Black & White or Color), paper size (A4, A3, Legal), and duplex orientation.',
      details: [
        'Supports files up to 50MB per upload',
        'Real-time automated page count detection',
        'Live cost calculation before you pay a single rupee',
      ],
    },
    {
      num: '03',
      icon: <CreditCard className="w-8 h-8 text-saffron" />,
      title: 'Seamless Digital or Cash Payment',
      subtitle: 'Pay via UPI or choose Pay at Counter',
      desc: 'Pay instantly using UPI apps like PhonePe, Google Pay, Paytm, or Net Banking. Prefer physical money? Select "Cash on Desk" to pay the vendor when you collect your printed papers.',
      details: [
        'Encrypted 256-bit payment gateway security',
        'Instant digital payment receipts with token code',
        'Full refund protection if printer experiences hardware failure',
      ],
    },
    {
      num: '04',
      icon: <Printer className="w-8 h-8 text-saffron" />,
      title: 'Collect Fresh Prints in Seconds',
      subtitle: 'Automated spooling straight to the shop printer',
      desc: 'The partner shop’s desktop agent receives your job automatically in the queue. Show your 4-digit pickup code or name, and grab your crisp, organized printed documents.',
      details: [
        'No more handing over personal USB drives',
        'No forwarding sensitive files over public WhatsApp groups',
        'Automated file purging after print completion',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24">
      <JsonLd data={[breadcrumbsSchema, howToSchema]} />

      {/* Header */}
      <section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-saffron-tint text-saffron text-xs font-bold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Simple · Fast · Contactless</span>
        </div>
        <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight mb-6">
          How Print2Me Works
        </h1>
        <p className="text-ink-soft text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          From your mobile screen to printed paper in under 60 seconds. Say goodbye to pen drives, crowded counters, and awkward WhatsApp uploads.
        </p>
      </section>

      {/* Step by Step Progression */}
      <section className="px-6 max-w-5xl mx-auto mb-24">
        <div className="space-y-10">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-surface rounded-[28px] p-8 md:p-10 border border-hairline shadow-ink-soft flex flex-col md:flex-row gap-8 items-start hover:border-saffron/30 transition-all"
            >
              <div className="flex md:flex-col items-center justify-between w-full md:w-28 shrink-0">
                <div className="w-16 h-16 rounded-24 bg-saffron-tint flex items-center justify-center mb-2 shadow-sm">
                  {step.icon}
                </div>
                <span className="font-sora font-extrabold text-3xl text-saffron/40 font-mono">
                  {step.num}
                </span>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="font-sora text-2xl font-bold text-ink mb-1">
                    {step.title}
                  </h2>
                  <div className="text-xs font-semibold uppercase tracking-wider text-saffron">
                    {step.subtitle}
                  </div>
                </div>
                <p className="text-ink-soft text-base leading-relaxed">
                  {step.desc}
                </p>
                <div className="pt-2 grid sm:grid-cols-2 gap-2 text-sm">
                  {step.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2 text-ink-soft">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Comparison Section */}
      <section className="px-6 max-w-5xl mx-auto mb-24">
        <div className="bg-ink rounded-[32px] p-8 md:p-14 text-white">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-white/10 text-saffron text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Privacy Guaranteed</span>
            </div>
            <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-white mb-4">
              Traditional Xerox vs. Print2Me
            </h2>
            <p className="text-white/70 text-base">
              Why thousands of students and everyday print customers across India choose Print2Me for their printing needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-24 p-6 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-rose-400">
                The Old Problematic Way
              </div>
              <ul className="space-y-3 text-sm text-white/70">
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span>Handing infected USB pen drives to shop PCs.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span>Sharing personal WhatsApp numbers and leaving chats open on stranger screens.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-rose-400 font-bold shrink-0">✕</span>
                  <span>Standing in long queues shouting page numbers across crowded counters.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/10 border border-saffron/40 rounded-24 p-6 space-y-3 shadow-lg">
              <div className="text-xs font-bold uppercase tracking-wider text-saffron">
                The Print2Me Experience
              </div>
              <ul className="space-y-3 text-sm text-white/90">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span>Direct browser upload over encrypted HTTPS connections.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span>Zero contact details or file remnants left on public shop computers.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <span>Automated spooling straight to the printer tray with pickup token.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="px-6 max-w-4xl mx-auto text-center">
        <div className="bg-surface rounded-[28px] p-8 md:p-12 border border-hairline shadow-ink-soft space-y-6">
          <h2 className="font-sora text-3xl font-extrabold text-ink">
            Ready to try the fastest print experience?
          </h2>
          <p className="text-ink-soft max-w-lg mx-auto text-base">
            Try our interactive demo kiosk or locate a partnered print counter near your college or locality.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/v/speedy-express">
              <Button variant="primary" className="h-13 px-8 gap-2">
                <Smartphone className="w-4 h-4" />
                <span>Test Live Demo Kiosk</span>
              </Button>
            </Link>
            <Link href="/locations">
              <Button variant="outline" className="h-13 px-8 gap-2">
                <span>Browse Partner Shops</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
