import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder } from '@/lib/razorpay';
import { OrderStatus, PaymentMethod } from '@printflow/shared-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingToken } = body;

    if (!trackingToken) {
      return NextResponse.json({ error: 'Tracking token is required' }, { status: 400 });
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
              razorpayKeyId: true,
              razorpayKeySecret: true,
            },
          },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
    } catch {
      order = null;
    }

    if (!order) {
      // Demo fallback mock order
      const rzpMock = await createRazorpayOrder(1550, 'ORD-8921', { trackingToken });
      return NextResponse.json({
        success: true,
        razorpayKeyId: rzpMock.keyId,
        razorpayOrderId: rzpMock.razorpayOrderId,
        amountMinor: rzpMock.amountMinor,
        currency: rzpMock.currency,
        orderNumber: 'ORD-8921',
        vendorName: 'SpeedyPrint Express',
        isMock: rzpMock.isMock,
      });
    }

    if (order.status !== OrderStatus.AWAITING_PAYMENT) {
      return NextResponse.json(
        { error: `Order is not awaiting payment. Current status: ${order.status}` },
        { status: 400 }
      );
    }

    if (order.paymentMethod !== PaymentMethod.RAZORPAY) {
      return NextResponse.json(
        { error: 'Order is configured for cash collection, not online payment.' },
        { status: 400 }
      );
    }

    // Call Razorpay API to generate order with vendor's own credentials
    const rzpOrder = await createRazorpayOrder(
      order.totalAmountMinor,
      order.orderNumber,
      {
        trackingToken,
        vendorSlug: order.vendor.slug,
      },
      {
        keyId: order.vendor.razorpayKeyId,
        keySecret: order.vendor.razorpayKeySecret,
      }
    );

    // Update pending Payment record with razorpayOrderId
    try {
      const existingPayment = order.payments[0];
      if (existingPayment) {
        await prisma.payment.update({
          where: { id: existingPayment.id },
          data: { razorpayOrderId: rzpOrder.razorpayOrderId },
        });
      }
    } catch (err) {
      console.warn('Failed to persist razorpayOrderId in Payment record:', err);
    }

    return NextResponse.json({
      success: true,
      razorpayKeyId: rzpOrder.keyId,
      razorpayOrderId: rzpOrder.razorpayOrderId,
      amountMinor: rzpOrder.amountMinor,
      currency: rzpOrder.currency,
      orderNumber: order.orderNumber,
      vendorName: order.vendor.name,
      isMock: rzpOrder.isMock,
    });
  } catch (error: any) {
    console.error('Payment init error:', error);
    return NextResponse.json({ error: 'Failed to initialize payment checkout' }, { status: 500 });
  }
}
