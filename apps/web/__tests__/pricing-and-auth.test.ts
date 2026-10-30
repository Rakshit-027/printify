import {
  calculateOrderSummary,
  calculateConvenienceFeeMinor,
  parsePageRangeCount,
  formatMinorToInr,
  RAZORPAY_EFFECTIVE_RATE,
} from '../lib/pricing-engine';
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from '../lib/auth';
import { PaperSize, PrintColor, DuplexMode, UserRole } from '@printflow/shared-types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, details?: any) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${title}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${title}`, details || '');
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('PRINT2ME CORE DOMAIN & PRICING ENGINE UNIT TEST SUITE');
  console.log('=============================================================\n');

  // Test 1: Page Range Parsing
  console.log('▶ 1. Page Range Parsing');
  assert(parsePageRangeCount(undefined, 10) === 10, 'Omitted page range defaults to total document pages');
  assert(parsePageRangeCount('ALL', 15) === 15, '"ALL" returns full page count');
  assert(parsePageRangeCount('1', 20) === 1, 'Single page "1" returns 1 page');
  assert(parsePageRangeCount('1-5', 20) === 5, 'Contiguous range "1-5" returns 5 pages');
  assert(parsePageRangeCount('1-3, 5, 8-10', 20) === 7, 'Mixed range "1-3, 5, 8-10" returns 7 unique pages');
  assert(parsePageRangeCount('1-50', 10) === 10, 'Out-of-bounds range clamped safely to total document pages (10)');
  assert(parsePageRangeCount('-5, 0, abc', 10) === 10, 'Invalid segments fall back gracefully to total pages');

  // Test 2: Convenience Fee Gross-Up Formula
  console.log('\n▶ 2. Gateway Convenience Fee Calculation');
  const fee1 = calculateConvenienceFeeMinor(10000, true); // ₹100.00
  // Gross = 10000 / (1 - 0.0236) = 10242 minor (₹102.42)
  // Fee = 242 minor (₹2.42)
  assert(fee1.totalAmountMinor === 10242, `Gross amount correctly computed as 10242 minor (actual: ${fee1.totalAmountMinor})`);
  assert(fee1.convenienceFeeMinor === 242, `Convenience fee is 242 minor (actual: ${fee1.convenienceFeeMinor})`);

  const feeCash = calculateConvenienceFeeMinor(10000, false);
  assert(feeCash.convenienceFeeMinor === 0 && feeCash.totalAmountMinor === 10000, 'Cash on desk has 0 convenience fee');

  // Test 3: Duplex Sheet Calculation & Item Pricing
  console.log('\n▶ 3. Duplex & Sheet Multipliers');
  const rules = [
    {
      paperSize: PaperSize.A4,
      colorMode: PrintColor.BLACK_AND_WHITE,
      isDuplex: true,
      pricePerSideMinor: 150, // ₹1.50 per side
      sheetChargeMinor: 0,
      minimumOrderMinor: 500, // ₹5.00 min order
      version: 1,
    },
    {
      paperSize: PaperSize.A4,
      colorMode: PrintColor.BLACK_AND_WHITE,
      isDuplex: false,
      pricePerSideMinor: 200, // ₹2.00 per side
      sheetChargeMinor: 0,
      minimumOrderMinor: 500,
      version: 1,
    },
  ];

  // 5 pages duplex = 3 sheets (ceil(5/2)), 5 sides
  const summaryDuplex = calculateOrderSummary(
    [
      {
        documentId: 'doc-1',
        totalDocumentPages: 5,
        paperSize: PaperSize.A4,
        colorMode: PrintColor.BLACK_AND_WHITE,
        duplexMode: DuplexMode.DOUBLE_SIDED_LONG_EDGE,
        copies: 1,
      },
    ],
    rules as any,
    500,
    false
  );

  assert(summaryDuplex.items[0].totalSheets === 3, '5 pages duplex calculates exactly 3 physical sheets');
  assert(summaryDuplex.items[0].totalSides === 5, '5 pages duplex has 5 printed sides');
  assert(summaryDuplex.items[0].itemTotalMinor === 750, '5 sides @ ₹1.50 = ₹7.50 (750 minor)');

  // Test 4: Format Minor to INR
  console.log('\n▶ 4. Currency Formatting');
  assert(formatMinorToInr(500) === '5.00', '500 minor formats as "5.00"');
  assert(formatMinorToInr(1250) === '12.50', '1250 minor formats as "12.50"');

  // Test 5: Cryptographic Auth Token Lifecycle
  console.log('\n▶ 5. Authentication & Cryptographic Session Security');
  const password = 'SuperSecretTestPassword2026!';
  const hash = await hashPassword(password);
  assert(hash.startsWith('$2'), 'Password hashed with bcrypt cost factor');
  assert(await verifyPassword(password, hash), 'Valid password verified by bcrypt');
  assert(!(await verifyPassword('WrongPassword', hash)), 'Invalid password rejected by bcrypt');

  const session = {
    userId: 'usr-test-123',
    email: 'vendor@print2me.in',
    fullName: 'Test Vendor Owner',
    role: UserRole.VENDOR_OWNER,
    vendorId: 'vnd-test-456',
  };

  const jwt = await createSessionToken(session);
  assert(typeof jwt === 'string' && jwt.split('.').length === 3, 'Signed compact JWT generated');

  const verified = await verifySessionToken(jwt);
  assert(verified !== null && verified.userId === session.userId, 'JWT successfully verified and payload decoded');
  assert(verified?.role === UserRole.VENDOR_OWNER, 'Role preserved in JWT session payload');

  const tamperedJwt = jwt.slice(0, -5) + 'abcde';
  const invalidVerified = await verifySessionToken(tamperedJwt);
  assert(invalidVerified === null, 'Tampered JWT rejected with null');

  console.log('\n-------------------------------------------------------------');
  console.log(`TEST RESULTS: Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite uncaught failure:', err);
  process.exit(1);
});
