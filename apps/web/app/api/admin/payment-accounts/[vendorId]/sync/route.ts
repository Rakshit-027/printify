export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, logAuditEvent } from '@/lib/auth';
import { fetchRazorpayAccountStatus } from '@/lib/razorpay-partner';
import { UserRole } from '@printflow/shared-types';

export async function POST(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || (session.role !== UserRole.SUPER_ADMIN && session.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { vendorId } = params;

    const account = await prisma.vendorPaymentAccount.findUnique({
      where: { vendorId },
    });

    if (!account || !account.razorpayAccountId) {
      return NextResponse.json(
        { error: 'No connected Razorpay account identifier found for this vendor' },
        { status: 400 }
      );
    }

    const statusResult = await fetchRazorpayAccountStatus(account.razorpayAccountId);

    if (!statusResult.success) {
      await prisma.vendorPaymentAccount.update({
        where: { id: account.id },
        data: {
          lastError: statusResult.error || 'Failed to sync status from Razorpay',
          lastSyncedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: statusResult.error || 'Failed to sync status from Razorpay',
          lastSyncedAt: new Date(),
        },
        { status: 502 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const acc = await tx.vendorPaymentAccount.update({
        where: { id: account.id },
        data: {
          activationStatus: statusResult.activationStatus,
          requirements: statusResult.requirements || undefined,
          lastError: null,
          lastSyncedAt: new Date(),
        },
      });

      if (statusResult.activationStatus === 'ACTIVATED') {
        await tx.vendor.update({
          where: { id: vendorId },
          data: { allowOnlinePayment: true },
        });
      }

      return acc;
    });

    await logAuditEvent({
      userId: session.userId,
      action: 'ADMIN_SYNCED_VENDOR_PAYMENT_STATUS',
      resource: 'VendorPaymentAccount',
      resourceId: account.id,
      details: {
        vendorId,
        razorpayAccountId: account.razorpayAccountId,
        activationStatus: statusResult.activationStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Vendor Razorpay status synchronized successfully',
      account: {
        id: updated.id,
        razorpayAccountId: updated.razorpayAccountId,
        authStatus: updated.authStatus,
        activationStatus: updated.activationStatus,
        lastSyncedAt: updated.lastSyncedAt,
      },
    });
  } catch (error: any) {
    console.error('[AdminPaymentSync] Error:', error);
    return NextResponse.json({ error: 'Failed to synchronize vendor status' }, { status: 500 });
  }
}
