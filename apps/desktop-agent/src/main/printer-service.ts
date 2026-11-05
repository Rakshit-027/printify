import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';

const execAsync = util.promisify(exec);

export type PrinterOnlineStatus =
  | 'READY'
  | 'PRINTING'
  | 'OFFLINE'
  | 'PAUSED'
  | 'PAPER_JAM'
  | 'OUT_OF_PAPER'
  | 'ERROR'
  | 'UNKNOWN';

export interface RealPrinterInfo {
  systemName: string;
  displayName: string;
  driverName?: string;
  portName?: string;
  isDefault: boolean;
  status: PrinterOnlineStatus;
  statusCode?: number;
  statusDetails?: string;
  isOnline: boolean;
  isReachable: boolean;
  isPaused: boolean;
  hasError: boolean;
  supportsColor: boolean;
  supportsDuplex: boolean;
  supportedSizes: string[];
}

export interface PrintDocumentOptions {
  printerName: string;
  copies?: number;
  colorMode?: 'COLOR' | 'BLACK_AND_WHITE';
  duplexMode?: 'SINGLE_SIDED' | 'DOUBLE_SIDED_LONG_EDGE' | 'DOUBLE_SIDED_SHORT_EDGE';
  paperSize?: 'A4' | 'A3' | 'LETTER' | 'LEGAL' | string;
  pageRange?: string; // e.g. "ALL" or "1-3, 5"
  landscape?: boolean;
}

export interface SpoolerJobInfo {
  jobId: number;
  printerName: string;
  documentName: string;
  jobStatus: string;
  totalPages: number;
  pagesPrinted: number;
  timeSubmitted: string;
}

export interface PrintResult {
  success: boolean;
  message: string;
  windowsJobId?: number;
  printerName: string;
  spoolStatus?: string;
}

export class WindowsPrinterService {
  /**
   * Helper to parse human-readable page ranges (e.g., "1-3, 5, 8-10") into 0-indexed Chromium pageRanges
   */
  public parsePageRange(rangeStr?: string): { from: number; to: number }[] | undefined {
    if (!rangeStr || rangeStr.trim().toUpperCase() === 'ALL') {
      return undefined;
    }

    const segments = rangeStr.split(',').map((s) => s.trim()).filter(Boolean);
    const ranges: { from: number; to: number }[] = [];

    for (const segment of segments) {
      if (segment.includes('-')) {
        const [startStr, endStr] = segment.split('-').map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
          ranges.push({ from: start - 1, to: end - 1 });
        }
      } else {
        const page = parseInt(segment, 10);
        if (!isNaN(page) && page > 0) {
          ranges.push({ from: page - 1, to: page - 1 });
        }
      }
    }

    return ranges.length > 0 ? ranges : undefined;
  }

  /**
   * Discovers actual printers installed and registered in Windows using CIM and native APIs
   * NO MOCK PRINTERS, NO SIMULATED PRINTERS.
   */
  async getInstalledPrinters(): Promise<RealPrinterInfo[]> {
    if (os.platform() !== 'win32') {
      // Non-Windows environment (e.g. Linux development machine)
      // Detect genuine CUPS printers without injecting any mock devices
      return this.getLinuxPrinters();
    }

    return this.getWindowsPrinters();
  }

  /**
   * Enumerate real Windows printers via PowerShell CIM Win32_Printer
   */
  private async getWindowsPrinters(): Promise<RealPrinterInfo[]> {
    try {
      // Query CIM Win32_Printer for deep driver, port, and hardware status
      const psCommand = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "
        $OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        try {
          $printers = Get-CimInstance -ClassName Win32_Printer | Select-Object Name, DeviceID, DriverName, PortName, Default, PrinterStatus, PrinterState, WorkOffline, SpoolEnabled, CapabilityDescriptions, Capabilities, HorizontalResolution, VerticalResolution
          if ($printers) {
            $printers | ConvertTo-Json -Depth 3 -Compress
          } else {
            '[]'
          }
        } catch {
          '[]'
        }
      "`;

      const { stdout } = await execAsync(psCommand, { timeout: 10000 });
      const rawText = stdout.trim();
      if (!rawText || rawText === '[]' || rawText === 'null') {
        return [];
      }

      const parsed = JSON.parse(rawText);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      const realPrinters: RealPrinterInfo[] = list
        .filter((p: any) => p && p.Name)
        .map((p: any) => {
          const name = String(p.Name).trim();
          const isDefault = Boolean(p.Default);
          const isWorkOffline = Boolean(p.WorkOffline);
          const printerState = typeof p.PrinterState === 'number' ? p.PrinterState : 0;
          const statusCode = typeof p.PrinterStatus === 'number' ? p.PrinterStatus : 2;

          // Decode status
          let status: PrinterOnlineStatus = 'READY';
          let statusDetails = 'Ready to print';
          let isPaused = false;
          let hasError = false;

          // PrinterState bitmask analysis
          if ((printerState & 0x00000001) !== 0) {
            status = 'PAUSED';
            statusDetails = 'Printer is paused in Windows spooler';
            isPaused = true;
          } else if ((printerState & 0x00000008) !== 0) {
            status = 'PAPER_JAM';
            statusDetails = 'Paper jam reported by printer hardware';
            hasError = true;
          } else if ((printerState & 0x00000010) !== 0) {
            status = 'OUT_OF_PAPER';
            statusDetails = 'Printer is out of paper. Please refill tray.';
            hasError = true;
          } else if (isWorkOffline || (printerState & 0x00000080) !== 0 || statusCode === 7) {
            status = 'OFFLINE';
            statusDetails = 'Printer is offline or disconnected';
          } else if ((printerState & 0x00000002) !== 0) {
            status = 'ERROR';
            statusDetails = 'Printer hardware error reported';
            hasError = true;
          } else if (statusCode === 4 || (printerState & 0x00000400) !== 0) {
            status = 'PRINTING';
            statusDetails = 'Printer is actively printing jobs';
          }

          const isOnline = status !== 'OFFLINE' && !isWorkOffline;
          const isReachable = isOnline && status !== 'ERROR';

          // Detect Color and Duplex capabilities from CapabilityDescriptions or Capabilities
          const capDesc = Array.isArray(p.CapabilityDescriptions)
            ? p.CapabilityDescriptions.map((c: any) => String(c).toLowerCase())
            : typeof p.CapabilityDescriptions === 'string'
            ? [p.CapabilityDescriptions.toLowerCase()]
            : [];

          const caps = Array.isArray(p.Capabilities) ? p.Capabilities : [];

          // 3 in Win32 Capabilities usually represents Color capability, 4 represents Duplex
          const supportsColor =
            capDesc.some((c: string) => c.includes('color')) ||
            caps.includes(3) ||
            name.toLowerCase().includes('color');

          const supportsDuplex =
            capDesc.some((c: string) => c.includes('duplex') || c.includes('two-sided')) ||
            caps.includes(4);

          // Supported paper sizes
          const supportedSizes: string[] = ['A4'];
          if (capDesc.some((c: string) => c.includes('a3')) || name.toLowerCase().includes('a3')) {
            supportedSizes.push('A3');
          }
          if (capDesc.some((c: string) => c.includes('letter'))) {
            supportedSizes.push('LETTER');
          }
          if (capDesc.some((c: string) => c.includes('legal'))) {
            supportedSizes.push('LEGAL');
          }

          return {
            systemName: name,
            displayName: name,
            driverName: p.DriverName ? String(p.DriverName) : undefined,
            portName: p.PortName ? String(p.PortName) : undefined,
            isDefault,
            status,
            statusCode,
            statusDetails,
            isOnline,
            isReachable,
            isPaused,
            hasError,
            supportsColor,
            supportsDuplex,
            supportedSizes: Array.from(new Set(supportedSizes)),
          };
        });

      return realPrinters;
    } catch (err) {
      console.error('[PRINTER-SERVICE] Windows printer discovery failed:', err);
      // Return empty list honestly rather than creating mock devices
      return [];
    }
  }

  /**
   * Enumerate real Linux CUPS printers (for development environment)
   * NO MOCK PRINTERS
   */
  private async getLinuxPrinters(): Promise<RealPrinterInfo[]> {
    try {
      const { stdout } = await execAsync('lpstat -p -d', { timeout: 4000 });
      if (!stdout || !stdout.includes('printer')) {
        return [];
      }

      // Parse default printer
      let defaultPrinter = '';
      const defMatch = stdout.match(/system default destination:\s*([^\s]+)/i);
      if (defMatch) {
        defaultPrinter = defMatch[1].trim();
      }

      // Parse printer lines e.g.: printer EPSON_L3150 is idle. enabled since ...
      const lines = stdout.split('\n');
      const printers: RealPrinterInfo[] = [];

      for (const line of lines) {
        const match = line.match(/^printer\s+([^\s]+)\s+(is\s+(idle|printing|disabled|paused))/i);
        if (match) {
          const name = match[1];
          const stateStr = (match[3] || '').toLowerCase();
          const isDefault = name === defaultPrinter;

          let status: PrinterOnlineStatus = 'READY';
          if (stateStr === 'printing') status = 'PRINTING';
          else if (stateStr === 'disabled' || stateStr === 'paused') status = 'PAUSED';

          printers.push({
            systemName: name,
            displayName: name.replace(/_/g, ' '),
            driverName: 'CUPS Linux Driver',
            portName: 'CUPS',
            isDefault,
            status,
            isOnline: true,
            isReachable: true,
            isPaused: status === 'PAUSED',
            hasError: false,
            supportsColor: true,
            supportsDuplex: true,
            supportedSizes: ['A4', 'A3', 'LETTER', 'LEGAL'],
          });
        }
      }

      return printers;
    } catch {
      // No CUPS or command not found - return empty
      return [];
    }
  }

  /**
   * Genuine Document Printing using Electron Chromium PDFium Engine directly into the Windows Print Spooler
   */
  async printDocument(filePath: string, options: PrintDocumentOptions): Promise<PrintResult> {
    const { printerName } = options;

    if (!fs.existsSync(filePath)) {
      throw new Error(`Print failure: Target document file does not exist at path: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const isPdf = ext === '.pdf';
    const isImage = ext === '.jpg' || ext === '.jpeg' || ext === '.png';

    if (!isPdf && !isImage) {
      throw new Error(`Unsupported document format '${ext}'. Allowed: .pdf, .jpg, .jpeg, .png`);
    }

    // Verify printer existence before submitting
    const allPrinters = await this.getInstalledPrinters();
    const targetPrinter = allPrinters.find(
      (p) => p.systemName.toLowerCase() === printerName.toLowerCase()
    );

    if (!targetPrinter) {
      throw new Error(
        `Selected printer '${printerName}' is not installed on this computer. Please refresh printer settings.`
      );
    }

    if (!targetPrinter.isOnline) {
      throw new Error(
        `Printer '${printerName}' is currently OFFLINE or disconnected. Please check physical cable and power.`
      );
    }

    if (targetPrinter.isPaused) {
      throw new Error(
        `Printer '${printerName}' is currently PAUSED in Windows. Resume printer before printing.`
      );
    }

    if (targetPrinter.hasError) {
      throw new Error(
        `Printer '${printerName}' is in an error state (${targetPrinter.statusDetails}). Please resolve printer alert.`
      );
    }

    // Prepare Electron off-screen printing window
    return new Promise<PrintResult>((resolve, reject) => {
      let printWindow: BrowserWindow | null = new BrowserWindow({
        show: false,
        width: 1024,
        height: 768,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
          plugins: true, // Enables Chromium's internal PDFium plugin
        },
      });

      const cleanupWindow = () => {
        if (printWindow && !printWindow.isDestroyed()) {
          printWindow.destroy();
          printWindow = null;
        }
      };

      const timeoutTimer = setTimeout(() => {
        cleanupWindow();
        reject(new Error(`Print submission timed out after 60 seconds on '${printerName}'`));
      }, 60000);

      const doPrint = () => {
        if (!printWindow || printWindow.isDestroyed()) return;

        const copies = Math.max(1, Math.min(100, options.copies || 1));
        const color = options.colorMode === 'COLOR';

        let duplexMode: 'simplex' | 'shortEdge' | 'longEdge' = 'simplex';
        if (options.duplexMode === 'DOUBLE_SIDED_LONG_EDGE') {
          duplexMode = 'longEdge';
        } else if (options.duplexMode === 'DOUBLE_SIDED_SHORT_EDGE') {
          duplexMode = 'shortEdge';
        }

        const pageSize = options.paperSize || 'A4';
        const pageRanges = this.parsePageRange(options.pageRange);
        const landscape = Boolean(options.landscape);

        const electronPrintOptions: any = {
          silent: true,
          printBackground: true,
          deviceName: targetPrinter.systemName,
          color,
          copies,
          duplexMode,
          pageSize,
          landscape,
          margins: { marginType: 'none' },
        };

        if (pageRanges && pageRanges.length > 0) {
          electronPrintOptions.pageRanges = pageRanges;
        }

        console.log(
          `[PRINTER-SERVICE] Submitting print job to '${targetPrinter.systemName}':`,
          JSON.stringify(electronPrintOptions)
        );

        printWindow.webContents.print(electronPrintOptions, async (success, failureReason) => {
          clearTimeout(timeoutTimer);
          cleanupWindow();

          if (!success) {
            const reason = failureReason || 'Spooler rejected document';
            console.error(`[PRINTER-SERVICE] Print submission failed: ${reason}`);
            resolve({
              success: false,
              message: `Windows Spooler Error: ${reason}`,
              printerName: targetPrinter.systemName,
            });
            return;
          }

          // Query Windows print spooler to capture native JobId
          let windowsJobId: number | undefined;
          let spoolStatus = 'SPOOLED_TO_WINDOWS_QUEUE';

          if (os.platform() === 'win32') {
            try {
              const spoolJobs = await this.getSpoolerJobs(targetPrinter.systemName);
              if (spoolJobs.length > 0) {
                // Latest job in this printer's queue
                windowsJobId = spoolJobs[0].jobId;
                spoolStatus = spoolJobs[0].jobStatus || 'Present in Spooler';
              }
            } catch {
              // Non-fatal if spooler query is slower
            }
          }

          resolve({
            success: true,
            message: `Document successfully submitted to Windows Print Spooler on '${targetPrinter.systemName}'`,
            windowsJobId,
            printerName: targetPrinter.systemName,
            spoolStatus,
          });
        });
      };

      if (isPdf) {
        // Load PDF directly into Chromium PDFium viewer
        const fileUrl = `file://${path.resolve(filePath).replace(/\\/g, '/')}`;
        printWindow.loadURL(fileUrl).catch((err) => {
          clearTimeout(timeoutTimer);
          cleanupWindow();
          reject(new Error(`Failed to load PDF in rendering engine: ${err.message}`));
        });

        printWindow.webContents.on('did-finish-load', () => {
          // Allow PDFium a short stabilization tick
          setTimeout(doPrint, 800);
        });
      } else if (isImage) {
        // Load HTML wrapper with strict CSS page sizing to preserve aspect ratio and avoid clipping
        const fileUrl = `file://${path.resolve(filePath).replace(/\\/g, '/')}`;
        const orientationCss = options.landscape ? 'landscape' : 'portrait';
        const pageCssSize = options.paperSize || 'A4';

        const wrapperHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page {
                size: ${pageCssSize} ${orientationCss};
                margin: 0;
              }
              * { box-sizing: border-box; }
              html, body {
                margin: 0;
                padding: 0;
                width: 100vw;
                height: 100vh;
                overflow: hidden;
                background: #ffffff;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            <img src="${fileUrl}" />
          </body>
          </html>
        `;

        printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(wrapperHtml)}`).catch((err) => {
          clearTimeout(timeoutTimer);
          cleanupWindow();
          reject(new Error(`Failed to load image wrapper in rendering engine: ${err.message}`));
        });

        printWindow.webContents.on('did-finish-load', () => {
          setTimeout(doPrint, 400);
        });
      }
    });
  }

  /**
   * Queries Windows Print Spooler for active jobs on a specific printer or all printers
   */
  async getSpoolerJobs(printerName?: string): Promise<SpoolerJobInfo[]> {
    if (os.platform() !== 'win32') return [];

    try {
      const filterClause = printerName ? `-Filter "Name LIKE '%${printerName.replace(/'/g, "''")}%'"` : '';
      const psCommand = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "
        $OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        try {
          $jobs = Get-CimInstance -ClassName Win32_PrintJob ${filterClause} | Select-Object JobId, Name, Document, JobStatus, Status, TotalPages, PagesPrinted, TimeSubmitted
          if ($jobs) {
            $jobs | ConvertTo-Json -Depth 2 -Compress
          } else {
            '[]'
          }
        } catch {
          '[]'
        }
      "`;

      const { stdout } = await execAsync(psCommand, { timeout: 6000 });
      const rawText = stdout.trim();
      if (!rawText || rawText === '[]' || rawText === 'null') return [];

      const parsed = JSON.parse(rawText);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      return list.map((j: any) => ({
        jobId: Number(j.JobId) || 0,
        printerName: String(j.Name || ''),
        documentName: String(j.Document || 'Print2Me Document'),
        jobStatus: String(j.JobStatus || j.Status || 'Spooling'),
        totalPages: Number(j.TotalPages) || 0,
        pagesPrinted: Number(j.PagesPrinted) || 0,
        timeSubmitted: String(j.TimeSubmitted || new Date().toISOString()),
      }));
    } catch (err) {
      console.warn('[PRINTER-SERVICE] Spooler query notice:', err);
      return [];
    }
  }

  /**
   * Opens the native Windows print queue GUI for the specified printer
   */
  async openPrinterQueue(printerName: string): Promise<{ success: boolean; message: string }> {
    if (os.platform() !== 'win32') {
      return {
        success: false,
        message: 'Native Windows printer queue is only available on Windows operating system.',
      };
    }

    try {
      // rundll32.exe printui.dll,PrintUIEntry /o /n "PrinterName"
      const safePrinter = printerName.replace(/"/g, '\\"');
      const cmd = `rundll32.exe printui.dll,PrintUIEntry /o /n "${safePrinter}"`;
      exec(cmd);
      return {
        success: true,
        message: `Opened native Windows print queue for '${printerName}'`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to open Windows queue: ${err.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Opens Windows 10/11 Printer Settings
   */
  async openWindowsPrinterSettings(): Promise<{ success: boolean; message: string }> {
    if (os.platform() !== 'win32') {
      return {
        success: false,
        message: 'Windows Settings is only available on Windows operating system.',
      };
    }

    try {
      // ms-settings:printers or control printers
      exec('start ms-settings:printers', (err) => {
        if (err) {
          // Fallback to classic Control Panel Printers
          exec('control printers');
        }
      });
      return {
        success: true,
        message: 'Opened Windows Printer Settings',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to open settings: ${err.message}`,
      };
    }
  }

  /**
   * Prints a genuine hardware verification test page to the selected printer
   */
  async printTestPage(printerName: string): Promise<PrintResult> {
    const allPrinters = await this.getInstalledPrinters();
    const printer = allPrinters.find((p) => p.systemName.toLowerCase() === printerName.toLowerCase());

    if (!printer) {
      throw new Error(`Target printer '${printerName}' was not found. Please refresh printer list.`);
    }

    // Generate high-resolution HTML test document
    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A;
            line-height: 1.4;
          }
          .header {
            border-bottom: 3px solid #101B3B;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title {
            font-size: 22px;
            font-weight: 800;
            color: #101B3B;
          }
          .subtitle {
            font-size: 13px;
            color: #64748B;
          }
          .box {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 14px;
            margin-bottom: 16px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px solid #EEF2F6;
            font-size: 13px;
          }
          .row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #475569; }
          .value { font-weight: 700; color: #0F172A; }
          .color-bars {
            display: flex;
            gap: 8px;
            margin-top: 20px;
          }
          .bar {
            flex: 1;
            height: 36px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 800;
            color: #fff;
          }
          .cyan { background: #06B6D4; }
          .magenta { background: #EC4899; }
          .yellow { background: #EAB308; color: #000; }
          .black { background: #0F172A; }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 11px;
            color: #94A3B8;
            border-top: 1px solid #E2E8F0;
            padding-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Print2Me Hardware Test Page</div>
            <div class="subtitle">Real Windows Print Driver &amp; Spooler Verification</div>
          </div>
        </div>

        <div class="box">
          <div class="row"><span class="label">Target Windows Printer:</span><span class="value">${printer.systemName}</span></div>
          <div class="row"><span class="label">Windows Driver:</span><span class="value">${printer.driverName || 'Standard Driver'}</span></div>
          <div class="row"><span class="label">Assigned Port:</span><span class="value">${printer.portName || 'Unknown'}</span></div>
          <div class="row"><span class="label">OS Default Printer:</span><span class="value">${printer.isDefault ? 'Yes' : 'No'}</span></div>
          <div class="row"><span class="label">Color Support:</span><span class="value">${printer.supportsColor ? 'Full Color' : 'Monochrome'}</span></div>
          <div class="row"><span class="label">Duplex (Two-Sided) Support:</span><span class="value">${printer.supportsDuplex ? 'Supported' : 'Single-Sided Only'}</span></div>
          <div class="row"><span class="label">Test Execution Timestamp:</span><span class="value">${new Date().toLocaleString()}</span></div>
        </div>

        <div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:6px;">Color &amp; Alignment Calibration Bars:</div>
        <div class="color-bars">
          <div class="bar cyan">CYAN (C)</div>
          <div class="bar magenta">MAGENTA (M)</div>
          <div class="bar yellow">YELLOW (Y)</div>
          <div class="bar black">BLACK (K)</div>
        </div>

        <div class="footer">
          Print2Me Workstation Desktop Agent • Hardware Verification Document • print2me.in
        </div>
      </body>
      </html>
    `;

    const tempTestFile = path.join(os.tmpdir(), `p2m-testpage-${Date.now()}.html`);
    fs.writeFileSync(tempTestFile, testHtml, 'utf-8');

    try {
      return await this.printDocument(tempTestFile, {
        printerName: printer.systemName,
        copies: 1,
        colorMode: printer.supportsColor ? 'COLOR' : 'BLACK_AND_WHITE',
        paperSize: 'A4',
      });
    } finally {
      try {
        if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);
      } catch {
        // Ignore
      }
    }
  }
}

export const printerService = new WindowsPrinterService();
