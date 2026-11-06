import { execFile } from "child_process";
import util from "util";
import os from "os";
import fs from "fs";
import path from "path";
import { BrowserWindow, app, shell } from "electron";
import { logger } from "./logger";

const execFileAsync = util.promisify(execFile);

export type PrinterOnlineStatus =
  | "READY"
  | "PRINTING"
  | "OFFLINE"
  | "PAUSED"
  | "PAPER_JAM"
  | "OUT_OF_PAPER"
  | "ERROR"
  | "SPOOLER_STOPPED"
  | "UNKNOWN";

export type PrinterConnectionType =
  | "USB"
  | "WIFI"
  | "ETHERNET"
  | "SHARED"
  | "IPP"
  | "OTHER";

export interface RealPrinterInfo {
  systemName: string;
  displayName: string;
  driverName?: string;
  portName?: string;
  connectionType: PrinterConnectionType;
  connectionDetails: string;
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
  isNetwork?: boolean;
  isShared?: boolean;
  serverName?: string;
  shareName?: string;
  location?: string;
  comment?: string;
  rawAttributes?: number;
}

export interface DetectConnectionOptions {
  name: string;
  portName?: string;
  driverName?: string;
  attributes?: number;
  isNetwork?: boolean;
  isShared?: boolean;
  serverName?: string;
  hasActiveWifi?: boolean;
  hasActiveEthernet?: boolean;
}

/**
 * Robust Windows printer connection type classifier
 * Detects USB, Wi-Fi, Ethernet/LAN, Windows Shared, IPP, and Virtual/Other connections
 * using reliable Windows printer port, driver, network interface, and registry attributes.
 */
export function detectPrinterConnectionType(opts: DetectConnectionOptions): {
  connectionType: PrinterConnectionType;
  connectionDetails: string;
} {
  const {
    name = "",
    portName = "",
    driverName = "",
    attributes = 0,
    isNetwork = false,
    isShared = false,
    serverName = "",
    hasActiveWifi = false,
    hasActiveEthernet = false,
  } = opts;

  const n = name.toLowerCase();
  const p = (portName || "").trim().toLowerCase();
  const d = (driverName || "").trim().toLowerCase();
  const s = (serverName || "").trim().toLowerCase();

  // 1. Windows Shared Printer (SMB UNC path / network printer connection)
  // Check for UNC path (\\server\printer) in name or port, or " on " notation, or PRINTER_ATTRIBUTE_NETWORK (0x00000010)
  const isUnc = name.startsWith("\\\\") || (portName && portName.startsWith("\\\\"));
  const hasOnServer = /\s+on\s+[a-z0-9_.-]+/i.test(name);
  const hasNetworkAttr = (attributes & 0x00000010) !== 0 || isNetwork || Boolean(serverName);

  if (
    isUnc ||
    hasOnServer ||
    hasNetworkAttr ||
    (isShared && !p.startsWith("usb") && !p.startsWith("portprompt") && !p.startsWith("nul"))
  ) {
    const remoteTarget = name.startsWith("\\\\")
      ? name
      : portName && portName.startsWith("\\\\")
      ? portName
      : serverName
      ? `\\\\${serverName}\\${name}`
      : name;
    return {
      connectionType: "SHARED",
      connectionDetails: `Windows Network Share (${remoteTarget})`,
    };
  }

  // 2. IPP (Internet Printing Protocol)
  // Ports starting with http://, https://, ipp://, ipps://, or IPP port monitors
  if (
    p.startsWith("http://") ||
    p.startsWith("https://") ||
    p.startsWith("ipp://") ||
    p.startsWith("ipps://") ||
    p.includes("/printers/") ||
    p.includes("internet print") ||
    d.includes("internet print") ||
    d.includes("ipp")
  ) {
    return {
      connectionType: "IPP",
      connectionDetails: `Internet Printing Protocol (${portName || "IPP Port"})`,
    };
  }

  // 3. USB-connected printers
  // Ports starting with USB (USB001, USB002), DOT4 (DOT4_001 IEEE 1284.4 USB printing), or USB keywords
  if (
    /^usb[0-9]*/i.test(portName) ||
    /^dot4/i.test(portName) ||
    p.includes("usb") ||
    d.includes("usb")
  ) {
    return {
      connectionType: "USB",
      connectionDetails: `USB Connection (${portName || "USB Port"})`,
    };
  }

  // 4. Wi-Fi (Wireless Network)
  // Explicit wireless keywords in printer name, driver name, or port
  const hasWifiMarker =
    /\b(wi-?fi|wireless|wlan|802\.11|airprint)\b/i.test(name) ||
    /\b(wi-?fi|wireless|wlan|802\.11|airprint)\b/i.test(driverName) ||
    /\b(wi-?fi|wireless|wlan|802\.11|airprint)\b/i.test(portName);

  if (hasWifiMarker) {
    return {
      connectionType: "WIFI",
      connectionDetails: `Wi-Fi Wireless (${portName || "Wireless Network"})`,
    };
  }

  // 5. Ethernet / LAN (Wired Network)
  // Explicit ethernet/LAN keywords
  const hasEthernetMarker =
    /\b(ethernet|lan|wired)\b/i.test(name) ||
    /\b(ethernet|lan|wired)\b/i.test(driverName) ||
    /\b(ethernet|lan|wired)\b/i.test(portName);

  if (hasEthernetMarker) {
    return {
      connectionType: "ETHERNET",
      connectionDetails: `Ethernet / LAN (${portName || "Wired Network"})`,
    };
  }

  // Standard TCP/IP Port (e.g. IP_192.168.1.50, 192.168.1.100, port 9100)
  const isTcpIpPort =
    /^ip_/i.test(portName) ||
    /^([0-9]{1,3}\.){3}[0-9]{1,3}/.test(portName) ||
    /:9100$/i.test(portName) ||
    p.includes("tcpip") ||
    p.includes("standard tcp/ip");

  if (isTcpIpPort) {
    if (hasActiveWifi && !hasActiveEthernet) {
      return {
        connectionType: "WIFI",
        connectionDetails: `Wi-Fi Wireless (TCP/IP ${portName})`,
      };
    }
    return {
      connectionType: "ETHERNET",
      connectionDetails: `Ethernet / LAN (TCP/IP ${portName})`,
    };
  }

  // WSD (Web Services for Devices) Ports (e.g. WSD-xxxx)
  if (/^wsd/i.test(portName)) {
    if (hasActiveWifi && !hasActiveEthernet) {
      return {
        connectionType: "WIFI",
        connectionDetails: `Wi-Fi Wireless (WSD ${portName})`,
      };
    }
    if (hasActiveEthernet && !hasActiveWifi) {
      return {
        connectionType: "ETHERNET",
        connectionDetails: `Ethernet / LAN (WSD ${portName})`,
      };
    }
    return {
      connectionType: "WIFI",
      connectionDetails: `Network Device (WSD ${portName})`,
    };
  }

  // 6. Virtual / Local / Other
  // Software / PDF / XPS / File ports
  if (
    p.startsWith("portprompt") ||
    p.startsWith("nul") ||
    p.startsWith("file:") ||
    p.startsWith("ne0") ||
    p.startsWith("lpt") ||
    p.startsWith("com") ||
    n.includes("pdf") ||
    n.includes("onenote") ||
    n.includes("xps") ||
    d.includes("pdf") ||
    d.includes("onenote") ||
    d.includes("xps")
  ) {
    return {
      connectionType: "OTHER",
      connectionDetails: `Virtual / System Port (${portName || "Local"})`,
    };
  }

  // Unknown fallback
  return {
    connectionType: "OTHER",
    connectionDetails: portName ? `Other (${portName})` : "Other",
  };
}

export interface PrintDocumentOptions {
  printerName: string;
  copies?: number;
  colorMode?: "COLOR" | "BLACK_AND_WHITE";
  duplexMode?: "SINGLE_SIDED" | "DOUBLE_SIDED_LONG_EDGE" | "DOUBLE_SIDED_SHORT_EDGE";
  paperSize?: "A4" | "A3" | "LETTER" | "LEGAL" | string;
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
  connectionType?: PrinterConnectionType;
  spoolStatus?: string;
  pageCount?: number;
}

export class WindowsPrinterService {
  /**
   * Helper to parse human-readable page ranges (e.g., "1-3, 5, 8-10") into 0-indexed Chromium pageRanges
   */
  public parsePageRange(rangeStr?: string): { from: number; to: number }[] | undefined {
    if (!rangeStr || rangeStr.trim().toUpperCase() === "ALL") {
      return undefined;
    }

    const segments = rangeStr.split(",").map((s) => s.trim()).filter(Boolean);
    const ranges: { from: number; to: number }[] = [];

    for (const segment of segments) {
      if (segment.includes("-")) {
        const [startStr, endStr] = segment.split("-").map((s) => s.trim());
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
   * Helper to compute total pages selected by a page range given document total pages
   */
  public getSelectedPageNumbers(totalDocPages: number, rangeStr?: string): number[] {
    const ranges = this.parsePageRange(rangeStr);
    if (!ranges) {
      return Array.from({ length: totalDocPages }, (_, i) => i + 1);
    }

    const selected = new Set<number>();
    for (const r of ranges) {
      const from = Math.max(1, r.from + 1);
      const to = Math.min(totalDocPages, r.to + 1);
      for (let p = from; p <= to; p++) {
        selected.add(p);
      }
    }
    return Array.from(selected).sort((a, b) => a - b);
  }

  private cachedPrinters: RealPrinterInfo[] = [];
  private lastScanTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 12000;

  /**
   * Discovers actual printers installed and registered in Windows using native Registry,
   * System.Drawing driver capabilities, network interface checks, and CIM fallback.
   * Caches results for 12s unless forceRefresh is true.
   * NO MOCK PRINTERS, NO SIMULATED PRINTERS.
   */
  async getInstalledPrinters(forceRefresh = false): Promise<RealPrinterInfo[]> {
    if (!forceRefresh && this.cachedPrinters.length > 0 && Date.now() - this.lastScanTimestamp < this.CACHE_TTL_MS) {
      return this.cachedPrinters;
    }

    let printers: RealPrinterInfo[];
    if (os.platform() !== "win32") {
      printers = await this.getLinuxPrinters();
    } else {
      printers = await this.getWindowsPrinters();
    }

    this.cachedPrinters = printers;
    this.lastScanTimestamp = Date.now();
    return printers;
  }

  /**
   * Enumerate real Windows printers via Registry, System.Drawing, and native Spooler APIs
   * with deep hardware status analysis and connection type classification.
   */
  private async getWindowsPrinters(): Promise<RealPrinterInfo[]> {
    try {
      // Execute safe PowerShell script without raw string interpolation
      const psScript = `
        $OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        Add-Type -AssemblyName System.Drawing

        $isSpoolerRunning = $true
        $spooler = Get-Service -Name Spooler -ErrorAction SilentlyContinue
        if ($spooler) {
          $isSpoolerRunning = ($spooler.Status -eq 'Running')
        }

        $hasActiveWifi = $false
        $hasActiveEthernet = $false
        try {
          [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | ForEach-Object {
            if ($_.OperationalStatus -eq 'Up') {
              if ($_.NetworkInterfaceType -eq 'Wireless80211') { $hasActiveWifi = $true }
              elseif ($_.NetworkInterfaceType -eq 'Ethernet') { $hasActiveEthernet = $true }
            }
          }
        } catch {}

        $defaultDev = (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Windows' -ErrorAction SilentlyContinue).Device
        $defaultName = if ($defaultDev) { $defaultDev.Split(',')[0].Trim() } else { '' }

        $devProps = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Devices' -ErrorAction SilentlyContinue
        $devicesMap = @{}
        if ($devProps) {
          $devProps.PSObject.Properties | Where-Object { $_.Name -notin @('PSPath','PSParentPath','PSChildName','PSDrive','PSProvider') } | ForEach-Object {
            $val = [string]$_.Value
            $devicesMap[$_.Name] = if ($val.Contains(',')) { $val.Split(',')[1].Trim() } else { $val }
          }
        }

        $installedPrinters = @()
        try {
          $installedPrinters = @([System.Drawing.Printing.PrinterSettings]::InstalledPrinters)
        } catch {}

        $hklmPath = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers'
        if (Test-Path $hklmPath) {
          Get-ChildItem $hklmPath -ErrorAction SilentlyContinue | ForEach-Object {
            $pName = $_.PSChildName
            if ($installedPrinters -notcontains $pName) {
              $installedPrinters += $pName
            }
          }
        }

        # Check HKCU Printers Connections (Windows Shared printers connected by user)
        $hkcuConnPath = 'HKCU:\\Printers\\Connections'
        if (Test-Path $hkcuConnPath) {
          Get-ChildItem $hkcuConnPath -ErrorAction SilentlyContinue | ForEach-Object {
            $keyName = $_.PSChildName
            $parts = $keyName.TrimStart(',').Split(',')
            if ($parts.Length -ge 2) {
              $unc = "\\\\" + $parts[0] + "\\" + $parts[1]
              if ($installedPrinters -notcontains $unc) {
                $installedPrinters += $unc
              }
            }
          }
        }

        $cimMap = @{}
        try {
          $cimList = Get-CimInstance -ClassName Win32_Printer -ErrorAction Stop
          foreach ($cp in $cimList) {
            if ($cp.Name) { $cimMap[$cp.Name] = $cp }
          }
        } catch {}

        $results = @()
        foreach ($name in $installedPrinters) {
          if (-not $name) { continue }

          $regKey = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Print\\Printers\\' + $name
          $reg = if (Test-Path $regKey) { Get-ItemProperty $regKey -ErrorAction SilentlyContinue } else { $null }

          $port = if ($reg -and $reg.Port) { [string]$reg.Port } elseif ($devicesMap.ContainsKey($name)) { [string]$devicesMap[$name] } else { '' }
          $driver = if ($reg -and $reg.'Printer Driver') { [string]$reg.'Printer Driver' } else { '' }
          $attr = if ($reg -and $reg.Attributes) { [int]$reg.Attributes } else { 0 }
          $status = if ($reg -and $reg.Status) { [int]$reg.Status } else { 0 }
          $shareName = if ($reg -and $reg.'Share Name') { [string]$reg.'Share Name' } else { '' }
          $location = if ($reg -and $reg.Location) { [string]$reg.Location } else { '' }
          $comment = if ($reg -and $reg.Description) { [string]$reg.Description } else { '' }
          $serverName = if ($reg -and $reg.ServerName) { [string]$reg.ServerName } else { '' }

          $isValid = $true
          $supportsColor = $false
          $canDuplex = $false
          $sizes = @()

          try {
            $ps = New-Object System.Drawing.Printing.PrinterSettings
            $ps.PrinterName = $name
            $isValid = [bool]$ps.IsValid
            $supportsColor = [bool]$ps.SupportsColor
            $canDuplex = [bool]$ps.CanDuplex
            $sizes = @($ps.PaperSizes | ForEach-Object { $_.PaperName })
          } catch {
            $isValid = $false
          }

          $printerStatus = 3
          $printerState = 0
          $workOffline = $false
          if ($cimMap.ContainsKey($name)) {
            $c = $cimMap[$name]
            if ($c.PortName -and -not $port) { $port = [string]$c.PortName }
            if ($c.DriverName -and -not $driver) { $driver = [string]$c.DriverName }
            if ($c.PrinterStatus) { $printerStatus = [int]$c.PrinterStatus }
            if ($c.PrinterState) { $printerState = [int]$c.PrinterState }
            if ($c.WorkOffline) { $workOffline = [bool]$c.WorkOffline }
            if ($c.ServerName -and -not $serverName) { $serverName = [string]$c.ServerName }
          }

          $results += [PSCustomObject]@{
            Name = $name
            Port = $port
            Driver = $driver
            Attributes = $attr
            Status = $status
            PrinterStatus = $printerStatus
            PrinterState = $printerState
            WorkOffline = $workOffline
            ShareName = $shareName
            Location = $location
            Comment = $comment
            ServerName = $serverName
            Default = ($name -eq $defaultName)
            IsValid = $isValid
            SupportsColor = $supportsColor
            CanDuplex = $canDuplex
            PaperSizes = $sizes
          }
        }

        $payload = @{
          spoolerRunning = $isSpoolerRunning
          hasActiveWifi = $hasActiveWifi
          hasActiveEthernet = $hasActiveEthernet
          printers = $results
        }
        $payload | ConvertTo-Json -Depth 4 -Compress
      `;

      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psScript],
        { timeout: 12000 }
      );

      const raw = stdout.trim();
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      const isSpoolerRunning = Boolean(parsed.spoolerRunning);
      const hasActiveWifi = Boolean(parsed.hasActiveWifi);
      const hasActiveEthernet = Boolean(parsed.hasActiveEthernet);
      const rawPrinters = parsed.printers;
      const list = Array.isArray(rawPrinters) ? rawPrinters : rawPrinters ? [rawPrinters] : [];

      if (!isSpoolerRunning) {
        logger.error("Windows Print Spooler service is STOPPED.");
      }

      return list
        .filter((p: any) => p && p.Name)
        .map((p: any) => {
          const name = String(p.Name).trim();
          const port = String(p.Port || "").trim();
          const driver = String(p.Driver || "").trim();
          const attr = typeof p.Attributes === "number" ? p.Attributes : 0;
          const isDefault = Boolean(p.Default);
          const isWorkOffline = Boolean(p.WorkOffline) || (attr & 0x00000400) !== 0;
          const printerState = typeof p.PrinterState === "number" ? p.PrinterState : 0;
          const regStatus = typeof p.Status === "number" ? p.Status : 0;
          const statusCode = typeof p.PrinterStatus === "number" ? p.PrinterStatus : 3;
          const isValid = p.IsValid !== undefined ? Boolean(p.IsValid) : true;

          // Detect connection type
          const conn = detectPrinterConnectionType({
            name,
            portName: port,
            driverName: driver,
            attributes: attr,
            isNetwork: (attr & 0x00000010) !== 0,
            isShared: (attr & 0x00000008) !== 0,
            serverName: p.ServerName ? String(p.ServerName) : undefined,
            hasActiveWifi,
            hasActiveEthernet,
          });

          let status: PrinterOnlineStatus = "READY";
          let statusDetails = "Ready to print";
          let isPaused = false;
          let hasError = false;

          if (!isSpoolerRunning) {
            status = "SPOOLER_STOPPED";
            statusDetails = "Windows Print Spooler service is stopped. Start the Spooler service in Windows Services.";
            hasError = true;
          } else if ((printerState & 0x00000001) !== 0) {
            status = "PAUSED";
            statusDetails = "Printer is paused in Windows Spooler. Resume printing in Windows queue.";
            isPaused = true;
          } else if ((printerState & 0x00000008) !== 0) {
            status = "PAPER_JAM";
            statusDetails = "Paper jam reported by printer hardware. Please clear the paper path.";
            hasError = true;
          } else if ((printerState & 0x00000010) !== 0) {
            status = "OUT_OF_PAPER";
            statusDetails = "Printer is out of paper. Please refill the paper tray.";
            hasError = true;
          } else if (isWorkOffline || (printerState & 0x00000080) !== 0 || statusCode === 7 || !isValid) {
            status = "OFFLINE";
            if (conn.connectionType === "WIFI") {
              statusDetails = "Wi-Fi printer is offline. Verify printer is powered on, awake from sleep, and connected to the same Wi-Fi network.";
            } else if (conn.connectionType === "ETHERNET") {
              statusDetails = "Ethernet printer is offline. Verify network cable, router switch port, and printer IP address.";
            } else if (conn.connectionType === "SHARED") {
              statusDetails = "Shared network printer is offline. Check if the host computer sharing this printer is powered on and accessible.";
            } else if (conn.connectionType === "IPP") {
              statusDetails = "IPP printer is offline or unreachable. Check internet/network connectivity.";
            } else {
              statusDetails = "Printer is offline or disconnected. Check physical cable and power.";
            }
          } else if ((printerState & 0x00000002) !== 0) {
            status = "ERROR";
            statusDetails = "Printer hardware or driver error reported.";
            hasError = true;
          } else if (statusCode === 4 || (printerState & 0x00000400) !== 0) {
            status = "PRINTING";
            statusDetails = "Printer is actively printing documents.";
          }

          const isOnline = status !== "OFFLINE" && !isWorkOffline && isSpoolerRunning && isValid;
          const isReachable = isOnline && status !== "ERROR";

          // Extract and normalize driver paper sizes
          const rawSizes: string[] = Array.isArray(p.PaperSizes) ? p.PaperSizes : [];
          const normalizedSizes: string[] = [];

          for (const s of rawSizes) {
            const clean = String(s).trim();
            if (!clean) continue;
            normalizedSizes.push(clean);
          }

          // Ensure standard A4 is present if none reported
          if (normalizedSizes.length === 0) {
            normalizedSizes.push("A4", "Letter");
          }

          const supportsColor = Boolean(p.SupportsColor);
          const supportsDuplex = Boolean(p.CanDuplex);

          return {
            systemName: name,
            displayName: name,
            driverName: driver || undefined,
            portName: port || undefined,
            connectionType: conn.connectionType,
            connectionDetails: conn.connectionDetails,
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
            supportedSizes: Array.from(new Set(normalizedSizes)),
            isShared: Boolean(p.ShareName) || (attr & 0x00000008) !== 0,
            isNetwork: (attr & 0x00000010) !== 0 || conn.connectionType === "WIFI" || conn.connectionType === "ETHERNET" || conn.connectionType === "SHARED" || conn.connectionType === "IPP",
            serverName: p.ServerName ? String(p.ServerName) : undefined,
            shareName: p.ShareName ? String(p.ShareName) : undefined,
            location: p.Location ? String(p.Location) : undefined,
            comment: p.Comment ? String(p.Comment) : undefined,
            rawAttributes: attr,
          };
        });
    } catch (err: any) {
      logger.error(`Windows printer discovery failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Enumerate real Linux CUPS printers (for test/dev environments)
   */
  private async getLinuxPrinters(): Promise<RealPrinterInfo[]> {
    try {
      const { stdout } = await execFileAsync("lpstat", ["-p", "-d", "-v"], { timeout: 4000 });
      if (!stdout || !stdout.includes("printer")) return [];

      let defaultPrinter = "";
      const defMatch = stdout.match(/system default destination:\s*([^\s]+)/i);
      if (defMatch) defaultPrinter = defMatch[1].trim();

      // Parse device URIs if available (e.g. device for HP: usb://... or socket://...)
      const deviceMap: Record<string, string> = {};
      const uriMatches = stdout.matchAll(/device for ([^:]+):\s*([^\n\r]+)/gi);
      for (const m of uriMatches) {
        deviceMap[m[1].trim()] = m[2].trim();
      }

      const lines = stdout.split("\n");
      const printers: RealPrinterInfo[] = [];

      for (const line of lines) {
        const match = line.match(/^printer\s+([^\s]+)\s+(is\s+(idle|printing|disabled|paused))/i);
        if (match) {
          const name = match[1];
          const stateStr = (match[3] || "").toLowerCase();
          const isDefault = name === defaultPrinter;
          const uri = deviceMap[name] || "CUPS";

          let connType: PrinterConnectionType = "OTHER";
          let connDetails = `CUPS (${uri})`;

          if (/^usb:/i.test(uri)) {
            connType = "USB";
            connDetails = `USB Connection (${uri})`;
          } else if (/^ipp:|^ipps:|^http:|^https:/i.test(uri)) {
            connType = "IPP";
            connDetails = `IPP Network (${uri})`;
          } else if (/^socket:|^lpd:/i.test(uri)) {
            connType = "ETHERNET";
            connDetails = `Network Printer (${uri})`;
          } else if (/^smb:/i.test(uri)) {
            connType = "SHARED";
            connDetails = `Windows SMB Share (${uri})`;
          }

          let status: PrinterOnlineStatus = "READY";
          if (stateStr === "printing") status = "PRINTING";
          else if (stateStr === "disabled" || stateStr === "paused") status = "PAUSED";

          printers.push({
            systemName: name,
            displayName: name.replace(/_/g, " "),
            driverName: "CUPS Linux Driver",
            portName: uri,
            connectionType: connType,
            connectionDetails: connDetails,
            isDefault,
            status,
            isOnline: true,
            isReachable: true,
            isPaused: status === "PAUSED",
            hasError: false,
            supportsColor: true,
            supportsDuplex: true,
            supportedSizes: ["A4", "A3", "LETTER", "LEGAL"],
            isNetwork: connType !== "USB",
          });
        }
      }

      return printers;
    } catch {
      return [];
    }
  }

  /**
   * Genuine Document Printing directly into the Windows Print Spooler
   */
  async printDocument(filePath: string, options: PrintDocumentOptions): Promise<PrintResult> {
    const { printerName } = options;

    if (!fs.existsSync(filePath)) {
      throw new Error(`Print failure: Target document file does not exist at path: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const isPdf = ext === ".pdf";
    const isImage = ext === ".jpg" || ext === ".jpeg" || ext === ".png";

    if (!isPdf && !isImage) {
      throw new Error(`Unsupported document format '${ext}'. Allowed: .pdf, .jpg, .jpeg, .png`);
    }

    // Verify printer existence and health before submitting
    const allPrinters = await this.getInstalledPrinters();
    const targetPrinter = allPrinters.find(
      (p) => p.systemName.toLowerCase() === printerName.toLowerCase()
    );

    if (!targetPrinter) {
      throw new Error(
        `Selected printer '${printerName}' is not installed on this computer. Please select a valid printer in Printer Settings.`
      );
    }

    if (targetPrinter.status === "SPOOLER_STOPPED") {
      throw new Error(
        "Windows Print Spooler service is not running. Please start the Print Spooler service in Windows Services."
      );
    }

    if (!targetPrinter.isOnline) {
      let connAdvice = "Please check physical cable and power.";
      if (targetPrinter.connectionType === "WIFI") {
        connAdvice = "Wi-Fi printer is offline. Verify that the printer is turned on, awake from sleep mode, and connected to the same Wi-Fi network.";
      } else if (targetPrinter.connectionType === "ETHERNET") {
        connAdvice = "Ethernet printer is offline. Verify the network Ethernet cable, router port link light, and printer IP address.";
      } else if (targetPrinter.connectionType === "SHARED") {
        connAdvice = "Windows shared printer is unreachable. Check if the remote computer sharing this printer is powered on and accessible.";
      } else if (targetPrinter.connectionType === "IPP") {
        connAdvice = "IPP network printer is unreachable. Verify network connection and IPP port status.";
      }
      throw new Error(`Printer '${printerName}' (${targetPrinter.connectionType}) is currently OFFLINE or disconnected. ${connAdvice}`);
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

    // Verify capabilities
    if (options.colorMode === "COLOR" && !targetPrinter.supportsColor) {
      logger.warn(
        `Printer '${printerName}' does not advertise color support; job requested COLOR. Proceeding with driver color mapping.`
      );
    }

    // Prepare off-screen printing window
    return new Promise<PrintResult>((resolve, reject) => {
      let printWindow: BrowserWindow | null = new BrowserWindow({
        show: false,
        width: 1024,
        height: 768,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
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

      const doPrint = async (detectedPageCount?: number) => {
        if (!printWindow || printWindow.isDestroyed()) return;

        const copies = Math.max(1, Math.min(100, options.copies || 1));
        const color = options.colorMode === "COLOR";

        let duplexMode: "simplex" | "shortEdge" | "longEdge" = "simplex";
        if (options.duplexMode === "DOUBLE_SIDED_LONG_EDGE") {
          duplexMode = "longEdge";
        } else if (options.duplexMode === "DOUBLE_SIDED_SHORT_EDGE") {
          duplexMode = "shortEdge";
        }

        const pageSize = options.paperSize || "A4";
        const pageRanges = this.parsePageRange(options.pageRange);
        const landscape = Boolean(options.landscape);

        const isVirtualPdfPrinter =
          targetPrinter.systemName.toLowerCase().includes("pdf") ||
          (targetPrinter.portName && targetPrinter.portName.toUpperCase().includes("PORTPROMPT"));

        // Handle virtual/PDF printers (e.g., 'Microsoft Print to PDF')
        if (isVirtualPdfPrinter) {
          logger.info(
            `Target printer '${targetPrinter.systemName}' is a virtual PDF printer (PORTPROMPT:). Exporting print output via printToPDF...`
          );
          try {
            const pdfData = await printWindow.webContents.printToPDF({
              landscape,
              preferCSSPageSize: true,
              printBackground: true,
            });

            let desktopDir: string;
            try {
              desktopDir = app.getPath("desktop");
            } catch {
              desktopDir = path.join(os.homedir(), "Desktop");
            }
            const outputDir = path.join(desktopDir, "Print2Me_Printed_Documents");
            if (!fs.existsSync(outputDir)) {
              fs.mkdirSync(outputDir, { recursive: true });
            }

            const cleanBase = path.basename(filePath, path.extname(filePath));
            const fileName = `Printed_${cleanBase}_${Date.now()}.pdf`;
            const destPath = path.join(outputDir, fileName);
            fs.writeFileSync(destPath, pdfData);

            clearTimeout(timeoutTimer);
            cleanupWindow();

            logger.info(`Successfully exported virtual print to: ${destPath}`);

            try {
              shell.showItemInFolder(destPath);
            } catch {}

            resolve({
              success: true,
              message: `Printed to PDF successfully: ${destPath}`,
              printerName: targetPrinter.systemName,
              spoolStatus: "PRINTED_TO_FILE",
              pageCount: detectedPageCount,
            });
            return;
          } catch (pdfErr: any) {
            logger.error(`printToPDF failed: ${pdfErr.message}`);
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
          margins: { marginType: "none" },
        };

        if (pageRanges && pageRanges.length > 0) {
          electronPrintOptions.pageRanges = pageRanges;
        }

        logger.info(
          `Submitting print job to '${targetPrinter.systemName}': ${JSON.stringify(electronPrintOptions)}`
        );

        printWindow.webContents.print(electronPrintOptions, async (success, failureReason) => {
          clearTimeout(timeoutTimer);
          cleanupWindow();

          if (!success) {
            const reason = failureReason || "Windows spooler rejected document";
            logger.error(`Print submission failed: ${reason}`);
            resolve({
              success: false,
              message: `Windows Spooler Error: ${reason}`,
              printerName: targetPrinter.systemName,
            });
            return;
          }

          // Query Windows print spooler to capture native JobId
          let windowsJobId: number | undefined;
          let spoolStatus = "SPOOLED_TO_WINDOWS_QUEUE";

          if (os.platform() === "win32") {
            try {
              const spoolJobs = await this.getSpoolerJobs(targetPrinter.systemName);
              if (spoolJobs.length > 0) {
                windowsJobId = spoolJobs[0].jobId;
                spoolStatus = spoolJobs[0].jobStatus || "Present in Spooler";
              }
            } catch {
              // Non-fatal if spooler query is slower
            }
          }

          resolve({
            success: true,
            message: `Document successfully submitted to Windows Print Spooler on '${targetPrinter.systemName}' (${targetPrinter.connectionType})`,
            windowsJobId,
            printerName: targetPrinter.systemName,
            connectionType: targetPrinter.connectionType,
            spoolStatus,
            pageCount: detectedPageCount,
          });
        });
      };

      if (isPdf) {
        // Load PDF directly using Chromium's native PDFium engine via file:// URL
        const fileUrl = `file://${path.resolve(filePath).replace(/\\/g, "/")}`;

        // Locate local offline pdf.min.js and pdf.worker.min.js
        let pdfJsContent = "";
        let workerJsContent = "";
        const possiblePdfJsPaths = [
          path.join(__dirname, "../assets/pdfjs/pdf.min.js"),
          path.join(__dirname, "../../assets/pdfjs/pdf.min.js"),
          path.join(process.cwd(), "assets/pdfjs/pdf.min.js"),
        ];
        const possibleWorkerPaths = [
          path.join(__dirname, "../assets/pdfjs/pdf.worker.min.js"),
          path.join(__dirname, "../../assets/pdfjs/pdf.worker.min.js"),
          path.join(process.cwd(), "assets/pdfjs/pdf.worker.min.js"),
        ];

        for (const p of possiblePdfJsPaths) {
          if (fs.existsSync(p)) {
            pdfJsContent = fs.readFileSync(p, "utf-8");
            break;
          }
        }
        for (const p of possibleWorkerPaths) {
          if (fs.existsSync(p)) {
            workerJsContent = fs.readFileSync(p, "utf-8");
            break;
          }
        }

        const orientationCss = options.landscape ? "landscape" : "portrait";
        const pageCssSize = options.paperSize || "A4";
        const isMonochrome = options.colorMode !== "COLOR";

        // Read file as Uint8Array base64 or pass safely to pdfjs
        const pdfBuffer = fs.readFileSync(filePath);
        const base64Pdf = pdfBuffer.toString("base64");

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
                margin: 0; padding: 0; background: #ffffff; width: 100%;
              }
              .pdf-page-wrapper {
                width: 100vw; height: 100vh;
                display: flex; justify-content: center; align-items: center;
                page-break-after: always; page-break-inside: avoid; overflow: hidden;
              }
              .pdf-page-wrapper:last-child { page-break-after: auto; }
              canvas { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
              ${
                isMonochrome
                  ? `
              html, body, #pdf-container, .pdf-page-wrapper, canvas {
                filter: grayscale(100%) contrast(105%) !important;
                -webkit-filter: grayscale(100%) contrast(105%) !important;
              }
              @media print {
                * {
                  filter: grayscale(100%) contrast(105%) !important;
                  -webkit-filter: grayscale(100%) contrast(105%) !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
              `
                  : ""
              }
            </style>
          </head>
          <body>
            <div id="pdf-container"></div>
            <script>${workerJsContent}</script>
            <script>${pdfJsContent}</script>
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
                  window.__PDF_NUM_PAGES__ = pdf.numPages;
                  const container = document.getElementById('pdf-container');
                  const isMono = ${isMonochrome ? "true" : "false"};

                  // Render pages efficiently
                  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 2.0 });

                    const pageWrapper = document.createElement('div');
                    pageWrapper.className = 'pdf-page-wrapper';

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d');

                    await page.render({ canvasContext: ctx, viewport }).promise;

                    if (isMono) {
                      try {
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const d = imgData.data;
                        const len = d.length;
                        for (let i = 0; i < len; i += 4) {
                          // ITU-R BT.601 perceptual luminance conversion (pure achromatic grayscale)
                          const gray = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
                          d[i] = gray;
                          d[i + 1] = gray;
                          d[i + 2] = gray;
                        }
                        ctx.putImageData(imgData, 0, 0);
                      } catch (canvasErr) {
                        console.warn('Canvas pixel desaturation fallback:', canvasErr);
                      }
                    }

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
        fs.writeFileSync(tempHtmlPath, pdfHtml, "utf-8");

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
            const isReady = await printWindow.webContents.executeJavaScript("Boolean(window.__PDF_PRINT_READY__)");
            if (isHandled) return;
            const renderError = await printWindow.webContents.executeJavaScript("window.__PDF_PRINT_ERROR__");
            if (isHandled) return;

            if (renderError) {
              isHandled = true;
              clearInterval(renderCheckInterval);
              clearTimeout(timeoutTimer);
              cleanupWindow();
              try { fs.unlinkSync(tempHtmlPath); } catch {}
              reject(new Error(`PDF rendering failed: ${renderError}`));
              return;
            }

            if (isReady) {
              isHandled = true;
              clearInterval(renderCheckInterval);
              const totalPages = await printWindow.webContents.executeJavaScript("window.__PDF_NUM_PAGES__ || 1");
              setTimeout(() => {
                try { if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath); } catch {}
              }, 5000);
              setTimeout(() => doPrint(totalPages), 250);
            }
          } catch {
            // Window transitioning
          }
        }, 150);
      } else if (isImage) {
        const fileUrl = `file://${path.resolve(filePath).replace(/\\/g, "/")}`;
        const orientationCss = options.landscape ? "landscape" : "portrait";
        const pageCssSize = options.paperSize || "A4";
        const isMonochrome = options.colorMode !== "COLOR";

        const imageBuffer = fs.readFileSync(filePath);
        const base64Img = imageBuffer.toString("base64");
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        const dataUri = `data:${mimeType};base64,${base64Img}`;

        const wrapperHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              @page { size: ${pageCssSize} ${orientationCss}; margin: 0; }
              * { box-sizing: border-box; }
              html, body {
                margin: 0; padding: 0; width: 100vw; height: 100vh;
                overflow: hidden; background: #ffffff;
                display: flex; justify-content: center; align-items: center;
              }
              canvas, img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
              ${
                isMonochrome
                  ? `
              html, body, img, canvas {
                filter: grayscale(100%) contrast(105%) !important;
                -webkit-filter: grayscale(100%) contrast(105%) !important;
              }
              @media print {
                * {
                  filter: grayscale(100%) contrast(105%) !important;
                  -webkit-filter: grayscale(100%) contrast(105%) !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
              }
              `
                  : ""
              }
            </style>
          </head>
          <body>
            ${
              isMonochrome
                ? `
            <canvas id="mono-canvas"></canvas>
            <script>
              const img = new Image();
              img.onload = () => {
                const canvas = document.getElementById('mono-canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                try {
                  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const d = imgData.data;
                  for (let i = 0; i < d.length; i += 4) {
                    const gray = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
                    d[i] = gray;
                    d[i + 1] = gray;
                    d[i + 2] = gray;
                  }
                  ctx.putImageData(imgData, 0, 0);
                } catch (e) {
                  console.warn('Image canvas mono fallback:', e);
                }
                window.__IMAGE_PRINT_READY__ = true;
              };
              img.onerror = () => {
                window.__IMAGE_PRINT_READY__ = true;
              };
              img.src = "${dataUri}";
            </script>
            `
                : `
            <img src="${dataUri}" onload="window.__IMAGE_PRINT_READY__ = true" />
            <script>
              window.__IMAGE_PRINT_READY__ = true;
            </script>
            `
            }
          </body>
          </html>
        `;

        const tempImgHtmlPath = path.join(os.tmpdir(), `p2m-img-render-${Date.now()}.html`);
        fs.writeFileSync(tempImgHtmlPath, wrapperHtml, "utf-8");

        printWindow.loadFile(tempImgHtmlPath).catch((err) => {
          clearTimeout(timeoutTimer);
          cleanupWindow();
          try { fs.unlinkSync(tempImgHtmlPath); } catch {}
          reject(new Error(`Failed to load image wrapper: ${err.message}`));
        });

        printWindow.webContents.on("did-finish-load", () => {
          setTimeout(() => {
            try { if (fs.existsSync(tempImgHtmlPath)) fs.unlinkSync(tempImgHtmlPath); } catch {}
            doPrint(1);
          }, 350);
        });
      }
    });
  }

  /**
   * Queries Windows Print Spooler for active jobs on a specific printer or all printers
   */
  async getSpoolerJobs(printerName?: string): Promise<SpoolerJobInfo[]> {
    if (os.platform() !== "win32") return [];

    try {
      const safeTarget = printerName ? printerName.replace(/'/g, "''") : "";
      const psScript = `
        $OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        $target = '${safeTarget}'
        try {
          $jobs = if ($target) {
            Get-CimInstance -ClassName Win32_PrintJob -Filter "Name LIKE '%$($target -replace "'", "''")%'" -ErrorAction Stop
          } else {
            Get-CimInstance -ClassName Win32_PrintJob -ErrorAction Stop
          }
          if ($jobs) {
            $jobs | Select-Object JobId, Name, Document, JobStatus, Status, TotalPages, PagesPrinted, TimeSubmitted | ConvertTo-Json -Depth 2 -Compress
          } else {
            '[]'
          }
        } catch {
          '[]'
        }
      `;

      const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psScript];
      const { stdout } = await execFileAsync("powershell.exe", args, { timeout: 6000 });
      const rawText = stdout.trim();
      if (!rawText || rawText === "[]" || rawText === "null") return [];

      const parsed = JSON.parse(rawText);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      return list.map((j: any) => ({
        jobId: Number(j.JobId) || 0,
        printerName: String(j.Name || ""),
        documentName: String(j.Document || "Print2Me Document"),
        jobStatus: String(j.JobStatus || j.Status || "Spooling"),
        totalPages: Number(j.TotalPages) || 0,
        pagesPrinted: Number(j.PagesPrinted) || 0,
        timeSubmitted: String(j.TimeSubmitted || new Date().toISOString()),
      }));
    } catch (err: any) {
      logger.warn(`Spooler query notice: ${err.message}`);
      return [];
    }
  }

  /**
   * Opens the native Windows print queue GUI for the specified printer safely using execFile
   */
  async openPrinterQueue(printerName: string): Promise<{ success: boolean; message: string }> {
    if (os.platform() !== "win32") {
      return {
        success: false,
        message: "Native Windows printer queue is only available on Windows operating system.",
      };
    }

    try {
      // Safe execution using execFile with distinct parameters preventing shell injection
      await execFileAsync("rundll32.exe", ["printui.dll,PrintUIEntry", "/o", "/n", printerName]);
      return {
        success: true,
        message: `Opened native Windows print queue for '${printerName}'`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to open Windows queue: ${err.message || "Unknown error"}`,
      };
    }
  }

  /**
   * Opens Windows 10/11 Printer Settings safely
   */
  async openWindowsPrinterSettings(): Promise<{ success: boolean; message: string }> {
    if (os.platform() !== "win32") {
      return {
        success: false,
        message: "Windows Settings is only available on Windows operating system.",
      };
    }

    try {
      await execFileAsync("cmd.exe", ["/c", "start", "ms-settings:printers"]);
      return {
        success: true,
        message: "Opened Windows Printer Settings",
      };
    } catch {
      try {
        await execFileAsync("cmd.exe", ["/c", "control", "printers"]);
        return {
          success: true,
          message: "Opened Control Panel Printers",
        };
      } catch (err: any) {
        return {
          success: false,
          message: `Failed to open settings: ${err.message}`,
        };
      }
    }
  }

  /**
   * Prints a genuine hardware verification test page to the selected printer
   */
  async printTestPage(printerName: string): Promise<PrintResult> {
    const allPrinters = await this.getInstalledPrinters();
    const printer = allPrinters.find(
      (p) => p.systemName.toLowerCase() === printerName.toLowerCase()
    );

    if (!printer) {
      throw new Error(`Target printer '${printerName}' was not found. Please refresh printer list.`);
    }

    const testHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0F172A; line-height: 1.4;
          }
          .header {
            border-bottom: 3px solid #101B3B; padding-bottom: 12px; margin-bottom: 20px;
            display: flex; justify-content: space-between; align-items: center;
          }
          .title { font-size: 22px; font-weight: 800; color: #101B3B; }
          .subtitle { font-size: 13px; color: #64748B; }
          .box {
            background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 16px;
          }
          .row {
            display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #EEF2F6; font-size: 13px;
          }
          .row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #475569; }
          .value { font-weight: 700; color: #0F172A; }
          .color-bars { display: flex; gap: 8px; margin-top: 20px; }
          .bar {
            flex: 1; height: 36px; border-radius: 4px; display: flex; align-items: center;
            justify-content: center; font-size: 11px; font-weight: 800; color: #fff;
          }
          .cyan { background: #06B6D4; }
          .magenta { background: #EC4899; }
          .yellow { background: #EAB308; color: #000; }
          .black { background: #0F172A; }
          .footer {
            margin-top: 30px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; padding-top: 12px;
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
          <div class="row"><span class="label">Connection Type:</span><span class="value" style="color:#0284C7;font-weight:800;">${printer.connectionType} — ${printer.connectionDetails}</span></div>
          <div class="row"><span class="label">Windows Driver:</span><span class="value">${printer.driverName || "Standard Driver"}</span></div>
          <div class="row"><span class="label">Assigned Port:</span><span class="value">${printer.portName || "Unknown"}</span></div>
          <div class="row"><span class="label">OS Default Printer:</span><span class="value">${printer.isDefault ? "Yes" : "No"}</span></div>
          <div class="row"><span class="label">Color Support:</span><span class="value">${printer.supportsColor ? "Full Color" : "Monochrome"}</span></div>
          <div class="row"><span class="label">Duplex (Two-Sided) Support:</span><span class="value">${printer.supportsDuplex ? "Supported" : "Single-Sided Only"}</span></div>
          <div class="row"><span class="label">Supported Paper Sizes:</span><span class="value">${printer.supportedSizes.slice(0, 8).join(", ")}</span></div>
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
    fs.writeFileSync(tempTestFile, testHtml, "utf-8");

    try {
      return await this.printDocument(tempTestFile, {
        printerName: printer.systemName,
        copies: 1,
        colorMode: printer.supportsColor ? "COLOR" : "BLACK_AND_WHITE",
        paperSize: "A4",
      });
    } finally {
      try {
        if (fs.existsSync(tempTestFile)) fs.unlinkSync(tempTestFile);
      } catch {}
    }
  }

  /**
   * Diagnostic summary of network adapters, spooler, and connected printer types
   */
  async getNetworkDiagnostics(): Promise<{
    hasActiveWifi: boolean;
    hasActiveEthernet: boolean;
    networkAdapters: Array<{ name: string; description: string; type: string; status: string }>;
    spoolerRunning: boolean;
    printersByConnection: Record<PrinterConnectionType, number>;
  }> {
    const printers = await this.getInstalledPrinters(false);
    const printersByConnection: Record<PrinterConnectionType, number> = {
      USB: 0,
      WIFI: 0,
      ETHERNET: 0,
      SHARED: 0,
      IPP: 0,
      OTHER: 0,
    };

    for (const p of printers) {
      if (printersByConnection[p.connectionType] !== undefined) {
        printersByConnection[p.connectionType]++;
      } else {
        printersByConnection.OTHER++;
      }
    }

    let hasActiveWifi = false;
    let hasActiveEthernet = false;
    const networkAdapters: Array<{ name: string; description: string; type: string; status: string }> = [];

    if (os.platform() === "win32") {
      try {
        const psScript = `
          [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | ForEach-Object {
            [PSCustomObject]@{
              Name = $_.Name
              Description = $_.Description
              Type = $_.NetworkInterfaceType.ToString()
              Status = $_.OperationalStatus.ToString()
            }
          } | ConvertTo-Json -Depth 2 -Compress
        `;
        const { stdout } = await execFileAsync(
          "powershell.exe",
          ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", psScript],
          { timeout: 6000 }
        );
        const parsed = JSON.parse(stdout.trim() || "[]");
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) {
          if (!item || !item.Name) continue;
          const isUp = item.Status === "Up";
          if (isUp && item.Type === "Wireless80211") hasActiveWifi = true;
          if (isUp && item.Type === "Ethernet") hasActiveEthernet = true;
          networkAdapters.push({
            name: String(item.Name),
            description: String(item.Description || ""),
            type: String(item.Type || "Unknown"),
            status: String(item.Status || "Unknown"),
          });
        }
      } catch {}
    }

    const spoolerRunning = printers.length > 0 ? printers[0].status !== "SPOOLER_STOPPED" : true;

    return {
      hasActiveWifi,
      hasActiveEthernet,
      networkAdapters,
      spoolerRunning,
      printersByConnection,
    };
  }
}

export const printerService = new WindowsPrinterService();
