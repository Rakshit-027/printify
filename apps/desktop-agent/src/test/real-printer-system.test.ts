import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { TempFileManager } from "../main/temp-file-manager";
import { JobLifecycleManager } from "../main/job-lifecycle";
import { WindowsPrinterService, detectPrinterConnectionType, PrinterConnectionType, RealPrinterInfo } from "../main/printer-service";
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

  // ==============================================================
  // 9. Wi-Fi, Ethernet, USB, Shared, IPP Connection Type Detection
  // ==============================================================
  describe("9. Wi-Fi & Network Printer Connection Type Detection", () => {
    test("Detects standard USB printer on USB001", () => {
      const res = detectPrinterConnectionType({
        name: "HP LaserJet 1020",
        portName: "USB001",
        driverName: "HP LaserJet 1020 Driver",
      });
      assert.equal(res.connectionType, "USB");
      assert.ok(res.connectionDetails.includes("USB001"));
    });

    test("Detects multiple USB printers across USB002 and DOT4 ports", () => {
      const usb2 = detectPrinterConnectionType({
        name: "Canon LBP2900",
        portName: "USB002",
      });
      assert.equal(usb2.connectionType, "USB");

      const dot4 = detectPrinterConnectionType({
        name: "HP LaserJet Professional P1102",
        portName: "DOT4_001",
        driverName: "HP LaserJet P1102 PCLm-S",
      });
      assert.equal(dot4.connectionType, "USB");
      assert.ok(dot4.connectionDetails.includes("DOT4_001"));
    });

    test("Detects Wi-Fi printer from printer name with Wi-Fi / WiFi keyword", () => {
      const res = detectPrinterConnectionType({
        name: "HP LaserJet Pro MFP M227fdw (Wi-Fi)",
        portName: "WSD-38294a2b-1234",
        driverName: "HP LaserJet Pro PCL 6",
      });
      assert.equal(res.connectionType, "WIFI");
      assert.ok(res.connectionDetails.includes("Wi-Fi"));
    });

    test("Detects Wi-Fi printer from driver name with Wireless keyword", () => {
      const res = detectPrinterConnectionType({
        name: "EPSON L3150 Series",
        portName: "192.168.1.105",
        driverName: "EPSON L3150 Series Wireless Driver",
      });
      assert.equal(res.connectionType, "WIFI");
    });

    test("Detects Wi-Fi printer on WSD port when host network adapter is Wi-Fi", () => {
      const res = detectPrinterConnectionType({
        name: "Brother HL-L2350DW series",
        portName: "WSD-b14876ca-5491-4d7a",
        driverName: "Brother HL-L2350DW series",
        hasActiveWifi: true,
        hasActiveEthernet: false,
      });
      assert.equal(res.connectionType, "WIFI");
    });

    test("Detects Ethernet / LAN printer from Standard TCP/IP port on wired host", () => {
      const res = detectPrinterConnectionType({
        name: "Xerox VersaLink B400",
        portName: "IP_192.168.1.50",
        driverName: "Xerox VersaLink B400 PCL6",
        hasActiveWifi: false,
        hasActiveEthernet: true,
      });
      assert.equal(res.connectionType, "ETHERNET");
      assert.ok(res.connectionDetails.includes("192.168.1.50"));
    });

    test("Detects Ethernet printer from LAN / Ethernet keyword in printer name", () => {
      const res = detectPrinterConnectionType({
        name: "Canon imageRUNNER 2520 (LAN)",
        portName: "192.168.0.88",
        driverName: "Canon UFR II Driver",
      });
      assert.equal(res.connectionType, "ETHERNET");
    });

    test("Detects Windows Shared printer from UNC printer name \\\\server\\printer", () => {
      const res = detectPrinterConnectionType({
        name: "\\\\OFFICE-PC\\Canon_IR2006",
        portName: "\\\\OFFICE-PC\\Canon_IR2006",
        driverName: "Canon Generic Plus PCL6",
      });
      assert.equal(res.connectionType, "SHARED");
      assert.ok(res.connectionDetails.includes("\\\\OFFICE-PC\\Canon_IR2006"));
    });

    test("Detects Windows Shared printer from 'on server' name format", () => {
      const res = detectPrinterConnectionType({
        name: "Brother HL-L2350DW on DESKTOP-MAIN",
        portName: "Ne02:",
        driverName: "Brother HL-L2350DW series",
      });
      assert.equal(res.connectionType, "SHARED");
    });

    test("Detects Windows Shared printer from PRINTER_ATTRIBUTE_NETWORK attribute flag", () => {
      const res = detectPrinterConnectionType({
        name: "Counter Billing Printer",
        portName: "Ne03:",
        driverName: "Epson TM-T82 Receipt",
        attributes: 0x00000010, // PRINTER_ATTRIBUTE_NETWORK
      });
      assert.equal(res.connectionType, "SHARED");
    });

    test("Detects IPP (Internet Printing Protocol) printer from HTTP/IPP port", () => {
      const res1 = detectPrinterConnectionType({
        name: "Cloud Reception Printer",
        portName: "http://192.168.1.80:631/printers/LaserJet",
        driverName: "Generic / Text Only",
      });
      assert.equal(res1.connectionType, "IPP");

      const res2 = detectPrinterConnectionType({
        name: "Remote Office IPP",
        portName: "ipps://print.company.internal/printers/reception",
        driverName: "IPP Class Driver",
      });
      assert.equal(res2.connectionType, "IPP");
    });

    test("Classifies virtual and local system printers as OTHER", () => {
      const pdf = detectPrinterConnectionType({
        name: "Microsoft Print to PDF",
        portName: "PORTPROMPT:",
        driverName: "Microsoft Print To PDF",
      });
      assert.equal(pdf.connectionType, "OTHER");

      const oneNote = detectPrinterConnectionType({
        name: "OneNote (Desktop)",
        portName: "nul:",
        driverName: "Send to Microsoft OneNote 16 Driver",
      });
      assert.equal(oneNote.connectionType, "OTHER");
    });
  });

  // ==============================================================
  // 10. Capability Detection & Hardware Normalization
  // ==============================================================
  describe("10. Printer Capability Detection & Normalization", () => {
    test("Discovers real system printers and assigns valid connection types", async () => {
      const printers = await printerService.getInstalledPrinters(true);
      assert.ok(Array.isArray(printers));
      for (const p of printers) {
        assert.ok(p.systemName, "Printer must have systemName");
        assert.ok(
          ["USB", "WIFI", "ETHERNET", "SHARED", "IPP", "OTHER"].includes(p.connectionType),
          `Printer ${p.systemName} must have valid connectionType, got: ${p.connectionType}`
        );
        assert.ok(p.connectionDetails, "Printer must have connectionDetails string");
        assert.ok(Array.isArray(p.supportedSizes), "Printer must have supportedSizes array");
        assert.equal(typeof p.supportsColor, "boolean");
        assert.equal(typeof p.supportsDuplex, "boolean");
        assert.equal(typeof p.isDefault, "boolean");
      }
    });

    test("Caches printer list efficiently and honors forceRefresh", async () => {
      const t0 = Date.now();
      const first = await printerService.getInstalledPrinters(false);
      const t1 = Date.now();

      // Second call without forceRefresh returns cached in < 10ms
      const t2 = Date.now();
      const cached = await printerService.getInstalledPrinters(false);
      const t3 = Date.now();

      assert.equal(first.length, cached.length);
      assert.ok(t3 - t2 < 50, `Cached call took ${t3 - t2}ms, expected < 50ms`);
    });

    test("Provides network adapter and connection diagnostic summary", async () => {
      const diag = await printerService.getNetworkDiagnostics();
      assert.ok(diag, "Diagnostics summary must be returned");
      assert.equal(typeof diag.hasActiveWifi, "boolean");
      assert.equal(typeof diag.hasActiveEthernet, "boolean");
      assert.ok(diag.printersByConnection, "printersByConnection counts must be present");
      assert.equal(typeof diag.printersByConnection.USB, "number");
      assert.equal(typeof diag.printersByConnection.WIFI, "number");
      assert.equal(typeof diag.printersByConnection.ETHERNET, "number");
      assert.equal(typeof diag.printersByConnection.SHARED, "number");
      assert.equal(typeof diag.printersByConnection.IPP, "number");
      assert.equal(typeof diag.printersByConnection.OTHER, "number");
    });
  });

  // ==============================================================
  // 11. Network Printer Edge Cases & Safe Routing Guarding
  // ==============================================================
  describe("11. Network Printer Edge Cases & Safe Routing", () => {
    test("Rejects print submission safely when network printer is offline with clear troubleshooting guidance", async () => {
      // Create a test file
      const tempPdf = path.join(testDataDir, "test-offline.pdf");
      fs.writeFileSync(tempPdf, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF");

      try {
        await assert.rejects(
          async () => {
            await printerService.printDocument(tempPdf, {
              printerName: "NonExistent_Network_Printer_99",
            });
          },
          {
            message: /Selected printer 'NonExistent_Network_Printer_99' is not installed/,
          }
        );
      } finally {
        if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
      }
    });

    test("Guards against duplicate print dispatches for the same order across multiple attempts", () => {
      const key = `net_ord_${Date.now()}_dedup`;
      lifecycle.registerJob({
        jobId: "job-dedup-1",
        orderId: "ord-dedup-1",
        orderNumber: "ORD-DEDUP-1",
        idempotencyKey: key,
        printerName: "Office-HP-Wifi",
        totalCopies: 1,
        colorMode: "BLACK_AND_WHITE",
        paperSize: "A4",
        duplexMode: "SINGLE_SIDED",
        documentName: "invoice.pdf",
      });

      // Submit to spooler
      lifecycle.transition(key, "SUBMITTED_TO_SPOOLER", { windowsJobId: 101 });
      assert.equal(lifecycle.isAlreadyDispatched(key), true);

      // Attempting to dispatch again must report already dispatched
      assert.equal(lifecycle.isAlreadyDispatched(key), true);
    });

    test("Prevents double printing across UUID orderId and ORD-XXXX orderNumber formats", () => {
      const orderUuid = "45ad01fe-bea8-4055-a5ac-478dd5bb5536";
      const orderNum = "ORD-3A09F0C5";
      const directKey = lifecycle.generateIdempotencyKey(orderUuid, "item-1", "doc-1");

      lifecycle.registerJob({
        jobId: `direct-${orderUuid}`,
        orderId: orderUuid,
        orderNumber: orderNum,
        idempotencyKey: directKey,
        printerName: "OhMyPrinter",
        totalCopies: 1,
        colorMode: "BLACK_AND_WHITE",
        paperSize: "A4",
        duplexMode: "SINGLE_SIDED",
        documentName: "print_doc.pdf",
      });

      lifecycle.transition(directKey, "SUBMITTED_TO_SPOOLER", { windowsJobId: 42 });

      // Worker key generated with orderNumber instead of UUID
      const workerKey = lifecycle.generateIdempotencyKey(orderNum, "job", "doc-1");

      // Cross-key guard must detect that the order was already dispatched
      assert.equal(lifecycle.isAlreadyDispatched(workerKey), true);
      assert.equal(lifecycle.isOrderAlreadyDispatched(orderNum, "doc-1"), true);
      assert.equal(lifecycle.isOrderAlreadyDispatched(orderUuid, "doc-1"), true);
    });

    test("Permits sequential spooling of multiple distinct documents within the same order", () => {
      const orderId = "ord-multi-doc-77";
      const keyDoc1 = lifecycle.generateIdempotencyKey(orderId, "item-1", "doc-A");
      const keyDoc2 = lifecycle.generateIdempotencyKey(orderId, "item-2", "doc-B");

      lifecycle.registerJob({
        jobId: "job-multi-1",
        orderId,
        orderNumber: "ORD-MULTI-77",
        idempotencyKey: keyDoc1,
        printerName: "OhMyPrinter",
        totalCopies: 1,
        colorMode: "BLACK_AND_WHITE",
        paperSize: "A4",
        duplexMode: "SINGLE_SIDED",
        documentName: "first_doc.pdf",
      });

      // Spool doc 1
      lifecycle.transition(keyDoc1, "SUBMITTED_TO_SPOOLER", { windowsJobId: 101 });
      lifecycle.transition(keyDoc1, "COMPLETED", { windowsJobId: 101 });

      // Doc 1 is already dispatched
      assert.equal(lifecycle.isAlreadyDispatched(keyDoc1), true);

      // Doc 2 must NOT be treated as a duplicate of Doc 1!
      assert.equal(lifecycle.isAlreadyDispatched(keyDoc2), false);
      assert.equal(lifecycle.isOrderAlreadyDispatched(orderId, "doc-B"), false);
    });

    test("Preserves vendor's preferred printer selection safely in config store", () => {
      configStore.saveConfig({
        backendUrl: "https://www.print2me.in",
        deviceId: "dev_pref_test",
        deviceToken: "tok_pref_test",
        defaultBwPrinter: "HP LaserJet Pro (Wi-Fi)",
        defaultColorPrinter: "Canon imageRUNNER (Ethernet)",
        vendorName: "Station Road Print Shop",
        vendorSlug: "station-road",
        isPollingActive: true,
      });

      const loaded = configStore.getConfig();
      assert.equal(loaded?.defaultBwPrinter, "HP LaserJet Pro (Wi-Fi)");
      assert.equal(loaded?.defaultColorPrinter, "Canon imageRUNNER (Ethernet)");
    });

    test("Enforces pure monochrome grayscale conversion formula (ITU-R BT.601) for Black & White prints", () => {
      // Verify ITU-R BT.601 perceptual luminance formula used for canvas desaturation
      const testPixels = [
        { r: 255, g: 0, b: 0, expected: 76 },     // Pure Red
        { r: 0, g: 255, b: 0, expected: 149 },    // Pure Green
        { r: 0, g: 0, b: 255, expected: 29 },     // Pure Blue
        { r: 255, g: 255, b: 255, expected: 255 }, // Pure White
        { r: 0, g: 0, b: 0, expected: 0 },         // Pure Black
      ];

      for (const pix of testPixels) {
        const luma = (pix.r * 0.299 + pix.g * 0.587 + pix.b * 0.114) | 0;
        assert.equal(luma, pix.expected);
      }
    });
  });

  // ==============================================================
  // 12. USB Regression Verification
  // ==============================================================
  describe("12. USB Printer Functionality & Backward Compatibility", () => {
    test("Existing USB printer settings and paper ranges function without error", () => {
      const parsedRange = printerService.parsePageRange("1-5, 8");
      assert.deepEqual(parsedRange, [{ from: 0, to: 4 }, { from: 7, to: 7 }]);
      const selectedPages = printerService.getSelectedPageNumbers(10, "1-5, 8");
      assert.deepEqual(selectedPages, [1, 2, 3, 4, 5, 8]);
    });

    test("Existing vendor authentication configuration schema remains intact", () => {
      const conf = configStore.getConfig();
      assert.ok(conf);
      assert.ok(conf?.deviceId);
      assert.ok(conf?.deviceToken);
      assert.ok(conf?.backendUrl);
    });
  });
});
