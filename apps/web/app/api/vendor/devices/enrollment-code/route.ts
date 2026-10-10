import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

/**
 * Get or generate a real device enrollment code for the authenticated vendor
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.vendorId) {
      return NextResponse.json({ error: 'Unauthorized or no vendor associated' }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: session.vendorId },
      select: { id: true, name: true, slug: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // 1. Check if there is an existing pending (unenrolled) device with an active code
    let pendingDevice = await prisma.device.findFirst({
      where: {
        vendorId: vendor.id,
        isEnrolled: false,
        isRevoked: false,
        enrollmentCode: { not: null },
      },
      select: {
        id: true,
        deviceName: true,
        enrollmentCode: true,
        createdAt: true,
      },
    });

    // 2. If no pending code, generate a unique enrollment code
    if (!pendingDevice) {
      const codeSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const prefix = vendor.slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
      const code = `ENROLL-${prefix || 'PRNT'}-${codeSuffix}`;

      pendingDevice = await prisma.device.create({
        data: {
          vendorId: vendor.id,
          deviceName: `${vendor.name} - Counter PC`,
          deviceKeyHash: `pending_${crypto.randomBytes(16).toString('hex')}`,
          enrollmentCode: code,
          isEnrolled: false,
          isRevoked: false,
        },
        select: {
          id: true,
          deviceName: true,
          enrollmentCode: true,
          createdAt: true,
        },
      });
    }

    // 3. Query all currently enrolled active devices for this vendor
    const activeDevices = await prisma.device.findMany({
      where: {
        vendorId: vendor.id,
        isEnrolled: true,
        isRevoked: false,
      },
      select: {
        id: true,
        deviceName: true,
        osVersion: true,
        agentVersion: true,
        lastHeartbeat: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
      },
      enrollmentCode: pendingDevice.enrollmentCode,
      activeDevices,
    });
  } catch (error: any) {
    console.error('Fetch enrollment code error:', error);
    return NextResponse.json({ error: 'Failed to fetch enrollment code' }, { status: 500 });
  }
}

/**
 * Generate a fresh new enrollment code (for adding another workstation)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.vendorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: session.vendorId },
      select: { id: true, name: true, slug: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    const codeSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const prefix = vendor.slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    const code = `ENROLL-${prefix || 'PRNT'}-${codeSuffix}`;

    const newDevice = await prisma.device.create({
      data: {
        vendorId: vendor.id,
        deviceName: `${vendor.name} - Counter PC`,
        deviceKeyHash: `pending_${crypto.randomBytes(16).toString('hex')}`,
        enrollmentCode: code,
        isEnrolled: false,
        isRevoked: false,
      },
    });

    return NextResponse.json({
      success: true,
      enrollmentCode: newDevice.enrollmentCode,
    });
  } catch (error: any) {
    console.error('Create new enrollment code error:', error);
    return NextResponse.json({ error: 'Failed to create enrollment code' }, { status: 500 });
  }
}
