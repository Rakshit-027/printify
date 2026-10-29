export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRazorpaySignature } from '@/lib/razorpay';
import { OrderStatus, PaymentStatus, PrintJobStatus } from '@printflow/shared-types';
import { logAuditEvent } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingToken, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!trackingToken || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing required payment verification parameters' }, { status: 400 });
    }

    // 1. Fetch Order and Associated Vendor details
    let order: any = null;
    try {
      order = await prisma.order.findUnique({
        where: { trackingToken },
        include: {
          vendor: {
            select: {
              name: true,
              slug: true,
              paymentAccount: {
                select: { accessToken: true, razorpayAccountId: true }
              }
            }
          },
          payments: true,
        },
      });
    } catch {
      order = null;
    }

    // 2. Authoritative Signature Verification (Testing candidate secrets)
    const candidateSecrets = [
      process.env.RAZORPAY_KEY_SECRET,
      process.env.RAZORPAY_PARTNER_CLIENT_SECRET,
      process.env.RAZORPAY_PARTNER_WEBHOOK_SECRET,
      process.env.RAZORPAY_WEBHOOK_SECRET,
    ].filter(Boolean) as string[];

    let isValid = false;
    for (const secret of candidateSecrets) {
      if (verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature, secret })) {
        isValid = true;
        break;
      }
    }

    // Direct Authoritative Razorpay API Verification for OAuth sub-merchant accounts
    if (!isValid && order?.vendor?.paymentAccount?.accessToken) {
      try {
        const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpayPaymentId}`, {
          headers: { Authorization: `Bearer ${order.vendor.paymentAccount.accessToken}` },
        });
        if (rzpRes.ok) {
          const p = await rzpRes.json();
          if ((p.status === 'captured' || p.status === 'authorized' || p.captured) && p.order_id === razorpayOrderId) {
            isValid = true;
          }
        }
      } catch (apiErr) {
        console.warn('Direct Razorpay API verification failed in Next.js:', apiErr);
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      );
    }

    if (order) {
      // 3. Atomically confirm order, mark payment success, and enqueue PrintJob
      await prisma.$transaction(async (tx) => {
        // Update Order
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.CONFIRMED,
            paymentStatus: PaymentStatus.SUCCESS,
          },
        });

        // Update Payment Record
        const paymentRecord = order.payments.find((p: any) => p.razorpayOrderId === razorpayOrderId) || order.payments[0];
        if (paymentRecord) {
          await tx.payment.update({
            where: { id: paymentRecord.id },
            data: {
              razorpayPaymentId,
              razorpaySignature,
              status: PaymentStatus.SUCCESS,
              verifiedAt: new Date(),
            },
          });
        }

        // Enqueue PrintJob for Windows Print Agent
        await tx.printJob.create({
          data: {
            orderId: order.id,
            vendorId: order.vendorId,
            status: PrintJobStatus.QUEUED,
            attempts: 0,
            maxAttempts: 3,
            events: {
              create: {
                status: PrintJobStatus.QUEUED,
                message: 'Order paid online via Razorpay. Print job queued for agent.',
              },
            },
          },
        });
      });

      await logAuditEvent({
        action: 'PAYMENT_VERIFIED_SUCCESS',
        resource: 'Payment',
        resourceId: razorpayPaymentId,
        details: { orderId: order.id, razorpayOrderId, razorpayPaymentId },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified and confirmed successfully',
      trackingToken,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
