export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/auth';
import {
  verifyOAuthStateToken,
  exchangeAuthorizationCode,
  fetchRazorpayAccountStatus,
  getAppBaseUrl,
} from '@/lib/razorpay-partner';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const baseUrl = getAppBaseUrl();

  // 1. Handle user cancellation or provider error from Razorpay
  if (errorParam) {
    console.warn(`[RazorpayOAuthCallback] Provider error: ${errorParam} - ${errorDescription}`);
    return NextResponse.redirect(
      new URL(
        `/vendor?nav=PAYMENTS&error=${encodeURIComponent(errorDescription || errorParam)}`,
        baseUrl
      )
    );
  }

  // 2. Validate mandatory parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/vendor?nav=PAYMENTS&error=missing_callback_parameters', baseUrl)
    );
  }

  // 3. Verify cryptographic state token (CSRF & tampering check)
  const statePayload = await verifyOAuthStateToken(state);
  if (!statePayload) {
    return NextResponse.redirect(
      new URL('/vendor?nav=PAYMENTS&error=invalid_or_expired_state', baseUrl)
    );
  }

  const { vendorId, userId } = statePayload;

  try {
    // 4. Exchange authorization code for OAuth access token & sub-merchant account id
    const tokenResult = await exchangeAuthorizationCode(code, statePayload);

    if (!tokenResult.success || !tokenResult.razorpayAccountId) {
      const errorMsg = tokenResult.error || 'Failed to complete Razorpay token authorization';
      console.error('[RazorpayOAuthCallback] Exchange failed:', errorMsg);

      await prisma.vendorPaymentAccount.upsert({
        where: { vendorId },
        update: {
          lastError: errorMsg,
          onboardingStatus: 'NOT_STARTED',
        },
        create: {
          vendorId,
          lastError: errorMsg,
          onboardingStatus: 'NOT_STARTED',
          authStatus: 'NOT_CONNECTED',
        },
      });

      return NextResponse.redirect(
        new URL(`/vendor?nav=PAYMENTS&error=${encodeURIComponent(errorMsg)}`, baseUrl)
      );
    }

    // 5. Query initial account activation status from Razorpay V2 Accounts API
    let activationStatus = 'UNDER_REVIEW';
    let requirements: any = null;

    try {
      const statusResult = await fetchRazorpayAccountStatus(tokenResult.razorpayAccountId);
      if (statusResult.success) {
        activationStatus = statusResult.activationStatus;
        requirements = statusResult.requirements || null;
      }
    } catch (statusErr) {
      console.warn('[RazorpayOAuthCallback] Could not immediately sync account status:', statusErr);
    }

    // 6. Persist vendor payment account in database
    const tokenExpiresAt = tokenResult.expiresIn
      ? new Date(Date.now() + tokenResult.expiresIn * 1000)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    await prisma.vendorPaymentAccount.upsert({
      where: { vendorId },
      update: {
        partnerApp: 'Print2me',
        razorpayAccountId: tokenResult.razorpayAccountId,
        publicToken: tokenResult.publicToken || null,
        accessToken: tokenResult.accessToken || null,
        refreshToken: tokenResult.refreshToken || null,
        tokenExpiresAt,
        authStatus: 'AUTHORIZED',
        onboardingStatus: 'COMPLETED',
        activationStatus,
        requirements,
        lastError: null,
        lastSyncedAt: new Date(),
      },
      create: {
        vendorId,
        partnerApp: 'Print2me',
        razorpayAccountId: tokenResult.razorpayAccountId,
        publicToken: tokenResult.publicToken || null,
        accessToken: tokenResult.accessToken || null,
        refreshToken: tokenResult.refreshToken || null,
        tokenExpiresAt,
        authStatus: 'AUTHORIZED',
        onboardingStatus: 'COMPLETED',
        activationStatus,
        requirements,
        lastError: null,
        lastSyncedAt: new Date(),
      },
    });

    // Also update vendor allowOnlinePayment flag to true
    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        allowOnlinePayment: true,
      },
    });

    await logAuditEvent({
      userId,
      action: 'VENDOR_RAZORPAY_CONNECTED',
      resource: 'VendorPaymentAccount',
      resourceId: vendorId,
      details: {
        razorpayAccountId: tokenResult.razorpayAccountId,
        activationStatus,
        isSimulated: Boolean(tokenResult.isSimulated),
      },
    });

    return NextResponse.redirect(
      new URL(
        `/vendor?nav=PAYMENTS&onboarding=success&status=${encodeURIComponent(activationStatus)}`,
        baseUrl
      )
    );
  } catch (err: any) {
    console.error('[RazorpayOAuthCallback] Unhandled exception:', err);
    return NextResponse.redirect(
      new URL(
        `/vendor?nav=PAYMENTS&error=${encodeURIComponent(err.message || 'Onboarding error')}`,
        baseUrl
      )
    );
  }
}
