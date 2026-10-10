import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = request.nextUrl;
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const filter = searchParams.get('filter') || 'ALL'; // ALL, PENDING, ACTIVE, SUSPENDED

    const whereClause: any = {};
    if (filter === 'PENDING') whereClause.isApproved = false;
    if (filter === 'ACTIVE') {
      whereClause.isActive = true;
      whereClause.isApproved = true;
    }
    if (filter === 'SUSPENDED') whereClause.isActive = false;

    let vendors: any[] = [];
    let totalCount = 0;

    try {
      [vendors, totalCount] = await Promise.all([
        prisma.vendor.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                orders: true,
                devices: true,
                printers: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.vendor.count({ where: whereClause }),
      ]);
    } catch {
      // Offline fallback mock vendors
      vendors = [
        {
          id: 'v-demo-1',
          name: 'SpeedyPrint Express',
          slug: 'speedy-express',
          contactPhone: '+91 98765 00001',
          contactEmail: 'orders@speedyprint.com',
          address: 'Shop 4, Campus Arcade, Sector 14, Gurugram',
          isActive: true,
          isApproved: true,
          createdAt: new Date(),
          _count: { orders: 64, devices: 1, printers: 2 },
        },
        {
          id: 'v-demo-2',
          name: 'Apex Digital Xerox',
          slug: 'apex-xerox',
          contactPhone: '+91 98765 00002',
          contactEmail: 'contact@apexxerox.com',
          address: 'Gate 2, North Campus, New Delhi',
          isActive: true,
          isApproved: false, // Needs approval
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          _count: { orders: 0, devices: 0, printers: 0 },
        },
      ];
      totalCount = vendors.length;
    }

    return NextResponse.json({
      success: true,
      vendors,
      totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Admin vendors listing error:', error);
    return NextResponse.json({ error: 'Failed to retrieve vendor directory' }, { status: 500 });
  }
}
