import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export interface AgentAuthResult {
  device: {
    id: string;
    vendorId: string;
    deviceName: string;
    isRevoked: boolean;
  };
  vendor: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  };
}

/**
 * Authenticates requests originating from enrolled Windows Electron Print Agents
 */
export async function authenticateAgentRequest(
  request: NextRequest
): Promise<AgentAuthResult | NextResponse> {
  const deviceId = request.headers.get('x-device-id');
  const deviceToken = request.headers.get('x-device-token');

  if (!deviceId || !deviceToken) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing device authentication headers (x-device-id, x-device-token)' },
      { status: 401 }
    );
  }

  let device: any = null;
  try {
    device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        vendor: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });
  } catch {
    device = null;
  }

  if (!device || device.isRevoked) {
    return NextResponse.json(
      { error: 'Device record is invalid or has been revoked by vendor' },
      { status: 401 }
    );
  }

  const isTokenValid = await bcrypt.compare(deviceToken, device.deviceKeyHash);
  if (!isTokenValid) {
    return NextResponse.json({ error: 'Invalid device credentials' }, { status: 401 });
  }

  if (!device.vendor.isActive) {
    return NextResponse.json({ error: 'Associated vendor account is inactive' }, { status: 403 });
  }

  return {
    device: {
      id: device.id,
      vendorId: device.vendorId,
      deviceName: device.deviceName,
      isRevoked: device.isRevoked,
    },
    vendor: device.vendor,
  };
}
