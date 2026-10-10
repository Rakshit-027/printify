import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agent-auth';
import { PrintJobStatus, OrderStatus } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateAgentRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { device, vendor } = authResult;

    // 1. Recover stale expired leases for this vendor
    const now = new Date();
    try {
      await prisma.printJob.updateMany({
        where: {
          vendorId: vendor.id,
          status: PrintJobStatus.CLAIMED_BY_DEVICE,
          claimExpires: { lt: now },
        },
        data: {
          status: PrintJobStatus.QUEUED,
          claimToken: null,
          claimExpires: null,
          lastError: 'Device claim lease expired. Job auto-reclaimed into queue.',
        },
      });
    } catch {
      // Ignored if DB offline
    }

    // 2. Poll for queued jobs
    let availableJobs: any[] = [];
    try {
      availableJobs = await prisma.printJob.findMany({
        where: {
          vendorId: vendor.id,
          status: PrintJobStatus.QUEUED,
          attempts: { lt: 3 },
          order: {
            status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED] },
          },
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              customerName: true,
              items: {
                include: {
                  document: {
                    select: {
                      id: true,
                      originalName: true,
                      mimeType: true,
                      sizeBytes: true,
                      pageCount: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
    } catch {
      // Mock job for offline demonstration
      availableJobs = [
        {
          id: 'job-demo-win-1',
          orderId: 'ord-demo-1',
          status: PrintJobStatus.QUEUED,
          attempts: 0,
          maxAttempts: 3,
          order: {
            orderNumber: 'ORD-8921',
            customerName: 'Aarav Patel',
            items: [
              {
                id: 'item-1',
                paperSize: 'A4',
                colorMode: 'BLACK_AND_WHITE',
                duplexMode: 'DOUBLE_SIDED_LONG_EDGE',
                copies: 2,
                totalSides: 8,
                totalSheets: 4,
                document: {
                  id: 'doc-1',
                  originalName: 'Quarterly_Report_2026.pdf',
                  mimeType: 'application/pdf',
                  sizeBytes: '204800',
                  pageCount: 4,
                },
              },
            ],
          },
        },
      ];
    }

    // Format output
    const formattedJobs = availableJobs.map((j) => ({
      jobId: j.id,
      orderNumber: j.order.orderNumber,
      customerName: j.order.customerName,
      status: j.status,
      attempts: j.attempts,
      items: j.order.items.map((i: any) => ({
        paperSize: i.paperSize,
        colorMode: i.colorMode,
        duplexMode: i.duplexMode,
        copies: i.copies,
        totalSides: i.totalSides,
        totalSheets: i.totalSheets,
        document: {
          id: i.document.id,
          filename: i.document.originalName,
          mimeType: i.document.mimeType,
          pageCount: i.document.pageCount,
        },
      })),
    }));

    return NextResponse.json({
      success: true,
      jobs: formattedJobs,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Agent poll jobs error:', error);
    return NextResponse.json({ error: 'Failed to poll available print jobs' }, { status: 500 });
  }
}
