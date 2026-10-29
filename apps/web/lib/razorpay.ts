import crypto from 'crypto';
import Razorpay from 'razorpay';

const KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_YourTestKeyId';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'yourRazorpayTestKeySecret';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'yourRazorpayWebhookSecret';

export function isRazorpayConfigured(): boolean {
  return (
    Boolean(KEY_ID) &&
    Boolean(KEY_SECRET) &&
    !KEY_ID.includes('YourTestKeyId') &&
    !KEY_SECRET.includes('yourRazorpayTestKeySecret')
  );
}

export function getRazorpayClient(): Razorpay | null {
  if (!isRazorpayConfigured()) return null;
  return new Razorpay({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
  });
}

export interface RazorpayOrderInitResult {
  razorpayOrderId: string;
  amountMinor: number;
  currency: string;
  keyId: string;
  isMock: boolean;
}

/**
 * Creates an authorized Razorpay Order with server or vendor-specific credentials
 */
export async function createRazorpayOrder(
  amountMinor: number,
  receipt: string,
  notes?: Record<string, string>,
  vendorCredentials?: { keyId?: string; keySecret?: string }
): Promise<RazorpayOrderInitResult> {
  const activeKeyId = vendorCredentials?.keyId || KEY_ID;
  const activeSecret = vendorCredentials?.keySecret || KEY_SECRET;

  const isConfigured =
    Boolean(activeKeyId) &&
    Boolean(activeSecret) &&
    !activeKeyId.includes('YourTestKeyId') &&
    !activeSecret.includes('yourRazorpayTestKeySecret');

  if (!isConfigured) {
    // Development sandbox simulation
    const mockOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
    return {
      razorpayOrderId: mockOrderId,
      amountMinor,
      currency: 'INR',
      keyId: activeKeyId,
      isMock: true,
    };
  }

  const client = new Razorpay({
    key_id: activeKeyId,
    key_secret: activeSecret,
  });

  const options = {
    amount: amountMinor, // Amount in Paise
    currency: 'INR',
    receipt,
    notes: notes || {},
  };

  const rzpOrder = await client.orders.create(options);
  return {
    razorpayOrderId: rzpOrder.id,
    amountMinor: Number(rzpOrder.amount),
    currency: rzpOrder.currency,
    keyId: activeKeyId,
    isMock: false,
  };
}

/**
 * Verifies Razorpay Checkout HMAC-SHA256 signature
 * Generated from: razorpay_order_id + '|' + razorpay_payment_id
 */
export function verifyRazorpaySignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  secret?: string;
}): boolean {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;
  const secret = params.secret || KEY_SECRET;

  const isProd = process.env.NODE_ENV === 'production';
  const allowMock = !isProd && (process.env.ALLOW_MOCK_PAYMENTS === 'true' || !isRazorpayConfigured());

  if (razorpayOrderId.startsWith('order_mock_')) {
    if (!allowMock) {
      return false;
    }
    // In development mock simulation mode, verify simulation signatures
    return (
      Boolean(razorpayPaymentId) &&
      (razorpaySignature === 'simulated_signature' || razorpaySignature.length >= 10)
    );
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  // Timing-safe equal check to protect against timing attacks
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
  const actualBuffer = Buffer.from(razorpaySignature, 'utf-8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Verifies raw-body Razorpay Webhook signature
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string = WEBHOOK_SECRET
): boolean {
  if (!signatureHeader) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
  const actualBuffer = Buffer.from(signatureHeader, 'utf-8');

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
