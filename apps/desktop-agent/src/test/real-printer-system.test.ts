import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { TempFileManager } from '../main/temp-file-manager';
import { JobLifecycleManager } from '../main/job-lifecycle';
import { WindowsPrinterService } from '../main/printer-service';

describe('Real Printer System - Unit Tests', () => {
  describe('1. File Type Detection & Magic Bytes Security', () => {
    const tempMgr = new TempFileManager();

    test('Identifies valid PDF from %PDF header', () => {
      const pdfBuffer = Buffer.from('%PDF-1.7\nSample content');
      const mime = tempMgr.detectMimeFromMagicBytes(pdfBuffer);
      assert.equal(mime, 'application/pdf');
    });

    test('Identifies valid PNG from magic header', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const mime = tempMgr.detectMimeFromMagicBytes(pngBuffer);
      assert.equal(mime, 'image/png');
    });

    test('Identifies valid JPEG from magic header', () => {
      const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const mime = tempMgr.detectMimeFromMagicBytes(jpgBuffer);
      assert.equal(mime, 'image/jpeg');
    });

    test('Rejects executable or script files masquerading as PDF', async () => {
      const fakePdfBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00Windows Executable Content');
      await assert.rejects(
        async () => {
          await tempMgr.writeAndValidateBuffer(fakePdfBuffer, 'malicious.pdf');
        },
        {
          message: /Security rejection: Document file format is unrecognized or unsupported/,
        }
      );
    });

    test('Rejects zero-byte empty documents', async () => {
      const emptyBuffer = Buffer.alloc(0);
      await assert.rejects(
        async () => {
          await tempMgr.writeAndValidateBuffer(emptyBuffer, 'empty.pdf');
        },
        {
          message: /payload is empty \(0 bytes\)/,
        }
      );
    });

    test('Prevents directory traversal in filename generation', () => {
      const safePath = tempMgr.generateSecureTempPath('../../etc/passwd.pdf');
      assert.ok(!safePath.includes('../../'));
      assert.ok(path.isAbsolute(safePath));
    });

    test('Cleans up written temporary file safely', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>%%EOF');
      const validated = await tempMgr.writeAndValidateBuffer(validPdfBuffer, 'test.pdf');
      assert.ok(fs.existsSync(validated.filePath));

      tempMgr.cleanupFile(validated.filePath);
      assert.ok(!fs.existsSync(validated.filePath));
    });
  });

  describe('2. Page Range Parsing', () => {
    const service = new WindowsPrinterService();

    test('Parses "ALL" or undefined as undefined (all pages)', () => {
      assert.equal(service.parsePageRange('ALL'), undefined);
      assert.equal(service.parsePageRange('all'), undefined);
      assert.equal(service.parsePageRange(''), undefined);
      assert.equal(service.parsePageRange(undefined), undefined);
    });

    test('Parses contiguous range "1-3" to 0-indexed [{from: 0, to: 2}]', () => {
      const parsed = service.parsePageRange('1-3');
      assert.deepEqual(parsed, [{ from: 0, to: 2 }]);
    });

    test('Parses mixed ranges and single pages "1-3, 5, 8-10"', () => {
      const parsed = service.parsePageRange('1-3, 5, 8-10');
      assert.deepEqual(parsed, [
        { from: 0, to: 2 },
        { from: 4, to: 4 },
        { from: 7, to: 9 },
      ]);
    });

    test('Ignores negative or zero page numbers gracefully', () => {
      const parsed = service.parsePageRange('0, -2, 4');
      assert.deepEqual(parsed, [{ from: 3, to: 3 }]);
    });
  });

  describe('3. Job Lifecycle State Machine & Idempotency', () => {
    const lifecycle = new JobLifecycleManager();

    test('Generates deterministic canonical idempotency key', () => {
      const key1 = lifecycle.generateIdempotencyKey('ord-101', 'job-55', 'doc-1');
      const key2 = lifecycle.generateIdempotencyKey('ord-101', 'job-55', 'doc-1');
      assert.equal(key1, key2);
      assert.equal(key1, 'ord-101_job-55_doc-1');
    });

    test('Registers new job in RECEIVED state', () => {
      const key = `test_order_${Date.now()}_job1`;
      const record = lifecycle.registerJob({
        jobId: 'job-999',
        orderId: 'ord-test-1',
        orderNumber: 'ORD-TEST-1',
        idempotencyKey: key,
        printerName: 'Test-Printer',
        totalCopies: 2,
        colorMode: 'BLACK_AND_WHITE',
        paperSize: 'A4',
        duplexMode: 'SINGLE_SIDED',
        documentName: 'contract.pdf',
      });

      assert.equal(record.state, 'RECEIVED');
      assert.equal(record.totalCopies, 2);
      assert.equal(lifecycle.isAlreadyDispatched(key), false);
    });

    test('Transitions sequentially through DOWNLOADING -> READY_TO_PRINT -> SUBMITTED_TO_SPOOLER', () => {
      const key = `test_order_${Date.now()}_job2`;
      lifecycle.registerJob({
        jobId: 'job-888',
        orderId: 'ord-test-2',
        orderNumber: 'ORD-TEST-2',
        idempotencyKey: key,
        printerName: 'Test-Printer',
        totalCopies: 1,
        colorMode: 'COLOR',
        paperSize: 'A4',
        duplexMode: 'DOUBLE_SIDED_LONG_EDGE',
        documentName: 'presentation.pdf',
      });

      lifecycle.transition(key, 'DOWNLOADING');
      assert.equal(lifecycle.getRecord(key)?.state, 'DOWNLOADING');

      lifecycle.transition(key, 'READY_TO_PRINT', { fileSizeBytes: 1048576, sha256Hash: 'abc123hash' });
      assert.equal(lifecycle.getRecord(key)?.state, 'READY_TO_PRINT');
      assert.equal(lifecycle.getRecord(key)?.fileSizeBytes, 1048576);

      lifecycle.transition(key, 'SUBMITTED_TO_SPOOLER', { windowsJobId: 42 });
      assert.equal(lifecycle.getRecord(key)?.state, 'SUBMITTED_TO_SPOOLER');
      assert.equal(lifecycle.getRecord(key)?.windowsJobId, 42);

      // Guard test: Once spooled or completed, isAlreadyDispatched must return true
      assert.equal(lifecycle.isAlreadyDispatched(key), true);

      lifecycle.transition(key, 'COMPLETED');
      assert.equal(lifecycle.getRecord(key)?.state, 'COMPLETED');
      assert.equal(lifecycle.isAlreadyDispatched(key), true);
    });

    test('Allows vendor-controlled manual retry on FAILED job', () => {
      const key = `test_order_${Date.now()}_job3`;
      lifecycle.registerJob({
        jobId: 'job-777',
        orderId: 'ord-test-3',
        orderNumber: 'ORD-TEST-3',
        idempotencyKey: key,
        printerName: 'Test-Printer',
        totalCopies: 1,
        colorMode: 'BLACK_AND_WHITE',
        paperSize: 'A4',
        duplexMode: 'SINGLE_SIDED',
        documentName: 'file.pdf',
      });

      lifecycle.transition(key, 'FAILED', { errorMessage: 'Spooler door opened' });
      assert.equal(lifecycle.getRecord(key)?.state, 'FAILED');
      assert.equal(lifecycle.getRecord(key)?.lastErrorMessage, 'Spooler door opened');

      // Operator triggers manual retry
      const retried = lifecycle.allowManualRetry(key);
      assert.equal(retried.state, 'RECEIVED');
      assert.equal(retried.retryCount, 1);
    });
  });

  describe('4. Printer Validation & Capability Guarding', () => {
    const service = new WindowsPrinterService();

    test('Fails safely when file does not exist', async () => {
      await assert.rejects(
        async () => {
          await service.printDocument('/path/to/nonexistent/file.pdf', {
            printerName: 'NonExistentPrinter',
          });
        },
        {
          message: /does not exist at path/,
        }
      );
    });

    test('Rejects unsupported file extensions (.exe, .zip)', async () => {
      const tempBogusFile = path.join(require('os').tmpdir(), `bogus-${Date.now()}.zip`);
      fs.writeFileSync(tempBogusFile, 'PK\x03\x04zipcontent');

      try {
        await assert.rejects(
          async () => {
            await service.printDocument(tempBogusFile, {
              printerName: 'NonExistentPrinter',
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
});
