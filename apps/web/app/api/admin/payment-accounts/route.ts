export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || (session.role !== UserRole.SUPER_ADMIN && session.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'ALL'; // ALL, ACTIVATED, PENDING, NOT_CONNECTED, RESTRICTED

    const vendors = await prisma.vendor.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        isActive: true,
        isApproved: true,
        allowOnlinePayment: true,
        allowCashOnDesk: true,
        createdAt: true,
        paymentAccount: {
          select: {
            id: true,
            partnerApp: true,
            razorpayAccountId: true,
            authStatus: true,
            onboardingStatus: true,
            activationStatus: true,
            requirements: true,
            lastError: true,
            lastSyncedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    // Apply filter
    let filtered = vendors;
    if (filter === 'ACTIVATED') {
      filtered = vendors.filter(
        (v) => v.paymentAccount?.activationStatus === 'ACTIVATED'
      );
    } else if (filter === 'PENDING') {
      filtered = vendors.filter(
        (v) =>
          v.paymentAccount &&
          v.paymentAccount.authStatus === 'AUTHORIZED' &&
          v.paymentAccount.activationStatus !== 'ACTIVATED'
      );
    } else if (filter === 'NOT_CONNECTED') {
      filtered = vendors.filter(
        (v) => !v.paymentAccount || v.paymentAccount.authStatus === 'NOT_CONNECTED' || v.paymentAccount.authStatus === 'DISCONNECTED'
      );
    } else if (filter === 'RESTRICTED') {
      filtered = vendors.filter(
        (v) =>
          v.paymentAccount?.activationStatus === 'SUSPENDED' ||
          v.paymentAccount?.activationStatus === 'REJECTED' ||
          v.paymentAccount?.activationStatus === 'NEEDS_CLARIFICATION'
      );
    }

    // Get statistics
    const stats = {
      totalVendors: vendors.length,
      activatedCount: vendors.filter(
        (v) => v.paymentAccount?.activationStatus === 'ACTIVATED'
      ).length,
      underReviewCount: vendors.filter(
        (v) => v.paymentAccount?.activationStatus === 'UNDER_REVIEW'
      ).length,
      notConnectedCount: vendors.filter(
        (v) => !v.paymentAccount || v.paymentAccount.authStatus !== 'AUTHORIZED'
      ).length,
      restrictedCount: vendors.filter(
        (v) =>
          v.paymentAccount?.activationStatus === 'SUSPENDED' ||
          v.paymentAccount?.activationStatus === 'REJECTED'
      ).length,
    };

    return NextResponse.json({
      success: true,
      stats,
      vendors: filtered,
    });
  } catch (error: any) {
    console.error('[AdminPaymentAccounts] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment accounts' }, { status: 500 });
  }
}
