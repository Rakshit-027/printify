export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { UserRole } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

// GET /api/admin/plans - List all subscription plans
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    if (authResult instanceof NextResponse) return authResult;

    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    });

    return NextResponse.json({ success: true, plans });
  } catch (err: any) {
    console.error('Error fetching plans:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch plans' }, { status: 500 });
  }
}

// POST /api/admin/plans - Create or update a plan
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRoles(request, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const {
      id,
      code,
      name,
      description,
      priceMonthlyMinor,
      priceYearlyMinor,
      maxDevices,
      maxOrdersPerMonth,
      hasAutoPrint,
      hasColorRouting,
      hasPrioritySupport,
      isActive,
      displayOrder,
    } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }

    const planCode = String(code).trim().toUpperCase();

    const data: any = {
      code: planCode,
      name: String(name).trim(),
      description: description || null,
      priceMonthlyMinor: Number(priceMonthlyMinor) || 0,
      priceYearlyMinor: Number(priceYearlyMinor) || 0,
      maxDevices: Number(maxDevices) || 1,
      maxOrdersPerMonth: Number(maxOrdersPerMonth) ?? 500,
      hasAutoPrint: Boolean(hasAutoPrint),
      hasColorRouting: Boolean(hasColorRouting),
      hasPrioritySupport: Boolean(hasPrioritySupport),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      displayOrder: Number(displayOrder) || 0,
    };

    let plan;
    if (id) {
      plan = await prisma.subscriptionPlan.update({
        where: { id },
        data,
      });
    } else {
      plan = await prisma.subscriptionPlan.upsert({
        where: { code: planCode },
        update: data,
        create: data,
      });
    }

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    console.error('Error saving plan:', err);
    return NextResponse.json({ error: err.message || 'Failed to save plan' }, { status: 500 });
  }
}
