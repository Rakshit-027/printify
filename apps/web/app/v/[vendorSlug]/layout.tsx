import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { JsonLd } from '@/components/JsonLd';

export async function generateMetadata({
  params,
}: {
  params: { vendorSlug: string };
}): Promise<Metadata> {
  const { vendorSlug } = params;
  const normalizedSlug = vendorSlug.toLowerCase().trim();

  let vendor: any = null;
  try {
    vendor = await prisma.vendor.findUnique({
      where: { slug: normalizedSlug },
      select: {
        name: true,
        address: true,
        operatingHours: true,
        isActive: true,
        isApproved: true,
      },
    });
  } catch (err) {
    // If DB is offline during build
  }

  const shopName = vendor?.name || 'SpeedyPrint Express';
  const shopAddress = vendor?.address ? ` (${vendor.address})` : '';

  return {
    title: `Print at ${shopName} | Online Document Printing`,
    description: `Upload PDFs and images directly from your mobile browser to print at ${shopName}${shopAddress}. Skip the queue, pay online or cash, and collect your fresh prints with Print2Me.`,
    alternates: {
      canonical: `/v/${normalizedSlug}`,
    },
    openGraph: {
      title: `Print Documents at ${shopName} | Print2Me`,
      description: `Fast mobile document printing at ${shopName}. Scan QR or upload online for instant counter pickup.`,
      url: `https://print2me.in/v/${normalizedSlug}`,
      type: 'website',
    },
    robots:
      vendor && (!vendor.isActive || !vendor.isApproved)
        ? { index: false, follow: false }
        : { index: true, follow: true },
  };
}

export default async function VendorKioskLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { vendorSlug: string };
}) {
  const { vendorSlug } = params;
  const normalizedSlug = vendorSlug.toLowerCase().trim();

  let vendor: any = null;
  try {
    vendor = await prisma.vendor.findUnique({
      where: { slug: normalizedSlug },
      select: {
        id: true,
        name: true,
        address: true,
        contactPhone: true,
        contactEmail: true,
        operatingHours: true,
        isActive: true,
      },
    });
  } catch (err) {
    // Graceful fallback
  }

  const shopName = vendor?.name || 'SpeedyPrint Express';
  const shopAddress = vendor?.address || 'Campus Arcade';
  const shopPhone = vendor?.contactPhone;

  // LocalBusiness structured data
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `https://print2me.in/v/${normalizedSlug}#localbusiness`,
    name: shopName,
    url: `https://print2me.in/v/${normalizedSlug}`,
    description: `Official Print2Me partner counter at ${shopName}. Upload files from your phone and print on-demand.`,
    ...(shopAddress
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: shopAddress,
            addressCountry: 'IN',
          },
        }
      : {}),
    ...(shopPhone ? { telephone: shopPhone } : {}),
    ...(vendor?.operatingHours
      ? { openingHours: vendor.operatingHours }
      : {}),
    parentOrganization: {
      '@type': 'Organization',
      name: 'Print2Me',
      url: 'https://print2me.in',
    },
  };

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
        name: 'Print Shops',
        item: 'https://print2me.in/locations',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: shopName,
        item: `https://print2me.in/v/${normalizedSlug}`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={[localBusinessSchema, breadcrumbsSchema]} />
      {children}
    </>
  );
}
