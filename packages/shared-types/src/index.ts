import { z } from 'zod';

// ==========================================
// CORE DOMAIN ENUMS
// ==========================================

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  VENDOR_OWNER: 'VENDOR_OWNER',
  VENDOR_STAFF: 'VENDOR_STAFF',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderStatus = {
  DRAFT: 'DRAFT',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  AWAITING_VENDOR_APPROVAL: 'AWAITING_VENDOR_APPROVAL',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = {
  RAZORPAY: 'RAZORPAY',
  CASH_ON_COLLECTION: 'CASH_ON_COLLECTION',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CASH_PENDING: 'CASH_PENDING',
  CASH_COLLECTED: 'CASH_COLLECTED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PrintJobStatus = {
  CREATED: 'CREATED',
  QUEUED: 'QUEUED',
  CLAIMED_BY_DEVICE: 'CLAIMED_BY_DEVICE',
  DOWNLOADING: 'DOWNLOADING',
  SUBMITTED_TO_SPOOLER: 'SUBMITTED_TO_SPOOLER',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REQUIRES_MANUAL_REVIEW: 'REQUIRES_MANUAL_REVIEW',
  CANCELLED: 'CANCELLED',
} as const;
export type PrintJobStatus = (typeof PrintJobStatus)[keyof typeof PrintJobStatus];

export const PaperSize = {
  A4: 'A4',
  A3: 'A3',
  LEGAL: 'LEGAL',
  LETTER: 'LETTER',
} as const;
export type PaperSize = (typeof PaperSize)[keyof typeof PaperSize];

export const PrintColor = {
  BLACK_AND_WHITE: 'BLACK_AND_WHITE',
  COLOR: 'COLOR',
} as const;
export type PrintColor = (typeof PrintColor)[keyof typeof PrintColor];

export const DuplexMode = {
  SINGLE_SIDED: 'SINGLE_SIDED',
  DOUBLE_SIDED_LONG_EDGE: 'DOUBLE_SIDED_LONG_EDGE',
  DOUBLE_SIDED_SHORT_EDGE: 'DOUBLE_SIDED_SHORT_EDGE',
} as const;
export type DuplexMode = (typeof DuplexMode)[keyof typeof DuplexMode];

// ==========================================
// ZOD VALIDATION SCHEMAS
// ==========================================

// Authentication
export const LoginInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const RegisterVendorInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  fullName: z.string().min(2, 'Full name is required'),
  vendorName: z.string().min(2, 'Vendor business name is required'),
  vendorSlug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(20, 'Slug must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Slug may only contain letters, numbers, hyphens, and underscores'),
  contactPhone: z.string().min(10, 'A valid contact phone is required'),
  address: z.string().min(5, 'Physical business address is required'),
});
export type RegisterVendorInput = z.infer<typeof RegisterVendorInputSchema>;

// Vendor Settings Update
export const UpdateVendorSettingsSchema = z.object({
  name: z.string().min(2).optional(),
  contactPhone: z.string().min(10).optional(),
  contactEmail: z.string().email().optional(),
  address: z.string().min(5).optional(),
  operatingHours: z.string().max(100).optional(),
  allowCashOnDesk: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  retentionDays: z.number().int().min(1).max(90).optional(),
});
export type UpdateVendorSettings = z.infer<typeof UpdateVendorSettingsSchema>;

// Pricing Configuration Item
export const PricingConfigItemSchema = z.object({
  paperSize: z.nativeEnum(PaperSize),
  colorMode: z.nativeEnum(PrintColor),
  isDuplex: z.boolean(),
  pricePerSideMinor: z.number().int().min(1, 'Price per side must be at least 1 paise'),
  sheetChargeMinor: z.number().int().min(0).default(0),
  minimumOrderMinor: z.number().int().min(0).default(500), // Default min ₹5.00
});
export type PricingConfigItem = z.infer<typeof PricingConfigItemSchema>;

// Document Upload Session Init
export const InitUploadSessionSchema = z.object({
  vendorSlug: z.string(),
  filename: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().positive().max(50 * 1024 * 1024, 'Max file size is 50MB'),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']),
});
export type InitUploadSession = z.infer<typeof InitUploadSessionSchema>;

// Verify Upload After Blob Put
export const VerifyUploadSchema = z.object({
  sessionToken: z.string().uuid(),
  pageCount: z.number().int().positive().optional(),
  sha256Hash: z.string().optional(),
});
export type VerifyUpload = z.infer<typeof VerifyUploadSchema>;

// Print Item Configuration (Customer side)
export const PrintConfigurationItemSchema = z.object({
  documentId: z.string().uuid(),
  paperSize: z.nativeEnum(PaperSize).default(PaperSize.A4),
  colorMode: z.nativeEnum(PrintColor).default(PrintColor.BLACK_AND_WHITE),
  duplexMode: z.nativeEnum(DuplexMode).default(DuplexMode.SINGLE_SIDED),
  copies: z.number().int().min(1).max(100).default(1),
  pageRange: z.string().regex(/^([0-9]+(-[0-9]+)?(,\s*[0-9]+(-[0-9]+)?)*|ALL)$/, 'Invalid page range format').default('ALL'),
});
export type PrintConfigurationItem = z.infer<typeof PrintConfigurationItemSchema>;

// Create Order
export const CreateOrderSchema = z.object({
  vendorSlug: z.string(),
  items: z.array(PrintConfigurationItemSchema).min(1, 'At least one document is required'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().regex(/^[0-9]{10}$/, '10-digit phone number is required').optional(),
  customerNotes: z.string().max(250).optional(),
});
export type CreateOrder = z.infer<typeof CreateOrderSchema>;

// Device Enrollment (Electron Agent)
export const EnrollDeviceSchema = z.object({
  enrollmentCode: z.string().min(8),
  deviceName: z.string().min(2),
  osVersion: z.string().optional(),
  agentVersion: z.string().optional(),
});
export type EnrollDevice = z.infer<typeof EnrollDeviceSchema>;

// Printer Discovery Sync
export const SyncPrintersSchema = z.object({
  printers: z.array(
    z.object({
      systemName: z.string(),
      displayName: z.string(),
      supportedSizes: z.array(z.nativeEnum(PaperSize)),
      supportsColor: z.boolean(),
      supportsDuplex: z.boolean(),
      isDefault: z.boolean(),
    })
  ),
});
export type SyncPrinters = z.infer<typeof SyncPrintersSchema>;

// Claim Job Request
export const ClaimJobSchema = z.object({
  deviceId: z.string().uuid(),
  leaseSeconds: z.number().int().min(30).max(600).default(120),
});
export type ClaimJob = z.infer<typeof ClaimJobSchema>;

// Update Job Status
export const UpdateJobStatusSchema = z.object({
  jobId: z.string().uuid(),
  status: z.nativeEnum(PrintJobStatus),
  claimToken: z.string(),
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type UpdateJobStatus = z.infer<typeof UpdateJobStatusSchema>;
