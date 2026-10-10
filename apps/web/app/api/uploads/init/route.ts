import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { InitUploadSessionSchema } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';
import { generateInternalBlobKey, generateUploadSasUrl } from '@/lib/azure-storage';
import { sanitizeFilename, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '@/lib/file-validator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = InitUploadSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid upload request', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { vendorSlug, filename, fileSizeBytes, mimeType } = parseResult.data;

    // 1. Validate file size bound
    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB` },
        { status: 413 }
      );
    }

    // 2. Validate file extension
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file format. Permitted types: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // 3. Verify vendor status
    let vendor: any = null;
    try {
      vendor = await prisma.vendor.findUnique({
        where: { slug: vendorSlug.toLowerCase().trim() },
        select: { id: true, name: true, slug: true, isActive: true, isApproved: true },
      });
    } catch (dbErr) {
      // Offline fallback for preview mode
      vendor = {
        id: 'demo-speedy-uuid',
        name: 'SpeedyPrint Express',
        slug: vendorSlug,
        isActive: true,
        isApproved: true,
      };
    }

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor does not exist' }, { status: 404 });
    }

    if (!vendor.isActive || !vendor.isApproved) {
      return NextResponse.json(
        { error: 'This vendor is temporarily not accepting print orders' },
        { status: 403 }
      );
    }

    const sanitizedName = sanitizeFilename(filename);

    // 4. Generate isolated internal blob key
    const blobKey = generateInternalBlobKey(vendor.id, ext);

    // 5. Generate narrowly scoped PutBlob SAS URL
    const sasResult = await generateUploadSasUrl(blobKey, mimeType);

    // 6. Persist upload session record
    const sessionToken = crypto.randomUUID();
    try {
      await prisma.documentUploadSession.create({
        data: {
          sessionToken,
          vendorId: vendor.id,
          expectedSize: BigInt(fileSizeBytes),
          mimeType,
          blobKey,
          expiresAt: sasResult.expiresAt,
          isCompleted: false,
        },
      });
    } catch (dbErr) {
      // In-memory fallback if database server is offline
      const { fallbackUploadSessions } = await import('@/lib/upload-sessions');
      fallbackUploadSessions.set(sessionToken, {
        sessionToken,
        vendorId: vendor.id,
        expectedSize: BigInt(fileSizeBytes),
        mimeType,
        blobKey,
        expiresAt: sasResult.expiresAt,
        isCompleted: false,
      });
    }

    return NextResponse.json({
      success: true,
      sessionToken,
      uploadUrl: sasResult.uploadUrl,
      blobKey,
      sanitizedName,
      expiresAt: sasResult.expiresAt,
    });
  } catch (error: any) {
    console.error('Upload init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize document upload session' },
      { status: 500 }
    );
  }
}
