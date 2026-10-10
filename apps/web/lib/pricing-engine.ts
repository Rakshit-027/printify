import { PaperSize, PrintColor, DuplexMode } from '@printflow/shared-types';

export interface PricingRule {
  paperSize: PaperSize;
  colorMode: PrintColor;
  isDuplex: boolean;
  pricePerSideMinor: number;
  sheetChargeMinor: number;
  minimumOrderMinor: number;
  version: number;
}

export interface ItemCalculationInput {
  documentId: string;
  totalDocumentPages: number;
  pageRange?: string; // e.g. "ALL" or "1-5, 8"
  paperSize: PaperSize;
  colorMode: PrintColor;
  duplexMode: DuplexMode;
  copies: number;
}

export interface ItemCalculationResult {
  documentId: string;
  paperSize: PaperSize;
  colorMode: PrintColor;
  duplexMode: DuplexMode;
  copies: number;
  pageRange: string;
  validPagesCount: number;
  totalSides: number;
  totalSheets: number;
  unitPriceMinor: number;
  sheetChargeMinor: number;
  itemTotalMinor: number;
  priceVersion: number;
}

export interface OrderCalculationSummary {
  items: ItemCalculationResult[];
  subtotalMinor: number;
  taxMinor: number;
  minimumOrderApplied: boolean;
  totalAmountMinor: number;
  totalSheets: number;
  totalSides: number;
}

/**
 * Parses page range string and counts unique target pages bounded by totalDocumentPages
 * Supports: "ALL", "1", "1-5", "1, 3, 5-8"
 */
export function parsePageRangeCount(rangeStr: string | undefined | null, totalDocPages: number): number {
  if (!rangeStr || rangeStr.trim().toUpperCase() === 'ALL') {
    return Math.max(1, totalDocPages);
  }

  const clean = rangeStr.trim();
  const selectedPages = new Set<number>();
  const parts = clean.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (!isNaN(start) && !isNaN(end) && start <= end) {
        const clampedStart = Math.max(1, start);
        const clampedEnd = Math.min(totalDocPages, end);
        for (let p = clampedStart; p <= clampedEnd; p++) {
          selectedPages.add(p);
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalDocPages) {
        selectedPages.add(pageNum);
      }
    }
  }

  return selectedPages.size > 0 ? selectedPages.size : totalDocPages;
}

/**
 * Deterministically calculates item cost and distinguishes physical sheets from printed sides
 */
export function calculateItemPricing(
  input: ItemCalculationInput,
  pricingMatrix: PricingRule[]
): ItemCalculationResult {
  const isDuplex = input.duplexMode !== DuplexMode.SINGLE_SIDED;
  const copies = Math.max(1, Math.min(100, input.copies));
  const validPagesCount = parsePageRangeCount(input.pageRange, input.totalDocumentPages);

  // Find exact rule from matrix or fallback to baseline
  const rule =
    pricingMatrix.find(
      (r) =>
        r.paperSize === input.paperSize &&
        r.colorMode === input.colorMode &&
        r.isDuplex === isDuplex
    ) || {
      paperSize: input.paperSize,
      colorMode: input.colorMode,
      isDuplex,
      pricePerSideMinor: input.colorMode === PrintColor.COLOR ? 1000 : 200,
      sheetChargeMinor: 0,
      minimumOrderMinor: 500,
      version: 1,
    };

  const sidesPerCopy = validPagesCount;
  const totalSides = sidesPerCopy * copies;

  // Duplex physical sheet counting: 2 printed sides fit on 1 sheet
  const sheetsPerCopy = isDuplex ? Math.ceil(sidesPerCopy / 2) : sidesPerCopy;
  const totalSheets = sheetsPerCopy * copies;

  const sidesCost = totalSides * rule.pricePerSideMinor;
  const sheetsCost = totalSheets * rule.sheetChargeMinor;
  const itemTotalMinor = sidesCost + sheetsCost;

  return {
    documentId: input.documentId,
    paperSize: input.paperSize,
    colorMode: input.colorMode,
    duplexMode: input.duplexMode,
    copies,
    pageRange: input.pageRange || 'ALL',
    validPagesCount,
    totalSides,
    totalSheets,
    unitPriceMinor: rule.pricePerSideMinor,
    sheetChargeMinor: rule.sheetChargeMinor,
    itemTotalMinor,
    priceVersion: rule.version,
  };
}

/**
 * Computes authoritative order total enforcing vendor minimum charges
 */
export function calculateOrderSummary(
  inputs: ItemCalculationInput[],
  pricingMatrix: PricingRule[],
  vendorMinimumMinor: number = 500
): OrderCalculationSummary {
  const calculatedItems = inputs.map((item) => calculateItemPricing(item, pricingMatrix));

  const subtotalMinor = calculatedItems.reduce((acc, item) => acc + item.itemTotalMinor, 0);
  const totalSheets = calculatedItems.reduce((acc, item) => acc + item.totalSheets, 0);
  const totalSides = calculatedItems.reduce((acc, item) => acc + item.totalSides, 0);

  // Apply vendor minimum order charge if items exist but total is below minimum threshold
  let totalAmountMinor = subtotalMinor;
  let minimumOrderApplied = false;

  if (calculatedItems.length > 0 && subtotalMinor < vendorMinimumMinor) {
    totalAmountMinor = vendorMinimumMinor;
    minimumOrderApplied = true;
  }

  return {
    items: calculatedItems,
    subtotalMinor,
    taxMinor: 0, // Tax can be configured or included
    minimumOrderApplied,
    totalAmountMinor,
    totalSheets,
    totalSides,
  };
}

/**
 * Format minor units (Paise) to INR currency string e.g. 250 -> "2.50"
 */
export function formatMinorToInr(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}
