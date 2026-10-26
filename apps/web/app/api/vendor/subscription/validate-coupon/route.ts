export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

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
    const { couponCode, planCode, billingCycle = 'MONTHLY' } = body;

    if (!couponCode) {
      return NextResponse.json({ valid: false, error: 'Coupon code is required' }, { status: 400 });
    }

    const cleanCode = String(couponCode).trim().toUpperCase();

    // 1. Fetch coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code' }, { status: 400 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, error: 'This coupon is no longer active' }, { status: 400 });
    }

    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      return NextResponse.json({ valid: false, error: 'This coupon is not yet active' }, { status: 400 });
    }

    if (coupon.validTill && now > coupon.validTill) {
      return NextResponse.json({ valid: false, error: 'This coupon has expired' }, { status: 400 });
    }

    if (coupon.maxUsesTotal !== -1 && coupon.currentUsesTotal >= coupon.maxUsesTotal) {
      return NextResponse.json({ valid: false, error: 'Coupon usage limit has been reached' }, { status: 400 });
    }

    // Check vendor usage limit
    const vendorRedemptionCount = await prisma.couponRedemption.count({
      where: { vendorId, couponId: coupon.id },
    });

    if (vendorRedemptionCount >= coupon.maxUsesPerVendor) {
      return NextResponse.json({
        valid: false,
        error: `You have already used this coupon (limit: ${coupon.maxUsesPerVendor} per vendor)`,
      }, { status: 400 });
    }

    // 2. Fetch plan
    let plan = null;
    if (planCode) {
      plan = await prisma.subscriptionPlan.findUnique({
        where: { code: String(planCode).toUpperCase() },
      });
    }

    if (!plan && coupon.discountType !== 'FREE_DAYS') {
      return NextResponse.json({ valid: false, error: 'Please select a valid plan' }, { status: 400 });
    }

    // Check plan restriction
    if (coupon.applicablePlanCodes && coupon.applicablePlanCodes.length > 0) {
      if (!plan || !coupon.applicablePlanCodes.includes(plan.code)) {
        return NextResponse.json({
          valid: false,
          error: `This coupon is only valid for plans: ${coupon.applicablePlanCodes.join(', ')}`,
        }, { status: 400 });
      }
    }

    const isYearly = billingCycle === 'YEARLY';
    const originalPriceMinor = plan ? (isYearly ? plan.priceYearlyMinor : plan.priceMonthlyMinor) : 0;

    if (coupon.minOrderMinor > 0 && originalPriceMinor < coupon.minOrderMinor) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount of ₹${(coupon.minOrderMinor / 100).toFixed(0)} required to use this coupon`,
      }, { status: 400 });
    }

    // Calculate discount
    let discountMinor = 0;
    let message = '';
    let isFreePass = false;

    if (coupon.discountType === 'FREE_DAYS') {
      discountMinor = originalPriceMinor;
      isFreePass = true;
      const days = coupon.freeDays || 30;
      message = `🎉 VIP Voucher applied! Grants ${days} Days 100% FREE subscription without payment.`;
    } else if (coupon.discountType === 'PERCENTAGE') {
      discountMinor = Math.round((originalPriceMinor * coupon.discountValue) / 100);
      if (coupon.maxDiscountMinor && discountMinor > coupon.maxDiscountMinor) {
        discountMinor = coupon.maxDiscountMinor;
      }
      message = `🎉 ${coupon.discountValue}% discount applied! You save ₹${(discountMinor / 100).toFixed(2)}.`;
    } else if (coupon.discountType === 'FLAT_AMOUNT') {
      discountMinor = Math.min(coupon.discountValue, originalPriceMinor);
      message = `🎉 Flat ₹${(discountMinor / 100).toFixed(0)} discount applied!`;
    }

    const finalAmountMinor = Math.max(0, originalPriceMinor - discountMinor);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      freeDays: coupon.freeDays,
      isFreePass,
      originalPriceMinor,
      discountMinor,
      finalAmountMinor,
      message,
    });
  } catch (err: any) {
    console.error('Error validating coupon:', err);
    return NextResponse.json({ valid: false, error: err.message || 'Validation failed' }, { status: 500 });
  }
}
