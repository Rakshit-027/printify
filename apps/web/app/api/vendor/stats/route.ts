export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole, OrderStatus, PaymentStatus } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, [
      UserRole.VENDOR_OWNER,
      UserRole.VENDOR_STAFF,
      UserRole.SUPER_ADMIN,
    ]);

    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const vendorId = session.vendorId;
    if (!vendorId && session.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: 'No associated vendor account' }, { status: 400 });
    }

    const whereVendor = vendorId ? { vendorId } : {};

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      completedOrders,
      spoolingOrders,
      pendingApproval,
      cashPending,
      revenueAggregate,
      activeDevices,
    ] = await Promise.all([
      prisma.order.count({ where: whereVendor }),
      prisma.order.count({ where: { ...whereVendor, createdAt: { gte: startOfDay } } }),
      prisma.order.count({ where: { ...whereVendor, status: OrderStatus.COMPLETED } }),
      prisma.order.count({
        where: {
          ...whereVendor,
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
        },
      }),
      prisma.order.count({
        where: {
          ...whereVendor,
          status: OrderStatus.AWAITING_VENDOR_APPROVAL,
        },
      }),
      prisma.order.count({
        where: {
          ...whereVendor,
          paymentStatus: PaymentStatus.CASH_PENDING,
        },
      }),
      prisma.order.aggregate({
        where: {
          ...whereVendor,
          paymentStatus: { in: [PaymentStatus.SUCCESS, PaymentStatus.CASH_COLLECTED] },
        },
        _sum: { totalAmountMinor: true },
      }),
      prisma.device.count({
        where: {
          ...(vendorId ? { vendorId } : {}),
          isEnrolled: true,
          isRevoked: false,
        },
      }),
    ]);

    const totalRevenueMinor = revenueAggregate._sum.totalAmountMinor || 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        todayOrders,
        completedOrders,
        spoolingOrders,
        pendingApproval,
        cashPending,
        totalRevenueMinor,
        activeDevices,
      },
    });
  } catch (error: any) {
    console.error('Vendor stats calculation error:', error);
    return NextResponse.json({ error: 'Failed to retrieve vendor statistics' }, { status: 500 });
  }
}
