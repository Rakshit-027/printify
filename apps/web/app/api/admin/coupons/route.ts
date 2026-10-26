export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

// GET /api/admin/coupons - List all coupons with stats
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    if (authResult instanceof NextResponse) return authResult;

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });

    // Also compute total discount given across all redemptions
    const redemptionsAggregate = await prisma.couponRedemption.aggregate({
      _sum: { discountMinor: true },
    });

    return NextResponse.json({
      success: true,
      coupons,
      totalDiscountGivenMinor: redemptionsAggregate._sum.discountMinor || 0,
    });
  } catch (err: any) {
    console.error('Error fetching coupons:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch coupons' }, { status: 500 });
  }
}

// POST /api/admin/coupons - Create or update a coupon
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const {
      id,
      code,
      description,
      discountType,
      discountValue,
      freeDays,
      minOrderMinor,
      maxDiscountMinor,
      maxUsesTotal,
      maxUsesPerVendor,
      validFrom,
      validTill,
      isActive,
      applicablePlanCodes,
    } = body;

    if (!code || !discountType) {
      return NextResponse.json({ error: 'Coupon code and discountType are required' }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();

    const data: any = {
      code: cleanCode,
      description: description || null,
      discountType, // 'PERCENTAGE' | 'FLAT_AMOUNT' | 'FREE_DAYS'
      discountValue: Number(discountValue) || 0,
      freeDays: discountType === 'FREE_DAYS' ? (Number(freeDays) || 30) : null,
      minOrderMinor: Number(minOrderMinor) || 0,
      maxDiscountMinor: maxDiscountMinor ? Number(maxDiscountMinor) : null,
      maxUsesTotal: maxUsesTotal !== undefined ? Number(maxUsesTotal) : 100,
      maxUsesPerVendor: Number(maxUsesPerVendor) || 1,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validTill: validTill ? new Date(validTill) : null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      applicablePlanCodes: Array.isArray(applicablePlanCodes) ? applicablePlanCodes : [],
    };

    let coupon;
    if (id) {
      coupon = await prisma.coupon.update({
        where: { id },
        data,
      });
    } else {
      coupon = await prisma.coupon.upsert({
        where: { code: cleanCode },
        update: data,
        create: data,
      });
    }

    return NextResponse.json({ success: true, coupon });
  } catch (err: any) {
    console.error('Error saving coupon:', err);
    return NextResponse.json({ error: err.message || 'Failed to save coupon' }, { status: 500 });
  }
}
