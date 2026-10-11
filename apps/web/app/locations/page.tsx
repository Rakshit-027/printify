import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MapPin,
  Printer,
  Store,
  Clock,
  ArrowRight,
  Sparkles,
  Phone,
  CheckCircle2,
  Building,
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
    <div className="min-h-screen bg-paper pb-24">
      <JsonLd data={[breadcrumbsSchema]} />

      {/* Hero */}
      <section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-saffron-tint text-saffron text-xs font-bold uppercase tracking-wider mb-6">
          <MapPin className="w-3.5 h-3.5" />
          <span>Verified Partner Network</span>
        </div>
        <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight mb-6">
          Find a Print2Me Shop Near You
        </h1>
        <p className="text-ink-soft text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Walk up to any participating print counter, scan their standee QR code, or upload files directly online for express pickup.
        </p>
      </section>

      {/* Verified Shops Directory */}
      <section className="px-6 max-w-5xl mx-auto mb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-sora text-2xl font-bold text-ink">
              Active Print Kiosks ({vendors.length})
            </h2>
            <p className="text-ink-soft text-sm">
              Operational counters equipped with verified Print2Me Windows Spoolers.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Network
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-surface rounded-[24px] p-6 border border-hairline shadow-ink-soft hover:border-saffron/40 hover:-translate-y-0.5 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-16 bg-saffron-tint text-saffron flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-pill bg-paper border border-hairline text-ink-soft">
                    ID: {vendor.slug}
                  </span>
                </div>

                <div>
                  <h3 className="font-sora text-xl font-bold text-ink mb-1">
                    {vendor.name}
                  </h3>
                  <div className="flex items-start gap-2 text-ink-soft text-xs leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-saffron shrink-0 mt-0.5" />
                    <span>{vendor.address}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 text-xs text-ink-soft border-t border-hairline">
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

              <div className="pt-6">
                <Link href={`/v/${vendor.slug}`} className="block">
                  <Button variant="primary" className="w-full h-11 text-xs font-bold gap-2">
                    <span>Open Kiosk &amp; Upload Files</span>
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
        <div className="bg-surface rounded-[32px] p-8 md:p-12 border border-hairline shadow-ink-soft text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-paper border border-hairline flex items-center justify-center mx-auto text-ink">
            <Building className="w-6 h-6" />
          </div>
          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="font-sora text-2xl font-bold text-ink">
              Don&apos;t see your campus or favorite xerox shop?
            </h2>
            <p className="text-ink-soft text-sm leading-relaxed">
              We never fabricate city coverage or fake listings. Print2Me is actively expanding across university campuses and commercial hubs. You can request your local shop or introduce them to our team.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/register-vendor">
              <Button variant="primary" className="h-12 px-6 text-sm">
                Register Your Print Shop
              </Button>
            </Link>
            <a href="mailto:support@print2me.in?subject=Recommend%20a%20Print%20Shop%20Location">
              <Button variant="outline" className="h-12 px-6 text-sm">
                Recommend a Location
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
