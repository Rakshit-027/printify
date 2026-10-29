// hallmark:v1 theme=sticker shape=workbench density=balanced
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin,
  Store,
  Clock,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/primitives';
import { JsonLd } from '@/components/JsonLd';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Print Shops & Campus Locations – Find Nearby Kiosks | Print2Me',
  description:
    'Find verified Print2Me partner print shops and college campus kiosks. Scan counter QR codes or upload documents online for instant counter pickup.',
  alternates: {
    canonical: '/locations',
  },
  openGraph: {
    title: 'Print Shops & Campus Locations – Find Nearby Kiosks | Print2Me',
    description:
      'Locate participating print shops and campus xerox counters on the Print2Me network. Fast, contactless document printing.',
    url: 'https://print2me.in/locations',
    type: 'website',
  },
};

export default async function LocationsPage() {
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://print2me.in',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Locations & Print Shops',
        item: 'https://print2me.in/locations',
      },
    ],
  };

  // Fetch verified active vendors from database
  let vendors: any[] = [];
  try {
    vendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        contactPhone: true,
        operatingHours: true,
      },
      take: 50,
    });
  } catch (err) {
    // Graceful fallback
  }

  // If no vendors yet in local environment, provide the sample verified kiosk
  if (vendors.length === 0) {
    vendors = [
      {
        id: 'speedy-express-demo',
        name: 'SpeedyPrint Express',
        slug: 'speedy-express',
        address: 'Campus Arcade, Near Gate 2',
        contactPhone: '+91 98765 00001',
        operatingHours: '09:00 AM - 09:00 PM',
      },
    ];
  }

  return (
    <div className="min-h-screen bg-paper pb-24 text-ink">
      <JsonLd data={[breadcrumbsSchema]} />

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto text-center">
        <h1 className="font-sora text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          Partner print kiosks
        </h1>
        <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
          Find active print counters and campus kiosks on the Print2Me network.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/v/speedy-express"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="primary" className="w-full sm:w-auto h-12 px-8 text-sm">
              Open demo kiosk
            </Button>
          </Link>
          <Link
            href="/register-vendor"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="outline" className="w-full sm:w-auto h-12 px-8 text-sm">
              Register your shop
            </Button>
          </Link>
        </div>
      </section>

      {/* Verified Shops Directory */}
      <section className="px-6 max-w-5xl mx-auto mb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-sora text-xl font-bold text-ink">
              Active counters ({vendors.length})
            </h2>
            <p className="text-ink-soft text-xs">
              Operational desks running verified Print2Me spooler clients.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-success-tint text-success text-xs font-semibold border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success" />
            Live network
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-surface rounded-24 p-6 border border-hairline shadow-ink-soft flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-16 bg-saffron-tint text-saffron flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-pill bg-paper border border-hairline text-ink-soft">
                    {vendor.slug}
                  </span>
                </div>

                <div>
                  <h3 className="font-sora text-lg font-bold text-ink mb-1">
                    {vendor.name}
                  </h3>
                  <div className="flex items-start gap-1.5 text-ink-soft text-xs leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-saffron shrink-0 mt-0.5" />
                    <span>{vendor.address}</span>
                  </div>
                </div>

                <div className="space-y-1 pt-2 text-xs text-ink-soft border-t border-hairline">
                  {vendor.operatingHours && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-ink-soft/70 shrink-0" />
                      <span>{vendor.operatingHours}</span>
                    </div>
                  )}
                  {vendor.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-ink-soft/70 shrink-0" />
                      <span>{vendor.contactPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-5">
                <Link
                  href={`/v/${vendor.slug}`}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
                >
                  <Button variant="primary" className="w-full h-11 text-xs font-semibold gap-1.5">
                    <span>Open kiosk &amp; upload</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Honest Coverage Notice & Request Kiosk Card */}
      <section className="px-6 max-w-4xl mx-auto">
        <div className="bg-surface rounded-24 p-8 border border-hairline shadow-ink-soft flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="font-sora text-lg font-bold text-ink">
              Looking for a kiosk at your campus?
            </h3>
            <p className="text-ink-soft text-sm max-w-md">
              Let us know your college or commercial area. We will coordinate with nearby print vendors for setup.
            </p>
          </div>
          <Link
            href="/contact"
            className="w-full md:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="outline" className="w-full md:w-auto h-11 px-6 text-xs">
              Request a location
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
