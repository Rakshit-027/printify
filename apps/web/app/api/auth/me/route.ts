export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        vendorMemberships: {
          select: {
            role: true,
            vendor: {
              select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                contactPhone: true,
                operatingHours: true,
                isApproved: true,
                isActive: true,
                allowCashOnDesk: true,
                requireApproval: true,
                subscriptionPlan: true,
                subscriptionExpiresAt: true,
                isSubscriptionActive: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const primaryMembership = user.vendorMemberships[0];

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        vendor: primaryMembership ? primaryMembership.vendor : null,
      },
    });
  } catch (error) {
    console.error('Fetch session error:', error);
    return NextResponse.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}
