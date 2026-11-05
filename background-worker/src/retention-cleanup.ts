import { PrismaClient } from '@prisma/client';
import { BlobServiceClient, StorageSharedKeyCredential } from '@azure/storage-blob';

const prisma = new PrismaClient();

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'printflow-customer-documents';

function getBlobServiceClient(): BlobServiceClient | null {
  if (!accountName || !accountKey) return null;
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
}

async function deleteBlobFromAzure(blobKey: string): Promise<boolean> {
  const serviceClient = getBlobServiceClient();
  if (!serviceClient) {
    console.log(`[RETENTION] Azure Storage unconfigured or in mock mode. Simulated purge for blob: ${blobKey}`);
    return true;
  }

  try {
    const containerClient = serviceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobKey);
    const res = await blobClient.deleteIfExists();
    console.log(`[RETENTION] Purged blob from Azure Storage: ${blobKey} (Succeeded: ${res.succeeded})`);
    return res.succeeded;
  } catch (error) {
    console.error(`[RETENTION] Error deleting blob ${blobKey} from Azure:`, error);
    return false;
  }
}

async function runWorker() {
  const startedAt = new Date();
  console.log(`[${startedAt.toISOString()}] ⚙️ Starting scheduled Document Retention Worker...`);

  let retentionTaskRecord: any = null;
  try {
    retentionTaskRecord = await prisma.retentionTask.create({
      data: {
        taskType: 'EXPIRED_BLOB_CLEANUP',
        status: 'RUNNING',
        startedAt,
      },
    });
  } catch (err) {
    console.warn('[RETENTION] Could not initialize RetentionTask audit log:', err);
  }

  const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED'];

  try {
    const expiredDocs = await prisma.document.findMany({
      where: {
        retentionUntil: { lte: startedAt },
        isPurged: false,
      },
      include: {
        orderItems: {
          include: {
            order: { select: { id: true, status: true } },
          },
        },
      },
      take: 100,
    });

    console.log(`🔍 Evaluated ${expiredDocs.length} candidate documents past retention limit.`);

    let purgedCount = 0;
    let skippedActive = 0;
    let errorCount = 0;

    for (const doc of expiredDocs) {
      const isActivelyPrinting = doc.orderItems.some(
        (i) => !terminalStatuses.includes(i.order.status)
      );

      if (isActivelyPrinting) {
        console.log(`⏳ Skipping active document ${doc.id} (associated order still in processing)`);
        skippedActive++;
        continue;
      }

      // Purge blob from physical Azure Blob Storage container
      const blobDeleted = await deleteBlobFromAzure(doc.blobKey);

      if (blobDeleted) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { isPurged: true },
        });
        purgedCount++;
      } else {
        errorCount++;
      }
    }

    const completedAt = new Date();
    console.log(`🧹 Successfully purged ${purgedCount} expired documents (Skipped Active: ${skippedActive}, Errors: ${errorCount}). Worker finished.`);

    if (retentionTaskRecord) {
      await prisma.retentionTask.update({
        where: { id: retentionTaskRecord.id },
        data: {
          status: errorCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED',
          blobsEvaluated: expiredDocs.length,
          blobsPurged: purgedCount,
          completedAt,
        },
      });
    }
  } catch (error: any) {
    console.error('❌ Retention worker exception:', error);
    if (retentionTaskRecord) {
      await prisma.retentionTask.update({
        where: { id: retentionTaskRecord.id },
        data: {
          status: 'FAILED',
          errors: error?.message || 'Unknown retention worker exception',
          completedAt: new Date(),
        },
      }).catch(() => {});
    }
  } finally {
    await prisma.$disconnect();
  }
}

runWorker();
