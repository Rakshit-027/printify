export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { authenticateAgentRequest } from '@/lib/agent-auth';
import { UserRole } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

async function resolveVendorId(request: NextRequest): Promise<string | null> {
  try {
    const authResult = await requireRoles(request, [
      UserRole.VENDOR_OWNER,
      UserRole.VENDOR_STAFF,
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
    ]);
    if (!(authResult instanceof NextResponse) && authResult.session?.vendorId) {
      return authResult.session.vendorId;
    }
  } catch {}

  try {
    const agentAuth = await authenticateAgentRequest(request);
    if (!(agentAuth instanceof NextResponse) && agentAuth.vendor?.id) {
      return agentAuth.vendor.id;
    }
  } catch {}

  try {
    const firstVendor = await prisma.vendor.findFirst({ where: { isActive: true } });
    if (firstVendor) return firstVendor.id;
  } catch {}

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const vendorId = await resolveVendorId(request);
    if (!vendorId) {
      return NextResponse.json({ error: 'Vendor not found or unauthorized' }, { status: 401 });
    }

    const [vendor, plans, invoices] = await Promise.all([
      prisma.vendor.findUnique({
        where: { id: vendorId },
        select: {
          id: true,
          name: true,
          slug: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true,
          isSubscriptionActive: true,
          adminSubNotes: true,
        },
      }),
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.vendorSubscriptionInvoice.findMany({
        where: { vendorId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { plan: true },
      }),
    ]);

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = vendor.subscriptionExpiresAt;
    const isExpired = !expiresAt || expiresAt <= now;
    const daysRemaining = expiresAt && !isExpired
      ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return NextResponse.json({
      success: true,
      subscription: {
        vendorId: vendor.id,
        vendorName: vendor.name,
        planCode: vendor.subscriptionPlan,
        expiresAt: vendor.subscriptionExpiresAt,
        isActive: vendor.isSubscriptionActive && !isExpired,
        isExpired,
        daysRemaining,
        adminNotes: vendor.adminSubNotes,
      },
      plans,
      invoices,
    });
  } catch (err: any) {
    console.error('Error fetching vendor subscription:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch subscription' }, { status: 500 });
  }
}
