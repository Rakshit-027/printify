export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agent-auth';
import { PrintJobStatus, OrderStatus } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const authResult = await authenticateAgentRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { device, vendor } = authResult;

    const { jobId } = params;
    const body = await request.json();
    const { status, claimToken, message, metadata } = body;

    if (!status || !claimToken) {
      return NextResponse.json({ error: 'status and claimToken are required' }, { status: 400 });
    }

    let job: any = null;
    try {
      job = await prisma.printJob.findUnique({
        where: { id: jobId },
      });
    } catch {
      job = null;
    }

    if (!job || job.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Job not found for this vendor' }, { status: 404 });
    }

    if (job.claimToken !== claimToken) {
      return NextResponse.json({ error: 'Invalid claim token for this job' }, { status: 403 });
    }

    // Update job & record event in transaction
    await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: status as PrintJobStatus,
        lastError: status === PrintJobStatus.FAILED ? message || 'Print spooling error' : null,
      };

      if (status === PrintJobStatus.SUBMITTED_TO_SPOOLER) {
        updateData.spooledAt = new Date();
      }

      if (status === PrintJobStatus.COMPLETED) {
        updateData.completedAt = new Date();
        // Update Order to READY_FOR_PICKUP
        await tx.order.update({
          where: { id: job.orderId },
          data: { status: OrderStatus.READY_FOR_PICKUP },
        });
      }

      await tx.printJob.update({
        where: { id: job.id },
        data: updateData,
      });

      await tx.printJobEvent.create({
        data: {
          printJobId: job.id,
          status: status as PrintJobStatus,
          message: message || `Agent reported state transition: ${status}`,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Print job ${job.id} transitioned to ${status}`,
    });
  } catch (error: any) {
    console.error('Agent job status update error:', error);
    return NextResponse.json({ error: 'Failed to update print job status' }, { status: 500 });
  }
}
