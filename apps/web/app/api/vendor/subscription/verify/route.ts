export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';
import { verifyRazorpaySignature } from '@/lib/razorpay';

async function resolveVendorId(request: NextRequest): Promise<string | null> {
  try {
    const authResult = await requireRoles(request, [
      UserRole.VENDOR_OWNER,
      UserRole.VENDOR_STAFF,
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
    ]);
    if (!(authResult instanceof NextResponse) && authResult.session?.vendorId) {
      return authResult.session.vendorId;
    }
  } catch {}

  try {
    const firstVendor = await prisma.vendor.findFirst({ where: { isActive: true } });
    if (firstVendor) return firstVendor.id;
  } catch {}

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const vendorId = await resolveVendorId(request);
    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized or vendor not found' }, { status: 401 });
    }

    const body = await request.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      planCode,
      billingCycle = 'MONTHLY',
      couponCode,
      originalPriceMinor,
      discountMinor,
      finalAmountMinor,
    } = body;

    // Verify signature
    const isValidSignature = verifyRazorpaySignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid payment signature. Verification failed.' }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: String(planCode).toUpperCase() },
    });

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    const now = new Date();
    const currentExpiry = vendor?.subscriptionExpiresAt;
    const baseDate = (currentExpiry && currentExpiry > now) ? currentExpiry : now;

    const isYearly = billingCycle === 'YEARLY';
    const daysToAdd = isYearly ? 365 : 30;
    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // 1. Record Invoice
    const invoice = await prisma.vendorSubscriptionInvoice.create({
      data: {
        vendorId,
        planId: plan?.id || null,
        billingCycle,
        originalPriceMinor: Number(originalPriceMinor) || 0,
        discountMinor: Number(discountMinor) || 0,
        finalAmountMinor: Number(finalAmountMinor) || 0,
        couponCode: couponCode || null,
        razorpayOrderId,
        razorpayPaymentId,
        status: 'SUCCESS',
        startsAt: baseDate,
        expiresAt: newExpiry,
      },
    });

    // 2. Record Coupon Redemption if coupon was used
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: String(couponCode).toUpperCase() } });
      if (coupon) {
        await prisma.couponRedemption.create({
          data: {
            couponId: coupon.id,
            vendorId,
            invoiceId: invoice.id,
            discountMinor: Number(discountMinor) || 0,
          },
        });
        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { currentUsesTotal: { increment: 1 } },
        });
      }
    }

    // 3. Update Vendor Status
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        subscriptionPlan: plan?.code || vendor?.subscriptionPlan || 'STARTER',
        subscriptionExpiresAt: newExpiry,
        isSubscriptionActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Payment successful! Subscription active until ${newExpiry.toLocaleDateString('en-IN')}.`,
      expiresAt: newExpiry,
      invoiceId: invoice.id,
    });
  } catch (err: any) {
    console.error('Subscription verification error:', err);
    return NextResponse.json({ error: err.message || 'Payment verification failed' }, { status: 500 });
  }
}
