import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken, setSessionCookie, logAuditEvent } from '@/lib/auth';
import { UserRole, PaperSize, PrintColor } from '@printflow/shared-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeName, ownerName, email, password, phoneNumber, address } = body;

    if (!storeName || !ownerName || !email || !password) {
      return NextResponse.json(
        { error: 'Store name, owner name, email, and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email address already exists' },
        { status: 409 }
      );
    }

    // Generate clean slug from store name
    let baseSlug = storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) baseSlug = 'store';

    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await prisma.vendor.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const passwordHash = await hashPassword(password);
    const trialDays = 14;
    const subscriptionExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    // 1. Create User
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: ownerName.trim(),
        phoneNumber: phoneNumber?.trim() || null,
        role: UserRole.VENDOR_OWNER,
        isActive: true,
      },
    });

    // 2. Create Vendor
    const vendor = await prisma.vendor.create({
      data: {
        name: storeName.trim(),
        slug: uniqueSlug,
        contactEmail: normalizedEmail,
        contactPhone: phoneNumber?.trim() || 'Not Provided',
        address: address?.trim() || 'Store Location',
        operatingHours: '09:00 AM - 09:00 PM',
        isActive: true,
        isApproved: true, // Auto-approved for 14-day trial
        allowCashOnDesk: true,
        allowOnlinePayment: true,
        requireApproval: false,
        retentionDays: 30,
        subscriptionPlan: 'TRIAL',
        subscriptionExpiresAt,
        isSubscriptionActive: true,
      },
    });

    // 3. Link Membership
    await prisma.vendorMembership.create({
      data: {
        userId: user.id,
        vendorId: vendor.id,
        role: UserRole.VENDOR_OWNER,
      },
    });

    // 4. Default QR Standee Configuration
    await prisma.vendorQrConfig.create({
      data: {
        vendorId: vendor.id,
        customColor: '#0f172a',
        instructions: 'Scan with your camera to upload documents and print instantly',
      },
    });

    // 5. Default Pricing Tiers
    await prisma.vendorPricing.createMany({
      data: [
        {
          vendorId: vendor.id,
          paperSize: PaperSize.A4,
          colorMode: PrintColor.BLACK_AND_WHITE,
          pricePerSideMinor: 200, // ₹2.00
        },
        {
          vendorId: vendor.id,
          paperSize: PaperSize.A4,
          colorMode: PrintColor.COLOR,
          pricePerSideMinor: 1000, // ₹10.00
        },
        {
          vendorId: vendor.id,
          paperSize: PaperSize.A3,
          colorMode: PrintColor.BLACK_AND_WHITE,
          pricePerSideMinor: 500, // ₹5.00
        },
        {
          vendorId: vendor.id,
          paperSize: PaperSize.A3,
          colorMode: PrintColor.COLOR,
          pricePerSideMinor: 2000, // ₹20.00
        },
      ],
    });

    const result = { user, vendor };

    // Generate Session JWT
    const sessionPayload = {
      userId: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      vendorId: result.vendor.id,
    };

    const token = await createSessionToken(sessionPayload);

    // Audit log
    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    await logAuditEvent({
      userId: result.user.id,
      action: 'VENDOR_REGISTERED',
      resource: 'Vendor',
      resourceId: result.vendor.id,
      ipAddress,
      details: { storeName: result.vendor.name, slug: result.vendor.slug },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
      },
      vendor: {
        id: result.vendor.id,
        name: result.vendor.name,
        slug: result.vendor.slug,
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register vendor account' },
      { status: 500 }
    );
  }
}
