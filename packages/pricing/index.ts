export interface PricingConfig {
  bwPricePerSheet: number;
  colorPricePerSheet: number;
  duplexMultiplier: number; // e.g., 1.8 means double-sided is 1.8x the cost of single-sided
}

export interface PrintJobDetails {
  pages: number;
  copies: number;
  isColor: boolean;
  isDuplex: boolean;
}

export interface PriceCalculationResult {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
}

/**
 * Calculates the total authoritative price for a print job.
 * All monetary values are returned in minor units (e.g., paise).
 */
export function calculatePrintPrice(
  job: PrintJobDetails,
  config: PricingConfig,
  taxRate: number = 0.18 // Default 18% GST for example
): PriceCalculationResult {
  // 1. Determine sheets used
  // If duplex, 2 pages fit on 1 sheet. We use Math.ceil for odd number of pages.
  const sheetsPerCopy = job.isDuplex ? Math.ceil(job.pages / 2) : job.pages;
  const totalSheets = sheetsPerCopy * job.copies;

  // 2. Base cost per sheet
  let costPerSheet = job.isColor ? config.colorPricePerSheet : config.bwPricePerSheet;

  // 3. Duplex adjustment
  // A double-sided sheet costs more than a single-sided sheet, but typically less than 2 separate sheets.
  if (job.isDuplex) {
    costPerSheet = Math.round(costPerSheet * config.duplexMultiplier);
  }

  // 4. Calculate subtotal
  const subtotal = totalSheets * costPerSheet;

  // 5. Calculate taxes and final total
  const taxAmount = Math.round(subtotal * taxRate);
  const discountAmount = 0; // Hook in discount logic here if needed
  
  const totalAmount = subtotal + taxAmount - discountAmount;

  return {
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
    currency: "INR"
  };
}
