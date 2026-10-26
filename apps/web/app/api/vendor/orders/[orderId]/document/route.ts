export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { generateDownloadSasUrl } from '@/lib/azure-storage';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const authResult = await requireRoles(request, [
      UserRole.VENDOR_OWNER,
      UserRole.VENDOR_STAFF,
      UserRole.SUPER_ADMIN,
    ]);

    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;
    const { orderId } = params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            document: true,
          },
        },
      },
    });

    if (!order) {
      // Mock fallback for demo
      if (orderId.startsWith('ord-demo-')) {
        const sasUrl = await generateDownloadSasUrl('vendors/demo-vendor-id/2026/10/mock.pdf', 30);
        return NextResponse.json({
          success: true,
          documents: [
            {
              id: 'doc-demo-1',
              filename: 'Sample_Print_Document.pdf',
              mimeType: 'application/pdf',
              pageCount: 4,
              downloadUrl: sasUrl,
            },
          ],
        });
      }
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (session.role !== UserRole.SUPER_ADMIN && order.vendorId !== session.vendorId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this order' }, { status: 403 });
    }

    const documentsWithUrls = await Promise.all(
      order.items.map(async (item) => {
        const doc = item.document;
        const downloadUrl = await generateDownloadSasUrl(doc.blobKey, 30);
        return {
          itemId: item.id,
          documentId: doc.id,
          filename: doc.originalName,
          mimeType: doc.mimeType,
          pageCount: doc.pageCount,
          paperSize: item.paperSize,
          colorMode: item.colorMode,
          duplexMode: item.duplexMode,
          copies: item.copies,
          downloadUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      documents: documentsWithUrls,
    });
  } catch (error: any) {
    console.error('Vendor order document retrieval error:', error);
    return NextResponse.json({ error: 'Failed to retrieve order document' }, { status: 500 });
  }
}
