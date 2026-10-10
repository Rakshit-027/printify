import { NextRequest, NextResponse } from 'next/server';
import { RegisterVendorInputSchema, UserRole, PaperSize, PrintColor } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSessionToken, setSessionCookie, logAuditEvent } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = RegisterVendorInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, fullName, vendorName, vendorSlug, contactPhone, address } = parseResult.data;

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    // Check duplicate slug
    const normalizedSlug = vendorSlug.toLowerCase().trim();
    const existingVendor = await prisma.vendor.findUnique({
      where: { slug: normalizedSlug },
    });
    if (existingVendor) {
      return NextResponse.json({ error: 'This business slug/URL handle is already in use' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // Atomically create User, Vendor, Membership, and Default Pricing in transaction
    // 1. Create User
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        phoneNumber: contactPhone,
        role: UserRole.VENDOR_OWNER,
        isActive: true,
      },
    });

    // 2. Create Vendor with relations
    const vendor = await prisma.vendor.create({
      data: {
        name: vendorName,
        slug: normalizedSlug,
        contactPhone,
        contactEmail: email.toLowerCase(),
        address,
        isActive: true,
        isApproved: true,
        allowCashOnDesk: true,
        requireApproval: false,
        retentionDays: 30,
        memberships: {
          create: {
            userId: user.id,
            role: UserRole.VENDOR_OWNER,
          },
        },
        qrConfig: {
          create: {
            customColor: '#0f172a',
            instructions: 'Scan to upload documents and print instantly.',
          },
        },
      },
    });

    // 3. Default baseline pricing (Paise units)
    await prisma.vendorPricing.createMany({
      data: [
        {
          vendorId: vendor.id,
          paperSize: PaperSize.A4,
          colorMode: PrintColor.BLACK_AND_WHITE,
          isDuplex: false,
          pricePerSideMinor: 200, // ₹2.00
          sheetChargeMinor: 0,
          minimumOrderMinor: 500,
        },
        {
          vendorId: vendor.id,
          paperSize: PaperSize.A4,
          colorMode: PrintColor.BLACK_AND_WHITE,
          isDuplex: true,
          pricePerSideMinor: 175, // ₹3.50 duplex sheet
          sheetChargeMinor: 0,
          minimumOrderMinor: 500,
        },
        {
          vendorId: vendor.id,
          paperSize: PaperSize.A4,
          colorMode: PrintColor.COLOR,
          isDuplex: false,
          pricePerSideMinor: 1000, // ₹10.00
          sheetChargeMinor: 0,
          minimumOrderMinor: 500,
        },
      ],
    });

    const result = { user, vendor };

    const sessionPayload = {
      userId: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      role: result.user.role,
      vendorId: result.vendor.id,
    };

    const token = await createSessionToken(sessionPayload);

    // Audit Log
    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    await logAuditEvent({
      userId: result.user.id,
      action: 'VENDOR_REGISTRATION_SUCCESS',
      resource: 'Vendor',
      resourceId: result.vendor.id,
      ipAddress,
      userAgent,
      details: { slug: result.vendor.slug, businessName: result.vendor.name },
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
      { error: 'Failed to complete vendor registration' },
      { status: 500 }
    );
  }
}
