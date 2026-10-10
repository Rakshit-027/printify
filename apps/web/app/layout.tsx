import type { Metadata } from 'next';
import { Sora, Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Printer, ShieldCheck, Store, LogIn } from 'lucide-react';

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-sora' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });
const notoSansDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '500', '600'], variable: '--font-noto-sans-devanagari' });

export const metadata: Metadata = {
  title: 'PrintFlow | Cloud Online Printing & Vendor Management',
  description: 'Enterprise QR-based online document printing and vendor management system connected with Windows desktop print agents.',
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
        <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-hairline px-6 py-3.5 shadow-ink-soft">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-14 bg-saffron-tint flex items-center justify-center text-saffron font-bold transition-transform active:scale-95">
                <Printer className="w-5 h-5 text-saffron" />
              </div>
              <div>
                <span className="text-xl font-sora font-extrabold tracking-tight text-ink">
                  PrintFlow
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-3 sm:gap-4 text-sm font-medium">
              <Link
                href="/v/speedy-express"
                className="hidden md:flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors px-3 py-1.5 rounded-14 hover:bg-paper"
              >
                <span>Demo QR Store</span>
              </Link>
              <Link
                href="/vendor"
                className="flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors px-3 py-1.5 rounded-14 hover:bg-paper"
              >
                <Store className="w-4 h-4 text-ink-soft" />
                <span className="hidden sm:inline">Vendor</span>
              </Link>
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors px-3 py-1.5 rounded-14 hover:bg-paper"
              >
                <ShieldCheck className="w-4 h-4 text-ink-soft" />
                <span>Admin</span>
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 bg-ink hover:bg-ink/90 active:scale-95 text-white px-4 py-2 rounded-14 text-sm font-medium transition-all shadow-ink-soft"
              >
                <LogIn className="w-4 h-4 text-white" />
                <span>Sign In</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Body Content */}
        <main className="flex-1 pb-24 sm:pb-0">{children}</main>

        {/* Proper Fat Footer */}
        <footer className="border-t border-hairline bg-surface pt-16 pb-32 sm:pb-8 px-6 mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="col-span-1 md:col-span-2 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[10px] bg-saffron-tint flex items-center justify-center text-saffron font-bold">
                    <Printer className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-sora font-extrabold text-ink">PrintFlow</span>
                </div>
                <p className="text-ink-soft leading-relaxed max-w-sm">
                  Modernizing campus printing. Say goodbye to pen drives, unsecured WhatsApp documents, and long queues.
                </p>
                <div className="flex items-center gap-3 pt-2 font-bold text-ink-soft">
                  <a href="#" className="w-10 h-10 rounded-full bg-paper border border-hairline flex items-center justify-center hover:text-saffron hover:border-saffron/30 transition-all">X</a>
                  <a href="#" className="w-10 h-10 rounded-full bg-paper border border-hairline flex items-center justify-center hover:text-saffron hover:border-saffron/30 transition-all">in</a>
                </div>
              </div>
              
              <div>
                <h4 className="font-sora font-bold text-ink mb-5">Product</h4>
                <ul className="space-y-3 text-sm text-ink-soft">
                  <li><Link href="/" className="hover:text-ink transition-colors">Home</Link></li>
                  <li><Link href="/vendor" className="hover:text-ink transition-colors">Vendor Portal</Link></li>
                  <li><Link href="/admin" className="hover:text-ink transition-colors">Admin Hub</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-sora font-bold text-ink mb-5">Legal & Support</h4>
                <ul className="space-y-3 text-sm text-ink-soft">
                  <li><Link href="#" className="hover:text-ink transition-colors">Privacy Policy</Link></li>
                  <li><Link href="#" className="hover:text-ink transition-colors">Terms of Service</Link></li>
                  <li><Link href="#" className="hover:text-ink transition-colors">Refund Policy</Link></li>
                  <li><Link href="#" className="hover:text-ink transition-colors">Contact Us</Link></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-hairline flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-soft">
              <div>© {new Date().getFullYear()} PrintFlow Inc. All rights reserved.</div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-paper rounded-pill border border-hairline shadow-sm">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>System Status: <strong>All Nodes Operational</strong></span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
