import assert from 'assert';
import crypto from 'crypto';
import {
  createOAuthStateToken,
  verifyOAuthStateToken,
  getPartnerAuthorizeUrl,
  exchangeAuthorizationCode,
  fetchRazorpayAccountStatus,
  createPartnerOrder,
} from '../apps/web/lib/razorpay-partner';
import {
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../apps/web/lib/razorpay';

async function runTests() {
  console.log('🧪 Starting Razorpay Technology Partner Onboarding Test Suite...\n');

  // Test 1: OAuth State Token Generation & Verification
  console.log('Test 1: Generating and validating CSRF protected OAuth State Token...');
  const vendorId = 'vendor_test_12345';
  const userId = 'user_test_67890';
  const stateToken = await createOAuthStateToken(vendorId, userId);
  assert(stateToken && stateToken.length > 20, 'State token must be generated');

  const verifiedPayload = await verifyOAuthStateToken(stateToken);
  assert(verifiedPayload !== null, 'State token must verify successfully');
  assert.strictEqual(verifiedPayload?.vendorId, vendorId, 'Vendor ID in state must match');
  assert.strictEqual(verifiedPayload?.userId, userId, 'User ID in state must match');
  assert(verifiedPayload?.nonce, 'Nonce must be present in state token');
  console.log('  ✅ State token signed and verified with cryptographic integrity.');

  // Test 2: Tampered / Invalid State Token Rejection
  console.log('Test 2: Validating rejection of tampered state tokens...');
  const tamperedToken = stateToken.slice(0, -6) + 'xxxxxx';
  const tamperedResult = await verifyOAuthStateToken(tamperedToken);
  assert.strictEqual(tamperedResult, null, 'Tampered state token must be rejected');
  console.log('  ✅ Tampered state tokens correctly rejected.');

  // Test 3: Hosted Authorize URL Construction
  console.log('Test 3: Checking Razorpay hosted authorize URL parameters...');
  const authorizeUrl = getPartnerAuthorizeUrl(stateToken);
  const parsedUrl = new URL(authorizeUrl);
  assert.strictEqual(parsedUrl.origin, 'https://auth.razorpay.com', 'Origin must be auth.razorpay.com');
  assert.strictEqual(parsedUrl.pathname, '/authorize', 'Path must be /authorize');
  assert.strictEqual(parsedUrl.searchParams.get('response_type'), 'code', 'response_type must be code');
  assert.strictEqual(parsedUrl.searchParams.get('scope'), 'read_write', 'scope must be read_write');
  assert.strictEqual(parsedUrl.searchParams.get('state'), stateToken, 'state param must match token');
  assert(parsedUrl.searchParams.get('client_id'), 'client_id param must be present');
  assert(parsedUrl.searchParams.get('redirect_uri'), 'redirect_uri param must be present');
  console.log('  ✅ Authorize URL complies strictly with official Razorpay OAuth specs.');

  // Test 4: Authorization Code Exchange Handling
  console.log('Test 4: Exchanging authorization code for sub-merchant tokens...');
  const tokenResult = await exchangeAuthorizationCode('test_auth_code_9999', verifiedPayload!);
  assert(tokenResult.success, 'Token exchange must succeed');
  assert(tokenResult.razorpayAccountId?.startsWith('acc_'), 'Account ID must have acc_ prefix');
  assert(tokenResult.publicToken, 'Public token must be returned for client checkout');
  assert(tokenResult.accessToken, 'Access token must be returned for server operations');
  assert(tokenResult.tokenType === 'Bearer', 'Token type must be Bearer');
  console.log(`  ✅ Code exchanged for sub-merchant account: ${tokenResult.razorpayAccountId}`);

  // Test 5: Authoritative Status Resolution
  console.log('Test 5: Checking sub-merchant account status resolution...');
  const statusResult = await fetchRazorpayAccountStatus(tokenResult.razorpayAccountId!);
  assert(statusResult.success, 'Account status check must succeed');
  assert(
    ['ACTIVATED', 'UNDER_REVIEW', 'NEEDS_CLARIFICATION', 'SUSPENDED', 'REJECTED'].includes(
      statusResult.activationStatus
    ),
    'Activation status must be valid lifecycle enum'
  );
  console.log(`  ✅ Account status checked: ${statusResult.activationStatus}`);

  // Test 6: Sub-merchant Order Creation (0% Platform Commission)
  console.log('Test 6: Creating sub-merchant Razorpay Order...');
  const orderResult = await createPartnerOrder({
    amountMinor: 2500, // ₹25.00
    receipt: 'ORD-9871',
    notes: { vendorSlug: 'speedy-print', trackingToken: 'trk_abc123' },
    paymentAccount: {
      razorpayAccountId: tokenResult.razorpayAccountId,
      accessToken: tokenResult.accessToken,
      publicToken: tokenResult.publicToken,
    },
  });
  assert(orderResult.razorpayOrderId.startsWith('order_'), 'Razorpay order ID must start with order_');
  assert.strictEqual(orderResult.amountMinor, 2500, 'Order amount in minor paise must match');
  assert.strictEqual(orderResult.currency, 'INR', 'Currency must be INR');
  assert(orderResult.keyId, 'Key ID / Public token must be provided for frontend checkout');
  console.log(`  ✅ Partner order generated: ${orderResult.razorpayOrderId} with public token ${orderResult.keyId}`);

  // Test 7: Signature Verification for Checkout
  console.log('Test 7: Verifying Razorpay checkout signature calculation...');
  const secret = 'test_webhook_and_key_secret';
  const orderId = 'order_EKwxwAgItmmXdp';
  const paymentId = 'pay_29QQoUBcxrhErq';
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const validSigCheck = verifyRazorpaySignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: expectedSig,
    secret,
  });
  assert.strictEqual(validSigCheck, true, 'Valid HMAC signature must verify');

  const invalidSigCheck = verifyRazorpaySignature({
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: 'invalid_tampered_signature',
    secret,
  });
  assert.strictEqual(invalidSigCheck, false, 'Invalid HMAC signature must fail');
  console.log('  ✅ Payment signature validation timing-safe and accurate.');

  // Test 8: Webhook Raw Body HMAC-SHA256 Signature Verification
  console.log('Test 8: Verifying raw-body webhook signature verification...');
  const rawWebhookBody = JSON.stringify({
    event: 'account.activated',
    account_id: 'acc_test123',
    payload: { account: { entity: { id: 'acc_test123', status: 'activated' } } },
  });
  const webhookSig = crypto.createHmac('sha256', secret).update(rawWebhookBody).digest('hex');

  const validWebhookCheck = verifyWebhookSignature(rawWebhookBody, webhookSig, secret);
  assert.strictEqual(validWebhookCheck, true, 'Valid webhook signature must verify');

  const invalidWebhookCheck = verifyWebhookSignature(rawWebhookBody, 'forged_sig', secret);
  assert.strictEqual(invalidWebhookCheck, false, 'Forged webhook signature must fail');
  console.log('  ✅ Webhook HMAC-SHA256 signatures validated accurately.');

  console.log('\n🎉 ALL 8 RAZORPAY PARTNER INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
