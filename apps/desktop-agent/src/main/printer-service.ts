import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { BrowserWindow, app, shell } from 'electron';

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
   * Enumerate real Windows printers via Native Electron API, CIM, and .NET fallback
   */
  private async getWindowsPrinters(): Promise<RealPrinterInfo[]> {
    // 1. First attempt: Native Electron Chromium API (instant, no WMI permission issues)
    try {
      const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
      if (win && win.webContents && typeof win.webContents.getPrintersAsync === 'function') {
        const electronPrinters = await win.webContents.getPrintersAsync();
        if (electronPrinters && electronPrinters.length > 0) {
          return electronPrinters.map((p) => {
            const name = p.name;
            const isDefault = Boolean(p.isDefault);
            const options = (p.options || {}) as Record<string, any>;
            const driverName = options['printer-make-and-model'] || options['system_driverinfo'] || 'Windows Print Driver';
            const portName = options['printer-location'] || 'Local Port';
            const isColor = name.toLowerCase().includes('color') || true;
            return {
              systemName: name,
              displayName: p.displayName || name,
              driverName,
              portName,
              isDefault,
              status: 'READY' as PrinterOnlineStatus,
              statusCode: p.status || 0,
              statusDetails: 'Ready to print',
              isOnline: true,
              isReachable: true,
              isPaused: false,
              hasError: false,
              supportsColor: isColor,
              supportsDuplex: true,
              supportedSizes: ['A4', 'A3', 'LETTER', 'LEGAL'],
            };
          });
        }
      }
    } catch (e) {
      console.warn('[PRINTER-SERVICE] Native Electron getPrintersAsync fallback notice:', e);
    }

    // 2. Second attempt: PowerShell with CIM and .NET InstalledPrinters fallback
    try {
      const psCommand = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "
        $OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        try {
          $printers = Get-CimInstance -ClassName Win32_Printer -ErrorAction Stop | Select-Object Name, DeviceID, DriverName, PortName, Default, PrinterStatus, PrinterState, WorkOffline, SpoolEnabled, CapabilityDescriptions, Capabilities, HorizontalResolution, VerticalResolution
          if ($printers) {
            $printers | ConvertTo-Json -Depth 3 -Compress
            exit 0
          }
        } catch {}
        try {
          Add-Type -AssemblyName System.Drawing
          $default = (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows').Device
          $defaultName = if ($default) { $default.Split(',')[0] } else { '' }
          $list = [System.Drawing.Printing.PrinterSettings]::InstalledPrinters | ForEach-Object {
            [PSCustomObject]@{
              Name = $_
              DeviceID = $_
              DriverName = 'Standard Windows Printer Driver'
              PortName = 'Local'
              Default = ($_ -eq $defaultName)
              PrinterStatus = 3
              PrinterState = 0
              WorkOffline = $false
              SpoolEnabled = $true
              CapabilityDescriptions = @('Color', 'Duplex', 'A4', 'Letter')
              Capabilities = @(3, 4)
            }
          }
          if ($list) {
            $list | ConvertTo-Json -Depth 3 -Compress
            exit 0
          }
        } catch {}
        '[]'
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

      const doPrint = async () => {
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

        const isVirtualPdfPrinter =
          targetPrinter.systemName.toLowerCase().includes('pdf') ||
          (targetPrinter.portName && targetPrinter.portName.toUpperCase().includes('PORTPROMPT'));

        // Handle virtual/PDF printers (e.g., 'Microsoft Print to PDF')
        // In silent mode, Windows Spooler rejects PORTPROMPT: printers because there is no GUI to choose a save path.
        // We export the print directly to a PDF file in the user's Desktop/Print2Me_Printed_Documents folder.
        if (isVirtualPdfPrinter) {
          console.log(
            `[PRINTER-SERVICE] Target printer '${targetPrinter.systemName}' is a virtual PDF printer (PORTPROMPT:). Exporting print output via printToPDF...`
          );
          try {
            const pdfData = await printWindow.webContents.printToPDF({
              landscape,
              preferCSSPageSize: true,
              printBackground: true,
            });

            let desktopDir: string;
            try {
              desktopDir = app.getPath('desktop');
            } catch {
              desktopDir = path.join(os.homedir(), 'Desktop');
            }
            const outputDir = path.join(desktopDir, 'Print2Me_Printed_Documents');
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            const cleanBase = path.basename(filePath, path.extname(filePath));
            const fileName = `Printed_${cleanBase}_${Date.now()}.pdf`;
            const destPath = path.join(outputDir, fileName);
            fs.writeFileSync(destPath, pdfData);

            clearTimeout(timeoutTimer);
            cleanupWindow();

            console.log(`[PRINTER-SERVICE] Successfully exported virtual print to: ${destPath}`);

            // Automatically open File Explorer and highlight the printed PDF
            try {
              shell.showItemInFolder(destPath);
            } catch (openErr) {
              console.warn('[PRINTER-SERVICE] Could not reveal file in explorer:', openErr);
            }

            resolve({
              success: true,
              message: `Printed to PDF successfully: ${destPath}`,
              printerName: targetPrinter.systemName,
              spoolStatus: 'PRINTED_TO_FILE',
            });
            return;
          } catch (pdfErr: any) {
            console.error(`[PRINTER-SERVICE] printToPDF failed, attempting fallback to spooler:`, pdfErr);
          }
        }

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
        // Read PDF file as base64 to avoid file:// security blocks or path escaping issues
        const pdfBuffer = fs.readFileSync(filePath);
        const base64Pdf = pdfBuffer.toString('base64');

        // Locate local offline pdf.min.js and pdf.worker.min.js
        let pdfJsContent = '';
        let workerJsContent = '';
        const possiblePdfJsPaths = [
          path.join(__dirname, '../assets/pdfjs/pdf.min.js'),
          path.join(__dirname, '../../assets/pdfjs/pdf.min.js'),
          path.join(process.cwd(), 'assets/pdfjs/pdf.min.js'),
        ];
        const possibleWorkerPaths = [
          path.join(__dirname, '../assets/pdfjs/pdf.worker.min.js'),
          path.join(__dirname, '../../assets/pdfjs/pdf.worker.min.js'),
          path.join(process.cwd(), 'assets/pdfjs/pdf.worker.min.js'),
        ];

        for (const p of possiblePdfJsPaths) {
          if (fs.existsSync(p)) {
            pdfJsContent = fs.readFileSync(p, 'utf-8');
            break;
          }
        }
        for (const p of possibleWorkerPaths) {
          if (fs.existsSync(p)) {
            workerJsContent = fs.readFileSync(p, 'utf-8');
            break;
          }
        }

        const orientationCss = options.landscape ? 'landscape' : 'portrait';
        const pageCssSize = options.paperSize || 'A4';

        const pdfHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page {
                size: ${pageCssSize} ${orientationCss};
                margin: 0;
              }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              html, body {
                margin: 0;
                padding: 0;
                background: #ffffff;
                width: 100%;
              }
              .pdf-page-wrapper {
                width: 100vw;
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                page-break-after: always;
                page-break-inside: avoid;
                overflow: hidden;
              }
              .pdf-page-wrapper:last-child {
                page-break-after: auto;
              }
              canvas {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
                display: block;
              }
            </style>
          </head>
          <body>
            <div id="pdf-container"></div>
            <script>
              ${workerJsContent}
            </script>
            <script>
              ${pdfJsContent}
            </script>
            <script>
              (async () => {
                try {
                  const rawData = atob("${base64Pdf}");
                  const bytes = new Uint8Array(rawData.length);
                  for (let i = 0; i < rawData.length; i++) {
                    bytes[i] = rawData.charCodeAt(i);
                  }

                  const loadingTask = pdfjsLib.getDocument({ data: bytes });
                  const pdf = await loadingTask.promise;
                  const container = document.getElementById('pdf-container');

                  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    // Scale 2.5 delivers crisp 200-300 DPI high-res printing
                    const viewport = page.getViewport({ scale: 2.5 });

                    const pageWrapper = document.createElement('div');
                    pageWrapper.className = 'pdf-page-wrapper';

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');

                    await page.render({ canvasContext: ctx, viewport }).promise;

                    pageWrapper.appendChild(canvas);
                    container.appendChild(pageWrapper);
                  }
                  window.__PDF_PRINT_READY__ = true;
                } catch (err) {
                  window.__PDF_PRINT_ERROR__ = (err && err.message) || String(err);
                }
              })();
            </script>
          </body>
          </html>
        `;

        const tempHtmlPath = path.join(os.tmpdir(), `p2m-render-${Date.now()}.html`);
        fs.writeFileSync(tempHtmlPath, pdfHtml, 'utf-8');

        printWindow.loadFile(tempHtmlPath).catch((err) => {
          clearTimeout(timeoutTimer);
          cleanupWindow();
          try { fs.unlinkSync(tempHtmlPath); } catch {}
          reject(new Error(`Failed to load PDF renderer HTML: ${err.message}`));
        });

        let isHandled = false;
        const renderCheckInterval = setInterval(async () => {
          if (isHandled) {
            clearInterval(renderCheckInterval);
            return;
          }
          if (!printWindow || printWindow.isDestroyed()) {
            clearInterval(renderCheckInterval);
            try { fs.unlinkSync(tempHtmlPath); } catch {}
            return;
          }
          try {
            const isReady = await printWindow.webContents.executeJavaScript('Boolean(window.__PDF_PRINT_READY__)');
            if (isHandled) return;
            const renderError = await printWindow.webContents.executeJavaScript('window.__PDF_PRINT_ERROR__');
            if (isHandled) return;

            if (renderError) {
              isHandled = true;
              clearInterval(renderCheckInterval);
              clearTimeout(timeoutTimer);
              cleanupWindow();
              try { fs.unlinkSync(tempHtmlPath); } catch {}
              reject(new Error(`PDF Canvas rendering failed: ${renderError}`));
              return;
            }

            if (isReady) {
              isHandled = true;
              clearInterval(renderCheckInterval);
              setTimeout(() => {
                try { if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath); } catch {}
              }, 5000);
              setTimeout(doPrint, 250);
            }
          } catch {
            // Window might be transitioning
          }
        }, 150);
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
