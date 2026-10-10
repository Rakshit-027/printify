export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

// In-memory or temporary buffer store for local development testing when Azure credentials are not provided
const localBlobStore = new Map<string, { buffer: Uint8Array; mime: string }>();

export async function PUT(request: NextRequest) {
  const blobKey = request.nextUrl.searchParams.get('blobKey');
  if (!blobKey) {
    return NextResponse.json({ error: 'Missing blobKey' }, { status: 400 });
  }

  const arrayBuffer = await request.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  const mime = request.headers.get('content-type') || 'application/octet-stream';

  localBlobStore.set(blobKey, { buffer, mime });

  return new NextResponse(null, {
    status: 201,
    headers: {
      'x-ms-request-id': crypto.randomUUID(),
      'x-ms-version': '2023-11-03',
      ETag: `"${crypto.randomUUID()}"`,
    },
  });
}

export async function GET(request: NextRequest) {
  const blobKey = request.nextUrl.searchParams.get('blobKey');
  if (!blobKey) {
    return NextResponse.json({ error: 'Missing blobKey' }, { status: 400 });
  }

  const item = localBlobStore.get(blobKey);
  if (!item) {
    // Generate minimal dummy PDF if requested in mock mode
    const dummyPdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n162\n%%EOF`;
    return new NextResponse(dummyPdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="document.pdf"',
      },
    });
  }

  return new NextResponse(Buffer.from(item.buffer), {
    status: 200,
    headers: {
      'Content-Type': item.mime,
      'Content-Disposition': 'inline',
    },
  });
}
