import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Lock, Trash2, EyeOff, Server, FileText, ArrowRight } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Privacy Policy & Data Security – Print2Me (print2me.in)',
  description:
    'Our strict privacy commitment: automatic 30-day file deletion, encrypted document transmission via Azure Blob Storage, and zero document sharing.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPolicyPage() {
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://print2me.in' },
      { '@type': 'ListItem', position: 2, name: 'Privacy Policy', item: 'https://print2me.in/privacy' },
    ],
  };

  return (
    <div className="py-12 px-4 sm:px-6 max-w-5xl mx-auto space-y-12">
      <JsonLd data={breadcrumbSchema} />

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-success-tint border border-success/30 text-success text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          Data Protection &amp; Confidentiality
        </div>
        <h1 className="text-3xl sm:text-5xl font-sora font-extrabold text-ink tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-ink-soft max-w-2xl mx-auto text-sm sm:text-base">
          Last updated: October 2026. How Print2Me protects your documents, personal data, and payment information.
        </p>
      </div>

      {/* Key Guarantees Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3">
          <div className="w-10 h-10 rounded-full bg-saffron-tint flex items-center justify-center text-saffron">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">Automatic 30-Day Purge</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            All customer uploaded documents are permanently purged from Microsoft Azure Blob Storage after 30 days. No archival copies are retained.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">End-to-End Encryption</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            Files are transmitted via TLS 1.3 encryption and stored using AES-256 server-side encryption with secure time-limited Shared Access Signatures (SAS).
          </p>
        </div>

        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">Zero Document Sharing</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            Your documents are accessible exclusively to the selected printing store for the sole purpose of executing your requested print job.
          </p>
        </div>
      </div>

      {/* Policy Details */}
      <div className="bg-surface p-8 sm:p-10 rounded-[28px] border border-hairline shadow-ink-soft space-y-8 text-sm text-ink leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-sora font-bold text-ink">1. Information We Collect</h2>
          <p className="text-ink-soft">
            When you use Print2Me (either via QR kiosk upload or by registering an account), we collect only the minimum information necessary to execute document printing and provide order updates:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-soft">
            <li><strong>Document Data:</strong> PDF, DOCX, PPTX, or image files uploaded for printing, including file size, page count, and print configuration.</li>
            <li><strong>Contact Details:</strong> Customer phone number and name (optional) provided at the kiosk for SMS/WhatsApp order tracking and collection alerts.</li>
            <li><strong>Vendor Account Data:</strong> Store name, email, phone number, physical address, and payment credentials for authorized print shop owners.</li>
            <li><strong>Transaction References:</strong> Razorpay order IDs and payment timestamps. We never store credit card numbers or banking passwords.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-sora font-bold text-ink">2. How Documents Are Handled and Stored</h2>
          <p className="text-ink-soft">
            Uploaded files are stored in high-security, private Microsoft Azure Blob Storage containers located in India. Access to raw document files is strictly governed through short-lived Shared Access Signature (SAS) tokens valid for 15 minutes only. Documents are transmitted directly to the vendor&apos;s authenticated print client (Desktop Agent or Android App) solely for spooling to the designated printer.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-sora font-bold text-ink">3. Data Retention and Deletion</h2>
          <p className="text-ink-soft">
            Our automated background retention worker evaluates stored blobs every hour. Exactly 30 days following an order&apos;s placement (or immediately upon customer cancellation prior to printing), files are permanently deleted. Customers may also request early deletion by emailing support@print2me.in with their order tracking token.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-sora font-bold text-ink">4. Payments and Security</h2>
          <p className="text-ink-soft">
            Online payments are processed through Razorpay (PCI-DSS Level 1 compliant gateway). Payment transactions are verified cryptographically via server-side HMAC signatures. Print2Me never stores payment card data, CVVs, or UPI PINs on any server.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-sora font-bold text-ink">5. Contact and Grievances</h2>
          <p className="text-ink-soft">
            For privacy inquiries, data deletion requests, or grievances, contact our Data Protection Team at:
          </p>
          <div className="p-4 rounded-14 bg-paper border border-hairline font-mono text-xs space-y-1">
            <div>Print2Me Technologies Pvt. Ltd.</div>
            <div>Email: <a href="mailto:support@print2me.in" className="text-saffron hover:underline font-bold">support@print2me.in</a></div>
            <div>Official Portal: <a href="https://print2me.in" className="text-saffron hover:underline">https://www.print2me.in</a></div>
          </div>
        </section>
      </div>
    </div>
  );
}
