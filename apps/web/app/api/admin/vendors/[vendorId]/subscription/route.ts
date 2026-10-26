export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

// POST /api/admin/vendors/:vendorId/subscription
// Allows Admin to grant free days, override plan, or force-activate/suspend a vendor
export async function POST(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const authResult = await requireRoles(request, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    if (authResult instanceof NextResponse) return authResult;

    const { vendorId } = params;
    const body = await request.json();
    const {
      action, // 'GRANT_DAYS' | 'SET_EXPIRY' | 'SET_PLAN' | 'TOGGLE_STATUS'
      days,
      newExpiry,
      planCode,
      isActive,
      notes,
    } = body;

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    let updatedExpiresAt = vendor.subscriptionExpiresAt;
    let updatedIsActive = vendor.isSubscriptionActive;
    let updatedPlan = vendor.subscriptionPlan;
    const now = new Date();

    if (action === 'GRANT_DAYS') {
      const daysToAdd = Number(days) || 30;
      const baseDate = (updatedExpiresAt && updatedExpiresAt > now) ? updatedExpiresAt : now;
      updatedExpiresAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      updatedIsActive = true;
    } else if (action === 'SET_EXPIRY' && newExpiry) {
      updatedExpiresAt = new Date(newExpiry);
      updatedIsActive = updatedExpiresAt > now;
    } else if (action === 'SET_PLAN' && planCode) {
      updatedPlan = String(planCode).toUpperCase();
    } else if (action === 'TOGGLE_STATUS') {
      updatedIsActive = Boolean(isActive);
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        subscriptionExpiresAt: updatedExpiresAt,
        isSubscriptionActive: updatedIsActive,
        subscriptionPlan: updatedPlan,
        adminSubNotes: notes || vendor.adminSubNotes,
      },
    });

    // Record in AuditLog
    await prisma.auditLog.create({
      data: {
        action: `ADMIN_OVERRIDE_SUBSCRIPTION_${action}`,
        userId: (authResult as any).user?.id || null,
        resource: 'VENDOR_SUBSCRIPTION',
        resourceId: vendorId,
        details: {
          action,
          days,
          newExpiry,
          planCode,
          isActive,
          notes,
          previousExpiry: vendor.subscriptionExpiresAt,
          updatedExpiry: updatedExpiresAt,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Vendor subscription updated successfully',
      vendor: {
        id: updatedVendor.id,
        name: updatedVendor.name,
        subscriptionPlan: updatedVendor.subscriptionPlan,
        subscriptionExpiresAt: updatedVendor.subscriptionExpiresAt,
        isSubscriptionActive: updatedVendor.isSubscriptionActive,
        adminSubNotes: updatedVendor.adminSubNotes,
      },
    });
  } catch (err: any) {
    console.error('Error updating vendor subscription:', err);
    return NextResponse.json({ error: err.message || 'Failed to update vendor subscription' }, { status: 500 });
  }
}
