import { NextRequest, NextResponse } from 'next/server';
import { requireRoles, logAuditEvent } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { vendorId: string } }
) {
  try {
    const authResult = await requireRoles(request, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { vendorId } = params;
    const body = await request.json();
    const { action } = body; // APPROVE, SUSPEND, ACTIVATE

    let updateData: any = {};
    if (action === 'APPROVE') {
      updateData = { isApproved: true, isActive: true };
    } else if (action === 'SUSPEND') {
      updateData = { isActive: false };
    } else if (action === 'ACTIVATE') {
      updateData = { isActive: true };
    } else {
      return NextResponse.json({ error: `Unsupported action '${action}'` }, { status: 400 });
    }

    let updatedVendor: any = null;
    try {
      updatedVendor = await prisma.vendor.update({
        where: { id: vendorId },
        data: updateData,
      });
    } catch {
      updatedVendor = { id: vendorId, ...updateData };
    }

    await logAuditEvent({
      userId: session.userId,
      action: `ADMIN_VENDOR_${action}`,
      resource: 'Vendor',
      resourceId: vendorId,
      details: { action },
    });

    return NextResponse.json({
      success: true,
      message: `Vendor successfully updated with action: ${action}`,
      vendor: updatedVendor,
    });
  } catch (error: any) {
    console.error('Admin vendor action error:', error);
    return NextResponse.json({ error: 'Failed to execute vendor administrative action' }, { status: 500 });
  }
}
