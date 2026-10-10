import { NextRequest, NextResponse } from 'next/server';
import { OrderStatus } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { trackingToken: string } }
) {
  try {
    const { trackingToken } = params;

    const order = await prisma.order.findUnique({
      where: { trackingToken },
      include: { printJobs: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Cancellation eligibility check
    const cancellableStatuses: OrderStatus[] = [
      OrderStatus.DRAFT,
      OrderStatus.AWAITING_PAYMENT,
      OrderStatus.AWAITING_VENDOR_APPROVAL,
    ];

    if (!cancellableStatuses.includes(order.status as OrderStatus)) {
      return NextResponse.json(
        {
          error: `Cannot cancel order in '${order.status}' status. The print job is already in queue or spooled.`,
        },
        { status: 400 }
      );
    }

    // Cancel order and associated pending print jobs
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });

      await tx.printJob.updateMany({
        where: { orderId: order.id, status: { in: ['CREATED', 'QUEUED'] } },
        data: { status: 'CANCELLED' },
      });
    });

    await logAuditEvent({
      action: 'ORDER_CANCELLED_BY_CUSTOMER',
      resource: 'Order',
      resourceId: order.id,
      details: { orderNumber: order.orderNumber, previousStatus: order.status },
    });

    return NextResponse.json({
      success: true,
      message: 'Order was successfully cancelled',
    });
  } catch (error: any) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ error: 'Failed to process cancellation' }, { status: 500 });
  }
}
