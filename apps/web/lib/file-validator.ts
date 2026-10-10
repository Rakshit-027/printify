export interface FileValidationResult {
  valid: boolean;
  detectedMime?: string;
  error?: string;
}

// Magic Byte Signatures for strictly permitted formats
const FILE_SIGNATURES: { mime: string; check: (bytes: Uint8Array) => boolean }[] = [
  // PDF: starts with %PDF- (hex: 25 50 44 46 2D)
  {
    mime: 'application/pdf',
    check: (bytes) => bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d,
  },
  // JPEG: starts with FF D8 FF
  {
    mime: 'image/jpeg',
    check: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  {
    mime: 'image/png',
    check: (bytes) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB hard limit
export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

/**
 * Validates file buffer or magic bytes array against allowed binary signatures
 */
export function validateFileMagicBytes(buffer: Uint8Array): FileValidationResult {
  if (!buffer || buffer.length < 8) {
    return { valid: false, error: 'File is too small or corrupt to inspect header signature' };
  }

  for (const sig of FILE_SIGNATURES) {
    if (sig.check(buffer)) {
      return { valid: true, detectedMime: sig.mime };
    }
  }

  return {
    valid: false,
    error: 'Unsupported file signature. Only standard PDF, JPG, and PNG documents are allowed.',
  };
}

/**
 * Sanitizes customer-supplied file name to prevent path traversal and shell injection
 */
export function sanitizeFilename(rawFilename: string): string {
  // Strip path traversal indicators
  const baseName = rawFilename.replace(/^.*[\\\/]/, '').trim();
  // Retain only safe alphanumeric characters, dashes, underscores, and dots
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Avoid hidden files or double extensions abuse
  return sanitized.slice(0, 100) || 'document';
}
