import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { OrderStatus, PaymentStatus, PrintJobStatus } from '@printflow/shared-types';

export async function POST(request: NextRequest) {
  try {
    // 1. Read Raw Body as Text
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    // 2. Validate Signature
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('Unauthorized Razorpay webhook delivery: Invalid HMAC-SHA256 signature');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.event_id || event.id || `evt_${Date.now()}_${Math.random()}`;
    const eventType = event.event;

    // 3. Idempotent Deduplication Check
    let existingEvent: any = null;
    try {
      existingEvent = await prisma.webhookEvent.findUnique({
        where: { eventId },
      });
    } catch {
      existingEvent = null;
    }

    if (existingEvent && existingEvent.processed) {
      return NextResponse.json({
        success: true,
        message: 'Event already processed idempotently',
        eventId,
      });
    }

    // Record webhook reception
    let webhookRecord: any = null;
    try {
      webhookRecord = await prisma.webhookEvent.upsert({
        where: { eventId },
        update: {},
        create: {
          eventId,
          provider: 'RAZORPAY',
          eventType,
          payload: event,
          processed: false,
        },
      });
    } catch (err) {
      console.warn('WebhookEvent tracking error:', err);
    }

    // 4. Handle Specific Webhook Event Types
    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      const rzpPaymentId = paymentEntity?.id;

      if (rzpOrderId) {
        try {
          const payment = await prisma.payment.findUnique({
            where: { razorpayOrderId: rzpOrderId },
            include: { order: { include: { printJobs: true } } },
          });

          if (payment && payment.order) {
            await prisma.$transaction(async (tx) => {
              // Ensure order is marked confirmed
              if (payment.order.status === OrderStatus.AWAITING_PAYMENT) {
                await tx.order.update({
                  where: { id: payment.order.id },
                  data: {
                    status: OrderStatus.CONFIRMED,
                    paymentStatus: PaymentStatus.SUCCESS,
                  },
                });
              }

              // Update payment record
              await tx.payment.update({
                where: { id: payment.id },
                data: {
                  razorpayPaymentId: rzpPaymentId,
                  status: PaymentStatus.SUCCESS,
                  verifiedAt: new Date(),
                  rawPayload: paymentEntity,
                },
              });

              // Check if PrintJob exists, otherwise enqueue
              if (payment.order.printJobs.length === 0) {
                await tx.printJob.create({
                  data: {
                    orderId: payment.order.id,
                    vendorId: payment.order.vendorId,
                    status: PrintJobStatus.QUEUED,
                    attempts: 0,
                    maxAttempts: 3,
                    events: {
                      create: {
                        status: PrintJobStatus.QUEUED,
                        message: `Order reconciled via Razorpay webhook (${eventType}). Enqueued for agent.`,
                      },
                    },
                  },
                });
              }
            });
          }
        } catch (dbErr) {
          console.error('Failed to process payment capture in database:', dbErr);
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const rzpOrderId = paymentEntity?.order_id;
      if (rzpOrderId) {
        try {
          await prisma.payment.updateMany({
            where: { razorpayOrderId: rzpOrderId },
            data: {
              status: PaymentStatus.FAILED,
              failureReason: paymentEntity?.error_description || 'Payment failed',
              rawPayload: paymentEntity,
            },
          });
        } catch (dbErr) {
          console.error('Failed to record payment failure:', dbErr);
        }
      }
    }

    // Mark webhook as processed
    if (webhookRecord) {
      try {
        await prisma.webhookEvent.update({
          where: { id: webhookRecord.id },
          data: { processed: true },
        });
      } catch (err) {
        console.warn('Failed to update webhook processed flag:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook received and reconciled',
      eventId,
    });
  } catch (error: any) {
    console.error('Webhook processing exception:', error);
    return NextResponse.json({ error: 'Internal webhook ingestion error' }, { status: 500 });
  }
}
