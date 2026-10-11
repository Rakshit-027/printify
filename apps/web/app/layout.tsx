import type { Metadata } from 'next';
import { Sora, Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Printer, ShieldCheck, Store, LogIn, Mail, Globe, ArrowUpRight } from 'lucide-react';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { BrandLogo } from '@/components/BrandLogo';

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-sora' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });
const notoSansDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '500', '600'], variable: '--font-noto-sans-devanagari' });

export const metadata: Metadata = {
  title: 'Print2Me | Fast Campus & Counter Online Printing Network (print2me.in)',
  description: 'Skip the print shop queue with Print2Me (print2me.in). Scan counter QR, upload PDF/images from your phone, pay seamlessly, and pick up clean prints.',
  metadataBase: new URL('https://print2me.in'),
  icons: {
    icon: '/brand/print2me-app-icon.png',
    apple: '/brand/print2me-app-icon.png',
  },
  keywords: ['print2me', 'print2me.in', 'online xerox', 'campus printing', 'print shop qr', 'fast print india'],
  openGraph: {
    title: 'Print2Me | Modern Online Printing Network',
    description: 'Instant QR-based print ordering for students, businesses, and campus walk-ins. Powered by print2me.in',
    url: 'https://print2me.in',
    siteName: 'Print2Me',
    locale: 'en_IN',
    type: 'website',
    images: ['/brand/print2me-logo-horizontal.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`min-h-screen flex flex-col justify-between selection:bg-saffron selection:text-white ${sora.variable} ${inter.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable} font-inter text-ink`}>
        {/* Global Navigation Bar */}
        <GlobalNavbar />

        {/* Main Body Content */}
        <main className="flex-1 pb-24 sm:pb-0">{children}</main>

        {/* Professional Footer */}
        <footer className="border-t border-hairline bg-surface pt-16 pb-32 sm:pb-8 px-6 mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="col-span-1 md:grid-cols-2 md:col-span-2 space-y-4">
                <div>
                  <BrandLogo variant="horizontal" height={38} />
                  <div className="text-[11px] text-ink-soft font-mono mt-1">print2me.in · Campus &amp; Counter Print Hub</div>
                </div>
                <p className="text-ink-soft leading-relaxed max-w-sm text-sm">
                  India&apos;s modern counter &amp; campus printing network. Say goodbye to pen drives, unsecured WhatsApp documents, and tedious shop queues.
                </p>
                <div className="pt-2 flex flex-col gap-2 text-xs">
                  <div className="flex items-center gap-2 text-ink-soft">
                    <Mail className="w-3.5 h-3.5 text-saffron shrink-0" />
                    <span>Customer Support:</span>
                    <a href="mailto:support@print2me.in" className="font-semibold text-ink hover:text-saffron transition-colors">
                      support@print2me.in
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-ink-soft">
                    <Globe className="w-3.5 h-3.5 text-saffron shrink-0" />
                    <span>Official Portal:</span>
                    <a href="https://print2me.in" target="_blank" rel="noreferrer" className="font-semibold text-ink hover:text-saffron transition-colors inline-flex items-center gap-0.5">
                      print2me.in <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-sora font-bold text-ink mb-5 text-sm uppercase tracking-wider">Product &amp; Portals</h4>
                <ul className="space-y-3 text-sm text-ink-soft">
                  <li><Link href="/" className="hover:text-ink transition-colors">Home Platform</Link></li>
                  <li><Link href="/vendor" className="hover:text-ink transition-colors">Vendor Station Portal</Link></li>
                  <li><Link href="/register-vendor" className="hover:text-ink transition-colors font-medium text-saffron">Partner Your Store</Link></li>
                  <li><Link href="/admin" className="hover:text-ink transition-colors">Admin Command Hub</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-sora font-bold text-ink mb-5 text-sm uppercase tracking-wider">Help &amp; Inquiries</h4>
                <ul className="space-y-3 text-sm text-ink-soft">
                  <li>
                    <a href="mailto:support@print2me.in" className="hover:text-ink transition-colors flex items-center gap-2 font-medium text-ink">
                      <Mail className="w-3.5 h-3.5 text-saffron" />
                      support@print2me.in
                    </a>
                  </li>
                  <li>
                    <a href="mailto:support@print2me.com" className="hover:text-ink transition-colors text-xs text-ink-soft">
                      support@print2me.com
                    </a>
                  </li>
                  <li><a href="#contact" className="hover:text-ink transition-colors">Contact Sales Team</a></li>
                  <li><span className="text-xs text-ink-soft/70">Response time: &lt; 4 hours</span></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-hairline flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-soft">
              <div>© {new Date().getFullYear()} Print2Me (print2me.in). All rights reserved.</div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-paper rounded-pill border border-hairline shadow-sm">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>print2me.in Cloud: <strong>All Systems Operational</strong></span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
