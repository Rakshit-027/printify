// hallmark:v1 theme=sticker shape=workbench density=balanced
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Terms and Conditions – Print2Me (print2me.in)',
  description:
    'Terms of service governing customer document printing, print shop vendor partnerships, acceptable file usage, and platform responsibilities.',
  alternates: {
    canonical: '/terms',
  },
};

export default function TermsPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://print2me.in' },
      { '@type': 'ListItem', position: 2, name: 'Terms & Conditions', item: 'https://print2me.in/terms' },
    ],
  };

  return (
    <div className="min-h-screen bg-paper pb-24 text-ink">
      <JsonLd data={[breadcrumbSchema]} />

      {/* Header */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto text-center">
        <h1 className="font-sora text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          Terms and conditions
        </h1>
        <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Platform agreement governing customer document printing and print shop vendor partnerships.
        </p>
      </section>

      {/* Content */}
      <section className="px-6 max-w-4xl mx-auto">
        <div className="bg-surface p-6 sm:p-10 rounded-24 border border-hairline shadow-ink-soft space-y-6 text-sm text-ink leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">1. Nature of the service</h2>
            <p className="text-ink-soft">
              Print2Me (print2me.in) operates as a digital technology platform connecting customers with independent local printing vendors. Print2Me facilitates QR code scanning, file uploading, pricing calculations, electronic payment processing, and print job dispatch via desktop clients and mobile applications. Physical printing, paper quality, and collection fulfillment are performed by the selected vendor.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">2. Acceptable document uploads</h2>
            <p className="text-ink-soft">
              Users agree not to upload any content that:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-ink-soft">
              <li>Infringes upon third-party copyrights, trademarks, or proprietary intellectual property.</li>
              <li>Contains malicious code, trojans, worms, or file exploit payloads.</li>
              <li>Violates Indian federal or state laws, including prohibited counterfeit currency, forged official stamps, or classified materials.</li>
              <li>Contains unlawful, defamatory, or obscene material.</li>
            </ul>
            <p className="text-xs text-ink-soft italic">
              Vendors reserve the right to decline printing any document that violates local statutory regulations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">3. Pricing and payments</h2>
            <p className="text-ink-soft">
              Printing prices are configured by individual vendors based on page size (A4, A3, Legal), color mode (Black &amp; White vs. Color), and duplexing options. All orders display an exact subtotal and breakdown before payment confirmation. Customers may pay via online UPI/Cards or at the physical counter if permitted by the vendor.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">4. Vendor obligations</h2>
            <p className="text-ink-soft">
              Printing partners registered on Print2Me agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-ink-soft">
              <li>Maintain their hardware and print agents in operational working order.</li>
              <li>Execute print jobs faithfully according to the user-selected copy count and duplex specifications.</li>
              <li>Respect customer document privacy and never photocopy or distribute uploaded files outside of the order.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">5. Limitation of liability</h2>
            <p className="text-ink-soft">
              To the maximum extent permitted by applicable law, Print2Me shall not be liable for indirect, incidental, or consequential damages resulting from vendor hardware malfunction, paper jams, power outages at third-party premises, or network service interruptions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-sora font-bold text-ink">6. Governing law</h2>
            <p className="text-ink-soft">
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of the use of this service shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>

          <div className="pt-4 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-soft">
            <div>
              Questions about these terms? Email{' '}
              <a
                href="mailto:support@print2me.in"
                className="text-saffron font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
              >
                support@print2me.in
              </a>
            </div>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1 text-ink font-semibold hover:text-saffron transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
            >
              <span>Read privacy policy</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
