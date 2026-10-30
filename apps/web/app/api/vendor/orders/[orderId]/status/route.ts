export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles, logAuditEvent } from '@/lib/auth';
import { UserRole, OrderStatus, PaymentStatus, PaymentMethod, PrintJobStatus } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const authResult = await requireRoles(request, [
      UserRole.VENDOR_OWNER,
      UserRole.VENDOR_STAFF,
      UserRole.SUPER_ADMIN,
    ]);

    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { orderId } = params;

    const body = await request.json();
    let action = body.action;
    if (!action) {
      if (body.paymentStatus === 'CASH_COLLECTED') {
        action = 'MARK_CASH_COLLECTED';
      } else if (body.status === 'CONFIRMED' || body.status === 'APPROVED') {
        action = 'APPROVE';
      } else if (body.status === 'REJECTED') {
        action = 'REJECT';
      } else if (body.status === 'PROCESSING') {
        action = 'START_PRINTING';
      } else if (body.status === 'READY_FOR_PICKUP') {
        action = 'MARK_READY';
      } else if (body.status === 'COMPLETED') {
        action = 'MARK_COMPLETED';
      }
    }

    // Find order with vendor isolation check
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (session.role !== UserRole.SUPER_ADMIN && order.vendorId !== session.vendorId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this order' }, { status: 403 });
    }

    let updatedOrder: any = null;

    if (action === 'APPROVE' || action === 'APPROVE_ORDER') {
      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED },
      });

      // Queue print job for desktop agent if not already created
      const existingJob = await prisma.printJob.findFirst({
        where: { orderId: order.id },
      });
      if (!existingJob) {
        await prisma.printJob.create({
          data: {
            orderId: order.id,
            vendorId: order.vendorId,
            status: PrintJobStatus.QUEUED,
            attempts: 0,
            maxAttempts: 3,
            events: {
              create: {
                status: PrintJobStatus.QUEUED,
                message: 'Order approved by vendor. Print job queued for desktop agent.',
              },
            },
          },
        });
      }
    } else if (action === 'REJECT') {
      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.REJECTED },
      });
    } else if (
      action === 'MARK_CASH_COLLECTED' ||
      action === 'COLLECT_CASH_AND_PRINT' ||
      action === 'APPROVE_CASH'
    ) {
      // Fraud Prevention: Prevent marking online orders as cash collected
      if (
        order.paymentMethod !== PaymentMethod.CASH_ON_COLLECTION &&
        (order.paymentMethod as any) !== 'CASH'
      ) {
        return NextResponse.json(
          { error: 'Fraud Prevention: Cannot mark cash collected on an order configured for online Razorpay payment' },
          { status: 400 }
        );
      }

      await prisma.payment.updateMany({
        where: { orderId: order.id },
        data: { status: PaymentStatus.CASH_COLLECTED },
      });

      // Advance status to CONFIRMED only if it was pending vendor approval or payment
      // Preserve READY_FOR_PICKUP or COMPLETED if the order is already ready/completed!
      const shouldAdvanceToConfirmed =
        order.status === OrderStatus.AWAITING_VENDOR_APPROVAL ||
        order.status === OrderStatus.AWAITING_PAYMENT ||
        order.status === (OrderStatus as any).PENDING;

      const targetStatus = shouldAdvanceToConfirmed ? OrderStatus.CONFIRMED : order.status;

      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.CASH_COLLECTED,
          status: targetStatus,
        },
      });

      // Queue print job for desktop agent if not already created
      const existingJob = await prisma.printJob.findFirst({
        where: { orderId: order.id },
      });
      if (!existingJob) {
        await prisma.printJob.create({
          data: {
            orderId: order.id,
            vendorId: order.vendorId,
            status: PrintJobStatus.QUEUED,
            attempts: 0,
            maxAttempts: 3,
            events: {
              create: {
                status: PrintJobStatus.QUEUED,
                message: 'Cash payment received and approved. Print job queued for desktop agent.',
              },
            },
          },
        });
      }
    } else if (action === 'START_PRINTING' || action === 'MARK_PRINTING') {
      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PROCESSING },
      });
    } else if (action === 'REPORT_ERROR' || action === 'PAPER_OUT') {
      // Mark or log print error
      const existingJob = await prisma.printJob.findFirst({
        where: { orderId: order.id },
      });
      if (existingJob) {
        await prisma.printJobEvent.create({
          data: {
            printJobId: existingJob.id,
            status: PrintJobStatus.FAILED,
            message: body.message || 'Technical error / paper finished during printing.',
          },
        });
      }
      updatedOrder = order;
    } else if (action === 'MARK_READY') {
      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.READY_FOR_PICKUP },
      });
    } else if (action === 'MARK_COMPLETED') {
      updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.COMPLETED },
      });
    } else {
      return NextResponse.json({ error: `Unknown status action '${action}'` }, { status: 400 });
    }

    await logAuditEvent({
      userId: session.userId,
      action: `VENDOR_ORDER_ACTION_${action}`,
      resource: 'Order',
      resourceId: order.id,
      details: { previousStatus: order.status, action },
    });

    return NextResponse.json({
      success: true,
      message: `Order updated with action ${action}`,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
