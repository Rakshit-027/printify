import Link from 'next/link';
import { HomeContactForm } from '@/components/HomeContactForm';
import { 
  Printer, 
  CheckCircle2, 
  MapPin, 
  Mail, 
  Globe, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Smartphone,
  CreditCard
} from 'lucide-react';
import { Accordion } from '@/components/primitives';
import { JsonLd } from '@/components/JsonLd';

/* Hallmark · v2.0.0
   shape: Workbench · genre: modern-minimal · depth: full
   palette: paper #FAF7F2, ink #0E1A3A, saffron #FF8A1F, surface #FFFFFF, hairline #E7E1D6
   hero: Stage · signature: Live Counter Kiosk Ticket
   waive: 47b (kept counter ticket mockup in hero stage)
   answered: 58 (tightened hero copy to 14 words), 67 (sentence-case untracked microcopy)
*/

export default function HomePage() {
  const homeFaqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do I need to download an app to print with Print2Me?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Print2Me runs entirely in your mobile browser at print2me.in. Just scan the shop’s QR code and you are ready to upload and print in seconds.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is there a limit on file size?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can upload PDFs, JPGs, and PNGs up to 50MB each. The system auto-detects pages, colors, and paper sizes with instant price calculation.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I know my documents are private?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Files are directly streamed to our private encrypted storage via secure short-lived SAS tokens. After printing, files are automatically purged. Print2Me never stores or views customer documents.',
        },
      },
      {
        '@type': 'Question',
        name: 'What if the shop printer is broken after I pay?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'If a job fails to print or the vendor rejects it due to hardware issues, your transaction is safely reversed. You can also opt for Pay Cash on Desk to pay only when you have paper in hand.',
        },
      },
      {
        '@type': 'Question',
        name: 'How can I contact Print2Me support or partner my shop?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can reach our dedicated support desk anytime at support@print2me.in or support@print2me.com. Print vendors can also register their store directly at print2me.in/register-vendor.',
        },
      },
    ],
  };

  const faqItems = [
    {
      question: 'Do I need to download an app?',
      answer: 'No. Print2Me runs entirely in your mobile browser at print2me.in. Just scan the shop’s QR code and you are ready to upload and print in seconds.',
    },
    {
      question: 'Is there a limit on file size?',
      answer: 'You can upload PDFs, JPGs, and PNGs up to 50MB each. The system auto-detects pages, colors, and paper sizes with instant price calculation.',
    },
    {
      question: 'How do I know my documents are private?',
      answer: 'Files are directly streamed to our private encrypted storage via secure short-lived SAS tokens. After printing, files are automatically purged. Print2Me never stores or views customer documents.',
    },
    {
      question: 'What if the shop printer is broken after I pay?',
      answer: 'If a job fails to print or the vendor rejects it due to hardware issues, your transaction is safely reversed. You can also opt for Cash on Desk to pay only when you have paper in hand.',
    },
    {
      question: 'How can I contact Print2Me support or partner my shop?',
      answer: 'You can reach our dedicated support desk anytime at support@print2me.in or support@print2me.com. Print vendors can also register their store directly at print2me.in/register-vendor.',
    },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink pb-24 selection:bg-saffron selection:text-white">
      <JsonLd data={homeFaqSchema} />

      {/* 1. HERO SECTION (STAGE POSTURE) */}
      <section className="px-6 pt-16 pb-20 md:pt-24 md:pb-28 max-w-6xl mx-auto border-b border-hairline">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Headline & Actions (Cols 1-7) */}
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-block text-xs font-semibold text-saffron bg-saffron-tint px-3 py-1 rounded-pill">
              Campus printing network
            </span>

            <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight leading-[1.08]">
              Skip the line. Print in seconds.
            </h1>

            <p className="text-ink-soft text-base sm:text-lg max-w-xl leading-relaxed">
              Scan the counter QR code, upload from your phone, and collect prints.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/v/speedy-express"
                className="inline-flex items-center justify-center h-12 px-7 rounded-pill bg-saffron hover:bg-saffron/90 active:scale-[0.98] text-white font-bold text-sm shadow-md transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
              >
                Try demo print kiosk
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center h-12 px-7 rounded-pill bg-surface hover:bg-paper active:scale-[0.98] border border-hairline text-ink font-bold text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              >
                How it works
              </Link>
            </div>
          </div>

          {/* Signature Counter Kiosk Ticket (Cols 8-12) */}
          <div className="lg:col-span-5">
            <div className="bg-surface rounded-24 border border-hairline shadow-ink-soft p-6 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-hairline">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-14 bg-saffron-tint text-saffron flex items-center justify-center font-sora font-bold text-sm">
                    S
                  </div>
                  <div>
                    <div className="font-sora font-bold text-ink text-sm">SpeedyPrint Express</div>
                    <div className="text-xs text-ink-soft">Campus counter standee</div>
                  </div>
                </div>
                <span className="text-xs font-medium text-success bg-success-tint px-2.5 py-0.5 rounded-pill">
                  Live
                </span>
              </div>

              <div className="p-4 rounded-14 bg-paper border border-hairline flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-14 bg-surface border border-hairline flex items-center justify-center text-success shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-ink text-sm truncate">thesis_chapter_1.pdf</div>
                  <div className="text-xs text-ink-soft">12 pages · A4 Black &amp; White</div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <div className="text-xs text-ink-soft">Total payable</div>
                  <div className="font-sora text-2xl font-extrabold text-ink">₹24.00</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success bg-success-tint px-3 py-1.5 rounded-pill">
                  UPI &amp; cash ready
                </span>
              </div>

              <div className="pt-1">
                <div className="w-full py-3 rounded-pill bg-ink text-white text-center font-bold text-xs tracking-wide shadow-sm">
                  Pickup token: #ORD-2651
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. THE THREE FOUNDATIONS (LEDGER GRID) */}
      <section className="px-6 py-20 max-w-6xl mx-auto border-b border-hairline">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="bg-surface p-7 rounded-24 border border-hairline">
            <div className="w-11 h-11 rounded-14 bg-saffron-tint flex items-center justify-center text-saffron mb-5">
              <Smartphone className="w-5 h-5" />
            </div>
            <h2 className="font-sora text-lg font-bold text-ink mb-2">No app downloads</h2>
            <p className="text-ink-soft text-sm leading-relaxed">
              Scan the counter standee with your camera. Upload PDFs or photos directly in your mobile browser.
            </p>
          </div>

          <div className="bg-surface p-7 rounded-24 border border-hairline">
            <div className="w-11 h-11 rounded-14 bg-saffron-tint flex items-center justify-center text-saffron mb-5">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="font-sora text-lg font-bold text-ink mb-2">Flexible payments</h2>
            <p className="text-ink-soft text-sm leading-relaxed">
              Pay with UPI, Google Pay, or debit cards online. Or choose cash collection when receiving your paper.
            </p>
          </div>

          <div className="bg-surface p-7 rounded-24 border border-hairline">
            <div className="w-11 h-11 rounded-14 bg-saffron-tint flex items-center justify-center text-saffron mb-5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="font-sora text-lg font-bold text-ink mb-2">Automated purging</h2>
            <p className="text-ink-soft text-sm leading-relaxed">
              Files stream straight to private encrypted storage via temporary SAS tokens and auto-purge after printout.
            </p>
          </div>

        </div>
      </section>

      {/* 3. STEPPED WALKTHROUGH */}
      <section className="px-6 py-20 max-w-4xl mx-auto border-b border-hairline">
        <h2 className="font-sora text-2xl sm:text-3xl font-extrabold text-ink mb-12 text-center">
          Three steps from pocket to paper
        </h2>

        <div className="space-y-6">
          <div className="bg-surface p-6 rounded-24 border border-hairline flex items-start gap-5">
            <span className="w-8 h-8 rounded-full bg-saffron-tint text-saffron font-sora font-extrabold text-sm flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <h3 className="font-sora font-bold text-ink text-base mb-1">Scan the QR code</h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                Walk up to any participating print shop and scan their counter standee with your standard camera app.
              </p>
            </div>
          </div>

          <div className="bg-surface p-6 rounded-24 border border-hairline flex items-start gap-5">
            <span className="w-8 h-8 rounded-full bg-saffron-tint text-saffron font-sora font-extrabold text-sm flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <h3 className="font-sora font-bold text-ink text-base mb-1">Configure your printout</h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                Choose color, black and white, double-sided, and copies. The exact price calculates immediately.
              </p>
            </div>
          </div>

          <div className="bg-surface p-6 rounded-24 border border-hairline flex items-start gap-5">
            <span className="w-8 h-8 rounded-full bg-saffron-tint text-saffron font-sora font-extrabold text-sm flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <h3 className="font-sora font-bold text-ink text-base mb-1">Collect your pages</h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                Show your digital pickup token at the counter and take your freshly printed documents.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-saffron hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded-sm"
          >
            <span>Read full walkthrough</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 4. SHOP SEARCH LOCATOR */}
      <section className="px-6 py-20 max-w-4xl mx-auto border-b border-hairline">
        <div className="bg-surface rounded-24 p-8 border border-hairline">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="font-sora text-xl sm:text-2xl font-extrabold text-ink mb-1">
                Find a print kiosk
              </h2>
              <p className="text-ink-soft text-sm">
                Search verified print counters across colleges and commercial complexes.
              </p>
            </div>
            <Link
              href="/locations"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-ink hover:text-saffron transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-sm"
            >
              <span>Browse directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-ink-soft">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by college name, campus, or landmark..."
              className="w-full h-12 pl-11 pr-28 rounded-pill bg-paper border border-hairline text-ink text-sm font-medium placeholder:text-ink-soft/70 focus-visible:outline-none focus-visible:border-saffron focus-visible:ring-2 focus-visible:ring-saffron/20 transition-colors motion-reduce:transition-none"
            />
            <Link
              href="/locations"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-ink hover:bg-ink/90 text-white rounded-pill text-xs font-bold inline-flex items-center justify-center transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Search
            </Link>
          </div>
        </div>
      </section>

      {/* 5. VENDOR PRICING PLANS */}
      <section className="px-6 py-20 max-w-5xl mx-auto border-b border-hairline">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-sora text-2xl sm:text-3xl font-extrabold text-ink mb-2">
            Vendor plan options
          </h2>
          <p className="text-ink-soft text-sm">
            Simple plans for print shop operators. No hardware rental fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* Starter Plan */}
          <div className="bg-surface rounded-24 p-8 border border-hairline flex flex-col justify-between">
            <div>
              <div className="text-sm font-bold text-ink mb-1">Standard Operator</div>
              <div className="font-sora text-4xl font-extrabold text-ink mb-6">
                ₹0 <span className="text-xs font-normal text-ink-soft font-inter">per month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-ink-soft mb-8">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Unlimited mobile uploads</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Free Windows Spooler Agent software</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Personalized counter QR code kit</span>
                </li>
              </ul>
            </div>
            <Link
              href="/register-vendor"
              className="w-full h-12 rounded-pill bg-surface hover:bg-paper active:scale-[0.98] border border-hairline text-ink font-bold text-xs inline-flex items-center justify-center transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Start free kiosk
            </Link>
          </div>

          {/* Partner Plan */}
          <div className="bg-ink rounded-24 p-8 text-white flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-bold text-white">Partner Program</div>
                <span className="text-[11px] font-semibold text-saffron bg-white/10 px-2.5 py-0.5 rounded-pill">
                  Recommended
                </span>
              </div>
              <div className="font-sora text-4xl font-extrabold text-white mb-6">
                2% <span className="text-xs font-normal text-white/70 font-inter">per transaction</span>
              </div>
              <ul className="space-y-3.5 text-sm text-white/80 mb-8">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-saffron shrink-0" />
                  <span>Direct Razorpay partner settlement</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-saffron shrink-0" />
                  <span>Custom rate charts (color, duplex, bond)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-saffron shrink-0" />
                  <span>Real-time counter earnings telemetry</span>
                </li>
              </ul>
            </div>
            <Link
              href="/register-vendor"
              className="w-full h-12 rounded-pill bg-saffron hover:bg-saffron/90 active:scale-[0.98] text-white font-bold text-xs inline-flex items-center justify-center transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              Enroll as partner
            </Link>
          </div>

        </div>
      </section>

      {/* 6. COMMON QUESTIONS (ACCORDION) */}
      <section className="px-6 py-20 max-w-3xl mx-auto border-b border-hairline">
        <div className="text-center mb-10">
          <h2 className="font-sora text-2xl sm:text-3xl font-extrabold text-ink mb-2">
            Frequently asked questions
          </h2>
          <p className="text-ink-soft text-sm">
            Common questions regarding ordering, security, and print shop setup.
          </p>
        </div>

        <Accordion items={faqItems} />

        <div className="mt-8 text-center">
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-saffron hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded-sm"
          >
            <span>View all questions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 7. CONTACT & SUPPORT DESK */}
      <section id="contact" className="px-6 py-20 max-w-4xl mx-auto border-b border-hairline scroll-mt-16">
        <div className="bg-surface rounded-24 p-8 border border-hairline">
          <div className="text-center max-w-lg mx-auto mb-10">
            <h2 className="font-sora text-2xl font-extrabold text-ink mb-2">
              Contact our support desk
            </h2>
            <p className="text-ink-soft text-sm">
              Questions about an order or interest in kiosk partnership? Our team responds within four hours.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <a
              href="mailto:support@print2me.in"
              className="p-4 rounded-14 bg-paper border border-hairline hover:border-saffron/50 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <div className="w-8 h-8 rounded-14 bg-saffron-tint text-saffron flex items-center justify-center mb-2">
                <Mail className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-medium text-ink-soft">Direct support</div>
              <div className="font-sora font-bold text-ink text-sm">support@print2me.in</div>
            </a>

            <a
              href="mailto:support@print2me.com"
              className="p-4 rounded-14 bg-paper border border-hairline hover:border-saffron/50 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <div className="w-8 h-8 rounded-14 bg-success-tint text-success flex items-center justify-center mb-2">
                <Globe className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-medium text-ink-soft">Campus partnerships</div>
              <div className="font-sora font-bold text-ink text-sm">support@print2me.com</div>
            </a>

            <div className="p-4 rounded-14 bg-paper border border-hairline">
              <div className="w-8 h-8 rounded-14 bg-paper text-ink flex items-center justify-center mb-2 border border-hairline">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-[11px] font-medium text-ink-soft">Response time</div>
              <div className="font-sora font-bold text-ink text-sm">Under 4 hours</div>
            </div>
          </div>

          <HomeContactForm />
        </div>
      </section>

      {/* 8. VENDOR CALLOUT BANNER */}
      <section className="px-6 pt-20 max-w-5xl mx-auto">
        <div className="bg-ink rounded-24 p-8 sm:p-12 text-center text-white border border-ink">
          <div className="w-12 h-12 mx-auto rounded-14 bg-white/10 flex items-center justify-center mb-5 text-white">
            <Printer className="w-6 h-6" />
          </div>
          <h2 className="font-sora text-2xl sm:text-3xl font-extrabold text-white mb-3">
            Run your print shop with Print2Me
          </h2>
          <p className="text-white/80 max-w-lg mx-auto text-sm sm:text-base leading-relaxed mb-8">
            Eliminate WhatsApp queues and flash drives. Receive customer jobs directly into your local Windows PC spooler.
          </p>
          <Link
            href="/vendor"
            className="inline-flex items-center justify-center h-12 px-8 rounded-pill bg-white hover:bg-paper text-ink font-bold text-xs shadow-md transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Open vendor portal</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
}
