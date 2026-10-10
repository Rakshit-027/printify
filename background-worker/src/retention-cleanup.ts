import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runWorker() {
  console.log(`[${new Date().toISOString()}] ⚙️ Starting scheduled Document Retention Worker...`);

  const now = new Date();
  const terminalStatuses = ['COMPLETED', 'CANCELLED', 'REJECTED'];

  try {
    const expiredDocs = await prisma.document.findMany({
      where: {
        retentionUntil: { lte: now },
        isPurged: false,
      },
      include: {
        orderItems: {
          include: {
            order: { select: { id: true, status: true } },
          },
        },
      },
      take: 50,
    });

    console.log(`🔍 Evaluated ${expiredDocs.length} candidate documents past retention limit.`);

    let purgedCount = 0;
    for (const doc of expiredDocs) {
      const isActivelyPrinting = doc.orderItems.some(
        (i) => !terminalStatuses.includes(i.order.status)
      );

      if (isActivelyPrinting) {
        console.log(`⏳ Skipping active document ${doc.id} (associated order still in processing)`);
        continue;
      }

      await prisma.document.update({
        where: { id: doc.id },
        data: { isPurged: true },
      });
      purgedCount++;
    }

    console.log(`🧹 Successfully purged ${purgedCount} expired documents. Worker finished.`);
  } catch (error) {
    console.error('❌ Retention worker exception:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runWorker();
