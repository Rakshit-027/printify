'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  QrCode, 
  Zap, 
  ShieldCheck, 
  Smartphone,
  ArrowRight,
  Printer,
  CheckCircle2,
  MapPin,
  Mail,
  MessageSquare,
  Globe,
  Clock,
  Sparkles,
  Send
} from 'lucide-react';
import { Button, Accordion } from '@/components/primitives';
import { JsonLd } from '@/components/JsonLd';

export default function HomePage() {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

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

  return (
    <div className="min-h-screen bg-paper pb-20">
      <JsonLd data={homeFaqSchema} />

      {/* HERO SECTION WITH VISUAL MOCKUP */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 md:pt-28 md:pb-32 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-saffron-tint text-saffron text-xs font-bold uppercase tracking-wider mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
              The modern campus printing network
            </div>
            
            <h1 className="font-sora text-5xl lg:text-6xl xl:text-7xl font-extrabold text-ink tracking-tight mb-6 leading-[1.1]">
              Skip the line. <br className="hidden md:block"/>
              Print in <span className="text-saffron">seconds</span>.
            </h1>
            
            <p className="text-ink-soft text-lg md:text-xl max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              The fastest way to print documents at your local shop. Scan a QR code, upload from your phone, pay securely, and pick it up. No apps or logins required.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link href="/v/speedy-express" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full h-14 px-8 text-base">
                  Try Demo Print Kiosk
                </Button>
              </Link>
              <Link href="/how-it-works" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full h-14 px-8 text-base">
                  How It Works
                </Button>
              </Link>
            </div>
          </div>

          {/* Phone Mockup Graphic */}
          <div className="flex-1 w-full max-w-md lg:max-w-none relative animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="relative mx-auto w-[300px] h-[600px] bg-surface rounded-[48px] border-[12px] border-ink shadow-2xl overflow-hidden flex flex-col">
              <div className="absolute top-0 inset-x-0 h-6 bg-ink rounded-b-2xl w-32 mx-auto z-50" />
              <div className="bg-paper flex-1 pt-12 px-4 pb-4 overflow-hidden relative">
                {/* Mock UI */}
                <div className="bg-surface rounded-[24px] shadow-sm p-4 mb-4 border border-hairline flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-saffron-tint flex items-center justify-center text-saffron font-bold">S</div>
                  <div>
                    <div className="font-sora font-bold text-ink text-sm">SpeedyPrint Express</div>
                    <div className="text-xs text-ink-soft">Campus Arcade</div>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-hairline rounded-[20px] p-6 text-center mb-4 bg-surface">
                  <div className="w-12 h-12 mx-auto bg-saffron-tint rounded-full flex items-center justify-center mb-3">
                    <Printer className="w-6 h-6 text-saffron" />
                  </div>
                  <div className="font-bold text-ink text-sm">Tap to upload files</div>
                  <div className="text-xs text-ink-soft">PDF, JPG, PNG</div>
                </div>

                <div className="bg-surface border border-hairline rounded-[20px] p-3 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-14 bg-paper border border-hairline flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-ink text-sm">assignment.pdf</div>
                    <div className="text-xs text-ink-soft">12 pages</div>
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 bg-ink text-white rounded-pill py-3 text-center font-bold text-sm shadow-lg">
                  Pay ₹24.00 now
                </div>
              </div>
            </div>
            {/* Decorative background blob */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-saffron/20 rounded-full blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* VALUE PROPOSITION GRID */}
      <section className="px-6 max-w-7xl mx-auto mb-32">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-surface p-8 rounded-[24px] border border-hairline shadow-ink-soft hover:-translate-y-1 transition-transform duration-300">
            <div className="w-14 h-14 rounded-20 bg-saffron-tint flex items-center justify-center mb-6">
              <Smartphone className="w-7 h-7 text-saffron" />
            </div>
            <h3 className="font-sora text-xl font-bold text-ink mb-3">No apps to download</h3>
            <p className="text-ink-soft leading-relaxed text-sm md:text-base">
              Just scan the shop's QR code with your phone's camera. Upload PDFs or images directly from your mobile browser in seconds.
            </p>
          </div>
          
          <div className="bg-surface p-8 rounded-[24px] border border-hairline shadow-ink-soft hover:-translate-y-1 transition-transform duration-300">
            <div className="w-14 h-14 rounded-20 bg-success-tint flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-success" />
            </div>
            <h3 className="font-sora text-xl font-bold text-ink mb-3">Instant Payments</h3>
            <p className="text-ink-soft leading-relaxed text-sm md:text-base">
              Pay via UPI, GPay, or cards seamlessly online. Or choose to pay cash at the counter when you physically pick up your prints.
            </p>
          </div>
          
          <div className="bg-surface p-8 rounded-[24px] border border-hairline shadow-ink-soft hover:-translate-y-1 transition-transform duration-300">
            <div className="w-14 h-14 rounded-20 bg-paper flex items-center justify-center mb-6 border border-hairline">
              <ShieldCheck className="w-7 h-7 text-ink" />
            </div>
            <h3 className="font-sora text-xl font-bold text-ink mb-3">100% Private & Secure</h3>
            <p className="text-ink-soft leading-relaxed text-sm md:text-base">
              Your files are securely transmitted and automatically deleted from our servers within 30 days. We respect your privacy.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-ink text-center mb-16">How it works</h2>
        
        <div className="space-y-12 relative">
          <div className="hidden md:block absolute left-[39px] top-10 bottom-10 w-0.5 bg-hairline" />
          
          <div className="flex flex-col md:flex-row gap-6 md:gap-12 relative z-10">
            <div className="w-20 h-20 shrink-0 rounded-full bg-surface border-2 border-ink flex items-center justify-center font-sora text-3xl font-bold text-ink shadow-sm">
              1
            </div>
            <div className="pt-3">
              <h3 className="font-sora text-2xl font-bold text-ink mb-2">Scan the QR code</h3>
              <p className="text-ink-soft text-lg">Walk up to any partnered print shop and scan their counter standee using your regular camera app.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-12 relative z-10">
            <div className="w-20 h-20 shrink-0 rounded-full bg-surface border-2 border-saffron flex items-center justify-center font-sora text-3xl font-bold text-saffron shadow-sm">
              2
            </div>
            <div className="pt-3">
              <h3 className="font-sora text-2xl font-bold text-ink mb-2">Upload & Customize</h3>
              <p className="text-ink-soft text-lg">Select your documents. Choose color, B&W, duplex, or custom copies directly on your phone screen.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-12 relative z-10">
            <div className="w-20 h-20 shrink-0 rounded-full bg-surface border-2 border-success flex items-center justify-center font-sora text-3xl font-bold text-success shadow-sm">
              3
            </div>
            <div className="pt-3">
              <h3 className="font-sora text-2xl font-bold text-ink mb-2">Collect Prints</h3>
              <p className="text-ink-soft text-lg">Pay in one click. Show your pickup token at the counter and receive your freshly printed documents.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-bold text-saffron hover:underline">
            <span>Read full step-by-step walkthrough</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* LIVE SHOP LOCATOR */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <div className="bg-saffron-tint rounded-[32px] p-8 md:p-12 border border-saffron/20 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white text-saffron shadow-sm mb-2">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="font-sora text-3xl font-extrabold text-ink">Find a Print2Me shop</h2>
            <p className="text-ink-soft text-lg">We are expanding rapidly across colleges and commercial hubs. Search for a partnered print kiosk on print2me.in.</p>
            <div className="pt-1">
              <Link href="/locations" className="inline-flex items-center gap-1.5 text-xs font-bold text-ink hover:text-saffron transition-colors">
                <span>Browse all verified college &amp; market print kiosks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <input 
              type="text" 
              placeholder="Enter your college or city..." 
              className="w-full h-16 rounded-[20px] px-6 pr-16 font-medium text-ink bg-surface border border-hairline shadow-sm focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all" 
            />
            <Link href="/locations" className="absolute right-2 top-2 bottom-2 w-12 bg-ink rounded-14 flex items-center justify-center text-white hover:bg-ink/90 transition-colors shadow-sm" aria-label="Search locations">
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* INTERACTIVE FAQ */}
      <section className="px-6 max-w-3xl mx-auto mb-32">
        <div className="text-center mb-10">
          <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-ink mb-4">Frequently Asked Questions</h2>
          <p className="text-ink-soft text-lg">Everything you need to know about printing seamlessly with Print2Me.</p>
        </div>
        <Accordion items={[
          { question: "Do I need to download an app?", answer: "No. Print2Me runs entirely in your mobile browser at print2me.in. Just scan the shop's QR code and you're ready to upload and print in seconds." },
          { question: "Is there a limit on file size?", answer: "You can upload PDFs, JPGs, and PNGs up to 50MB each. The system auto-detects pages, colors, and paper sizes with instant price calculation." },
          { question: "How do I know my documents are private?", answer: "Files are directly streamed to our private encrypted storage via secure short-lived SAS tokens. After printing, files are automatically purged. Print2Me never stores or views customer documents." },
          { question: "What if the shop printer is broken after I pay?", answer: "If a job fails to print or the vendor rejects it due to hardware issues, your transaction is safely reversed. You can also opt for 'Pay Cash on Desk' to pay only when you have paper in hand." },
          { question: "How can I contact Print2Me support or partner my shop?", answer: "You can reach our dedicated support desk anytime at support@print2me.in or support@print2me.com. Print vendors can also register their store directly at print2me.in/register-vendor." },
        ]} />
        <div className="mt-8 text-center">
          <Link href="/faq" className="inline-flex items-center gap-2 text-sm font-bold text-saffron hover:underline">
            <span>Explore all questions on pricing, privacy, and support</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* VENDOR PRICING */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <div className="text-center mb-16">
          <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-ink mb-4">Transparent Vendor Pricing</h2>
          <p className="text-ink-soft text-lg">No monthly fees. No hardware rentals. Pay only when you earn.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="bg-surface rounded-[32px] p-8 border border-hairline shadow-ink-soft">
            <div className="text-saffron font-sora font-bold text-xl mb-2">Basic</div>
            <div className="font-sora text-5xl font-extrabold text-ink mb-6">₹0 <span className="text-lg text-ink-soft font-inter font-normal">/month</span></div>
            <ul className="space-y-4 text-ink-soft font-medium mb-8">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success shrink-0" /> Unlimited customer orders</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success shrink-0" /> Free Windows Spooler Agent</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-success shrink-0" /> Downloadable QR standee</li>
            </ul>
            <Link href="/register-vendor" className="block">
              <Button variant="outline" className="w-full h-14">Get Started for Free</Button>
            </Link>
          </div>
          <div className="bg-ink rounded-[32px] p-8 shadow-2xl relative overflow-hidden transform md:scale-105">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-saffron-tint text-saffron text-[10px] font-bold px-3 py-1.5 rounded-pill uppercase tracking-wider">Most Popular</span>
            </div>
            <div className="text-saffron-tint font-sora font-bold text-xl mb-2">Pro Partner</div>
            <div className="font-sora text-5xl font-extrabold text-white mb-6">2% <span className="text-lg text-white/60 font-inter font-normal">/transaction</span></div>
            <ul className="space-y-4 text-white/80 font-medium mb-8">
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-saffron shrink-0" /> Razorpay online settlement</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-saffron shrink-0" /> Custom pricing matrices</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-saffron shrink-0" /> Detailed analytics dashboard</li>
            </ul>
            <Link href="/register-vendor" className="block">
              <Button variant="saffron" className="w-full h-14">Become a Pro Partner</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PROFESSIONAL CONTACT & SUPPORT SECTION */}
      <section id="contact" className="px-6 max-w-5xl mx-auto mb-32 scroll-mt-24">
        <div className="bg-surface rounded-[32px] p-8 md:p-12 border border-hairline shadow-ink-soft">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-saffron-tint text-saffron text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>We&apos;re Here to Help</span>
            </div>
            <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-ink mb-3">Get in touch with Print2Me</h2>
            <p className="text-ink-soft text-base md:text-lg">
              Have a support question, feedback, or want to partner your college print shop? Our team is always active.
            </p>
          </div>

          {/* Quick Contact Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <a 
              href="mailto:support@print2me.in"
              className="p-5 rounded-24 bg-paper border border-hairline hover:border-saffron/40 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-14 bg-saffron-tint text-saffron flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-xs text-ink-soft font-semibold uppercase tracking-wider">Primary Support</div>
              <div className="font-sora font-bold text-ink text-sm sm:text-base mt-1 group-hover:text-saffron transition-colors">
                support@print2me.in
              </div>
              <p className="text-[11px] text-ink-soft mt-1">Queries &amp; assistance · 24/7 inbox</p>
            </a>

            <a 
              href="mailto:support@print2me.com"
              className="p-5 rounded-24 bg-paper border border-hairline hover:border-saffron/40 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-14 bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Globe className="w-5 h-5" />
              </div>
              <div className="text-xs text-ink-soft font-semibold uppercase tracking-wider">Alternate / Global Desk</div>
              <div className="font-sora font-bold text-ink text-sm sm:text-base mt-1 group-hover:text-emerald-600 transition-colors">
                support@print2me.com
              </div>
              <p className="text-[11px] text-ink-soft mt-1">Partnerships &amp; enterprise kiosks</p>
            </a>

            <div className="p-5 rounded-24 bg-paper border border-hairline">
              <div className="w-10 h-10 rounded-14 bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs text-ink-soft font-semibold uppercase tracking-wider">Guaranteed Response</div>
              <div className="font-sora font-bold text-ink text-sm sm:text-base mt-1">
                Under 4 Hours
              </div>
              <p className="text-[11px] text-ink-soft mt-1">Dedicated agent on campus issues</p>
            </div>
          </div>

          {/* Contact Message Form */}
          {contactSubmitted ? (
            <div className="max-w-2xl mx-auto p-8 rounded-[24px] bg-emerald-50/80 border border-emerald-200 text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-sora text-xl font-bold text-emerald-950">Message Sent Successfully!</h3>
              <p className="text-sm text-emerald-800 max-w-md mx-auto">
                Thank you for reaching out. A confirmation has been routed to <strong>support@print2me.in</strong>. Our team will get back to you at <strong>{contactForm.email || 'your email'}</strong> within 2-4 hours.
              </p>
              <button
                type="button"
                onClick={() => {
                  setContactSubmitted(false);
                  setContactForm({ name: '', email: '', message: '' });
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form 
              className="max-w-2xl mx-auto space-y-5" 
              onSubmit={(e) => {
                e.preventDefault();
                setContactSubmitted(true);
              }}
            >
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-ink ml-1">Your Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full bg-paper border border-hairline rounded-[16px] px-4 py-3.5 text-sm font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all placeholder:text-ink-soft/40" 
                    placeholder="e.g. Rahul Sharma" 
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-ink ml-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full bg-paper border border-hairline rounded-[16px] px-4 py-3.5 text-sm font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all placeholder:text-ink-soft/40" 
                    placeholder="e.g. rahul@example.com" 
                  />
                </div>
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-ink ml-1">Message / Partner Inquiry</label>
                <textarea 
                  rows={4} 
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full bg-paper border border-hairline rounded-[16px] px-4 py-3.5 text-sm font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all resize-none placeholder:text-ink-soft/40" 
                  placeholder="Tell us about your print requirements, shop location, or question..."
                />
              </div>
              <Button variant="primary" type="submit" className="w-full h-13 text-sm font-bold shadow-md">
                <span className="flex items-center justify-center gap-2">
                  Send to support@print2me.in <Send className="w-4 h-4 text-saffron" />
                </span>
              </Button>
            </form>
          )}

        </div>
      </section>

      {/* VENDOR CTA SECTION */}
      <section className="px-6 max-w-5xl mx-auto">
        <div className="bg-ink rounded-[32px] p-8 md:p-12 text-center relative overflow-hidden shadow-2xl">
          {/* Background decorative elements */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-saffron/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/20">
              <Printer className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-white mb-4">
              Own a print shop?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-10 text-lg leading-relaxed">
              Automate your workflow. Get a personalized QR standee, receive files directly to your Windows PC print spooler, and eliminate USB drives forever.
            </p>
            
            <Link href="/vendor">
              <Button variant="surface" className="w-full sm:w-auto bg-white text-ink hover:bg-paper font-bold font-inter px-8 h-14 rounded-pill transition-all inline-flex items-center justify-center gap-2 shadow-lg">
                Open Vendor Portal <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
