export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, logAuditEvent } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.vendorId) {
      return NextResponse.json({ error: 'Unauthorized: Vendor account required' }, { status: 401 });
    }

    const account = await prisma.vendorPaymentAccount.findUnique({
      where: { vendorId: session.vendorId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Payment account not found' }, { status: 404 });
    }

    // Safely clear credentials and disconnect
    await prisma.$transaction(async (tx) => {
      await tx.vendorPaymentAccount.update({
        where: { id: account.id },
        data: {
          authStatus: 'DISCONNECTED',
          onboardingStatus: 'NOT_STARTED',
          accessToken: null,
          refreshToken: null,
          lastSyncedAt: new Date(),
        },
      });

      await tx.vendor.update({
        where: { id: session.vendorId },
        data: {
          allowOnlinePayment: false,
        },
      });
    });

    await logAuditEvent({
      userId: session.userId,
      action: 'VENDOR_RAZORPAY_DISCONNECTED',
      resource: 'VendorPaymentAccount',
      resourceId: account.id,
      details: {
        vendorId: session.vendorId,
        razorpayAccountId: account.razorpayAccountId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Razorpay account disconnected successfully. Online payment is now disabled.',
    });
  } catch (error: any) {
    console.error('[VendorPaymentDisconnect] Error:', error);
    return NextResponse.json({ error: 'Failed to disconnect payment account' }, { status: 500 });
  }
}
