'use client';

import Link from 'next/link';
import { 
  QrCode, 
  Zap, 
  ShieldCheck, 
  Smartphone,
  ArrowRight,
  Printer,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { Button, Accordion } from '@/components/primitives';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper pb-20">
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
              <Link href="/vendor" className="w-full sm:w-auto">
                <Button variant="primary" className="w-full h-14 px-8 text-base">
                  Partner your shop
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
      </section>

      {/* LIVE SHOP LOCATOR */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <div className="bg-saffron-tint rounded-[32px] p-8 md:p-12 border border-saffron/20 flex flex-col md:flex-row items-center gap-8 shadow-sm">
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white text-saffron shadow-sm mb-2">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="font-sora text-3xl font-extrabold text-ink">Find a PrintFlow shop</h2>
            <p className="text-ink-soft text-lg">We are expanding rapidly across campuses. Search for a partnered print shop near your college or hostel.</p>
          </div>
          <div className="flex-1 w-full relative">
            <input 
              type="text" 
              placeholder="Enter your college or city..." 
              className="w-full h-16 rounded-[20px] px-6 pr-16 font-medium text-ink bg-surface border border-hairline shadow-sm focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all" 
            />
            <button className="absolute right-2 top-2 bottom-2 w-12 bg-ink rounded-14 flex items-center justify-center text-white hover:bg-ink/90 transition-colors shadow-sm">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* INTERACTIVE FAQ */}
      <section className="px-6 max-w-3xl mx-auto mb-32">
        <div className="text-center mb-10">
          <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-ink mb-4">Frequently Asked Questions</h2>
          <p className="text-ink-soft text-lg">Everything you need to know about printing seamlessly.</p>
        </div>
        <Accordion items={[
          { question: "Do I need to download an app?", answer: "No. PrintFlow runs entirely in your mobile browser. Just scan the shop's QR code and you're ready to upload and print." },
          { question: "Is there a limit on file size?", answer: "You can upload PDFs, JPGs, and PNGs up to 50MB each. The system will auto-detect pages and optimize them for the print spooler perfectly." },
          { question: "How do I know my documents are private?", answer: "Files are directly streamed to our secure Azure Blob containers via SAS tokens. After printing, they are automatically purged within 30 days. We never sell or look at your data." },
          { question: "What if the shop printer is broken after I pay?", answer: "If a job fails to print or the vendor rejects it due to hardware issues, your transaction is safely reversed. You can also opt for 'Pay Cash on Desk' to pay only when you have paper in hand." },
        ]} />
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
            <Button variant="outline" className="w-full h-14">Get Started for Free</Button>
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
            <Button variant="saffron" className="w-full h-14">Become a Pro Partner</Button>
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section className="px-6 max-w-5xl mx-auto mb-32">
        <div className="bg-surface rounded-[32px] p-8 md:p-12 border border-hairline shadow-ink-soft">
          <div className="text-center mb-10">
            <h2 className="font-sora text-3xl md:text-4xl font-extrabold text-ink mb-4">Get in touch</h2>
            <p className="text-ink-soft text-lg">Have a question or want to partner with us? Send us a message.</p>
          </div>
          <form className="max-w-2xl mx-auto space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-ink ml-1">Name</label>
                <input type="text" className="w-full bg-paper border border-hairline rounded-[16px] px-5 py-4 font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all placeholder:text-ink-soft/50" placeholder="Rahul Kumar" />
              </div>
              <div className="space-y-2 text-left">
                <label className="text-sm font-bold text-ink ml-1">Email</label>
                <input type="email" className="w-full bg-paper border border-hairline rounded-[16px] px-5 py-4 font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all placeholder:text-ink-soft/50" placeholder="rahul@example.com" />
              </div>
            </div>
            <div className="space-y-2 text-left">
              <label className="text-sm font-bold text-ink ml-1">Message</label>
              <textarea rows={4} className="w-full bg-paper border border-hairline rounded-[16px] px-5 py-4 font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all resize-none placeholder:text-ink-soft/50" placeholder="How can we help you?"></textarea>
            </div>
            <Button variant="primary" className="w-full h-14 text-base">Send Message</Button>
          </form>
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
