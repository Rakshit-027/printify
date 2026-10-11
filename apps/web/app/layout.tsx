import type { Metadata } from 'next';
import { Sora, Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Mail, Globe, ArrowUpRight, Printer, Sparkles, MapPin, Store } from 'lucide-react';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { BrandLogo } from '@/components/BrandLogo';
import { JsonLd } from '@/components/JsonLd';

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-sora' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });
const notoSansDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '500', '600'], variable: '--font-noto-sans-devanagari' });

export const metadata: Metadata = {
  metadataBase: new URL('https://print2me.in'),
  title: {
    default: 'Print2Me – Online Document Printing Made Easy',
    template: '%s | Print2Me',
  },
  description:
    'Upload documents from your phone, choose a nearby printing shop, pay online, and collect your prints. Print smarter with Print2Me.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/brand/print2me-app-icon.png',
    apple: '/brand/print2me-app-icon.png',
  },
  keywords: [
    'online document printing',
    'print documents online',
    'online printing services',
    'document printing near me',
    'mobile document printing',
    'campus printing services',
    'college printing services',
    'QR code printing',
    'online xerox',
    'print2me',
  ],
  authors: [{ name: 'Print2Me Team', url: 'https://print2me.in' }],
  creator: 'Print2Me',
  publisher: 'Print2Me',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Print2Me – Online Document Printing Made Easy',
    description:
      'Upload documents from your phone, choose a nearby printing shop, pay online, and collect your prints. Skip queues with Print2Me.',
    url: 'https://print2me.in',
    siteName: 'Print2Me',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Print2Me – Online Document Printing Made Easy',
    description:
      'Upload documents from your phone, pay online, and pick up clean prints at your local counter.',
    site: '@print2me',
    creator: '@print2me',
  },
  verification: {
    google: 'FA-hLtD6B6nuYiWlzNMmMXzzypbrLWra15q3CGSD-Bk',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://print2me.in/#organization',
    name: 'Print2Me',
    url: 'https://print2me.in',
    logo: {
      '@type': 'ImageObject',
      url: 'https://print2me.in/brand/print2me-logo-horizontal.png',
      width: 600,
      height: 150,
    },
    sameAs: ['https://print2me.in'],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@print2me.in',
      contactType: 'customer service',
      availableLanguage: ['English', 'Hindi'],
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://print2me.in/#website',
    name: 'Print2Me',
    url: 'https://print2me.in',
    description: 'Online Document Printing Platform for Campus and Local Print Shops',
    publisher: {
      '@id': 'https://print2me.in/#organization',
    },
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': 'https://print2me.in/#webapp',
    name: 'Print2Me Web Platform',
    url: 'https://print2me.in',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All modern browsers (iOS, Android, Windows, macOS, Linux)',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
  };

  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="FA-hLtD6B6nuYiWlzNMmMXzzypbrLWra15q3CGSD-Bk" />
        <JsonLd data={[organizationSchema, websiteSchema, webAppSchema]} />
      </head>
      <body className={`min-h-screen flex flex-col justify-between selection:bg-saffron selection:text-white ${sora.variable} ${inter.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable} font-inter text-ink`}>
        {/* Global Navigation Bar */}
        <GlobalNavbar />

        {/* Main Body Content */}
        <main className="flex-1 pb-24 sm:pb-0">{children}</main>

        {/* Professional SEO-Enhanced Footer */}
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
                  <li>
                    <a href="mailto:support@print2me.in" className="hover:text-ink transition-colors flex items-center gap-2 font-medium text-ink">
                      <Mail className="w-3.5 h-3.5 text-saffron shrink-0" />
                      support@print2me.in
                    </a>
                  </li>
                  <li>
                    <a href="mailto:support@print2me.com" className="hover:text-ink transition-colors text-xs text-ink-soft">
                      support@print2me.com
                    </a>
                  </li>
                  <li><a href="/#contact" className="hover:text-ink transition-colors">Contact Sales Desk</a></li>
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
