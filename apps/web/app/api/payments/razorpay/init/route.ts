export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPartnerOrder } from '@/lib/razorpay-partner';
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
              allowOnlinePayment: true,
              paymentAccount: {
                select: {
                  razorpayAccountId: true,
                  publicToken: true,
                  accessToken: true,
                  authStatus: true,
                  activationStatus: true,
                },
              },
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
      const rzpMock = await createPartnerOrder({
        amountMinor: 1550,
        receipt: 'ORD-8921',
        notes: { trackingToken },
        paymentAccount: null,
      });
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

    if (order.vendor && order.vendor.allowOnlinePayment === false) {
      return NextResponse.json(
        { error: 'Online payment is currently disabled by this vendor. Please pay cash at the counter.' },
        { status: 400 }
      );
    }

    // Call officially supported Partner Order creation API using sub-merchant OAuth token
    const rzpOrder = await createPartnerOrder({
      amountMinor: order.totalAmountMinor,
      receipt: order.orderNumber,
      notes: {
        trackingToken,
        vendorSlug: order.vendor.slug,
        orderNumber: order.orderNumber,
      },
      paymentAccount: order.vendor.paymentAccount,
    });

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
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment checkout' },
      { status: 500 }
    );
  }
}
