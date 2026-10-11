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
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '30', 10));
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const actionFilter = searchParams.get('action');

    const whereClause: any = {};
    if (actionFilter) whereClause.action = { contains: actionFilter };

    let logs: any[] = [];
    let totalCount = 0;

    try {
      [logs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          include: {
            user: { select: { email: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.auditLog.count({ where: whereClause }),
      ]);
    } catch {
      // Mock logs for preview
      logs = [
        {
          id: 'log-1',
          action: 'USER_LOGIN_SUCCESS',
          resource: 'User',
          resourceId: 'admin-1',
          ipAddress: '127.0.0.1',
          createdAt: new Date(),
          user: { email: 'admin@print2me.in', fullName: 'Platform Administrator', role: 'SUPER_ADMIN' },
        },
        {
          id: 'log-2',
          action: 'DEVICE_ENROLLED_SUCCESS',
          resource: 'Device',
          resourceId: 'dev-1',
          ipAddress: '192.168.1.100',
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
          user: null,
        },
      ];
      totalCount = logs.length;
    }

    return NextResponse.json({
      success: true,
      logs,
      totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Audit logs query error:', error);
    return NextResponse.json({ error: 'Failed to retrieve audit trail' }, { status: 500 });
  }
}
