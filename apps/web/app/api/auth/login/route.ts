export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { LoginInputSchema } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSessionToken, setSessionCookie, logAuditEvent } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = LoginInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // Retrieve user with vendor memberships
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        vendorMemberships: {
          include: { vendor: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const primaryVendor = user.vendorMemberships[0]?.vendor;

    const sessionPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      vendorId: primaryVendor?.id,
    };

    const token = await createSessionToken(sessionPayload);

    // Audit Log
    const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    await logAuditEvent({
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      resource: 'User',
      resourceId: user.id,
      ipAddress,
      userAgent,
      details: { role: user.role, vendorSlug: primaryVendor?.slug },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        vendor: primaryVendor
          ? {
              id: primaryVendor.id,
              name: primaryVendor.name,
              slug: primaryVendor.slug,
            }
          : null,
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}


