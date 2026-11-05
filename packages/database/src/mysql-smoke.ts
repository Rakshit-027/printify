import { randomUUID } from 'node:crypto';
import { PrismaClient, Prisma } from '@prisma/client';

class RollbackSmoke extends Error {}

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('mysql://') || process.env.RUN_MYSQL_SMOKE !== '1') {
    throw new Error('Use a dedicated disposable MySQL test database and set RUN_MYSQL_SMOKE=1');
  }

  const prisma = new PrismaClient();
  const email = `migration-smoke-${randomUUID()}@example.invalid`;
  const userId = randomUUID();
  try {
    try {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: {
          id: userId, email, fullName: 'Migration smoke', passwordHash: 'test-only',
        } });
        const vendor = await tx.vendor.create({ data: {
          name: 'Smoke shop', slug: `migration-${randomUUID()}`,
          contactPhone: '0000000000', contactEmail: email, address: 'Test only',
        } });
        await tx.vendorMembership.create({ data: {
          userId: user.id, vendorId: vendor.id, role: 'VENDOR_OWNER',
        } });
        const device = await tx.device.create({ data: {
          vendorId: vendor.id, deviceName: 'Smoke device', deviceKeyHash: randomUUID(),
        } });
        const printer = await tx.printer.create({ data: {
          vendorId: vendor.id, deviceId: device.id, systemName: 'Test printer',
          displayName: 'Test printer', supportedSizes: ['A4', 'A3'],
        } });
        const coupon = await tx.coupon.create({ data: {
          code: `SMOKE-${randomUUID()}`, discountType: 'PERCENTAGE', applicablePlanCodes: ['PRO'],
        } });
        const order = await tx.order.create({ data: {
          vendorId: vendor.id, orderNumber: `SMOKE-${randomUUID()}`,
          trackingToken: randomUUID().replaceAll('-', ''), subtotalMinor: 12345,
          totalAmountMinor: 12345,
        } });
        const payment = await tx.payment.create({ data: {
          orderId: order.id, amountMinor: 12345, rawPayload: { smoke: true },
        } });
        await tx.refund.create({ data: { paymentId: payment.id, amountMinor: 45 } });
        const found = await tx.order.findUniqueOrThrow({
          where: { id: order.id }, include: { vendor: true, payments: { include: { refunds: true } } },
        });
        if (found.vendor.id !== vendor.id || found.payments[0].refunds[0].amountMinor !== 45 ||
            found.totalAmountMinor !== 12345 ||
            JSON.stringify(printer.supportedSizes) !== JSON.stringify(['A4', 'A3']) ||
            JSON.stringify(coupon.applicablePlanCodes) !== JSON.stringify(['PRO'])) {
          throw new Error('MySQL relation, amount or JSON round-trip failed');
        }
        const page = await tx.order.findMany({
          where: { vendorId: vendor.id }, orderBy: { createdAt: 'desc' }, skip: 0, take: 1,
        });
        if (page.length !== 1 || page[0].id !== order.id) throw new Error('Pagination failed');
        try {
          await tx.user.create({ data: { email, fullName: 'Duplicate', passwordHash: 'test' } });
          throw new Error('Expected unique email constraint to reject duplicate');
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
        }
        throw new RollbackSmoke();
      });
    } catch (error) {
      if (!(error instanceof RollbackSmoke)) throw error;
    }
    if (await prisma.user.findUnique({ where: { id: userId } })) {
      throw new Error('Interactive transaction did not roll back');
    }
    console.log('MySQL CRUD, FK relations, uniqueness, JSON, amount, pagination and rollback: passed');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
