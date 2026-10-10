export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { EnrollDeviceSchema } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = EnrollDeviceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid enrollment request', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { enrollmentCode, deviceName, osVersion, agentVersion } = parseResult.data;

    let device: any = null;
    try {
      device = await prisma.device.findUnique({
        where: { enrollmentCode },
        include: {
          vendor: { select: { id: true, name: true, slug: true, isActive: true } },
        },
      });
    } catch {
      device = null;
    }

    // Demo enrollment simulation fallback if running offline
    if (!device && enrollmentCode.toUpperCase().startsWith('ENROLL-')) {
      const simulatedToken = `tok_agent_${crypto.randomBytes(24).toString('hex')}`;
      return NextResponse.json({
        success: true,
        deviceId: 'device_demo_win_01',
        deviceToken: simulatedToken,
        vendor: {
          id: 'demo-vendor-id',
          name: 'SpeedyPrint Express',
          slug: 'speedy-express',
        },
      });
    }

    if (!device || device.isRevoked) {
      return NextResponse.json(
        { error: 'Invalid or expired enrollment code. Please generate a code from your vendor portal.' },
        { status: 404 }
      );
    }

    // Generate hardware-bound secret API token
    const rawDeviceToken = crypto.randomBytes(32).toString('hex');
    const deviceKeyHash = await bcrypt.hash(rawDeviceToken, 10);

    // Consume one-time enrollment code and activate device
    const updatedDevice = await prisma.device.update({
      where: { id: device.id },
      data: {
        deviceName,
        osVersion: osVersion || 'Windows',
        agentVersion: agentVersion || '1.0.0',
        deviceKeyHash,
        enrollmentCode: null, // One-time enrollment code consumed
        isEnrolled: true,
        lastHeartbeat: new Date(),
      },
    });

    await logAuditEvent({
      action: 'DEVICE_ENROLLED_SUCCESS',
      resource: 'Device',
      resourceId: updatedDevice.id,
      details: { deviceName, osVersion, agentVersion, vendorId: device.vendorId },
    });

    return NextResponse.json({
      success: true,
      deviceId: updatedDevice.id,
      deviceToken: rawDeviceToken,
      vendor: {
        id: device.vendor.id,
        name: device.vendor.name,
        slug: device.vendor.slug,
      },
    });
  } catch (error: any) {
    console.error('Device enrollment error:', error);
    return NextResponse.json({ error: 'Device enrollment failed' }, { status: 500 });
  }
}
