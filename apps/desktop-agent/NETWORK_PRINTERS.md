# Print2Me Desktop Agent — Wi-Fi & Network Printer Technical Guide

## 1. Overview & Supported Printer Connection Types

Print2Me Desktop Agent connects local print shop workstations to customer print orders from `print2me.in`. The desktop agent leverages the Windows Print Architecture, communicating directly with installed Windows printer drivers, ports, and the Windows Print Spooler (`winspool`).

The desktop agent supports six primary connection types:

| Connection Type | Technical Medium | Detection Method | Typical Windows Port |
| :--- | :--- | :--- | :--- |
| **USB** | Direct USB 2.0 / 3.0 cable | Port name matches `USB*` or `DOT4*` (IEEE 1284.4) | `USB001`, `USB002`, `DOT4_001` |
| **Wi-Fi** | IEEE 802.11 Wireless LAN | WSD port on wireless interface or explicit Wi-Fi driver/port marker | `WSD-xxxx`, TCP/IP port on Wi-Fi subnet |
| **Ethernet** | IEEE 802.3 Wired LAN Cable | Standard TCP/IP Port monitor, static IP / DHCP IP or WSD over Ethernet | `IP_192.168.1.50`, `192.168.x.x`, `:9100` |
| **Shared** | Windows SMB Network Sharing | UNC naming (`\\server\printer`), `PRINTER_ATTRIBUTE_NETWORK` (0x10), or `HKCU:\Printers\Connections` | `\\SERVER\ShareName`, `Ne01:` |
| **IPP** | Internet Printing Protocol | URL scheme in port (`http://`, `https://`, `ipp://`, `ipps://`) | `http://192.168.1.80:631/printers/...` |
| **Other / Virtual**| Software PDF/XPS Export | Virtual file ports, `PORTPROMPT:`, `nul:`, `FILE:` | `PORTPROMPT:`, `nul:`, `FILE:` |

---

## 2. Windows Printer Discovery Architecture

The desktop agent uses a resilient, high-performance, non-blocking multi-source discovery pipeline:

1. **System.Drawing Driver Reflection Layer (`System.Drawing.Printing.PrinterSettings`)**:
   - Queries real driver settings for all installed printers in user and machine context.
   - Accurately retrieves real supported paper sizes (`PaperSizes`), color support (`SupportsColor`), hardware duplex capabilities (`CanDuplex`), and default status (`IsDefaultPrinter`).
   - Verifies whether the printer driver is installed and currently valid (`IsValid`).

2. **Windows Registry Spooler Layer (`HKLM:\SYSTEM\CurrentControlSet\Control\Print\Printers`)**:
   - Extracts hardware port names (`Port`), driver names (`Printer Driver`), spooler attributes (`Attributes`), status flags (`Status`), share names (`Share Name`), and network server names (`ServerName`).
   - Retrieves user-connected remote network printers from `HKCU:\Printers\Connections` and `HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Devices`.

3. **Pure .NET Network Interface Layer (`System.Net.NetworkInformation.NetworkInterface`)**:
   - Identifies active host physical adapters (Wi-Fi 802.11 vs Gigabit Ethernet 802.3) in milliseconds without CIM/WMI service dependencies.
   - Distinguishes whether WSD and TCP/IP printers communicate over wireless Wi-Fi or wired Ethernet LAN.

4. **Print Spooler CIM/WMI Fallback (`Win32_Printer`)**:
   - Enriches real-time hardware status flags (`PrinterState`, `PrinterStatus`, `WorkOffline`) when CIM is accessible, with zero-crash fallback if CIM permissions are restricted.

5. **In-Memory TTL Caching**:
   - Discovered printers are cached in memory with a 12-second TTL. Repeated UI renders and checks return instantly (0 ms latency).
   - Calling `syncPrinters()` or clicking "Refresh Printers" executes a force-refresh, bypassing the cache.

---

## 3. How Vendors Install a Wi-Fi Printer in Windows

1. Turn on the Wi-Fi printer and connect it to your shop's Wi-Fi router (refer to printer manual or LCD menu to connect to your Wi-Fi SSID).
2. On your Windows computer, open **Settings &rarr; Bluetooth &amp; devices &rarr; Printers &amp; scanners**.
3. Click **Add device**. Windows will search for network printers using WS-Discovery and mDNS.
4. When your printer appears (e.g. `HP LaserJet Pro MFP (Wi-Fi)`), click **Add device**.
5. Windows automatically installs the manufacturer driver and binds a `WSD-` or TCP/IP port.
6. Open the Print2Me Desktop Agent and click **Refresh Printers**. Your printer will display with the green **Wi-Fi** badge.

---

## 4. How Vendors Install an Ethernet / LAN Printer in Windows

1. Connect the printer using an Ethernet cable (RJ45) directly to your Wi-Fi router or shop network switch.
2. Print a Network Configuration Page from the printer control panel to note its IP address (e.g. `192.168.1.150`).
3. In Windows, go to **Settings &rarr; Bluetooth &amp; devices &rarr; Printers &amp; scanners**.
4. Click **Add device**, wait a few seconds, then click **Add manually**.
5. Choose **Add a printer using an IP address or hostname**.
6. Set Device type to **TCP/IP Device**, enter the printer's IP address (e.g. `192.168.1.150`), and check *Query the printer and automatically select the driver to use*.
7. Finish the wizard. The printer will appear in Print2Me with the indigo **Ethernet** badge.

---

## 5. How Vendors Connect Windows Shared Printers

If the printer is physically plugged into another counter PC in your shop:
1. On the host computer sharing the printer:
   - Go to Control Panel &rarr; View devices and printers.
   - Right-click the printer &rarr; **Printer Properties** &rarr; **Sharing** tab.
   - Check **Share this printer** and note the share name (e.g. `Canon2900`).
2. On this workstation:
   - Press `Win + R`, type `\\<HostComputerName>` (e.g. `\\COUNTER-PC`), and press Enter.
   - Right-click the shared printer and click **Connect**.
3. In Print2Me, click **Refresh Printers**. The printer will appear with the amber **Shared** badge.

---

## 6. How to Select and Configure Printers in Print2Me

1. Open the Print2Me Desktop Agent and navigate to the **Printers &amp; Hardware** tab.
2. In the **Smart Hardware Routing** card:
   - Select your **Default B&W Laser Printer** from the dropdown (used for black & white document pages).
   - Select your **Default Color Printer** from the dropdown (used for color documents, photos, and posters).
3. Click **Save Routing Rules**.
4. Print2Me automatically inspects incoming customer orders and dispatches B&W pages to your laser hardware and color pages to your color hardware.
5. Click **Test Print** on any printer card to verify physical driver and spooler communication.

---

## 7. Troubleshooting Offline Network Printers

If a Wi-Fi or Ethernet printer shows `OFFLINE` in Print2Me:

1. **Printer Sleep / Power Save Mode**:
   Many Wi-Fi printers enter deep sleep after 15 minutes of inactivity and disconnect from Wi-Fi. Press the Power or Wake button on the printer control panel to wake it up.
2. **Router Reboot / IP Address Change**:
   If your Wi-Fi router restarted, the printer may have received a new DHCP IP address. Turn the printer off, wait 10 seconds, and turn it back on so Windows updates the network route.
3. **Windows Network Profile Set to Public**:
   Windows blocks network printer discovery when connected to a "Public" network. In Windows Settings &rarr; Network &amp; internet &rarr; Wi-Fi &rarr; Network properties, set Network profile type to **Private network**.
4. **Windows Network Discovery Disabled**:
   Open Windows Control Panel &rarr; Network and Sharing Center &rarr; Advanced sharing settings &rarr; Enable **Turn on network discovery**.
5. **Windows Print Spooler Stalled**:
   Press `Win + R`, type `services.msc`, locate **Print Spooler**, right-click and choose **Restart**.

---

## 8. Network Connection Diagnostics & Error Handling

- **No Silent Fallback**: Print2Me never silently switches print orders to an unintended printer if your preferred printer is offline. If your preferred printer is offline, the job transitions to `NEEDS_ATTENTION`, notifying the vendor in the dashboard so orders are never misrouted or wasted.
- **Pre-flight Health Checks**: Before sending any document to Windows, Print2Me validates spooler readiness, paper status, offline state, and paper jam state.
- **Native Spooler Tracking**: Print2Me records the Windows Spooler Job ID (`windowsJobId`) and tracks printing progress until the job exits the Windows spool queue cleanly.

---

## 9. Known Limitations

1. **Host Standby / Hibernation**: The Print2Me Desktop Agent must run on an active Windows computer that does not enter deep sleep during shop operating hours.
2. **Guest Wi-Fi Isolation**: If the vendor PC is connected to a guest Wi-Fi network that enables "Client Isolation", devices on the network cannot communicate with each other. Use the shop's primary private Wi-Fi network.
3. **Virtual File Printers**: Printers with ports configured as `PORTPROMPT:` (e.g. Microsoft Print to PDF) cannot prompt an interactive GUI during background unattended automation; Print2Me automatically redirects virtual print jobs to a dedicated export folder on the desktop.

