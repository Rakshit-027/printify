import type { Metadata } from 'next';
import { Sora, Inter, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { GlobalNavbar } from '@/components/GlobalNavbar';
import { GlobalFooter } from '@/components/GlobalFooter';
import { BrandLogo } from '@/components/BrandLogo';
import { JsonLd } from '@/components/JsonLd';

const sora = Sora({ subsets: ['latin'], weight: ['700', '800'], variable: '--font-sora', display: 'swap' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' });
const notoSansDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], weight: ['400', '500', '600'], variable: '--font-noto-sans-devanagari', display: 'swap' });

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
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
        <link rel="dns-prefetch" href="https://api.razorpay.com" />
        <JsonLd data={[organizationSchema, websiteSchema, webAppSchema]} />
      </head>
      <body className={`min-h-screen flex flex-col justify-between selection:bg-saffron selection:text-white ${sora.variable} ${inter.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable} font-inter text-ink`}>
        {/* Global Navigation Bar */}
        <GlobalNavbar />

        {/* Main Body Content */}
        <main className="flex-1 pb-24 sm:pb-0">{children}</main>

        {/* Global Footer (Suppressed on Kiosk /v/ pages) */}
        <GlobalFooter />
      </body>
    </html>
  );
}
