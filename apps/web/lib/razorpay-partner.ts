import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'printflow-development-secret-key-at-least-32-chars-long!'
);

// Environment Configurations
export const PARTNER_CLIENT_ID = process.env.RAZORPAY_PARTNER_CLIENT_ID || '';
export const PARTNER_CLIENT_SECRET = process.env.RAZORPAY_PARTNER_CLIENT_SECRET || '';
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
export const RAZORPAY_WEBHOOK_SECRET =
  process.env.RAZORPAY_PARTNER_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || '';

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://www.print2me.in';
  }
  return 'http://localhost:3000';
}

export function getPartnerRedirectUri(): string {
  if (process.env.RAZORPAY_PARTNER_REDIRECT_URI) {
    return process.env.RAZORPAY_PARTNER_REDIRECT_URI;
  }
  return `${getAppBaseUrl()}/api/vendor/payments/razorpay/callback`;
}

/**
 * Check whether real Razorpay Partner credentials are fully configured.
 */
export function isPartnerConfigured(): boolean {
  return (
    Boolean(PARTNER_CLIENT_ID) &&
    Boolean(PARTNER_CLIENT_SECRET) &&
    !PARTNER_CLIENT_ID.includes('placeholder') &&
    !PARTNER_CLIENT_SECRET.includes('placeholder')
  );
}

// -------------------------------------------------------------
// OAUTH STATE TOKEN (CSRF & REPLAY PROTECTION)
// -------------------------------------------------------------

export interface OAuthStatePayload {
  vendorId: string;
  userId: string;
  nonce: string;
  issuedAt: number;
}

/**
 * Generates an encrypted/signed state token for Razorpay OAuth authorization.
 * Expires in 15 minutes.
 */
export async function createOAuthStateToken(vendorId: string, userId: string): Promise<string> {
  const nonce = crypto.randomBytes(16).toString('hex');
  return new SignJWT({ vendorId, userId, nonce, issuedAt: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

/**
 * Validates the OAuth state token returned by Razorpay in callback query params.
 */
export async function verifyOAuthStateToken(token: string): Promise<OAuthStatePayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.vendorId || !payload.userId) {
      return null;
    }
    return {
      vendorId: String(payload.vendorId),
      userId: String(payload.userId),
      nonce: String(payload.nonce || ''),
      issuedAt: Number(payload.issuedAt || 0),
    };
  } catch (err) {
    console.warn('[RazorpayPartner] State token verification failed:', err);
    return null;
  }
}

// -------------------------------------------------------------
// RAZORPAY AUTHORIZATION URL GENERATOR
// -------------------------------------------------------------

/**
 * Constructs the official Razorpay Partner hosted authorization URL.
 * Redirects the vendor to Razorpay for account authorization/onboarding.
 */
export function getPartnerAuthorizeUrl(stateToken: string): string {
  const clientId = PARTNER_CLIENT_ID || 'ca_simulated_partner_client_id';
  const redirectUri = getPartnerRedirectUri();

  // Official Razorpay OAuth params:
  // response_type=code, client_id, redirect_uri, scope=read_write, state
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read_write',
    state: stateToken,
  });

  return `https://auth.razorpay.com/authorize?${params.toString()}`;
}

// -------------------------------------------------------------
// TOKEN EXCHANGE & REFRESH (SERVER-TO-SERVER)
// -------------------------------------------------------------

export interface TokenExchangeResult {
  success: boolean;
  razorpayAccountId?: string;
  publicToken?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  error?: string;
  isSimulated?: boolean;
}

/**
 * Exchanges authorization code received in callback for access and refresh tokens.
 * Makes a secure server-to-server POST to https://auth.razorpay.com/token.
 */
export async function exchangeAuthorizationCode(
  code: string,
  statePayload: OAuthStatePayload
): Promise<TokenExchangeResult> {
  if (!isPartnerConfigured()) {
    // Sandbox / Simulation fallback for local testing when keys are not yet configured in env
    const mockAccountId = `acc_sim_${crypto.randomBytes(6).toString('hex')}`;
    const mockPublicToken = `rzp_test_oauth_${crypto.randomBytes(8).toString('hex')}`;
    const mockAccessToken = `tok_access_sim_${crypto.randomBytes(12).toString('hex')}`;
    const mockRefreshToken = `tok_refresh_sim_${crypto.randomBytes(12).toString('hex')}`;

    return {
      success: true,
      razorpayAccountId: mockAccountId,
      publicToken: mockPublicToken,
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 7776000, // 90 days
      isSimulated: true,
    };
  }

  const redirectUri = getPartnerRedirectUri();

  try {
    const response = await fetch('https://auth.razorpay.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PARTNER_CLIENT_ID,
        client_secret: PARTNER_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error_description || data?.error || 'Token exchange failed';
      console.error('[RazorpayPartner] Token exchange error:', errMsg);
      return {
        success: false,
        error: errMsg,
      };
    }

    return {
      success: true,
      razorpayAccountId: data.razorpay_account_id,
      publicToken: data.public_token || data.razorpay_account_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in || 7776000,
      isSimulated: false,
    };
  } catch (error: any) {
    console.error('[RazorpayPartner] Token exchange network exception:', error);
    return {
      success: false,
      error: error.message || 'Network exception exchanging code with Razorpay',
    };
  }
}

/**
 * Refreshes an expired OAuth access token using the stored refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenExchangeResult> {
  if (!isPartnerConfigured()) {
    return {
      success: true,
      accessToken: `tok_access_sim_refreshed_${crypto.randomBytes(8).toString('hex')}`,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 7776000,
      isSimulated: true,
    };
  }

  try {
    const response = await fetch('https://auth.razorpay.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: PARTNER_CLIENT_ID,
        client_secret: PARTNER_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data?.error_description || data?.error || 'Failed to refresh token',
      };
    }

    return {
      success: true,
      razorpayAccountId: data.razorpay_account_id,
      publicToken: data.public_token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenType: data.token_type || 'Bearer',
      expiresIn: data.expires_in || 7776000,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Token refresh network error',
    };
  }
}

// -------------------------------------------------------------
// ACCOUNT ACTIVATION STATUS SYNC (OFFICIAL V2 API)
// -------------------------------------------------------------

export interface AccountStatusResult {
  success: boolean;
  status: string; // created, under_review, needs_clarification, activated, suspended, rejected
  activationStatus: string; // ACTIVATED, UNDER_REVIEW, NEEDS_CLARIFICATION, SUSPENDED, REJECTED, NOT_ACTIVATED
  legalBusinessName?: string;
  businessType?: string;
  requirements?: any;
  error?: string;
  isSimulated?: boolean;
}

/**
 * Checks the authoritative status of a sub-merchant's Razorpay account using
 * GET https://api.razorpay.com/v2/accounts/:accountId with Partner Basic Auth.
 */
export async function fetchRazorpayAccountStatus(
  accountId: string
): Promise<AccountStatusResult> {
  if (!accountId) {
    return {
      success: false,
      status: 'unknown',
      activationStatus: 'NOT_ACTIVATED',
      error: 'Account ID is missing',
    };
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || accountId.startsWith('acc_sim_')) {
    // Simulated sandbox mode
    return {
      success: true,
      status: 'activated',
      activationStatus: 'ACTIVATED',
      legalBusinessName: 'Verified Print Partner',
      businessType: 'proprietorship',
      isSimulated: true,
    };
  }

  try {
    const authHeader = `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`;
    const response = await fetch(`https://api.razorpay.com/v2/accounts/${accountId}`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn(`[RazorpayPartner] Failed to fetch account ${accountId}:`, data?.error);
      return {
        success: false,
        status: 'unknown',
        activationStatus: 'UNDER_REVIEW',
        error: data?.error?.description || 'Failed to fetch account status from Razorpay',
      };
    }

    const rzpStatus = String(data.status || 'created').toLowerCase();
    let activationStatus = 'UNDER_REVIEW';

    switch (rzpStatus) {
      case 'activated':
        activationStatus = 'ACTIVATED';
        break;
      case 'under_review':
        activationStatus = 'UNDER_REVIEW';
        break;
      case 'needs_clarification':
        activationStatus = 'NEEDS_CLARIFICATION';
        break;
      case 'suspended':
        activationStatus = 'SUSPENDED';
        break;
      case 'rejected':
        activationStatus = 'REJECTED';
        break;
      default:
        activationStatus = 'UNDER_REVIEW';
        break;
    }

    return {
      success: true,
      status: rzpStatus,
      activationStatus,
      legalBusinessName: data.legal_business_name || data.business_name,
      businessType: data.business_type,
      requirements: data.requirements || null,
      isSimulated: false,
    };
  } catch (error: any) {
    console.error('[RazorpayPartner] Exception checking account status:', error);
    return {
      success: false,
      status: 'unknown',
      activationStatus: 'UNDER_REVIEW',
      error: error.message || 'Network failure communicating with Razorpay Accounts API',
    };
  }
}

// -------------------------------------------------------------
// SUB-MERCHANT ORDER CREATION (DIRECT TO VENDOR BANK)
// -------------------------------------------------------------

export interface PartnerOrderInitResult {
  razorpayOrderId: string;
  amountMinor: number;
  currency: string;
  keyId: string; // The public token or key to initialize checkout with
  isMock: boolean;
  subMerchantAccountId?: string;
}

/**
 * Creates an authorized Razorpay Order on behalf of the sub-merchant
 * using the vendor's OAuth access token.
 * Customer payment settles 100% to the vendor's bank account with 0% platform commission.
 */
export async function createPartnerOrder(params: {
  amountMinor: number;
  receipt: string;
  notes?: Record<string, string>;
  paymentAccount?: {
    razorpayAccountId?: string | null;
    accessToken?: string | null;
    publicToken?: string | null;
  } | null;
}): Promise<PartnerOrderInitResult> {
  const { amountMinor, receipt, notes, paymentAccount } = params;

  const accessToken = paymentAccount?.accessToken;
  const publicToken = paymentAccount?.publicToken;
  const accountId = paymentAccount?.razorpayAccountId;

  // Check if real OAuth token is available
  const hasLiveOAuth =
    Boolean(accessToken) &&
    !accessToken?.startsWith('tok_access_sim_') &&
    isPartnerConfigured();

  if (!hasLiveOAuth) {
    // Sandbox or Simulation mode
    const mockOrderId = `order_sub_${crypto.randomBytes(8).toString('hex')}`;
    const resolvedKey =
      publicToken ||
      RAZORPAY_KEY_ID ||
      'rzp_test_oauth_simulation';

    return {
      razorpayOrderId: mockOrderId,
      amountMinor,
      currency: 'INR',
      keyId: resolvedKey,
      isMock: true,
      subMerchantAccountId: accountId || undefined,
    };
  }

  try {
    // Official partner order creation using sub-merchant OAuth Bearer token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount: amountMinor,
        currency: 'INR',
        receipt,
        notes: notes || {},
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.description || data?.error || 'Failed to create sub-merchant order';
      console.error('[RazorpayPartner] Order creation error:', errMsg);
      throw new Error(errMsg);
    }

    const resolvedCheckoutKey =
      publicToken ||
      data.public_token ||
      PARTNER_CLIENT_ID ||
      RAZORPAY_KEY_ID;

    return {
      razorpayOrderId: data.id,
      amountMinor: Number(data.amount),
      currency: data.currency || 'INR',
      keyId: resolvedCheckoutKey,
      isMock: false,
      subMerchantAccountId: accountId || undefined,
    };
  } catch (err: any) {
    console.error('[RazorpayPartner] createPartnerOrder error:', err);
    throw err;
  }
}
