'use client';

import Link from 'next/link';
import { HelpCircle, Mail, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-paper pb-24">
      <JsonLd data={[breadcrumbsSchema, faqSchema]} />

      {/* Hero */}
      <section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-saffron-tint text-saffron text-xs font-bold uppercase tracking-wider mb-6">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help &amp; Answers</span>
        </div>
        <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight mb-6">
          Frequently Asked Questions
        </h1>
        <p className="text-ink-soft text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Everything you need to know about using Print2Me for fast, private, and convenient document printing.
        </p>
      </section>

      {/* Categorized FAQs */}
      <section className="px-6 max-w-4xl mx-auto mb-24 space-y-12">
        {faqItems.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="font-sora text-xl font-bold text-ink pl-1 border-l-4 border-saffron">
              &nbsp;{section.category}
            </h2>
            <Accordion items={section.items} />
          </div>
        ))}
      </section>

      {/* Still Have Questions Box */}
      <section className="px-6 max-w-3xl mx-auto text-center">
        <div className="bg-surface rounded-[28px] p-8 md:p-12 border border-hairline shadow-ink-soft space-y-5">
          <div className="w-12 h-12 rounded-full bg-saffron-tint text-saffron flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="font-sora text-2xl font-bold text-ink">
            Still have questions?
          </h2>
          <p className="text-ink-soft text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Can&apos;t find what you&apos;re looking for? Reach our support team anytime. We typically respond within 2 to 4 hours.
          </p>
          <div className="pt-2">
            <a href="mailto:support@print2me.in">
              <Button variant="primary" className="h-12 px-6 gap-2">
                <span>Email support@print2me.in</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
