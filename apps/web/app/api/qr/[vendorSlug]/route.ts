export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';

// In-memory cache for generated QR codes to prevent redundant CPU cycles
const qrCache = new Map<string, { svg?: string; dataUrl?: string; timestamp: number }>();
const QR_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { vendorSlug: string } }
) {
  try {
    const { vendorSlug } = params;
    const normalizedSlug = vendorSlug.toLowerCase().trim();

    let vendor: any = null;
    try {
      vendor = await prisma.vendor.findUnique({
        where: { slug: normalizedSlug },
        include: { qrConfig: true, pricingConfig: { where: { isActive: true } } },
      });
    } catch (dbErr) {
      // If DB is offline/unseeded during preview, fallback to demo vendor object
      vendor = {
        id: 'demo-speedy-uuid',
        name: 'SpeedyPrint Express',
        slug: normalizedSlug,
        isActive: true,
        qrConfig: { customColor: '#0f172a' },
      };
    }

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (!vendor.isActive) {
      return NextResponse.json({ error: 'Vendor account is currently inactive' }, { status: 403 });
    }

    // Determine target URL
    const host = request.headers.get('host') || 'localhost:3000';
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const targetUrl = `${proto}://${host}/v/${vendor.slug}`;

    // Options from query or vendor configuration
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'svg';
    const shouldDownload = searchParams.get('download') === '1';
    const fgColor = searchParams.get('color') || vendor.qrConfig?.customColor || '#020617';
    const cacheKey = `${targetUrl}:${fgColor}`;

    const now = Date.now();
    const cached = qrCache.get(cacheKey);
    const isCacheValid = cached && (now - cached.timestamp < QR_CACHE_TTL);

    if (format === 'svg') {
      let svgString = isCacheValid ? cached.svg : undefined;
      if (!svgString) {
        svgString = await QRCode.toString(targetUrl, {
          type: 'svg',
          color: {
            dark: fgColor,
            light: '#ffffff',
          },
          margin: 2,
          width: 600,
          errorCorrectionLevel: 'H',
        });
        qrCache.set(cacheKey, { ...(cached || {}), svg: svgString, timestamp: now });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      };

      if (shouldDownload) {
        headers['Content-Disposition'] = `attachment; filename="${vendor.slug}-qr-counter-standee.svg"`;
      }

      return new NextResponse(svgString, { status: 200, headers });
    }

    // JSON response for vendor order page and standee modal
    // Only generate dataUrl if requested or already cached to avoid blocking event loop
    const includeDataUrl = searchParams.get('dataUrl') === '1' || searchParams.get('format') === 'json_with_qr';
    let dataUrl: string | undefined = undefined;

    if (includeDataUrl) {
      dataUrl = isCacheValid ? cached.dataUrl : undefined;
      if (!dataUrl) {
        dataUrl = await QRCode.toDataURL(targetUrl, {
          color: {
            dark: fgColor,
            light: '#ffffff',
          },
          margin: 2,
          width: 400,
          errorCorrectionLevel: 'H',
        });
        qrCache.set(cacheKey, { ...(cached || {}), dataUrl, timestamp: now });
      }
    }

    return NextResponse.json(
      {
        success: true,
        vendor: {
          id: vendor.id,
          name: vendor.name,
          slug: vendor.slug,
          address: vendor.address || 'Campus Counter',
          contactPhone: vendor.contactPhone || null,
          operatingHours: vendor.operatingHours || null,
          targetUrl,
          pricingConfig: vendor.pricingConfig || [],
          allowCashOnDesk: vendor.allowCashOnDesk ?? true,
        },
        ...(dataUrl ? { dataUrl } : {}),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate vendor QR code' }, { status: 500 });
  }
}
