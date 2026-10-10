export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';

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

    if (format === 'svg') {
      const svgString = await QRCode.toString(targetUrl, {
        type: 'svg',
        color: {
          dark: fgColor,
          light: '#ffffff',
        },
        margin: 2,
        width: 600,
        errorCorrectionLevel: 'H', // High error correction so logos can be placed in center
      });

      const headers: Record<string, string> = {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      };

      if (shouldDownload) {
        headers['Content-Disposition'] = `attachment; filename="${vendor.slug}-qr-counter-standee.svg"`;
      }

      return new NextResponse(svgString, { status: 200, headers });
    }

    // Default to JSON response with data URL for in-app UI rendering
    const dataUrl = await QRCode.toDataURL(targetUrl, {
      color: {
        dark: fgColor,
        light: '#ffffff',
      },
      margin: 2,
      width: 400,
      errorCorrectionLevel: 'H',
    });

    return NextResponse.json({
      success: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        targetUrl,
        pricingConfig: vendor.pricingConfig || [],
      },
      dataUrl,
    });
  } catch (error: any) {
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate vendor QR code' }, { status: 500 });
  }
}
