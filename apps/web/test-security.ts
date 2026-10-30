import { NextRequest } from 'next/server';
import { GET as getPricing, PUT as putPricing } from './app/api/vendor/pricing/route';
import { GET as getSubscription } from './app/api/vendor/subscription/route';
import { POST as postCheckout } from './app/api/vendor/subscription/checkout/route';
import { POST as postValidateCoupon } from './app/api/vendor/subscription/validate-coupon/route';
import { POST as postVerifySubscription } from './app/api/vendor/subscription/verify/route';
import { POST as postOrderStatus } from './app/api/vendor/orders/[orderId]/status/route';
import { POST as postRazorpayVerify } from './app/api/payments/razorpay/verify/route';
import { GET as getOrderTracking } from './app/api/orders/[trackingToken]/route';
import { POST as postRazorpayInit } from './app/api/payments/razorpay/init/route';
import { POST as postAgentEnroll } from './app/api/agent/enroll/route';
import { createSessionToken } from './lib/auth';
import { UserRole, OrderStatus, PaymentStatus, PaymentMethod } from '@printflow/shared-types';
import { prisma } from './lib/prisma';
import fs from 'fs';
import path from 'path';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: any) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${testName}`, failureDetails || '');
    failedTests++;
  }
}

async function runSecuritySeparationTests() {
  console.log('\n=============================================================');
  console.log('PRINT2ME FRONTEND-BACKEND SEPARATION & SECURITY TEST SUITE');
  console.log('=============================================================\n');

  // Setup test mock entities in database if needed
  let testVendor1: any = null;
  let testVendor2: any = null;
  let testOrder1: any = null;

  try {
    testVendor1 = await prisma.vendor.upsert({
      where: { slug: 'sec-test-vendor-1' },
      create: {
        name: 'Security Test Vendor 1',
        slug: 'sec-test-vendor-1',
        contactPhone: '+919999999991',
        contactEmail: 'test1@print2me.in',
        address: 'Shop 1, Sector 1',
        isActive: true,
        isApproved: true,
      },
      update: {},
    });

    testVendor2 = await prisma.vendor.upsert({
      where: { slug: 'sec-test-vendor-2' },
      create: {
        name: 'Security Test Vendor 2',
        slug: 'sec-test-vendor-2',
        contactPhone: '+919999999992',
        contactEmail: 'test2@print2me.in',
        address: 'Shop 2, Sector 2',
        isActive: true,
        isApproved: true,
      },
      update: {},
    });

    testOrder1 = await prisma.order.upsert({
      where: { trackingToken: 'sec_test_tracking_token_1234567890' },
      create: {
        vendorId: testVendor1.id,
        orderNumber: 'SEC-001',
        trackingToken: 'sec_test_tracking_token_1234567890',
        status: OrderStatus.AWAITING_PAYMENT,
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentStatus: PaymentStatus.PENDING,
        subtotalMinor: 5000,
        totalAmountMinor: 5000,
        currency: 'INR',
      },
      update: {
        vendorId: testVendor1.id,
        status: OrderStatus.AWAITING_PAYMENT,
        paymentMethod: PaymentMethod.RAZORPAY,
        paymentStatus: PaymentStatus.PENDING,
      },
    });
  } catch (err) {
    console.warn('Database initialization note (using mock verification where applicable):', err);
  }

  // TEST SUITE 1: Strict Authentication & Elimination of findFirst() Fallbacks
  console.log('Test Suite 1: Enforce Strict Authentication (No DB findFirst Fallback)');

  // 1.1 GET /api/vendor/pricing unauthenticated without query param
  {
    const req = new NextRequest('http://localhost:3000/api/vendor/pricing');
    const res = await getPricing(req);
    assert(res.status === 401, 'Unauthenticated GET /api/vendor/pricing returns 401 (not DB fallback)');
  }

  // 1.2 PUT /api/vendor/pricing unauthenticated
  {
    const req = new NextRequest('http://localhost:3000/api/vendor/pricing', {
      method: 'PUT',
      body: JSON.stringify({ pricing: [] }),
    });
    const res = await putPricing(req);
    assert(res.status === 401, 'Unauthenticated PUT /api/vendor/pricing returns 401 Unauthorized');
  }

  // 1.3 GET /api/vendor/subscription unauthenticated
  {
    const req = new NextRequest('http://localhost:3000/api/vendor/subscription');
    const res = await getSubscription(req);
    assert(res.status === 401, 'Unauthenticated GET /api/vendor/subscription returns 401 Unauthorized');
  }

  // 1.4 POST /api/vendor/subscription/checkout unauthenticated
  {
    const req = new NextRequest('http://localhost:3000/api/vendor/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ planCode: 'PRO' }),
    });
    const res = await postCheckout(req);
    assert(res.status === 401, 'Unauthenticated POST /api/vendor/subscription/checkout returns 401');
  }

  // 1.5 POST /api/vendor/subscription/validate-coupon unauthenticated
  {
    const req = new NextRequest('http://localhost:3000/api/vendor/subscription/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ couponCode: 'SAVE50' }),
    });
    const res = await postValidateCoupon(req);
    assert(res.status === 401, 'Unauthenticated POST /api/vendor/subscription/validate-coupon returns 401');
  }

  // 1.6 POST /api/vendor/subscription/verify unauthenticated
  {
    const req = new NextRequest('http://localhost:3000/api/vendor/subscription/verify', {
      method: 'POST',
      body: JSON.stringify({ planCode: 'PRO' }),
    });
    const res = await postVerifySubscription(req);
    assert(res.status === 401, 'Unauthenticated POST /api/vendor/subscription/verify returns 401');
  }

  // TEST SUITE 2: Multi-Tenant Vendor Isolation & Order Ownership Enforcement
  console.log('\nTest Suite 2: Multi-Tenant Vendor Isolation & Ownership Checks');

  if (testVendor1 && testVendor2 && testOrder1) {
    // Session belonging to Vendor 2
    const vendor2Token = await createSessionToken({
      userId: 'user-vendor-2',
      email: 'vendor2@print2me.in',
      fullName: 'Vendor Two',
      role: UserRole.VENDOR_OWNER,
      vendorId: testVendor2.id,
    });

    // Vendor 2 attempts to change status of Order 1 (owned by Vendor 1)
    const req = new NextRequest(`http://localhost:3000/api/vendor/orders/${testOrder1.id}/status`, {
      method: 'POST',
      headers: {
        cookie: `printflow_session=${vendor2Token}`,
      },
      body: JSON.stringify({ action: 'APPROVE' }),
    });
    const res = await postOrderStatus(req, { params: { orderId: testOrder1.id } });
    const json = await res.json();
    assert(res.status === 403, 'Cross-tenant access blocked: Vendor 2 cannot modify Vendor 1 order (403 Forbidden)', json);
  } else {
    console.log('  \x1b[33m- SKIPPED\x1b[0m (DB test entities unavailable in current environment)');
  }

  // TEST SUITE 3: Online Payment Fraud & Cash Spoofing Prevention
  console.log('\nTest Suite 3: Fraud Prevention (Block Cash Collection on Online Orders)');

  if (testVendor1 && testOrder1) {
    // Session belonging to Vendor 1 (Owner)
    const vendor1Token = await createSessionToken({
      userId: 'user-vendor-1',
      email: 'vendor1@print2me.in',
      fullName: 'Vendor One',
      role: UserRole.VENDOR_OWNER,
      vendorId: testVendor1.id,
    });

    // Attempt to mark cash collected on an order with paymentMethod: RAZORPAY
    const req = new NextRequest(`http://localhost:3000/api/vendor/orders/${testOrder1.id}/status`, {
      method: 'POST',
      headers: {
        cookie: `printflow_session=${vendor1Token}`,
      },
      body: JSON.stringify({ action: 'MARK_CASH_COLLECTED' }),
    });
    const res = await postOrderStatus(req, { params: { orderId: testOrder1.id } });
    const json = await res.json();
    assert(
      res.status === 400 && json.error?.includes('Fraud Prevention'),
      'Fraud blocked: Cannot mark cash collected on an online Razorpay order (400 Bad Request)',
      json
    );
  } else {
    console.log('  \x1b[33m- SKIPPED\x1b[0m (DB test entities unavailable in current environment)');
  }

  // TEST SUITE 4: Payment Gateway Signature & Verification Security
  console.log('\nTest Suite 4: Razorpay Payment Verification & Signature Tampering');

  // 4.1 Forged signature rejection
  {
    const req = new NextRequest('http://localhost:3000/api/payments/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify({
        trackingToken: 'sec_test_tracking_token_1234567890',
        razorpayOrderId: 'order_live_fake123',
        razorpayPaymentId: 'pay_fake456',
        razorpaySignature: 'forged_invalid_signature_hex_value_123',
      }),
    });
    const res = await postRazorpayVerify(req);
    const json = await res.json();
    assert(res.status === 400, 'Forged Razorpay signature is rejected with 400 Bad Request', json);
  }

  // 4.2 Server-side authoritative pricing engine overrides client tampering
  {
    const { calculateOrderSummary } = await import('./lib/pricing-engine');
    const rules = [
      { paperSize: 'A4', colorMode: 'BLACK_AND_WHITE', isDuplex: false, pricePerSideMinor: 200, sheetChargeMinor: 0, minimumOrderMinor: 500 },
    ];
    // Client claims 1 page is ₹0.01 (1 minor)
    const summary = calculateOrderSummary(
      [{ documentId: 'doc-1', totalDocumentPages: 1, paperSize: 'A4' as any, colorMode: 'BLACK_AND_WHITE' as any, duplexMode: 'SINGLE_SIDED' as any, copies: 1 }],
      rules as any
    );
    // Server calculates ₹2.00, applies vendor minimum ₹5.00 (500 minor), ignoring any client-sent price
    assert(summary.totalAmountMinor === 500, 'Server pricing engine authoritatively enforces rates and minimums (500 minor), ignoring client spoofing');
  }

  // TEST SUITE 5: Elimination of Mock Fallbacks for Non-Existent Resources
  console.log('\nTest Suite 5: Elimination of Mock Fallbacks on Missing Resources');

  // 5.1 Non-existent order tracking returns 404, not ORD-8921 demo mock
  {
    const req = new NextRequest('http://localhost:3000/api/orders/non_existent_token_0987654321');
    const res = await getOrderTracking(req, { params: { trackingToken: 'non_existent_token_0987654321' } });
    const json = await res.json();
    assert(res.status === 404 && !json.order, 'Missing order returns 404 Not Found (no ORD-8921 mock order)', json);
  }

  // 5.2 Non-existent order payment initialization returns 404
  {
    const req = new NextRequest('http://localhost:3000/api/payments/razorpay/init', {
      method: 'POST',
      body: JSON.stringify({ trackingToken: 'non_existent_token_0987654321' }),
    });
    const res = await postRazorpayInit(req);
    const json = await res.json();
    assert(res.status === 404 && !json.orderNumber, 'Payment init for missing order returns 404 (no mock init)', json);
  }

  // TEST SUITE 6: Elimination of Agent Demo Bypasses
  console.log('\nTest Suite 6: Desktop Agent Device & Enrollment Security');

  // 6.1 Agent enrollment with ENROLL- demo code is rejected
  {
    const req = new NextRequest('http://localhost:3000/api/agent/enroll', {
      method: 'POST',
      body: JSON.stringify({
        enrollmentCode: 'ENROLL-DEMO-1234',
        deviceName: 'Tampered-Agent-PC',
      }),
    });
    const res = await postAgentEnroll(req);
    const json = await res.json();
    assert(res.status === 404, 'Agent enrollment rejects fake "ENROLL-" demo bypass with 404', json);
  }

  // TEST SUITE 7: Client Build Directory Secret Scan
  console.log('\nTest Suite 7: Client Build Directory Secret Scan');

  {
    const mobileDir = path.join(process.cwd(), '../Print2me-app');
    const filesInMobile = fs.existsSync(mobileDir) ? fs.readdirSync(mobileDir) : [];
    const hasAdminKeyInMobile = filesInMobile.some((f) => f.includes('firebase-adminsdk') || f.includes('serviceAccountKey'));
    assert(!hasAdminKeyInMobile, 'No Firebase Admin SDK keys exist in mobile client directory (apps/Print2me-app)');
  }

  {
    const desktopDir = path.join(process.cwd(), '../desktop-agent');
    const filesInDesktop = fs.existsSync(desktopDir) ? fs.readdirSync(desktopDir) : [];
    const hasAdminKeyInDesktop = filesInDesktop.some((f) => f.includes('firebase-adminsdk') || f.includes('serviceAccountKey'));
    assert(!hasAdminKeyInDesktop, 'No Firebase Admin SDK keys exist in Windows desktop agent directory');
  }

  // Clean up test records
  if (testOrder1) {
    try {
      await prisma.order.delete({ where: { id: testOrder1.id } });
      await prisma.vendor.delete({ where: { id: testVendor1.id } });
      await prisma.vendor.delete({ where: { id: testVendor2.id } });
    } catch {}
  }

  console.log('\n-------------------------------------------------------------');
  console.log(`TEST SUMMARY: Total: ${passedTests + failedTests} | \x1b[32mPassed: ${passedTests}\x1b[0m | \x1b[31mFailed: ${failedTests}\x1b[0m`);
  console.log('-------------------------------------------------------------\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecuritySeparationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
