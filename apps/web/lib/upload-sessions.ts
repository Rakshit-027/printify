// In-memory session cache for development / preview when PostgreSQL is temporarily offline
export interface FallbackUploadSession {
  sessionToken: string;
  vendorId: string;
  expectedSize: bigint;
  mimeType: string;
  blobKey: string;
  expiresAt: Date;
  isCompleted: boolean;
}

const globalForSessions = global as unknown as {
  __fallbackUploadSessions?: Map<string, FallbackUploadSession>;
};

export const fallbackUploadSessions =
  globalForSessions.__fallbackUploadSessions || new Map<string, FallbackUploadSession>();

if (process.env.NODE_ENV !== 'production') {
  globalForSessions.__fallbackUploadSessions = fallbackUploadSessions;
}
