import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';

const ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME || '';
const ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY || '';
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'printflow-customer-documents';
const SAS_EXPIRY_MINUTES = parseInt(process.env.AZURE_SAS_EXPIRY_MINUTES || '15', 10);

export interface UploadSessionResult {
  blobKey: string;
  uploadUrl: string;
  expiresAt: Date;
  isMockMode: boolean;
}

export interface BlobMetadataResult {
  exists: boolean;
  contentLength: number;
  contentType: string;
  lastModified?: Date;
  etag?: string;
}

function isAzureConfigured(): boolean {
  return (
    Boolean(ACCOUNT_NAME) &&
    Boolean(ACCOUNT_KEY) &&
    !ACCOUNT_KEY.includes('your-azure-storage-account-key')
  );
}

function getSharedKeyCredential(): StorageSharedKeyCredential | null {
  if (!isAzureConfigured()) return null;
  return new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
}

function getBlobServiceClient(): BlobServiceClient | null {
  const credential = getSharedKeyCredential();
  if (!credential) return null;
  return new BlobServiceClient(
    `https://${ACCOUNT_NAME}.blob.core.windows.net`,
    credential
  );
}

/**
 * Generates an internal non-guessable blob key scoped by vendor and date
 * e.g. vendors/{vendorId}/2026/10/{uuid}.pdf
 */
export function generateInternalBlobKey(vendorId: string, extension: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const uniqueId = crypto.randomUUID();
  const cleanExt = extension.startsWith('.') ? extension : `.${extension}`;
  return `vendors/${vendorId}/${year}/${month}/${uniqueId}${cleanExt}`;
}

/**
 * Generates a short-lived, narrowly scoped upload SAS URL for direct-to-blob PUT
 */
export async function generateUploadSasUrl(
  blobKey: string,
  contentType: string
): Promise<UploadSessionResult> {
  const expiresOn = new Date(Date.now() + SAS_EXPIRY_MINUTES * 60 * 1000);

  if (!isAzureConfigured()) {
    // Development fallback mock mode
    return {
      blobKey,
      uploadUrl: `/api/uploads/mock-blob-receiver?blobKey=${encodeURIComponent(blobKey)}`,
      expiresAt: expiresOn,
      isMockMode: true,
    };
  }

  const credential = getSharedKeyCredential()!;
  const permissions = new BlobSASPermissions();
  permissions.create = true;
  permissions.write = true;

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName: blobKey,
      permissions,
      startsOn: new Date(Date.now() - 60 * 1000), // 1-minute clock skew tolerance
      expiresOn,
      protocol: SASProtocol.Https,
      contentType,
    },
    credential
  ).toString();

  const uploadUrl = `https://${ACCOUNT_NAME}.blob.core.windows.net/${CONTAINER_NAME}/${blobKey}?${sasToken}`;

  return {
    blobKey,
    uploadUrl,
    expiresAt: expiresOn,
    isMockMode: false,
  };
}

/**
 * Generates a short-lived download SAS URL for the authorized Windows Print Agent
 */
export async function generateDownloadSasUrl(
  blobKey: string,
  expiryMinutes: number = 10
): Promise<string> {
  if (!isAzureConfigured()) {
    return `/api/uploads/mock-blob-receiver?blobKey=${encodeURIComponent(blobKey)}&action=download`;
  }

  const credential = getSharedKeyCredential()!;
  const expiresOn = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const permissions = new BlobSASPermissions();
  permissions.read = true;

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName: blobKey,
      permissions,
      startsOn: new Date(Date.now() - 60 * 1000),
      expiresOn,
      protocol: SASProtocol.Https,
    },
    credential
  ).toString();

  return `https://${ACCOUNT_NAME}.blob.core.windows.net/${CONTAINER_NAME}/${blobKey}?${sasToken}`;
}

/**
 * Verifies that the blob was actually uploaded into the Azure container and inspects its size
 */
export async function verifyBlobExists(blobKey: string): Promise<BlobMetadataResult> {
  if (!isAzureConfigured()) {
    // In dev mock mode, return valid mock metadata
    return {
      exists: true,
      contentLength: 1024 * 100, // 100 KB
      contentType: 'application/pdf',
      lastModified: new Date(),
    };
  }

  try {
    const serviceClient = getBlobServiceClient()!;
    const containerClient = serviceClient.getContainerClient(CONTAINER_NAME);
    const blobClient = containerClient.getBlobClient(blobKey);

    const properties = await blobClient.getProperties();
    return {
      exists: true,
      contentLength: properties.contentLength || 0,
      contentType: properties.contentType || 'application/octet-stream',
      lastModified: properties.lastModified,
      etag: properties.etag,
    };
  } catch (error: any) {
    if (error.statusCode === 404) {
      return { exists: false, contentLength: 0, contentType: '' };
    }
    throw error;
  }
}

/**
 * Deletes a blob from Azure Blob Storage (used by retention cleanup worker)
 */
export async function deleteBlobDocument(blobKey: string): Promise<boolean> {
  if (!isAzureConfigured()) return true;

  try {
    const serviceClient = getBlobServiceClient()!;
    const containerClient = serviceClient.getContainerClient(CONTAINER_NAME);
    const blobClient = containerClient.getBlobClient(blobKey);
    const res = await blobClient.deleteIfExists();
    return res.succeeded;
  } catch (error) {
    console.error(`Failed to delete blob ${blobKey}:`, error);
    return false;
  }
}

/**
 * Health check for storage configuration
 */
export async function checkStorageHealth(): Promise<{ healthy: boolean; mode: string; message: string }> {
  if (!isAzureConfigured()) {
    return {
      healthy: true,
      mode: 'MOCK_FALLBACK',
      message: 'Azure Storage credentials not configured. Running in local test mock mode.',
    };
  }

  try {
    const serviceClient = getBlobServiceClient()!;
    const containerClient = serviceClient.getContainerClient(CONTAINER_NAME);
    const exists = await containerClient.exists();
    return {
      healthy: exists,
      mode: 'AZURE_PRODUCTION',
      message: exists
        ? `Container '${CONTAINER_NAME}' verified in Central India region.`
        : `Container '${CONTAINER_NAME}' not found. Please create container in Azure Portal.`,
    };
  } catch (error: any) {
    return {
      healthy: false,
      mode: 'AZURE_ERROR',
      message: error.message || 'Error connecting to Azure Blob Storage service.',
    };
  }
}
