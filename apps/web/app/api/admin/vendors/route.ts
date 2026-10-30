export const dynamic = "force-dynamic";
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
    } catch (dbErr) {
      console.error('Failed to query vendors database:', dbErr);
      return NextResponse.json({ error: 'Failed to retrieve vendors from database' }, { status: 500 });
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
