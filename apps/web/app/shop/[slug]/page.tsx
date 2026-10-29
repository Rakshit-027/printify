// hallmark:v1 theme=sticker shape=workbench density=balanced
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BrandLogo } from '@/components/BrandLogo';
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Printer,
  FileText,
  ShieldCheck,
  CreditCard,
  Banknote,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';
import { formatMinorToInr } from '@/lib/pricing-engine';

interface ShopPageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const normalizedSlug = params.slug.toLowerCase().trim();
  const vendor = await prisma.vendor.findUnique({
    where: { slug: normalizedSlug },
    select: { name: true, address: true },
  });

  if (!vendor) {
    return {
      title: 'Print Shop Not Found | Print2Me',
      description: 'The requested local print shop page could not be located on Print2Me.',
    };
  }

  return {
    title: `${vendor.name} - Online Document Printing | Print2Me`,
    description: `Order documents, xerox, and photo prints directly from ${vendor.name} located at ${vendor.address}. Fast turnaround, secure payment, and counter pickup.`,
    openGraph: {
      title: `${vendor.name} - Print Shop on Print2Me`,
      description: `Print documents online with direct counter pickup at ${vendor.name}, ${vendor.address}.`,
      url: `https://www.print2me.in/shop/${params.slug}`,
      siteName: 'Print2Me',
    },
  };
}

export default async function VendorShopPage({ params }: ShopPageProps) {
  const normalizedSlug = params.slug.toLowerCase().trim();

  let vendor: any = null;
  try {
    vendor = await prisma.vendor.findUnique({
      where: { slug: normalizedSlug },
      include: {
        pricingConfig: {
          where: { isActive: true },
          orderBy: [{ paperSize: 'asc' }, { colorMode: 'asc' }],
        },
        paymentAccount: {
          select: {
            authStatus: true,
            activationStatus: true,
            razorpayAccountId: true,
          },
        },
      },
    });
  } catch (err) {
    console.error('Error loading vendor shop page:', err);
    vendor = null;
  }

  if (!vendor) {
    notFound();
  }

  const isOnlineActive =
    vendor.allowOnlinePayment &&
    vendor.paymentAccount?.authStatus === 'AUTHORIZED' &&
    vendor.paymentAccount?.activationStatus === 'ACTIVATED';

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col font-sans selection:bg-saffron/20">
      {/* Top Header */}
      <header className="border-b border-hairline bg-surface/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href={`/v/${vendor.slug}`}
              className="inline-flex items-center gap-2 bg-saffron text-ink font-semibold text-xs px-4 py-2.5 rounded-12 shadow-sm hover:brightness-105 active:scale-95 motion-reduce:transform-none transition-transform transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <span>Upload &amp; print now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-surface border-b border-hairline py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-saffron bg-saffron-tint px-2.5 py-1 rounded-pill">
                  Partnered local print shop
                </span>
                {vendor.isActive && (
                  <span className="text-xs font-semibold text-success bg-success-tint px-2.5 py-1 rounded-pill flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success motion-safe:animate-pulse" />
                    Accepting orders
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-sora font-extrabold text-ink tracking-tight">
                {vendor.name}
              </h1>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-ink-soft">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-saffron shrink-0" />
                  <span>{vendor.address}</span>
                </div>
                {vendor.operatingHours && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-ink-soft shrink-0" />
                    <span>{vendor.operatingHours}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <Link
                href={`/v/${vendor.slug}`}
                className="inline-flex items-center justify-center gap-2 bg-ink text-paper font-bold text-sm px-6 py-3.5 rounded-14 hover:bg-ink/90 active:scale-95 transition shadow-sm text-center"
              >
                <span>Print Documents Online</span>
                <ArrowRight className="w-4 h-4 text-saffron" />
              </Link>
              <div className="text-center text-[11px] text-ink-soft">
                Skip the counter line • Collect in minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12 flex-1">
        {/* Services & Pricing Matrix */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-sora font-bold text-ink">
                Printing Services & Official Rates
              </h2>
              <p className="text-xs text-ink-soft">
                All pricing is set independently by {vendor.name} with 0% platform markup.
              </p>
            </div>
          </div>

          <div className="bg-surface border border-hairline rounded-20 overflow-hidden shadow-ink-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-paper border-b border-hairline font-semibold text-ink-soft text-xs">
                  <tr>
                    <th className="py-3 px-4">Paper size</th>
                    <th className="py-3 px-4">Color mode</th>
                    <th className="py-3 px-4">Sides</th>
                    <th className="py-3 px-4">Rate per side</th>
                    <th className="py-3 px-4">Minimum order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {vendor.pricingConfig && vendor.pricingConfig.length > 0 ? (
                    vendor.pricingConfig.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-paper/50 transition">
                        <td className="py-3.5 px-4 font-bold text-ink font-mono">{item.paperSize}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.colorMode === 'COLOR'
                                ? 'bg-indigo-500/10 text-indigo-600'
                                : 'bg-slate-500/10 text-slate-700'
                            }`}
                          >
                            {item.colorMode === 'COLOR' ? 'Color Print' : 'Black & White'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-ink-soft">
                          {item.isDuplex ? 'Double Sided' : 'Single Sided'}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-ink">
                          ₹{formatMinorToInr(item.pricePerSideMinor)}
                        </td>
                        <td className="py-3.5 px-4 text-ink-soft">
                          ₹{formatMinorToInr(item.minimumOrderMinor)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-ink-soft">
                        Standard store pricing applies upon document upload.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Customer Ordering Process */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-sora font-bold text-ink">How to Order Prints</h2>
            <p className="text-xs text-ink-soft">
              Simple 4-step workflow to get your documents printed quickly and reliably.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface p-5 rounded-16 border border-hairline space-y-2">
              <div className="w-8 h-8 rounded-10 bg-saffron/10 text-saffron font-bold text-sm flex items-center justify-center font-mono">
                1
              </div>
              <h3 className="text-sm font-bold text-ink">Upload Documents</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Upload your PDF files, images, or assignment notes securely from any phone or laptop.
              </p>
            </div>

            <div className="bg-surface p-5 rounded-16 border border-hairline space-y-2">
              <div className="w-8 h-8 rounded-10 bg-saffron/10 text-saffron font-bold text-sm flex items-center justify-center font-mono">
                2
              </div>
              <h3 className="text-sm font-bold text-ink">Choose Options</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Select copies, color or B&W, single or double sided, and specific page ranges.
              </p>
            </div>

            <div className="bg-surface p-5 rounded-16 border border-hairline space-y-2">
              <div className="w-8 h-8 rounded-10 bg-saffron/10 text-saffron font-bold text-sm flex items-center justify-center font-mono">
                3
              </div>
              <h3 className="text-sm font-bold text-ink">Direct Payment</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Pay online via UPI/Razorpay directly to the vendor&apos;s bank or select Cash on Desk.
              </p>
            </div>

            <div className="bg-surface p-5 rounded-16 border border-hairline space-y-2">
              <div className="w-8 h-8 rounded-10 bg-saffron/10 text-saffron font-bold text-sm flex items-center justify-center font-mono">
                4
              </div>
              <h3 className="text-sm font-bold text-ink">Counter Pickup</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Track your print job live on your phone and collect your prints at the shop counter.
              </p>
            </div>
          </div>
        </section>

        {/* Payment & Settlement Details */}
        <section className="bg-surface border border-hairline rounded-20 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-saffron" />
            <h2 className="text-lg font-sora font-bold text-ink">Payment & Settlement Policy</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-ink-soft">
            <div className="space-y-2">
              <h4 className="font-bold text-ink flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-success" />
                Direct-to-Vendor Bank Settlement
              </h4>
              <p className="leading-relaxed">
                Customer printing payments made online via Razorpay are routed and settled directly to{' '}
                <strong className="text-ink">{vendor.name}</strong>&apos;s verified merchant account. Print2Me is
                a technology platform and does not hold customer printing funds or deduct commission from print orders.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-ink flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-ink" />
                Accepted Payment Methods
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {isOnlineActive ? (
                  <li>UPI (Google Pay, PhonePe, Paytm, BHIM), Debit/Credit Cards via Razorpay</li>
                ) : (
                  <li>Pay at Counter (Cash or Store UPI)</li>
                )}
                {vendor.allowCashOnDesk && <li>Cash on Desk collection at shop counter</li>}
              </ul>
            </div>
          </div>
        </section>

        {/* Terms, Cancellation & Refund Policy */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface border border-hairline rounded-20 p-6 space-y-3">
            <div className="flex items-center gap-2 text-ink">
              <FileCheck2 className="w-5 h-5 text-saffron" />
              <h3 className="text-base font-sora font-bold">Cancellation & Refund Policy</h3>
            </div>
            <ul className="text-xs text-ink-soft space-y-2 leading-relaxed">
              <li>
                <strong>Before Spooling:</strong> You may cancel unfulfilled orders before the shop spooler begins
                printing directly through your order tracking link.
              </li>
              <li>
                <strong>Quality Concerns:</strong> In the event of printing defects, wrong color selection by the operator, or paper jams, notify the shop staff at the counter immediately for a free reprint or instant refund.
              </li>
              <li>
                <strong>Failed Online Debits:</strong> Online payments debited but not confirmed on the platform are automatically reversed to the original payment source within 3-5 business days via Razorpay.
              </li>
            </ul>
          </div>

          <div className="bg-surface border border-hairline rounded-20 p-6 space-y-3">
            <div className="flex items-center gap-2 text-ink">
              <HelpCircle className="w-5 h-5 text-saffron" />
              <h3 className="text-base font-sora font-bold">Customer Support & Contact</h3>
            </div>
            <div className="text-xs text-ink-soft space-y-2 leading-relaxed">
              <p>For order queries, pickup assistance, or immediate shop inquiries, contact:</p>
              <div className="p-3 bg-paper rounded-12 border border-hairline space-y-1.5 font-mono text-[11px] text-ink">
                <div>
                  <strong>Store:</strong> {vendor.name}
                </div>
                {vendor.contactPhone && (
                  <div>
                    <strong>Phone:</strong> {vendor.contactPhone}
                  </div>
                )}
                {vendor.contactEmail && (
                  <div>
                    <strong>Email:</strong> {vendor.contactEmail}
                  </div>
                )}
                <div>
                  <strong>Platform Support:</strong> support@print2me.in
                </div>
              </div>
              <p className="text-[11px]">
                Print2Me technology services operated by Print2Me Tech. Individual print quality and order fulfilment are the sole responsibility of the respective print shop.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Bar */}
        <section className="p-6 md:p-8 bg-ink text-paper rounded-[24px] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-sora font-bold">Ready to print at {vendor.name}?</h3>
            <p className="text-xs text-paper/70">
              Upload your documents online and collect them ready at the desk.
            </p>
          </div>

          <Link
            href={`/v/${vendor.slug}`}
            className="inline-flex items-center gap-2 bg-saffron text-ink font-bold text-xs px-6 py-3.5 rounded-14 hover:brightness-105 active:scale-95 transition shadow-sm shrink-0"
          >
            <span>Start Print Order</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-hairline py-6 text-center text-xs text-ink-soft bg-surface">
        <p>© {new Date().getFullYear()} Print2Me. Marketplace connecting customers with verified local print shops.</p>
      </footer>
    </div>
  );
}
