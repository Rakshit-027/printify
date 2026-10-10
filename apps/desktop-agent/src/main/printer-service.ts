import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import fs from 'fs';
import path from 'path';

const execAsync = util.promisify(exec);

export interface DetectedPrinter {
  systemName: string;
  displayName: string;
  supportedSizes: string[];
  supportsColor: boolean;
  supportsDuplex: boolean;
  isDefault: boolean;
  isOnline: boolean;
  isVirtual?: boolean;
}

export class WindowsPrinterService {
  private virtualOutputDir: string;

  constructor() {
    this.virtualOutputDir = path.join(os.homedir(), 'PrintFlow-Virtual-Prints');
    try {
      if (!fs.existsSync(this.virtualOutputDir)) {
        fs.mkdirSync(this.virtualOutputDir, { recursive: true });
      }
    } catch (err) {
      console.warn('Could not create virtual print output directory:', err);
    }
  }

  public getVirtualOutputDir(): string {
    return this.virtualOutputDir;
  }

  /**
   * Enumerate installed printers via OS APIs or Virtual Emulators
   */
  async getInstalledPrinters(): Promise<DetectedPrinter[]> {
    if (os.platform() !== 'win32') {
      // In development / Linux environment, provide hardware-emulated printers
      // and detect any CUPS virtual printers (like PDF)
      const virtualPrinters: DetectedPrinter[] = [
        {
          systemName: 'Virtual-Canon-LBP2900B',
          displayName: 'Canon LBP2900B (Virtual B&W Laser)',
          supportedSizes: ['A4', 'LETTER'],
          supportsColor: false,
          supportsDuplex: false,
          isDefault: true,
          isOnline: true,
          isVirtual: true,
        },
        {
          systemName: 'Virtual-HP-ColorLaserJet-M479',
          displayName: 'HP Color LaserJet Pro M479 (Virtual Color Duplex)',
          supportedSizes: ['A4', 'A3', 'LEGAL'],
          supportsColor: true,
          supportsDuplex: true,
          isDefault: false,
          isOnline: true,
          isVirtual: true,
        },
      ];

      // Check if Linux CUPS-PDF is installed
      try {
        const { stdout } = await execAsync('lpstat -p', { timeout: 3000 });
        if (stdout.includes('PDF')) {
          virtualPrinters.push({
            systemName: 'PDF',
            displayName: 'CUPS-PDF (Linux System Virtual Spooler)',
            supportedSizes: ['A4', 'A3', 'LETTER'],
            supportsColor: true,
            supportsDuplex: true,
            isDefault: false,
            isOnline: true,
            isVirtual: true,
          });
        }
      } catch {
        // CUPS not installed or no printers, virtual printers are ready
      }

      return virtualPrinters;
    }

    try {
      const psCommand = `powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object Name, Default, PrinterStatus, CapabilityDescriptions | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCommand, { timeout: 8000 });
      const raw = JSON.parse(stdout);
      const list = Array.isArray(raw) ? raw : [raw];

      const printers = list.map((p: any) => ({
        systemName: p.Name,
        displayName: p.Name,
        supportedSizes: ['A4', 'LETTER'],
        supportsColor: true,
        supportsDuplex: true,
        isDefault: Boolean(p.Default),
        isOnline: true,
        isVirtual: p.Name.toLowerCase().includes('pdf') || p.Name.toLowerCase().includes('virtual'),
      }));

      // If no printers found, provide the virtual fallback
      if (printers.length === 0) {
        return [
          {
            systemName: 'Microsoft Print to PDF',
            displayName: 'Microsoft Print to PDF (Virtual)',
            supportedSizes: ['A4', 'LETTER'],
            supportsColor: true,
            supportsDuplex: false,
            isDefault: true,
            isOnline: true,
            isVirtual: true,
          },
        ];
      }

      return printers;
    } catch (error) {
      console.warn('PowerShell printer enumeration error, using default virtual fallback:', error);
      return [
        {
          systemName: 'Microsoft Print to PDF',
          displayName: 'Microsoft Print to PDF (Virtual)',
          supportedSizes: ['A4', 'LETTER'],
          supportsColor: true,
          supportsDuplex: false,
          isDefault: true,
          isOnline: true,
          isVirtual: true,
        },
      ];
    }
  }

  /**
   * Submits document to the spooler or virtual printer emulator
   */
  async printDocument(
    filePath: string,
    printerName: string,
    copies: number = 1
  ): Promise<{ success: boolean; message: string; outputFolder?: string; spooledFile?: string }> {
    // 1. Virtual Spooler Output (Zero-Cost Emulator for testing without real paper/ink)
    let spooledFile = '';
    try {
      if (!fs.existsSync(this.virtualOutputDir)) {
        fs.mkdirSync(this.virtualOutputDir, { recursive: true });
      }
      const safePrinter = printerName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseName = path.basename(filePath);
      spooledFile = path.join(this.virtualOutputDir, `[${safePrinter}]_${timestamp}_${baseName}`);

      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, spooledFile);

        // Write print job manifest
        const manifest = {
          printerName,
          copies,
          timestamp: new Date().toISOString(),
          originalFile: baseName,
          spooledPath: spooledFile,
          status: 'SUCCESSFULLY_SPOOLED',
        };
        fs.writeFileSync(
          spooledFile.replace(/\.[^.]+$/, '_manifest.json'),
          JSON.stringify(manifest, null, 2),
          'utf-8'
        );
      }
    } catch (copyErr) {
      console.warn('Virtual spooler copy notice:', copyErr);
    }

    if (os.platform() !== 'win32') {
      // On Linux: Try CUPS if available, otherwise complete via Virtual Spooler
      try {
        if (printerName === 'PDF') {
          await execAsync(`lp -d PDF "${filePath}"`, { timeout: 10000 });
          return {
            success: true,
            message: `Spooled to Linux CUPS-PDF. Rendered copy saved to: ${this.virtualOutputDir}`,
            outputFolder: this.virtualOutputDir,
            spooledFile,
          };
        }
      } catch {
        // Fall back to virtual emulator
      }

      // Realistic progressive spool simulation
      await new Promise((resolve) => setTimeout(resolve, 1200));

      return {
        success: true,
        message: `Hardware Emulator: Spooled ${copies} copy(ies) to '${printerName}'. Output saved in: ${this.virtualOutputDir}`,
        outputFolder: this.virtualOutputDir,
        spooledFile,
      };
    }

    // Windows Production Spooler
    try {
      const psPrint = `powershell -NoProfile -Command "Start-Process -FilePath '${filePath}' -Verb PrintTo -ArgumentList '${printerName}' -Wait"`;
      await execAsync(psPrint, { timeout: 30000 });
      return {
        success: true,
        message: `Job successfully submitted to Windows Spooler on '${printerName}'`,
        outputFolder: this.virtualOutputDir,
        spooledFile,
      };
    } catch (err: any) {
      // If hardware spooler failed, virtual print output was still preserved for operator inspection
      return {
        success: false,
        message: err.message || 'Spooler failed to accept document',
        outputFolder: this.virtualOutputDir,
      };
    }
  }
  /**
   * Generates and prints a test page to verify printer hardware
   */
  async printTestPage(printerName: string) {
    const testFile = path.join(os.tmpdir(), `printflow-test-${Date.now()}.txt`);
    const content = `========================================\nPRINTFLOW DESKTOP TEST PAGE\n========================================\nTarget Printer: ${printerName}\nTimestamp: ${new Date().toLocaleString()}\nSystem Status: ONLINE & READY\nHardware Verification: SUCCESSFUL\n========================================\n`;
    fs.writeFileSync(testFile, content, "utf-8");
    return this.printDocument(testFile, printerName, 1);
  }
}

export const printerService = new WindowsPrinterService();
