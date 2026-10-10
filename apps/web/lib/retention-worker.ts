import { prisma } from './prisma';
import { deleteBlobDocument } from './azure-storage';
import { logAuditEvent } from './auth';

export interface RetentionRunResult {
  taskId: string;
  evaluated: number;
  purged: number;
  skippedActive: number;
  errors: number;
  completedAt: Date;
}

/**
 * Autonomous document retention cleaner
 * Complies with strict privacy policies while safeguarding active orders
 */
export async function executeRetentionCleanup(batchSize: number = 50): Promise<RetentionRunResult> {
  const startedAt = new Date();
  let task: any = null;

  try {
    task = await prisma.retentionTask.create({
      data: {
        taskType: 'EXPIRED_BLOB_CLEANUP',
        status: 'RUNNING',
        startedAt,
      },
    });
  } catch {
    task = { id: `task_mock_${Date.now()}` };
  }

  let candidates: any[] = [];
  try {
    candidates = await prisma.document.findMany({
      where: {
        retentionUntil: { lte: startedAt },
        isPurged: false,
      },
      include: {
        orderItems: {
          include: {
            order: {
              select: { id: true, status: true },
            },
          },
        },
      },
      take: batchSize,
    });
  } catch {
    candidates = [];
  }

  let purgedCount = 0;
  let skippedActiveCount = 0;
  let errorCount = 0;

  const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED'];

  for (const doc of candidates) {
    try {
      // Safety check: ensure none of the associated orders are currently processing
      const hasActiveOrders = doc.orderItems.some(
        (item: any) => !terminalStatuses.includes(item.order.status)
      );

      if (hasActiveOrders) {
        skippedActiveCount++;
        continue;
      }

      // Purge blob from Azure Storage
      const deleted = await deleteBlobDocument(doc.blobKey);
      if (deleted) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { isPurged: true },
        });
        purgedCount++;
      } else {
        errorCount++;
      }
    } catch (err) {
      console.error(`Error purging document ${doc.id}:`, err);
      errorCount++;
    }
  }

  const completedAt = new Date();

  try {
    if (task && task.id && !task.id.startsWith('task_mock_')) {
      await prisma.retentionTask.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          blobsEvaluated: candidates.length,
          blobsPurged: purgedCount,
          errors: errorCount > 0 ? `${errorCount} purge errors encountered` : null,
          completedAt,
        },
      });
    }
  } catch (err) {
    console.warn('Failed to commit retention task completion:', err);
  }

  await logAuditEvent({
    action: 'RETENTION_CLEANUP_EXECUTION',
    resource: 'RetentionTask',
    resourceId: task.id,
    details: {
      evaluated: candidates.length,
      purged: purgedCount,
      skippedActive: skippedActiveCount,
      errors: errorCount,
    },
  });

  return {
    taskId: task.id,
    evaluated: candidates.length,
    purged: purgedCount,
    skippedActive: skippedActiveCount,
    errors: errorCount,
    completedAt,
  };
}
