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
        razorpayKeyId: true,
        razorpayKeySecret: true,
        upiId: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
        isSubscriptionActive: true,
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...vendor,
        // Mask secret for UI security
        razorpayKeySecretMasked: vendor.razorpayKeySecret
          ? `••••••••${vendor.razorpayKeySecret.slice(-4)}`
          : '',
        hasConfiguredRazorpay: Boolean(vendor.razorpayKeyId && vendor.razorpayKeySecret),
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
      razorpayKeyId,
      razorpayKeySecret,
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

    if (razorpayKeyId !== undefined) {
      updateData.razorpayKeyId = razorpayKeyId.trim() || null;
    }
    // Only update secret if non-empty string provided
    if (razorpayKeySecret && razorpayKeySecret.trim() && !razorpayKeySecret.includes('••••')) {
      updateData.razorpayKeySecret = razorpayKeySecret.trim();
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id: session.vendorId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Store and payment settings updated successfully',
      vendor: {
        id: updatedVendor.id,
        name: updatedVendor.name,
        slug: updatedVendor.slug,
        razorpayKeyId: updatedVendor.razorpayKeyId,
        upiId: updatedVendor.upiId,
        allowOnlinePayment: updatedVendor.allowOnlinePayment,
        allowCashOnDesk: updatedVendor.allowCashOnDesk,
      },
    });
  } catch (error: any) {
    console.error('Update vendor settings error:', error);
    return NextResponse.json({ error: 'Failed to update vendor settings' }, { status: 500 });
  }
}
