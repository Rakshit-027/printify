'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Globe, ArrowUpRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export function GlobalFooter() {
  const pathname = usePathname();

  // Suppress footer on kiosk and full-screen dashboards (/v/, /vendor, /admin)
  if (pathname?.startsWith('/v/') || pathname?.startsWith('/vendor') || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="border-t border-hairline bg-surface pt-16 pb-32 sm:pb-10 px-6 mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-16">
          {/* Brand Col */}
          <div className="col-span-1 md:col-span-2 space-y-4">
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

          {/* Services & Solutions */}
          <div>
            <h4 className="font-sora font-bold text-ink mb-5 text-sm uppercase tracking-wider">Services</h4>
            <ul className="space-y-3 text-sm text-ink-soft">
              <li><Link href="/" className="hover:text-ink transition-colors">Home Platform</Link></li>
              <li><Link href="/how-it-works" className="hover:text-ink transition-colors">How It Works</Link></li>
              <li><Link href="/document-printing" className="hover:text-ink transition-colors">Document Printing</Link></li>
              <li><Link href="/campus-printing" className="hover:text-ink transition-colors">Campus Solutions</Link></li>
              <li><Link href="/locations" className="hover:text-ink transition-colors">Find a Print Shop</Link></li>
            </ul>
          </div>

          {/* Partners & Shops */}
          <div>
            <h4 className="font-sora font-bold text-ink mb-5 text-sm uppercase tracking-wider">Shop Partners</h4>
            <ul className="space-y-3 text-sm text-ink-soft">
              <li><Link href="/partner" className="hover:text-ink transition-colors font-medium text-saffron">Partner Overview</Link></li>
              <li><Link href="/register-vendor" className="hover:text-ink transition-colors">Register Your Store</Link></li>
              <li><Link href="/vendor" className="hover:text-ink transition-colors">Vendor Station Login</Link></li>
              <li><Link href="/v/speedy-express" className="hover:text-ink transition-colors">Demo Counter Kiosk</Link></li>
            </ul>
          </div>

          {/* Help & Support */}
          <div>
            <h4 className="font-sora font-bold text-ink mb-5 text-sm uppercase tracking-wider">Help &amp; Inquiries</h4>
            <ul className="space-y-3 text-sm text-ink-soft">
              <li><Link href="/faq" className="hover:text-ink transition-colors">Frequently Asked Questions</Link></li>
              <li><Link href="/contact" className="hover:text-ink transition-colors">Contact Support Desk</Link></li>
              <li>
                <a href="mailto:support@print2me.in" className="hover:text-ink transition-colors flex items-center gap-2 font-medium text-ink">
                  <Mail className="w-3.5 h-3.5 text-saffron shrink-0" />
                  support@print2me.in
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-hairline flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-soft">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>© {new Date().getFullYear()} Print2Me (print2me.in). All rights reserved.</span>
            <Link href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-ink transition-colors">Terms of Service</Link>
            <Link href="/refund" className="hover:text-ink transition-colors">Refund Policy</Link>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-paper rounded-pill border border-hairline shadow-sm">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>print2me.in Cloud: <strong>All Systems Operational</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
