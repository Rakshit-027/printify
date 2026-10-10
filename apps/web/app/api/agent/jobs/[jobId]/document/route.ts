export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agent-auth';
import { generateDownloadSasUrl } from '@/lib/azure-storage';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const authResult = await authenticateAgentRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { device, vendor } = authResult;

    const { jobId } = params;
    const claimToken =
      request.headers.get('x-claim-token') || request.nextUrl.searchParams.get('claimToken');

    if (!claimToken) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing claim token for document retrieval' },
        { status: 403 }
      );
    }

    let job: any = null;
    try {
      job = await prisma.printJob.findUnique({
        where: { id: jobId },
        include: {
          order: {
            include: {
              items: {
                include: { document: true },
              },
            },
          },
        },
      });
    } catch {
      job = null;
    }

    // Fallback for mock preview
    if (!job && jobId.startsWith('job-demo-')) {
      const sasUrl = await generateDownloadSasUrl('vendors/demo-vendor-id/2026/10/mock.pdf', 15);
      return NextResponse.json({
        success: true,
        document: {
          filename: 'Quarterly_Report_2026.pdf',
          mimeType: 'application/pdf',
          downloadUrl: sasUrl,
        },
      });
    }

    if (!job || job.vendorId !== vendor.id) {
      return NextResponse.json({ error: 'Job not found for this vendor' }, { status: 404 });
    }

    if (job.claimToken !== claimToken) {
      return NextResponse.json({ error: 'Invalid or expired claim token' }, { status: 403 });
    }

    const firstDoc = job.order.items[0]?.document;
    if (!firstDoc) {
      return NextResponse.json({ error: 'No associated document found for this job' }, { status: 404 });
    }

    // Generate short-lived download SAS URL (15 minutes)
    const downloadUrl = await generateDownloadSasUrl(firstDoc.blobKey, 15);

    return NextResponse.json({
      success: true,
      document: {
        id: firstDoc.id,
        filename: firstDoc.originalName,
        mimeType: firstDoc.mimeType,
        pageCount: firstDoc.pageCount,
        downloadUrl,
      },
    });
  } catch (error: any) {
    console.error('Job document URL error:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}
