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

    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get('status');
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const whereClause: any = {};
    if (vendorId) whereClause.vendorId = vendorId;

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'CASH_PENDING' || statusFilter === 'PENDING_CASH') {
        whereClause.paymentStatus = PaymentStatus.CASH_PENDING;
      } else if (statusFilter === 'PENDING') {
        whereClause.OR = [
          { status: OrderStatus.AWAITING_VENDOR_APPROVAL },
          { paymentStatus: PaymentStatus.CASH_PENDING },
        ];
      } else if (Object.values(OrderStatus).includes(statusFilter as any)) {
        whereClause.status = statusFilter;
      }
    }

    let orders: any[] = [];
    let totalCount = 0;

    try {
      [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            items: {
              include: {
                document: {
                  select: {
                    originalName: true,
                    pageCount: true,
                    mimeType: true,
                  },
                },
              },
            },
            printJobs: {
              select: {
                id: true,
                status: true,
                attempts: true,
                lastError: true,
              },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.order.count({ where: whereClause }),
      ]);
    } catch (dbErr) {
      console.error('Failed to query orders database:', dbErr);
      return NextResponse.json({ error: 'Failed to retrieve orders from database' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orders,
      totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Fetch vendor orders error:', error);
    return NextResponse.json({ error: 'Failed to retrieve vendor orders' }, { status: 500 });
  }
}
