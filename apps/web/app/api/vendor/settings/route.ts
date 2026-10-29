export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.vendorId) {
      return NextResponse.json({ error: 'Unauthorized or no vendor associated' }, { status: 401 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: session.vendorId },
      select: {
        id: true,
        name: true,
        slug: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        operatingHours: true,
        allowCashOnDesk: true,
        allowOnlinePayment: true,
        requireApproval: true,
        upiId: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
        isSubscriptionActive: true,
        paymentAccount: {
          select: {
            id: true,
            razorpayAccountId: true,
            authStatus: true,
            onboardingStatus: true,
            activationStatus: true,
            lastSyncedAt: true,
          },
        },
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    const hasConnectedRazorpay =
      vendor.paymentAccount?.authStatus === 'AUTHORIZED' &&
      vendor.paymentAccount?.activationStatus === 'ACTIVATED';

    return NextResponse.json({
      success: true,
      settings: {
        ...vendor,
        hasConfiguredRazorpay: Boolean(hasConnectedRazorpay),
        paymentAccount: vendor.paymentAccount,
      },
    });
  } catch (error: any) {
    console.error('Fetch vendor settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendor settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || !session.vendorId) {
      return NextResponse.json({ error: 'Unauthorized or no vendor associated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      contactPhone,
      address,
      operatingHours,
      allowCashOnDesk,
      allowOnlinePayment,
      upiId,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (operatingHours !== undefined) updateData.operatingHours = operatingHours.trim();
    if (allowCashOnDesk !== undefined) updateData.allowCashOnDesk = Boolean(allowCashOnDesk);
    if (allowOnlinePayment !== undefined) updateData.allowOnlinePayment = Boolean(allowOnlinePayment);
    if (upiId !== undefined) updateData.upiId = upiId.trim() || null;

    const updatedVendor = await prisma.vendor.update({
      where: { id: session.vendorId },
      data: updateData,
      include: {
        paymentAccount: {
          select: {
            id: true,
            razorpayAccountId: true,
            authStatus: true,
            activationStatus: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Store profile settings updated successfully',
      vendor: {
        id: updatedVendor.id,
        name: updatedVendor.name,
        slug: updatedVendor.slug,
        upiId: updatedVendor.upiId,
        allowOnlinePayment: updatedVendor.allowOnlinePayment,
        allowCashOnDesk: updatedVendor.allowCashOnDesk,
        paymentAccount: updatedVendor.paymentAccount,
      },
    });
  } catch (error: any) {
    console.error('Update vendor settings error:', error);
    return NextResponse.json({ error: 'Failed to update vendor settings' }, { status: 500 });
  }
}
