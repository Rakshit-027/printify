export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { executeRetentionCleanup } from '@/lib/retention-worker';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    if (authResult instanceof NextResponse) return authResult;

    const result = await executeRetentionCleanup(100);

    return NextResponse.json({
      success: true,
      message: 'Retention cleanup cycle executed successfully',
      result,
    });
  } catch (error: any) {
    console.error('Retention execution error:', error);
    return NextResponse.json({ error: 'Failed to run retention cleanup' }, { status: 500 });
  }
}
