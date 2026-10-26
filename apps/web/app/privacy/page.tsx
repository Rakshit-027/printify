import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Trash2,
  EyeOff,
  Server,
  FileText,
  ArrowRight,
  HelpCircle,
  Mail,
  Clock,
  CheckCircle2,
  FileCheck,
  Scale,
  ExternalLink,
  ChevronRight,
  Database,
  Building,
} from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Privacy Policy & Data Security – Print2Me (print2me.in)',
  description:
    'Our strict privacy commitment: automatic 30-day ephemeral document deletion, encrypted Azure Blob storage in India, zero third-party data sharing, and full DPDP Act compliance.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'October 2026';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://print2me.in' },
      { '@type': 'ListItem', position: 2, name: 'Privacy Policy', item: 'https://print2me.in/privacy' },
    ],
  };

  const privacyFaqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How long does Print2Me keep my uploaded documents?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Print2Me enforces strict ephemeral storage. All customer documents uploaded via kiosk or mobile are permanently purged from Microsoft Azure Blob Storage servers within 30 days. No backup or archival copies are retained.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can print shop owners or employees read my files?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Uploaded documents are accessible exclusively to the designated vendor client machine for the strict technical purpose of spooling to the physical printer. Print2Me never sells, indexes, or shares document contents with advertisers or third parties.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are online payments secure on Print2Me?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Payments are processed through Razorpay, a PCI-DSS Level 1 compliant gateway. Print2Me never stores credit card details, debit card CVVs, or UPI PINs on any server.',
        },
      },
    ],
  };

  const navSections = [
    { id: 'collection', title: '1. Information We Collect' },
    { id: 'storage', title: '2. Document Handling & Ephemeral Purge' },
    { id: 'usage', title: '3. How Data Is Used' },
    { id: 'payments', title: '4. Razorpay & Payment Security' },
    { id: 'dpdp', title: '5. Rights Under DPDP Act 2023' },
    { id: 'cookies', title: '6. Cookies & Client Storage' },
    { id: 'grievance', title: '7. Statutory Grievance Redressal' },
  ];

  return (
    <div className="py-10 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto space-y-12">
      <JsonLd data={[breadcrumbSchema, privacyFaqSchema]} />

      {/* Header & Breadcrumb */}
      <div className="text-center space-y-4">
        <nav aria-label="Breadcrumb" className="flex items-center justify-center gap-1.5 text-xs text-ink-soft">
          <Link href="/" className="hover:text-ink transition-colors">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 text-ink-soft/50" />
          <span className="text-ink font-semibold">Privacy Policy</span>
        </nav>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-success-tint border border-success/30 text-success text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" />
          Data Protection &amp; Confidentiality Guarantee
        </div>

        <h1 className="text-3xl sm:text-5xl font-sora font-extrabold text-ink tracking-tight">
          Privacy Policy
        </h1>

        <p className="text-ink-soft max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Effective date: <strong className="text-ink">{lastUpdated}</strong>. How Print2Me protects customer print files, personal data, and payment information under the Digital Personal Data Protection (DPDP) Act and Indian IT Rules.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill bg-paper border border-hairline text-ink-soft font-mono">
            <Clock className="w-3.5 h-3.5 text-saffron" /> 30-Day Auto Purge
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill bg-paper border border-hairline text-ink-soft font-mono">
            <Lock className="w-3.5 h-3.5 text-success" /> TLS 1.3 / AES-256
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-pill bg-paper border border-hairline text-ink-soft font-mono">
            <Building className="w-3.5 h-3.5 text-saffron" /> Hosted in India (Azure)
          </span>
        </div>
      </div>

      {/* Key Guarantees Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3 transition-transform hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-full bg-saffron-tint flex items-center justify-center text-saffron">
            <Trash2 className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">Automatic 30-Day Purge</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            All customer uploaded documents are permanently erased from Microsoft Azure Blob Storage containers within 30 days. No tape, cold storage, or archival copies are ever retained.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3 transition-transform hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">End-to-End Encryption</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            Documents are transmitted over TLS 1.3 encryption and stored with AES-256 server-side encryption. Vendor print spoolers access raw blobs solely through 15-minute expiring SAS signatures.
          </p>
        </div>

        <div className="bg-surface p-6 rounded-20 border border-hairline shadow-ink-soft space-y-3 transition-transform hover:-translate-y-0.5">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
          <h3 className="font-sora font-bold text-ink text-base">Zero Document Sharing</h3>
          <p className="text-xs text-ink-soft leading-relaxed">
            We never read, mine, or share your document contents with third-party advertisers or data brokers. Your files are accessible solely to your chosen print shop to fulfill your print order.
          </p>
        </div>
      </div>

      {/* Quick Navigation Anchor Strip */}
      <div className="p-4 sm:p-5 rounded-20 bg-paper border border-hairline space-y-2">
        <div className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-saffron" />
          <span>Quick Section Directory</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {navSections.map((sec) => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className="text-xs px-3 py-1.5 rounded-12 bg-surface hover:bg-hairline text-ink font-medium border border-hairline transition-colors"
            >
              {sec.title}
            </a>
          ))}
        </div>
      </div>

      {/* Main Policy Content */}
      <div className="bg-surface p-6 sm:p-10 rounded-[28px] border border-hairline shadow-ink-soft space-y-10 text-sm text-ink leading-relaxed">
        
        {/* Introduction */}
        <section className="space-y-3 pb-6 border-b border-hairline/80">
          <h2 className="text-xl font-sora font-extrabold text-ink">
            Print2Me Privacy Commitment
          </h2>
          <p className="text-ink-soft">
            Print2Me Technologies Pvt. Ltd. (operating as &quot;<strong>Print2Me</strong>&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot; via{' '}
            <a href="https://print2me.in" className="text-saffron hover:underline font-bold">
              print2me.in
            </a>
            ) respects your privacy and is firmly committed to protecting personal data and documents entrusted to us. This Privacy Policy outlines our transparent data handling practices across our web portal, QR kiosk upload stations, mobile vendor applications, and desktop print agent software.
          </p>
        </section>

        {/* Section 1: Information We Collect */}
        <section id="collection" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-sora font-bold text-ink flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-saffron-tint text-saffron flex items-center justify-center text-xs font-mono font-bold">1</span>
            <span>Information We Collect</span>
          </h2>
          <p className="text-ink-soft">
            When you use Print2Me (either as a walk-up customer at a local print shop kiosk or as a registered printing partner), we collect only the minimum data required to execute document printing and provide order lifecycle tracking:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-ink-soft">
            <li>
              <strong>Document Upload Files:</strong> PDF, DOC, DOCX, PPT, PPTX, TXT, or image files (JPEG, PNG) uploaded for physical printing, including file metadata (name, page count, byte size, color mode, and duplex specifications).
            </li>
            <li>
              <strong>Customer Contact Information:</strong> Optional customer phone number or name provided on the kiosk upload screen solely to issue SMS/WhatsApp pickup notifications and live tracking links.
            </li>
            <li>
              <strong>Vendor Partner Data:</strong> Store name, registered business email, owner contact number, physical shop address, geolocation coordinates, and payout bank account details for authorized print shop partners.
            </li>
            <li>
              <strong>Payment Transaction References:</strong> Cryptographic Razorpay payment IDs, order tokens, and transaction status. <em>Print2Me never receives or stores your credit/debit card numbers, CVVs, netbanking credentials, or UPI PINs.</em>
            </li>
          </ul>
        </section>

        {/* Section 2: Document Handling & Ephemeral Purge */}
        <section id="storage" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-sora font-bold text-ink flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-saffron-tint text-saffron flex items-center justify-center text-xs font-mono font-bold">2</span>
            <span>Document Handling &amp; Ephemeral 30-Day Purge</span>
          </h2>
          <div className="p-4 rounded-16 bg-success-tint/40 border border-success/20 text-xs text-ink space-y-2">
            <div className="font-bold flex items-center gap-2 text-success">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Strict 30-Day Ephemeral Retention Rule</span>
            </div>
            <p className="leading-relaxed text-ink-soft">
              Customer files uploaded to Microsoft Azure Blob Storage (Central India region) are automatically queued for deletion. An automated worker evaluates stored blobs continuously. Exactly 30 days after an order is placed, raw files are permanently destroyed.
            </p>
          </div>
          <p className="text-ink-soft">
            To prevent unauthorized access, raw file URLs are never exposed publicly. Access to document payloads is governed strictly by short-lived <strong>Shared Access Signatures (SAS)</strong> valid for 15 minutes, issued only to authenticated print clients (Workstation Agent or Mobile App) belonging to the print shop you selected.
          </p>
        </section>

        {/* Section 3: How Data Is Used */}
        <section id="usage" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-sora font-bold text-ink flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-saffron-tint text-saffron flex items-center justify-center text-xs font-mono font-bold">3</span>
            <span>How Your Data Is Used</span>
          </h2>
          <p className="text-ink-soft">
            Information gathered through Print2Me is utilized exclusively for operational printing fulfillment:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-soft">
            <li>Calculating page totals, duplexing rules, and accurate pricing breakdowns.</li>
            <li>Routing document payloads directly to your designated vendor&apos;s physical printer queue.</li>
            <li>Sending real-time order status updates (e.g., &quot;Printing in Progress&quot;, &quot;Ready for Pickup at Desk&quot;).</li>
            <li>Resolving customer support requests or payment dispute reconciliations.</li>
            <li>Preventing platform abuse, file injection attacks, or malicious server exploitation.</li>
          </ul>
        </section>

        {/* Section 4: Razorpay & Payment Security */}
        <section id="payments" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-sora font-bold text-ink flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-saffron-tint text-saffron flex items-center justify-center text-xs font-mono font-bold">4</span>
            <span>Razorpay &amp; Payment Security</span>
          </h2>
          <p className="text-ink-soft">
            Online transactions on Print2Me are processed securely through <strong>Razorpay Software Private Limited</strong>, an RBI-authorized Payment Aggregator and certified PCI-DSS Level 1 compliant gateway.
          </p>
          <p className="text-ink-soft">
            When you complete an online payment via UPI, Google Pay, PhonePe, credit card, or netbanking, all sensitive financial details are handled directly within Razorpay&apos;s 256-bit SSL encrypted checkout modal. Print2Me receives only a server-side HMAC SHA-256 signature confirmation validating payment settlement.
          </p>
        </section>

        {/* Section 5: Rights Under DPDP Act 2023 */}
        <section id="dpdp" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-sora font-bold text-ink flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-saffron-tint text-saffron flex items-center justify-center text-xs font-mono font-bold">5</span>
            <span>Your Rights Under the DPDP Act, 2023</span>
          </h2>
          <p className="text-ink-soft">
            In compliance with the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> of India, all users (&quot;Data Principals&quot;) retain the following statutory rights:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-16 bg-paper border border-hairline space-y-1">
              <strong className="text-xs font-bold text-ink block">Right to Access:</strong>
              <span className="text-xs text-ink-soft">Request a summary of your active orders and personal data processed by Print2Me.</span>
            </div>
            <div className="p-3.5 rounded-16 bg-paper border border-hairline space-y-1">
              <strong className="text-xs font-bold text-ink block">Right to Immediate Erasure:</strong>
              <span className="text-xs text-ink-soft">Request early deletion of your uploaded documents prior to the standard 30-day purge cycle.</span>
            </div>
            <div className="p-3.5 rounded-16 bg-paper border border-hairline space-y-1">
              <strong className="text-xs font-bold text-ink block">Right to Grievance Redressal:</strong>
              <span className="text-xs text-ink-soft">Escalate data protection concerns directly to our designated Grievance Officer.</span>
            </div>
            <div className="p-3.5 rounded-16 bg-paper border border-hairline space-y-1">
              <strong className="text-xs font-bold text-ink block">Right to Nominate:</strong>
              <span className="text-xs text-ink-soft">Nominate an individual to exercise data principal rights in the event of death or incapacity.</span>
            </div>
          </div>
        </section>

        {/* Section 6: Cookies & Client Storage */}
        <section id="cookies" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-sora font-bold text-ink flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-saffron-tint text-saffron flex items-center justify-center text-xs font-mono font-bold">6</span>
            <span>Cookies &amp; Local Storage</span>
          </h2>
          <p className="text-ink-soft">
            Print2Me uses only essential cookies and client storage mechanisms strictly necessary for platform functionality:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-ink-soft">
            <li><strong>Session Authentication:</strong> Secure HTTP-only cookies to verify vendor and administrator accounts.</li>
            <li><strong>Local Upload Drafts:</strong> Browser IndexedDB storage on your device to preserve uploaded files if your mobile network briefly disconnects during ordering.</li>
            <li><strong>Zero Tracking Cookies:</strong> We do not deploy third-party advertising cookies, cross-site trackers, or behavioral surveillance pixels.</li>
          </ul>
        </section>

        {/* Section 7: Statutory Grievance Redressal */}
        <section id="grievance" className="space-y-4 scroll-mt-24">
          <h2 className="text-xl font-sora font-bold text-ink flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-saffron-tint text-saffron flex items-center justify-center text-xs font-mono font-bold">7</span>
            <span>Statutory Grievance Redressal Officer</span>
          </h2>
          <p className="text-ink-soft">
            In accordance with the Information Technology Act 2000 and the Digital Personal Data Protection Act 2023, the details of our Grievance Redressal Officer are published below:
          </p>

          <div className="p-5 rounded-20 bg-paper border border-hairline space-y-3 font-mono text-xs">
            <div className="text-sm font-bold text-ink font-sora">Print2Me Technologies Pvt. Ltd.</div>
            <div className="space-y-1 text-ink-soft">
              <div><strong className="text-ink">Grievance Officer:</strong> Data Protection &amp; Compliance Cell</div>
              <div><strong className="text-ink">Email:</strong> <a href="mailto:support@print2me.in" className="text-saffron hover:underline font-bold">support@print2me.in</a></div>
              <div><strong className="text-ink">Physical Office:</strong> Campus Tech Hub, Bengaluru, Karnataka, India - 560001</div>
              <div><strong className="text-ink">Response SLA:</strong> Acknowledgment within 24 hours; complete resolution within 15 working days.</div>
            </div>
          </div>
        </section>

        {/* Common Privacy FAQ Accordion */}
        <section className="pt-6 border-t border-hairline space-y-4">
          <div className="flex items-center gap-2 text-ink font-sora font-bold text-base">
            <HelpCircle className="w-5 h-5 text-saffron" />
            <span>Frequently Asked Privacy Questions</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-16 bg-paper border border-hairline space-y-1.5">
              <h3 className="font-sora font-bold text-ink text-xs sm:text-sm">
                Can the print shop owner read or distribute my document?
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Print2Me partner agreements strictly prohibit vendors from viewing, copying, or distributing customer documents outside of physical spooling. Document transmission is governed by transient 15-minute SAS tokens, and all files are erased automatically within 30 days.
              </p>
            </div>

            <div className="p-4 rounded-16 bg-paper border border-hairline space-y-1.5">
              <h3 className="font-sora font-bold text-ink text-xs sm:text-sm">
                How do I request early or immediate file deletion?
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                If you printed sensitive documents and want them purged before the standard 30-day window, simply email{' '}
                <a href="mailto:support@print2me.in" className="text-saffron font-bold hover:underline">
                  support@print2me.in
                </a>{' '}
                with your Order Tracking Reference (e.g. <code>ORD-...</code>). Our Data Protection team will permanently wipe your blobs within 2 hours.
              </p>
            </div>

            <div className="p-4 rounded-16 bg-paper border border-hairline space-y-1.5">
              <h3 className="font-sora font-bold text-ink text-xs sm:text-sm">
                What happens if my payment fails?
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                If payment fails, no documents are released to the vendor&apos;s printer. In accordance with our{' '}
                <Link href="/refund" className="text-saffron font-bold hover:underline">
                  Refund &amp; Cancellation Policy
                </Link>
                , any duplicate or failed debits are reconciled automatically via Razorpay within 3 to 5 business days.
              </p>
            </div>
          </div>
        </section>

        {/* Footer Navigation within policy */}
        <div className="pt-6 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-soft">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-ink">Related Agreements:</span>
            <Link href="/terms" className="text-saffron hover:underline font-semibold">Terms of Service</Link>
            <span>•</span>
            <Link href="/refund" className="text-saffron hover:underline font-semibold">Refund Policy</Link>
            <span>•</span>
            <Link href="/contact" className="text-saffron hover:underline font-semibold">Contact Desk</Link>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-ink font-bold hover:text-saffron transition-colors"
          >
            <span>Back to Home</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
