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

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const vendorId = await resolveVendorId(request);
    if (!vendorId) {
      return NextResponse.json({ error: 'Unauthorized: Vendor login required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      planCode,
      billingCycle = 'MONTHLY',
      couponCode,
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

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'Invalid or inactive subscription plan' }, { status: 400 });
    }

    // Authoritatively calculate prices server-side (never trust client amounts)
    const isYearly = billingCycle === 'YEARLY';
    const serverOriginalPriceMinor = isYearly ? plan.priceYearlyMinor : plan.priceMonthlyMinor;
    let serverDiscountMinor = 0;
    let validCoupon: any = null;

    if (couponCode) {
      const cleanCode = String(couponCode).trim().toUpperCase();
      validCoupon = await prisma.coupon.findUnique({ where: { code: cleanCode } });
      if (validCoupon && validCoupon.isActive) {
        const now = new Date();
        const isValidDate = (!validCoupon.validFrom || now >= validCoupon.validFrom) &&
                            (!validCoupon.validTill || now <= validCoupon.validTill);
        const hasUses = validCoupon.maxUsesTotal === -1 || validCoupon.currentUsesTotal < validCoupon.maxUsesTotal;
        const vendorUses = await prisma.couponRedemption.count({
          where: { vendorId, couponId: validCoupon.id },
        });

        if (isValidDate && hasUses && vendorUses < validCoupon.maxUsesPerVendor) {
          if (validCoupon.discountType === 'FREE_DAYS') {
            serverDiscountMinor = serverOriginalPriceMinor;
          } else if (validCoupon.discountType === 'PERCENTAGE') {
            serverDiscountMinor = Math.round((serverOriginalPriceMinor * validCoupon.discountValue) / 100);
            if (validCoupon.maxDiscountMinor && serverDiscountMinor > validCoupon.maxDiscountMinor) {
              serverDiscountMinor = validCoupon.maxDiscountMinor;
            }
          } else if (validCoupon.discountType === 'FLAT_AMOUNT') {
            serverDiscountMinor = Math.min(validCoupon.discountValue, serverOriginalPriceMinor);
          }
        }
      }
    }

    const serverFinalAmountMinor = Math.max(0, serverOriginalPriceMinor - serverDiscountMinor);

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    const now = new Date();
    const currentExpiry = vendor?.subscriptionExpiresAt;
    const baseDate = (currentExpiry && currentExpiry > now) ? currentExpiry : now;

    let daysToAdd = isYearly ? 365 : 30;
    if (validCoupon?.freeDays) {
      daysToAdd = validCoupon.freeDays;
    }
    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    // 1. Authoritative Invoice Record
    const invoice = await prisma.vendorSubscriptionInvoice.create({
      data: {
        vendorId,
        planId: plan.id,
        billingCycle,
        originalPriceMinor: serverOriginalPriceMinor,
        discountMinor: serverDiscountMinor,
        finalAmountMinor: serverFinalAmountMinor,
        couponCode: validCoupon?.code || null,
        razorpayOrderId,
        razorpayPaymentId,
        status: 'SUCCESS',
        startsAt: baseDate,
        expiresAt: newExpiry,
      },
    });

    // 2. Record Coupon Redemption if valid coupon applied
    if (validCoupon) {
      await prisma.couponRedemption.create({
        data: {
          couponId: validCoupon.id,
          vendorId,
          invoiceId: invoice.id,
          discountMinor: serverDiscountMinor,
        },
      });
      await prisma.coupon.update({
        where: { id: validCoupon.id },
        data: { currentUsesTotal: { increment: 1 } },
      });
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
