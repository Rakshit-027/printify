export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingToken: string } }
) {
  try {
    const { trackingToken } = params;

    if (!trackingToken || trackingToken.length < 16) {
      return NextResponse.json({ error: 'Invalid tracking token format' }, { status: 400 });
    }

    let order: any = null;
    try {
      order = await prisma.order.findUnique({
        where: { trackingToken },
        include: {
          vendor: {
            select: {
              name: true,
              slug: true,
              contactPhone: true,
              address: true,
              operatingHours: true,
            },
          },
          items: {
            include: {
              document: {
                select: {
                  originalName: true,
                  pageCount: true,
                  mimeType: true,
                },
              },
            },
          },
          printJobs: {
            select: {
              status: true,
              spooledAt: true,
              completedAt: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } catch {
      order = null;
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        trackingToken: order.trackingToken,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        subtotalMinor: order.subtotalMinor,
        totalAmountMinor: order.totalAmountMinor,
        customerName: order.customerName,
        createdAt: order.createdAt,
        vendor: order.vendor,
        items: order.items.map((i: any) => ({
          id: i.id,
          paperSize: i.paperSize,
          colorMode: i.colorMode,
          duplexMode: i.duplexMode,
          copies: i.copies,
          totalSides: i.totalSides,
          totalSheets: i.totalSheets,
          itemTotalMinor: i.itemTotalMinor,
          document: {
            originalName: i.document.originalName,
            pageCount: i.document.pageCount,
          },
        })),
        printJob: order.printJobs[0] || null,
      },
    });
  } catch (error: any) {
    console.error('Track order error:', error);
    return NextResponse.json({ error: 'Failed to retrieve order tracking details' }, { status: 500 });
  }
}
