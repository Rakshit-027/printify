import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://print2me.in';
  const lastModified = new Date();

  // Core static public landing pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/document-printing`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/campus-printing`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/partner`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/locations`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Dynamic public vendor kiosk pages (only active, verified vendors)
  let vendorRoutes: MetadataRoute.Sitemap = [];
  try {
    const activeVendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      take: 200,
    });

    vendorRoutes = activeVendors.map((vendor) => ({
      url: `${baseUrl}/v/${vendor.slug}`,
      lastModified: vendor.updatedAt || lastModified,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch (error) {
    // If database is unavailable during build time, fallback cleanly
    vendorRoutes = [
      {
        url: `${baseUrl}/v/speedy-express`,
        lastModified,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      },
    ];
  }

  return [...staticRoutes, ...vendorRoutes];
}
