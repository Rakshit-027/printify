export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { isPartnerConfigured } from '@/lib/razorpay-partner';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.vendorId) {
      return NextResponse.json({ error: 'Unauthorized: Vendor account required' }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: session.vendorId },
      include: {
        paymentAccount: true,
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    const account = vendor.paymentAccount;

    return NextResponse.json({
      success: true,
      isConfigured: isPartnerConfigured(),
      account: account
        ? {
            id: account.id,
            partnerApp: account.partnerApp || 'Print2me',
            razorpayAccountId: account.razorpayAccountId,
            authStatus: account.authStatus,
            onboardingStatus: account.onboardingStatus,
            activationStatus: account.activationStatus,
            requirements: account.requirements,
            lastError: account.lastError,
            lastSyncedAt: account.lastSyncedAt,
            hasAccessToken: Boolean(account.accessToken),
            tokenExpiresAt: account.tokenExpiresAt,
          }
        : null,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        allowOnlinePayment: vendor.allowOnlinePayment,
        allowCashOnDesk: vendor.allowCashOnDesk,
      },
    });
  } catch (error: any) {
    console.error('[VendorPaymentStatus] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment account status' }, { status: 500 });
  }
}
