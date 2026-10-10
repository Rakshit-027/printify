import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateAgentRequest } from '@/lib/agent-auth';
import { PrintJobStatus } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAgentRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { device, vendor } = authResult;

    const body = await request.json();
    const { jobId, leaseSeconds = 120 } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const claimToken = crypto.randomUUID();
    const leaseDuration = Math.min(600, Math.max(30, leaseSeconds));
    const claimExpires = new Date(Date.now() + leaseDuration * 1000);

    let updatedJob: any = null;
    try {
      updatedJob = await prisma.$transaction(async (tx) => {
        const job = await tx.printJob.findUnique({
          where: { id: jobId },
        });

        if (!job || job.vendorId !== vendor.id) {
          throw new Error('Print job not found for this vendor');
        }

        if (job.status !== PrintJobStatus.QUEUED) {
          throw new Error(`Cannot claim job in status '${job.status}'`);
        }

        const claimed = await tx.printJob.update({
          where: { id: job.id },
          data: {
            status: PrintJobStatus.CLAIMED_BY_DEVICE,
            deviceId: device.id,
            claimToken,
            claimExpires,
            attempts: { increment: 1 },
          },
        });

        await tx.printJobEvent.create({
          data: {
            printJobId: claimed.id,
            status: PrintJobStatus.CLAIMED_BY_DEVICE,
            message: `Claimed by device ${device.deviceName} (Lease: ${leaseDuration}s)`,
          },
        });

        return claimed;
      });
    } catch (err: any) {
      if (jobId.startsWith('job-demo-')) {
        return NextResponse.json({
          success: true,
          jobId,
          claimToken,
          claimExpires,
          isMock: true,
        });
      }
      return NextResponse.json({ error: err.message || 'Failed to claim print job' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      jobId: updatedJob.id,
      claimToken,
      claimExpires,
    });
  } catch (error: any) {
    console.error('Claim job error:', error);
    return NextResponse.json({ error: 'Internal error claiming print job' }, { status: 500 });
  }
}
