export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, logAuditEvent } from '@/lib/auth';
import { fetchRazorpayAccountStatus } from '@/lib/razorpay-partner';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.vendorId) {
      return NextResponse.json({ error: 'Unauthorized: Vendor account required' }, { status: 401 });
    }

    const account = await prisma.vendorPaymentAccount.findUnique({
      where: { vendorId: session.vendorId },
    });

    if (!account || !account.razorpayAccountId) {
      return NextResponse.json(
        { error: 'No connected Razorpay account found to synchronize' },
        { status: 400 }
      );
    }

    // Call official Razorpay V2 Accounts API
    const statusResult = await fetchRazorpayAccountStatus(account.razorpayAccountId);

    if (!statusResult.success) {
      await prisma.vendorPaymentAccount.update({
        where: { id: account.id },
        data: {
          lastError: statusResult.error || 'Failed to sync status with Razorpay',
          lastSyncedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: statusResult.error || 'Failed to sync status with Razorpay',
          lastSyncedAt: new Date(),
        },
        { status: 502 }
      );
    }

    const updated = await prisma.vendorPaymentAccount.update({
      where: { id: account.id },
      data: {
        activationStatus: statusResult.activationStatus,
        requirements: statusResult.requirements || undefined,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: 'VENDOR_RAZORPAY_STATUS_SYNCED',
      resource: 'VendorPaymentAccount',
      resourceId: account.id,
      details: {
        razorpayAccountId: account.razorpayAccountId,
        activationStatus: statusResult.activationStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Account status synchronized successfully',
      account: {
        id: updated.id,
        razorpayAccountId: updated.razorpayAccountId,
        authStatus: updated.authStatus,
        onboardingStatus: updated.onboardingStatus,
        activationStatus: updated.activationStatus,
        requirements: updated.requirements,
        lastSyncedAt: updated.lastSyncedAt,
      },
    });
  } catch (error: any) {
    console.error('[VendorPaymentSync] Error:', error);
    return NextResponse.json({ error: 'Failed to synchronize account status' }, { status: 500 });
  }
}
