// hallmark:v1 theme=sticker shape=workbench density=balanced
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  QrCode,
  UploadCloud,
  CreditCard,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Smartphone,
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
      icon: <QrCode className="w-6 h-6 text-saffron" />,
      title: 'Scan the shop QR standee',
      subtitle: 'Zero app downloads or account signups required',
      desc: 'Open your phone camera and point it at the Print2Me standee on the counter. You are connected directly to the shop kiosk.',
      details: [
        'Works on iPhone, Android, and tablets',
        'No phone memory wasted on single-use apps',
        'Direct connection to the desk printer queue',
      ],
    },
    {
      num: '02',
      icon: <UploadCloud className="w-6 h-6 text-saffron" />,
      title: 'Upload files and select options',
      subtitle: 'Instant page detection and clear pricing',
      desc: 'Pick your PDF, JPG, or PNG files. Set page range, color mode, paper size (A4, A3, Legal), and duplex orientation.',
      details: [
        'Supports files up to 50MB per upload',
        'Real-time automated page count detection',
        'Calculated total before you proceed to pay',
      ],
    },
    {
      num: '03',
      icon: <CreditCard className="w-6 h-6 text-saffron" />,
      title: 'Digital payment or counter cash',
      subtitle: 'Pay with UPI or settle at the desk',
      desc: 'Pay using UPI apps like PhonePe, Google Pay, and Paytm, or choose cash on desk to pay the shopkeeper upon collection.',
      details: [
        'Encrypted 256-bit gateway security',
        'Instant digital order receipt with token code',
        'Direct refund handling if hardware jams',
      ],
    },
    {
      num: '04',
      icon: <Printer className="w-6 h-6 text-saffron" />,
      title: 'Collect printed sheets',
      subtitle: 'Automated spooling straight to the printer tray',
      desc: 'The shop desktop client releases your job automatically. Show your 4-digit pickup code and grab your printed papers.',
      details: [
        'No personal USB flash drives needed',
        'No sharing personal numbers over WhatsApp',
        'Automated file purging after fulfillment',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24 text-ink">
      <JsonLd data={[breadcrumbsSchema, howToSchema]} />

      {/* Header */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto text-center">
        <h1 className="font-sora text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          How Print2Me works
        </h1>
        <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
          From your phone screen to printed sheets at the counter in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/v/speedy-express"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="primary" className="w-full sm:w-auto h-12 px-8 text-sm">
              Try interactive kiosk
            </Button>
          </Link>
          <Link
            href="/locations"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="outline" className="w-full sm:w-auto h-12 px-8 text-sm">
              View active locations
            </Button>
          </Link>
        </div>
      </section>

      {/* Step by Step Progression */}
      <section className="px-6 max-w-4xl mx-auto mb-20">
        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-surface rounded-24 p-6 sm:p-8 border border-hairline shadow-ink-soft flex flex-col md:flex-row gap-6 items-start"
            >
              <div className="flex md:flex-col items-center justify-between w-full md:w-20 shrink-0">
                <div className="w-12 h-12 rounded-16 bg-saffron-tint flex items-center justify-center mb-1">
                  {step.icon}
                </div>
                <span className="font-sora font-extrabold text-2xl text-saffron/40 font-mono">
                  {step.num}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="font-sora text-xl font-bold text-ink mb-1">
                    {step.title}
                  </h2>
                  <div className="text-xs font-semibold text-saffron">
                    {step.subtitle}
                  </div>
                </div>
                <p className="text-ink-soft text-sm leading-relaxed">
                  {step.desc}
                </p>
                <div className="pt-1 grid sm:grid-cols-2 gap-2 text-xs">
                  {step.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2 text-ink-soft">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
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
      <section className="px-6 max-w-4xl mx-auto mb-20">
        <div className="bg-ink rounded-24 p-8 text-white space-y-8">
          <div className="max-w-xl mx-auto text-center space-y-2">
            <h2 className="font-sora text-2xl font-bold text-white">
              Traditional counter printing vs. Print2Me
            </h2>
            <p className="text-white/70 text-sm">
              Direct advantages for students, professionals, and shop owners.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-20 p-5 space-y-2.5">
              <div className="text-xs font-bold text-saffron">
                Traditional counter experience
              </div>
              <ul className="space-y-2 text-xs text-white/70">
                <li className="flex items-start gap-2">
                  <span className="text-saffron font-bold shrink-0">✕</span>
                  <span>Handing personal USB drives to counter PCs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-saffron font-bold shrink-0">✕</span>
                  <span>Sharing personal phone numbers over public WhatsApp chats.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-saffron font-bold shrink-0">✕</span>
                  <span>Waiting in line shouting page configurations across the desk.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/10 border border-saffron/40 rounded-20 p-5 space-y-2.5">
              <div className="text-xs font-bold text-saffron">
                The Print2Me experience
              </div>
              <ul className="space-y-2 text-xs text-white/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                  <span>Direct browser upload over encrypted connections.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                  <span>Zero personal contact details left on shop computers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                  <span>Automated spooling to the printer tray with 4-digit token.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="px-6 max-w-3xl mx-auto text-center">
        <div className="bg-surface rounded-24 p-8 border border-hairline shadow-ink-soft space-y-4">
          <h2 className="font-sora text-2xl font-extrabold text-ink">
            Ready to test the print workflow?
          </h2>
          <p className="text-ink-soft max-w-md mx-auto text-sm">
            Try the demo kiosk or locate a partnered print counter in your area.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
            <Link
              href="/v/speedy-express"
              className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
            >
              <Button variant="primary" className="w-full sm:w-auto h-11 px-6 text-sm">
                Test live demo kiosk
              </Button>
            </Link>
            <Link
              href="/locations"
              className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
            >
              <Button variant="outline" className="w-full sm:w-auto h-11 px-6 text-sm">
                Browse partner shops
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
