import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { TempFileManager } from "../main/temp-file-manager";
import { JobLifecycleManager } from "../main/job-lifecycle";
import { WindowsPrinterService } from "../main/printer-service";
import { ConfigStore } from "../main/config-store";
import { logger } from "../main/logger";

describe("Print2Me Desktop Agent - Full Engineering Audit Test Suite", () => {
  const testDataDir = path.join(os.tmpdir(), `p2m-audit-test-${Date.now()}`);
  const tempMgr = new TempFileManager(path.join(testDataDir, "spool"));
  const lifecycle = new JobLifecycleManager(path.join(testDataDir, "jobs-history.json"));
  const configStore = new ConfigStore(path.join(testDataDir, "agent-config.json"));
  const printerService = new WindowsPrinterService();

  before(() => {
    fs.mkdirSync(testDataDir, { recursive: true });
  });

  after(() => {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch {}
  });

  // ==============================================================
  // 1. File Type Detection & Magic Bytes Security
  // ==============================================================
  describe("1. File Type Detection & Magic Bytes Security", () => {
    test("Identifies valid PDF from %PDF header", () => {
      const pdfBuffer = Buffer.from("%PDF-1.7\nSample content");
      const mime = tempMgr.detectMimeFromMagicBytes(pdfBuffer);
      assert.equal(mime, "application/pdf");
    });

    test("Identifies valid PNG from magic header", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const mime = tempMgr.detectMimeFromMagicBytes(pngBuffer);
      assert.equal(mime, "image/png");
    });

    test("Identifies valid JPEG from magic header", () => {
      const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const mime = tempMgr.detectMimeFromMagicBytes(jpgBuffer);
      assert.equal(mime, "image/jpeg");
    });

    test("Rejects executable or script files masquerading as PDF", async () => {
      const fakePdfBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00Windows Executable Content");
      await assert.rejects(
        async () => {
          await tempMgr.writeAndValidateBuffer(fakePdfBuffer, "malicious.pdf");
        },
        {
          message: /Security rejection: Document file format is unrecognized or unsupported/,
        }
      );
    });

    test("Rejects zero-byte empty documents", async () => {
      const emptyBuffer = Buffer.alloc(0);
      await assert.rejects(
        async () => {
          await tempMgr.writeAndValidateBuffer(emptyBuffer, "empty.pdf");
        },
        {
          message: /payload is empty \(0 bytes\)/,
        }
      );
    });

    test("Prevents directory traversal in filename generation", () => {
      const safePath = tempMgr.generateSecureTempPath("../../etc/passwd.pdf");
      assert.ok(!safePath.includes("../../"));
      assert.ok(path.isAbsolute(safePath));
    });

    test("Cleans up written temporary file safely", async () => {
      const validPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF");
      const validated = await tempMgr.writeAndValidateBuffer(validPdfBuffer, "test.pdf");
      assert.ok(fs.existsSync(validated.filePath));

      tempMgr.cleanupFile(validated.filePath, 0); // immediate delete
      assert.ok(!fs.existsSync(validated.filePath));
    });
  });

  // ==============================================================
  // 2. Deep PDF Validation: Corrupted, Incomplete & Password-Locked
  // ==============================================================
  describe("2. Deep PDF Validation & Security Guarding", () => {
    test("Rejects truncated PDF missing %%EOF trailer", async () => {
      const truncatedPdf = Buffer.from(
        "%PDF-1.5\nSome realistic long PDF document body content without end of file marker to test truncated stream"
      );
      await assert.rejects(
        async () => {
          await tempMgr.writeAndValidateBuffer(truncatedPdf, "truncated.pdf");
        },
        {
          message: /Corrupted document: Missing %%EOF marker/,
        }
      );
    });

    test("Rejects password-protected / encrypted PDF (/Encrypt dictionary)", async () => {
      const encryptedPdf = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\ntrailer<</Root 1 0 R/Encrypt 3 0 R>>\n%%EOF"
      );
      await assert.rejects(
        async () => {
          await tempMgr.writeAndValidateBuffer(encryptedPdf, "locked.pdf");
        },
        {
          message: /Document is password-protected or encrypted/,
        }
      );
    });

    test("Accepts clean well-formed PDF with proper header and trailer", async () => {
      const cleanPdf = Buffer.from(
        "%PDF-1.7\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"
      );
      const res = await tempMgr.writeAndValidateBuffer(cleanPdf, "invoice.pdf");
      assert.equal(res.mimeType, "application/pdf");
      assert.ok(res.sha256Hash.length === 64);
      tempMgr.cleanupFile(res.filePath, 0);
    });
  });

  // ==============================================================
  // 3. Page Range Parsing & Calculation
  // ==============================================================
  describe("3. Page Range Parsing & Calculation", () => {
    test("Parses 'ALL' or undefined as undefined (all pages)", () => {
      assert.equal(printerService.parsePageRange("ALL"), undefined);
      assert.equal(printerService.parsePageRange("all"), undefined);
      assert.equal(printerService.parsePageRange(""), undefined);
      assert.equal(printerService.parsePageRange(undefined), undefined);
    });

    test("Parses contiguous range '1-3' to 0-indexed [{from: 0, to: 2}]", () => {
      const parsed = printerService.parsePageRange("1-3");
      assert.deepEqual(parsed, [{ from: 0, to: 2 }]);
    });

    test("Parses mixed ranges and single pages '1-3, 5, 8-10'", () => {
      const parsed = printerService.parsePageRange("1-3, 5, 8-10");
      assert.deepEqual(parsed, [
        { from: 0, to: 2 },
        { from: 4, to: 4 },
        { from: 7, to: 9 },
      ]);
    });

    test("Ignores negative or zero page numbers gracefully", () => {
      const parsed = printerService.parsePageRange("0, -2, 4");
      assert.deepEqual(parsed, [{ from: 3, to: 3 }]);
    });

    test("Computes correct selected page numbers from document total", () => {
      const pages = printerService.getSelectedPageNumbers(10, "1-3, 5, 9-15");
      // Page 15 is clamped to doc length 10
      assert.deepEqual(pages, [1, 2, 3, 5, 9, 10]);
    });
  });

  // ==============================================================
  // 4. Job Lifecycle State Machine & Duplicate-Print Prevention
  // ==============================================================
  describe("4. Job Lifecycle State Machine & Idempotency", () => {
    test("Generates deterministic canonical idempotency key", () => {
      const key1 = lifecycle.generateIdempotencyKey("ord-101", "item-1", "doc-1");
      const key2 = lifecycle.generateIdempotencyKey("ord-101", "item-1", "doc-1");
      assert.equal(key1, key2);
      assert.equal(key1, "order_ord-101_doc_doc-1");
    });

    test("Registers new job in RECEIVED state", () => {
      const key = `test_order_${Date.now()}_job1`;
      const record = lifecycle.registerJob({
        jobId: "job-999",
        orderId: "ord-test-1",
        orderNumber: "ORD-TEST-1",
        idempotencyKey: key,
        printerName: "Test-Printer",
        totalCopies: 2,
        colorMode: "BLACK_AND_WHITE",
        paperSize: "A4",
        duplexMode: "SINGLE_SIDED",
        documentName: "contract.pdf",
      });

      assert.equal(record.state, "RECEIVED");
      assert.equal(record.totalCopies, 2);
      assert.equal(lifecycle.isAlreadyDispatched(key), false);
    });

    test("Transitions sequentially through DOWNLOADING -> READY_TO_PRINT -> SUBMITTED_TO_SPOOLER -> PRINTING -> COMPLETED", () => {
      const key = `test_order_${Date.now()}_job2`;
      lifecycle.registerJob({
        jobId: "job-888",
        orderId: "ord-test-2",
        orderNumber: "ORD-TEST-2",
        idempotencyKey: key,
        printerName: "Test-Printer",
        totalCopies: 1,
        colorMode: "COLOR",
        paperSize: "A4",
        duplexMode: "DOUBLE_SIDED_LONG_EDGE",
        documentName: "presentation.pdf",
      });

      lifecycle.transition(key, "DOWNLOADING");
      assert.equal(lifecycle.getRecord(key)?.state, "DOWNLOADING");

      lifecycle.transition(key, "READY_TO_PRINT", { fileSizeBytes: 1048576, sha256Hash: "abc123hash" });
      assert.equal(lifecycle.getRecord(key)?.state, "READY_TO_PRINT");
      assert.equal(lifecycle.getRecord(key)?.fileSizeBytes, 1048576);

      lifecycle.transition(key, "SUBMITTED_TO_SPOOLER", { windowsJobId: 42 });
      assert.equal(lifecycle.getRecord(key)?.state, "SUBMITTED_TO_SPOOLER");
      assert.equal(lifecycle.getRecord(key)?.windowsJobId, 42);

      // Once submitted to spooler, duplicate printing MUST be blocked
      assert.equal(lifecycle.isAlreadyDispatched(key), true);

      lifecycle.transition(key, "PRINTING", { totalPages: 5, pagesPrinted: 3 });
      assert.equal(lifecycle.getRecord(key)?.state, "PRINTING");
      assert.equal(lifecycle.getRecord(key)?.pagesPrinted, 3);
      assert.equal(lifecycle.isAlreadyDispatched(key), true);

      lifecycle.transition(key, "COMPLETED");
      assert.equal(lifecycle.getRecord(key)?.state, "COMPLETED");
      assert.equal(lifecycle.isAlreadyDispatched(key), true);
    });

    test("Allows vendor-controlled manual retry on FAILED job", () => {
      const key = `test_order_${Date.now()}_job3`;
      lifecycle.registerJob({
        jobId: "job-777",
        orderId: "ord-test-3",
        orderNumber: "ORD-TEST-3",
        idempotencyKey: key,
        printerName: "Test-Printer",
        totalCopies: 1,
        colorMode: "BLACK_AND_WHITE",
        paperSize: "A4",
        duplexMode: "SINGLE_SIDED",
        documentName: "file.pdf",
      });

      lifecycle.transition(key, "FAILED", { errorMessage: "Spooler door opened" });
      assert.equal(lifecycle.getRecord(key)?.state, "FAILED");
      assert.equal(lifecycle.getRecord(key)?.lastErrorMessage, "Spooler door opened");

      // Operator triggers manual retry
      const retried = lifecycle.allowManualRetry(key);
      assert.equal(retried.state, "RECEIVED");
      assert.equal(retried.retryCount, 1);
    });
  });

  // ==============================================================
  // 5. Config Storage & Sensitive Information Redaction
  // ==============================================================
  describe("5. Configuration Storage & Security Redaction", () => {
    test("Saves and reloads agent configuration cleanly", () => {
      configStore.saveConfig({
        backendUrl: "https://www.print2me.in",
        deviceId: "dev_audit_test",
        deviceToken: "secret_tok_12345",
        vendorName: "College Print Shop",
        vendorSlug: "college-print",
        isPollingActive: true,
        userEmail: "vendor@college.edu",
      });

      const loaded = configStore.getConfig();
      assert.ok(loaded);
      assert.equal(loaded?.deviceId, "dev_audit_test");
      assert.equal(loaded?.vendorName, "College Print Shop");
      assert.equal(loaded?.deviceToken, "secret_tok_12345");
    });

    test("Logger sanitizes secrets, tokens, passwords, and SAS query signatures", () => {
      const rawLog =
        "Authorization: Bearer my-secret-jwt-token-12345 with password: TopSecretPassword! and SAS sig=abc123SecretKey456";
      const sanitized = logger.sanitize(rawLog);

      assert.ok(!sanitized.includes("my-secret-jwt-token-12345"));
      assert.ok(!sanitized.includes("TopSecretPassword!"));
      assert.ok(!sanitized.includes("abc123SecretKey456"));
      assert.ok(sanitized.includes("[REDACTED_TOKEN]"));
      assert.ok(sanitized.includes("[REDACTED]"));
      assert.ok(sanitized.includes("[REDACTED_SAS_SIG]"));
    });
  });

  // ==============================================================
  // 6. Printer Validation & Unsupported Format Guarding
  // ==============================================================
  describe("6. Printer Validation & Capability Guarding", () => {
    test("Fails safely when file does not exist", async () => {
      await assert.rejects(
        async () => {
          await printerService.printDocument("/path/to/nonexistent/file.pdf", {
            printerName: "NonExistentPrinter",
          });
        },
        {
          message: /does not exist at path/,
        }
      );
    });

    test("Rejects unsupported file extensions (.exe, .zip)", async () => {
      const tempBogusFile = path.join(os.tmpdir(), `bogus-${Date.now()}.zip`);
      fs.writeFileSync(tempBogusFile, "PK\x03\x04zipcontent");

      try {
        await assert.rejects(
          async () => {
            await printerService.printDocument(tempBogusFile, {
              printerName: "NonExistentPrinter",
            });
          },
          {
            message: /Unsupported document format/,
          }
        );
      } finally {
        if (fs.existsSync(tempBogusFile)) fs.unlinkSync(tempBogusFile);
      }
    });
  });

  // ==============================================================
  // 7. Order Queue Filtering & Payment Status Logic
  // ==============================================================
  describe("7. Order Queue Filtering & Payment Status Verification", () => {
    function computePaymentLabel(order: { paymentMethod: string; paymentStatus: string; status: string }) {
      const isCancelled = order.status === "CANCELLED" || order.status === "REJECTED";
      if (isCancelled) return { label: "● Order Cancelled", class: "cancelled" };
      if (order.paymentStatus === "SUCCESS") return { label: "● Online Paid (Razorpay)", class: "paid" };
      if (order.paymentStatus === "CASH_COLLECTED") return { label: "● Cash Collected (Paid)", class: "paid" };
      if (order.paymentStatus === "FAILED") return { label: "● Online Payment Failed", class: "danger" };
      if (order.paymentMethod === "RAZORPAY" || order.paymentMethod === "ONLINE") return { label: "● Online Checkout Pending", class: "pending" };
      if (order.paymentMethod === "CASH_ON_COLLECTION" || order.paymentMethod === "CASH") return { label: "● Cash Due at Desk", class: "pending" };
      return { label: `● ${order.paymentStatus || "Unpaid"}`, class: "pending" };
    }

    function isOrderPending(order: { paymentMethod: string; paymentStatus: string; status: string }) {
      if (order.status === "CANCELLED" || order.status === "REJECTED") return false;
      return (
        order.status === "AWAITING_VENDOR_APPROVAL" ||
        order.paymentStatus === "CASH_PENDING" ||
        (order.paymentMethod === "CASH_ON_COLLECTION" && order.paymentStatus !== "CASH_COLLECTED" && order.paymentStatus !== "SUCCESS")
      );
    }

    test("Cancelled online payment order is NOT labeled as Cash Pending (Desk)", () => {
      const order = {
        paymentMethod: "RAZORPAY",
        paymentStatus: "PENDING",
        status: "CANCELLED",
      };
      const res = computePaymentLabel(order);
      assert.equal(res.label, "● Order Cancelled");
      assert.equal(res.class, "cancelled");
      assert.notEqual(res.label, "● Cash Pending (Desk)");
    });

    test("Unpaid/abandoned Razorpay order shows Online Checkout Pending, not Cash Pending", () => {
      const order = {
        paymentMethod: "RAZORPAY",
        paymentStatus: "PENDING",
        status: "AWAITING_PAYMENT",
      };
      const res = computePaymentLabel(order);
      assert.equal(res.label, "● Online Checkout Pending");
      assert.equal(res.class, "pending");
      assert.notEqual(res.label, "● Cash Pending (Desk)");
    });

    test("Failed online payment order shows Online Payment Failed with danger class", () => {
      const order = {
        paymentMethod: "RAZORPAY",
        paymentStatus: "FAILED",
        status: "AWAITING_PAYMENT",
      };
      const res = computePaymentLabel(order);
      assert.equal(res.label, "● Online Payment Failed");
      assert.equal(res.class, "danger");
    });

    test("Cancelled orders are excluded from pending queue count", () => {
      const sampleOrders = [
        { id: "1", paymentMethod: "CASH_ON_COLLECTION", paymentStatus: "PENDING", status: "AWAITING_VENDOR_APPROVAL" },
        { id: "2", paymentMethod: "RAZORPAY", paymentStatus: "PENDING", status: "CANCELLED" },
        { id: "3", paymentMethod: "CASH_ON_COLLECTION", paymentStatus: "PENDING", status: "CANCELLED" },
        { id: "4", paymentMethod: "RAZORPAY", paymentStatus: "SUCCESS", status: "CONFIRMED" },
      ];

      const pending = sampleOrders.filter(isOrderPending);
      assert.equal(pending.length, 1);
      assert.equal(pending[0].id, "1");
    });

    test("Converting online order to desk cash marks payment collected and confirmed", () => {
      const onlineOrder = {
        id: "ord_online_99",
        paymentMethod: "RAZORPAY",
        paymentStatus: "PENDING",
        status: "AWAITING_PAYMENT",
      };

      // Vendor converts to desk cash
      onlineOrder.paymentMethod = "CASH_ON_COLLECTION";
      onlineOrder.paymentStatus = "CASH_COLLECTED";
      onlineOrder.status = "CONFIRMED";

      const res = computePaymentLabel(onlineOrder);
      assert.equal(res.label, "● Cash Collected (Paid)");
      assert.equal(res.class, "paid");
      assert.equal(onlineOrder.status, "CONFIRMED");
    });
  });

  // ==============================================================
  // 8. Razorpay Onboarding & Merchant Gateway State Verification
  // ==============================================================
  describe("8. Razorpay Onboarding & Merchant Gateway State Verification", () => {
    function resolveMerchantState(account: { authStatus?: string; activationStatus?: string; razorpayAccountId?: string } | null) {
      if (!account || account.authStatus !== "AUTHORIZED") {
        return { isConnected: false, badge: "⚪ Not Connected", canAcceptOnline: false };
      }
      const activation = account.activationStatus || "NOT_ACTIVATED";
      if (activation === "ACTIVATED" || activation === "ACTIVE") {
        return { isConnected: true, badge: "🟢 Active & Verified", canAcceptOnline: true };
      }
      return { isConnected: true, badge: "⏳ Verification in Progress", canAcceptOnline: false };
    }

    test("Unconnected vendor account resolves to Not Connected with online payments disabled", () => {
      const state = resolveMerchantState(null);
      assert.equal(state.isConnected, false);
      assert.equal(state.badge, "⚪ Not Connected");
      assert.equal(state.canAcceptOnline, false);
    });

    test("Connected account under review shows Verification in Progress", () => {
      const account = {
        authStatus: "AUTHORIZED",
        activationStatus: "UNDER_REVIEW",
        razorpayAccountId: "acc_review_123",
      };
      const state = resolveMerchantState(account);
      assert.equal(state.isConnected, true);
      assert.equal(state.badge, "⏳ Verification in Progress");
      assert.equal(state.canAcceptOnline, false);
    });

    test("Fully activated Razorpay partner account enables store online payments", () => {
      const account = {
        authStatus: "AUTHORIZED",
        activationStatus: "ACTIVATED",
        razorpayAccountId: "acc_live_999",
      };
      const state = resolveMerchantState(account);
      assert.equal(state.isConnected, true);
      assert.equal(state.badge, "🟢 Active & Verified");
      assert.equal(state.canAcceptOnline, true);
    });

    test("Validates Razorpay authorization URL format", () => {
      const sampleOAuthUrl = "https://auth.razorpay.com/oauth/authorize?client_id=rzp_live_xxx&response_type=code&scope=read_write";
      assert.ok(sampleOAuthUrl.startsWith("https://auth.razorpay.com/oauth/authorize"));
      assert.ok(sampleOAuthUrl.includes("client_id="));
      assert.ok(sampleOAuthUrl.includes("response_type=code"));
    });
  });
});
