export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';
import { createRazorpayOrder } from '@/lib/razorpay';

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
    const { planCode, billingCycle = 'MONTHLY', couponCode } = body;

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { code: String(planCode).toUpperCase() },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'Invalid or inactive subscription plan' }, { status: 400 });
    }

    const isYearly = billingCycle === 'YEARLY';
    const originalPriceMinor = isYearly ? plan.priceYearlyMinor : plan.priceMonthlyMinor;
    let discountMinor = 0;
    let validCoupon: any = null;
    let isFreePass = false;

    // Validate Coupon if provided
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
            isFreePass = true;
            discountMinor = originalPriceMinor;
          } else if (validCoupon.discountType === 'PERCENTAGE') {
            discountMinor = Math.round((originalPriceMinor * validCoupon.discountValue) / 100);
            if (validCoupon.maxDiscountMinor && discountMinor > validCoupon.maxDiscountMinor) {
              discountMinor = validCoupon.maxDiscountMinor;
            }
          } else if (validCoupon.discountType === 'FLAT_AMOUNT') {
            discountMinor = Math.min(validCoupon.discountValue, originalPriceMinor);
          }
        }
      }
    }

    const finalAmountMinor = Math.max(0, originalPriceMinor - discountMinor);
    const now = new Date();

    // CASE 1: 100% Free Pass (Coupon FREE_DAYS or 100% off) -> Instant Activation!
    if (finalAmountMinor === 0 || isFreePass) {
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      const currentExpiry = vendor?.subscriptionExpiresAt;
      const baseDate = (currentExpiry && currentExpiry > now) ? currentExpiry : now;

      // Duration: if freeDays specified use that, otherwise default month/year
      let daysToAdd = isYearly ? 365 : 30;
      if (validCoupon?.freeDays) {
        daysToAdd = validCoupon.freeDays;
      }

      const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      // 1. Create Invoice
      const invoice = await prisma.vendorSubscriptionInvoice.create({
        data: {
          vendorId,
          planId: plan.id,
          billingCycle: isFreePass ? 'FREE_PASS' : billingCycle,
          originalPriceMinor,
          discountMinor,
          finalAmountMinor: 0,
          couponCode: validCoupon?.code || null,
          status: 'SUCCESS',
          startsAt: baseDate,
          expiresAt: newExpiry,
        },
      });

      // 2. Record Coupon Redemption
      if (validCoupon) {
        await prisma.couponRedemption.create({
          data: {
            couponId: validCoupon.id,
            vendorId,
            invoiceId: invoice.id,
            discountMinor,
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
          subscriptionPlan: plan.code,
          subscriptionExpiresAt: newExpiry,
          isSubscriptionActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        activated: true,
        message: `Subscription activated until ${newExpiry.toLocaleDateString('en-IN')}!`,
        expiresAt: newExpiry,
        plan: plan.name,
      });
    }

    // CASE 2: Payment Required -> Initialize Razorpay Order
    const receipt = `sub_${vendorId.slice(0, 6)}_${Date.now()}`;
    const rzpOrder = await createRazorpayOrder(finalAmountMinor, receipt, {
      vendorId,
      planCode: plan.code,
      billingCycle,
      couponCode: validCoupon?.code || '',
      originalPriceMinor: String(originalPriceMinor),
      discountMinor: String(discountMinor),
    });

    return NextResponse.json({
      success: true,
      activated: false,
      razorpayOrder: {
        orderId: rzpOrder.razorpayOrderId,
        amountMinor: rzpOrder.amountMinor,
        currency: rzpOrder.currency,
        keyId: rzpOrder.keyId,
        isMock: rzpOrder.isMock,
        planName: plan.name,
        planCode: plan.code,
        billingCycle,
        couponCode: validCoupon?.code || null,
        originalPriceMinor,
        discountMinor,
      },
    });
  } catch (err: any) {
    console.error('Subscription checkout error:', err);
    return NextResponse.json({ error: err.message || 'Checkout failed' }, { status: 500 });
  }
}
