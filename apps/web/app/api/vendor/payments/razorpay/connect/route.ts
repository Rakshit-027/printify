export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest, logAuditEvent } from '@/lib/auth';
import {
  createOAuthStateToken,
  getPartnerAuthorizeUrl,
  isPartnerConfigured,
  getAppBaseUrl,
} from '@/lib/razorpay-partner';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.vendorId) {
      return NextResponse.json({ error: 'Unauthorized: Vendor account required' }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: session.vendorId },
      include: { paymentAccount: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor record not found' }, { status: 404 });
    }

    // 1. Generate cryptographically signed state token (expires in 15 mins)
    const stateToken = await createOAuthStateToken(vendor.id, session.userId);

    // 2. Mark initial onboarding state in database
    await prisma.vendorPaymentAccount.upsert({
      where: { vendorId: vendor.id },
      update: {
        onboardingStatus: 'IN_PROGRESS',
        lastError: null,
      },
      create: {
        vendorId: vendor.id,
        partnerApp: 'Print2me',
        authStatus: 'NOT_CONNECTED',
        onboardingStatus: 'IN_PROGRESS',
        activationStatus: 'NOT_ACTIVATED',
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: 'VENDOR_RAZORPAY_ONBOARDING_INITIATED',
      resource: 'VendorPaymentAccount',
      resourceId: vendor.id,
      details: { vendorSlug: vendor.slug },
    });

    // 3. Determine authorize URL
    let authorizeUrl: string;
    const isConfigured = isPartnerConfigured();

    if (isConfigured) {
      authorizeUrl = getPartnerAuthorizeUrl(stateToken);
    } else {
      // In local dev/test environment without live partner credentials, provide local simulation callback
      const baseUrl = getAppBaseUrl();
      authorizeUrl = `${baseUrl}/api/vendor/payments/razorpay/callback?code=mock_code_${Date.now()}&state=${encodeURIComponent(stateToken)}`;
    }

    return NextResponse.json({
      success: true,
      authorizeUrl,
      isConfigured,
      message: isConfigured
        ? 'Redirecting to Razorpay secure authorization'
        : 'Development simulation mode active: redirecting to test onboarding callback',
    });
  } catch (error: any) {
    console.error('[VendorPaymentConnect] Error:', error);
    return NextResponse.json({ error: 'Failed to initiate onboarding flow' }, { status: 500 });
  }
}
