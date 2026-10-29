// hallmark:v1 theme=sticker shape=workbench density=balanced
'use client';

import Link from 'next/link';
import { Mail, ArrowRight } from 'lucide-react';
import { Accordion, Button } from '@/components/primitives';
import { JsonLd } from '@/components/JsonLd';

export default function FaqPage() {
  const faqItems = [
    {
      category: 'General & Customer Usage',
      items: [
        {
          question: 'Do I need to download a mobile app to use Print2Me?',
          answer:
            'No. Print2Me is a progressive web platform that runs entirely in your mobile browser. You do not need to install an app from Google Play or the App Store. Simply scan the shop QR code or open print2me.in.',
        },
        {
          question: 'What file formats and sizes can I upload?',
          answer:
            'Print2Me supports PDF documents, JPG images, and PNG images. You can upload multiple files up to 50MB each. The system automatically inspects page count, color density, and format specifications.',
        },
        {
          question: 'Can I print both single-sided and double-sided (duplex)?',
          answer:
            'Yes. On the document upload screen, you can toggle between single-sided and double-sided (long-edge or short-edge) duplex printing. Duplex printing reduces paper usage and printing costs.',
        },
        {
          question: 'How do I pick up my printed documents?',
          answer:
            'After confirming your order, you receive a short pickup token code on your phone screen. Show this code or your name to the shopkeeper at the counter, and collect your fresh prints.',
        },
      ],
    },
    {
      category: 'Privacy & File Security',
      items: [
        {
          question: 'How does Print2Me ensure my documents remain confidential?',
          answer:
            'Your documents are uploaded directly through short-lived Shared Access Signatures (SAS tokens) using 256-bit encryption. Shopkeepers cannot browse your personal folders or keep copies on public computers. Once printed, files are automatically purged from our cloud storage.',
        },
        {
          question: 'Do shop employees see the contents of my personal documents?',
          answer:
            'Print2Me passes print jobs straight to the printer spooler tray without requiring the shopkeeper to manually open, read, or download your file to their desktop folders.',
        },
      ],
    },
    {
      category: 'Payments & Pricing',
      items: [
        {
          question: 'What payment options are available?',
          answer:
            'You can pay online using UPI apps (Google Pay, PhonePe, Paytm, BHIM), debit/credit cards, or net banking via our secure Razorpay integration. You can also select "Pay Cash on Desk" to pay directly with cash when picking up your papers.',
        },
        {
          question: 'What happens if a printer breaks down or runs out of ink?',
          answer:
            'If the vendor cannot fulfill your job due to a mechanical breakdown, paper jam, or ink outage, they can reject or cancel the order. Online payments are automatically reversed through the gateway.',
        },
      ],
    },
    {
      category: 'Shop Owners & Campuses',
      items: [
        {
          question: 'How much does it cost for a print shop to join Print2Me?',
          answer:
            'There are zero upfront monthly rental fees. Shop registration and basic usage are free. We provide a custom QR counter standee and our Windows desktop spooler software at no charge.',
        },
        {
          question: 'How do print vendors receive print jobs?',
          answer:
            'Partner shops install the lightweight Print2Me Windows Spooler Agent on their store PC. It automatically claims queued jobs and routes them straight to their connected USB or network printers.',
        },
      ],
    },
  ];

  // Flattened for FAQPage JSON-LD schema
  const allFaqs = faqItems.flatMap((c) => c.items);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

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
        name: 'Frequently Asked Questions',
        item: 'https://print2me.in/faq',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-paper pb-24 text-ink">
      <JsonLd data={[breadcrumbsSchema, faqSchema]} />

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto text-center">
        <h1 className="font-sora text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          Frequently asked questions
        </h1>
        <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-4">
          Answers on file security, printer spooling, pickup tokens, and payment.
        </p>
      </section>

      {/* Categorized FAQs */}
      <section className="px-6 max-w-3xl mx-auto mb-20 space-y-10">
        {faqItems.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h2 className="font-sora text-lg font-bold text-ink pl-2 border-l-2 border-saffron">
              {section.category}
            </h2>
            <Accordion items={section.items} />
          </div>
        ))}
      </section>

      {/* Still Have Questions Box */}
      <section className="px-6 max-w-3xl mx-auto text-center">
        <div className="bg-surface rounded-24 p-6 sm:p-8 border border-hairline shadow-ink-soft space-y-4">
          <div className="w-10 h-10 rounded-full bg-saffron-tint text-saffron flex items-center justify-center mx-auto">
            <Mail className="w-5 h-5" />
          </div>
          <h2 className="font-sora text-xl font-bold text-ink">
            Still have questions?
          </h2>
          <p className="text-ink-soft text-sm max-w-md mx-auto leading-relaxed">
            Reach our support team anytime. We respond within 2 to 4 business hours.
          </p>
          <div className="pt-1">
            <a
              href="mailto:support@print2me.in"
              className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
            >
              <Button variant="primary" className="h-11 px-6 text-xs gap-1.5">
                <span>Email support@print2me.in</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
