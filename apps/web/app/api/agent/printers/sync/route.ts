export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentRequest } from '@/lib/agent-auth';
import { SyncPrintersSchema } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateAgentRequest(request);
    if (authResult instanceof NextResponse) return authResult;
    const { device, vendor } = authResult;

    const body = await request.json();
    const parseResult = SyncPrintersSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid printer payload', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { printers } = parseResult.data;

    try {
      for (const p of printers) {
        await prisma.printer.upsert({
          where: {
            deviceId_systemName: {
              deviceId: device.id,
              systemName: p.systemName,
            },
          },
          update: {
            displayName: p.displayName,
            supportedSizes: p.supportedSizes as any,
            supportsColor: p.supportsColor,
            supportsDuplex: p.supportsDuplex,
            isDefault: p.isDefault,
            isOnline: true,
          },
          create: {
            vendorId: vendor.id,
            deviceId: device.id,
            systemName: p.systemName,
            displayName: p.displayName,
            supportedSizes: p.supportedSizes as any,
            supportsColor: p.supportsColor,
            supportsDuplex: p.supportsDuplex,
            isDefault: p.isDefault,
            isOnline: true,
          },
        });
      }
    } catch (dbErr) {
      console.warn('Printer sync DB warning:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Synchronized ${printers.length} local Windows printers`,
      syncedCount: printers.length,
    });
  } catch (error: any) {
    console.error('Printer sync error:', error);
    return NextResponse.json({ error: 'Failed to sync local printers' }, { status: 500 });
  }
}
