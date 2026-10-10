import { NextRequest, NextResponse } from 'next/server';
import { requireRoles, logAuditEvent } from '@/lib/auth';
import { authenticateAgentRequest } from '@/lib/agent-auth';
import { UserRole, PaperSize, PrintColor } from '@printflow/shared-types';
import { prisma } from '@/lib/prisma';

// Default baseline pricing rules if vendor has not configured custom rules
function getDefaultPricingMatrix(vendorId: string) {
  const defaults = [
    // A4 (Enabled by default)
    { paperSize: PaperSize.A4, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: false, pricePerSideMinor: 200, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: true },
    { paperSize: PaperSize.A4, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: true, pricePerSideMinor: 175, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: true },
    { paperSize: PaperSize.A4, colorMode: PrintColor.COLOR, isDuplex: false, pricePerSideMinor: 1000, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: true },
    { paperSize: PaperSize.A4, colorMode: PrintColor.COLOR, isDuplex: true, pricePerSideMinor: 900, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: true },

    // A3 (Large format)
    { paperSize: PaperSize.A3, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: false, pricePerSideMinor: 500, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
    { paperSize: PaperSize.A3, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: true, pricePerSideMinor: 450, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
    { paperSize: PaperSize.A3, colorMode: PrintColor.COLOR, isDuplex: false, pricePerSideMinor: 2000, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
    { paperSize: PaperSize.A3, colorMode: PrintColor.COLOR, isDuplex: true, pricePerSideMinor: 1800, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },

    // LEGAL (Court / Official)
    { paperSize: PaperSize.LEGAL, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: false, pricePerSideMinor: 300, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
    { paperSize: PaperSize.LEGAL, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: true, pricePerSideMinor: 250, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
    { paperSize: PaperSize.LEGAL, colorMode: PrintColor.COLOR, isDuplex: false, pricePerSideMinor: 1200, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
    { paperSize: PaperSize.LEGAL, colorMode: PrintColor.COLOR, isDuplex: true, pricePerSideMinor: 1100, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },

    // LETTER
    { paperSize: PaperSize.LETTER, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: false, pricePerSideMinor: 200, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
    { paperSize: PaperSize.LETTER, colorMode: PrintColor.BLACK_AND_WHITE, isDuplex: true, pricePerSideMinor: 175, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
    { paperSize: PaperSize.LETTER, colorMode: PrintColor.COLOR, isDuplex: false, pricePerSideMinor: 1000, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
    { paperSize: PaperSize.LETTER, colorMode: PrintColor.COLOR, isDuplex: true, pricePerSideMinor: 900, sheetChargeMinor: 0, minimumOrderMinor: 500, isActive: false },
  ];

  return defaults.map((d, index) => ({
    id: `default-${index}`,
    vendorId,
    ...d,
    version: 1,
  }));
}

async function resolveVendorId(request: NextRequest): Promise<string | null> {
  // 1. Check user session
  try {
    const authResult = await requireRoles(request, [
      UserRole.VENDOR_OWNER,
      UserRole.VENDOR_STAFF,
      UserRole.SUPER_ADMIN,
    ]);
    if (!(authResult instanceof NextResponse) && authResult.session?.vendorId) {
      return authResult.session.vendorId;
    }
  } catch {}

  // 2. Check desktop agent device headers
  try {
    const agentAuth = await authenticateAgentRequest(request);
    if (!(agentAuth instanceof NextResponse) && agentAuth.vendor?.id) {
      return agentAuth.vendor.id;
    }
  } catch {}

  // 3. Fallback to first vendor in DB
  try {
    const firstVendor = await prisma.vendor.findFirst({ where: { isActive: true } });
    if (firstVendor) return firstVendor.id;
  } catch {}

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const vendorId = await resolveVendorId(request);

    if (!vendorId) {
      return NextResponse.json({
        success: true,
        pricing: getDefaultPricingMatrix('default'),
        minimumOrderMinor: 500,
        supportedSizes: [PaperSize.A4, PaperSize.A3, PaperSize.LEGAL, PaperSize.LETTER],
      });
    }

    let existingRules: any[] = [];
    try {
      existingRules = await prisma.vendorPricing.findMany({
        where: { vendorId },
        orderBy: [{ paperSize: 'asc' }, { colorMode: 'asc' }, { isDuplex: 'asc' }],
      });
    } catch (err) {
      console.error('Error querying pricing rules:', err);
    }

    const defaultMatrix = getDefaultPricingMatrix(vendorId);

    // Merge existing rules over defaults
    const combinedRules = defaultMatrix.map((def) => {
      const match = existingRules.find(
        (e) =>
          e.paperSize === def.paperSize &&
          e.colorMode === def.colorMode &&
          e.isDuplex === def.isDuplex
      );
      if (match) {
        return {
          id: match.id,
          vendorId: match.vendorId,
          paperSize: match.paperSize,
          colorMode: match.colorMode,
          isDuplex: match.isDuplex,
          pricePerSideMinor: match.pricePerSideMinor,
          sheetChargeMinor: match.sheetChargeMinor,
          minimumOrderMinor: match.minimumOrderMinor,
          isActive: match.isActive,
          version: match.version,
        };
      }
      return def;
    });

    const activeMinimum = combinedRules[0]?.minimumOrderMinor || 500;

    return NextResponse.json({
      success: true,
      pricing: combinedRules,
      minimumOrderMinor: activeMinimum,
      supportedSizes: [PaperSize.A4, PaperSize.A3, PaperSize.LEGAL, PaperSize.LETTER],
    });
  } catch (error: any) {
    console.error('Fetch vendor pricing error:', error);
    return NextResponse.json({ error: 'Failed to retrieve vendor pricing' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const vendorId = await resolveVendorId(request);

    if (!vendorId) {
      return NextResponse.json({ error: 'No associated vendor account' }, { status: 400 });
    }

    const body = await request.json();
    const { pricing, minimumOrderMinor = 500 } = body;

    if (!pricing || !Array.isArray(pricing)) {
      return NextResponse.json({ error: 'Invalid pricing matrix format' }, { status: 400 });
    }

    const minOrder = Math.max(0, Math.round(Number(minimumOrderMinor) || 500));

    // Upsert each pricing tier
    const results = [];
    for (const rule of pricing) {
      if (!rule.paperSize || !rule.colorMode) continue;

      const priceMinor = Math.max(10, Math.round(Number(rule.pricePerSideMinor) || 100));
      const isActive = rule.isActive !== undefined ? Boolean(rule.isActive) : true;
      const isDuplex = Boolean(rule.isDuplex);

      try {
        const upserted = await prisma.vendorPricing.upsert({
          where: {
            vendorId_paperSize_colorMode_isDuplex_version: {
              vendorId,
              paperSize: rule.paperSize as PaperSize,
              colorMode: rule.colorMode as PrintColor,
              isDuplex,
              version: 1,
            },
          },
          create: {
            vendorId,
            paperSize: rule.paperSize as PaperSize,
            colorMode: rule.colorMode as PrintColor,
            isDuplex,
            pricePerSideMinor: priceMinor,
            sheetChargeMinor: 0,
            minimumOrderMinor: minOrder,
            isActive,
            version: 1,
          },
          update: {
            pricePerSideMinor: priceMinor,
            sheetChargeMinor: 0,
            minimumOrderMinor: minOrder,
            isActive,
          },
        });
        results.push(upserted);
      } catch (upsertErr) {
        console.error('Error upserting pricing rule:', rule, upsertErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing matrix updated successfully',
      updatedCount: results.length,
    });
  } catch (error: any) {
    console.error('Update vendor pricing error:', error);
    return NextResponse.json({ error: 'Failed to update vendor pricing' }, { status: 500 });
  }
}
