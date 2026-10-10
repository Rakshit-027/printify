import { NextRequest, NextResponse } from 'next/server';
import { VerifyUploadSchema } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';
import { verifyBlobExists } from '@/lib/azure-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = VerifyUploadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid verification payload', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { sessionToken, pageCount: clientPageCount, sha256Hash } = parseResult.data;

    // 1. Look up upload session
    let session: any = null;
    try {
      session = await prisma.documentUploadSession.findUnique({
        where: { sessionToken },
      });
    } catch (dbErr) {
      const { fallbackUploadSessions } = await import('@/lib/upload-sessions');
      session = fallbackUploadSessions.get(sessionToken);
    }

    if (!session) {
      return NextResponse.json({ error: 'Upload session not found or expired' }, { status: 404 });
    }

    if (session.isCompleted) {
      return NextResponse.json({ error: 'Upload session has already been verified' }, { status: 409 });
    }

    if (new Date() > session.expiresAt) {
      return NextResponse.json({ error: 'Upload session has timed out. Please retry upload.' }, { status: 410 });
    }

    // 2. Query vendor retention policy
    let retentionDays = 30;
    try {
      const vendor = await prisma.vendor.findUnique({
        where: { id: session.vendorId },
        select: { id: true, retentionDays: true },
      });
      if (vendor?.retentionDays) {
        retentionDays = vendor.retentionDays;
      }
    } catch (dbErr) {
      retentionDays = 30;
    }

    // 3. Verify actual existence of blob in Azure Storage
    const blobMetadata = await verifyBlobExists(session.blobKey);
    if (!blobMetadata.exists) {
      return NextResponse.json(
        { error: 'Uploaded file not detected in storage container. Ensure PUT completed successfully.' },
        { status: 400 }
      );
    }

    // 4. Resolve page count
    let resolvedPages = 1;
    if (session.mimeType === 'application/pdf') {
      resolvedPages = clientPageCount && clientPageCount > 0 ? clientPageCount : 1;
    }

    // Compute retention deadline
    const retentionUntil = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    const filenameFromKey = session.blobKey.split('/').pop() || 'document';

    // 5. Persist Document record and complete session
    let document: any = null;
    try {
      document = await prisma.$transaction(async (tx) => {
        const doc = await tx.document.create({
          data: {
            vendorId: session.vendorId,
            originalName: filenameFromKey,
            sanitizedName: filenameFromKey,
            blobKey: session.blobKey,
            mimeType: session.mimeType,
            sizeBytes: BigInt(blobMetadata.contentLength || Number(session.expectedSize)),
            pageCount: resolvedPages,
            sha256Hash: sha256Hash || null,
            isVerified: true,
            isPurged: false,
            retentionUntil,
          },
        });

        if (session.id) {
          await tx.documentUploadSession.update({
            where: { id: session.id },
            data: { isCompleted: true },
          });
        }

        return doc;
      });
    } catch (dbErr) {
      // In-memory fallback document if DB is offline
      const { fallbackUploadSessions } = await import('@/lib/upload-sessions');
      session.isCompleted = true;
      fallbackUploadSessions.set(sessionToken, session);

      document = {
        id: crypto.randomUUID(),
        originalName: filenameFromKey,
        mimeType: session.mimeType,
        pageCount: resolvedPages,
        sizeBytes: BigInt(blobMetadata.contentLength || Number(session.expectedSize)),
        retentionUntil,
      };
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        pageCount: document.pageCount,
        sizeBytes: document.sizeBytes.toString(),
        retentionUntil: document.retentionUntil,
      },
    });
  } catch (error: any) {
    console.error('Upload verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify uploaded document' },
      { status: 500 }
    );
  }
}
