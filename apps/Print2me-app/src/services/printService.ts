import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { StorageService } from './storage';

export interface PrintOptions {
  copies?: number;
  orientation?: 'portrait' | 'landscape';
  duplex?: boolean;
}

export const PrintService = {
  /**
   * Open native printer picker (AirPrint / Mopria), save the selection
   * persistently, and return the chosen printer URL.
   * Returns null if the user cancels or the platform is web.
   */
  async selectAndSavePrinter(): Promise<string | null> {
    if (Platform.OS === 'web') return null;
    try {
      const printer = await Print.selectPrinterAsync();
      if (printer?.url) {
        await StorageService.setPrinterUrl(printer.url);
        console.log('[Print2Me] Printer saved:', printer.url);
        return printer.url;
      }
      return null;
    } catch (err: any) {
      console.warn('[Print2Me] Printer selection cancelled or failed:', err?.message);
      return null;
    }
  },

  /**
   * Print a document via local WiFi using the native mobile print framework
   * (AirPrint on iOS, Mopria/Android Print Service on Android)
   */
  async printRemoteDocument(
    downloadUrl: string,
    filename: string,
    options?: PrintOptions
  ): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // In web preview, open printable window or iframe
        const printWindow = window.open(downloadUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        }
        return true;
      }

      // 1. Prepare local cache path
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const targetLocalUri = `${FileSystem.cacheDirectory}${Date.now()}_${safeFilename}`;

      // 2. Download remote file to local device cache
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, targetLocalUri);
      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download file (HTTP ${downloadResult.status})`);
      }

      // 3. Load saved printer URL (if vendor has previously selected one)
      const printerUrl = await StorageService.getPrinterUrl();

      // 4. Invoke native WiFi print dialog (AirPrint / Mopria)
      await Print.printAsync({
        uri: downloadResult.uri,
        orientation: options?.orientation === 'landscape' ? Print.Orientation.landscape : Print.Orientation.portrait,
        ...(printerUrl ? { printerUrl } : {}),
      });

      // 5. Clean up downloaded file in the background
      FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {});

      return true;
    } catch (err: any) {
      console.error('WiFi Print Error:', err);
      throw err;
    }
  },

  /**
   * Print an HTML receipt / token slip directly to a local printer
   */
  async printReceiptSlip(receiptHtml: string): Promise<boolean> {
    try {
      // Load saved printer URL (if vendor has previously selected one)
      const printerUrl = Platform.OS !== 'web'
        ? await StorageService.getPrinterUrl()
        : null;

      await Print.printAsync({
        html: receiptHtml,
        ...(printerUrl ? { printerUrl } : {}),
      });
      return true;
    } catch (err: any) {
      console.error('Receipt print error:', err);
      throw err;
    }
  },

  /**
   * Generate standard order receipt HTML for counter printing with big Token #
   */
  formatOrderReceiptHtml(order: any, vendorName: string): string {
    const rawDigits = (order.orderNumber || '').replace(/[^0-9]/g, '');
    const tokenNumber = rawDigits.slice(-2) || (order.orderNumber || '').slice(-2).toUpperCase();

    const itemsHtml = (order.items || [])
      .map(
        (item: any) => `
        <tr style="border-bottom: 1px dashed #ccc;">
          <td style="padding: 6px 0;">
            <strong>${item.document?.originalName || 'Document'}</strong><br/>
            <small>${item.paperSize} • ${item.colorMode === 'COLOR' ? 'Color' : 'B&W'} • ${item.copies} copy</small>
          </td>
          <td style="text-align: right; vertical-align: top; padding: 6px 0;">
            ${item.pageCount || 1} pgs
          </td>
        </tr>
      `
      )
      .join('');

    const totalInr = ((order.totalAmountMinor || 0) / 100).toFixed(2);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; padding: 18px; color: #0E1A3A; }
            .header { text-align: center; border-bottom: 2px dashed #0E1A3A; padding-bottom: 12px; margin-bottom: 12px; }
            .token-box { background: #0E1A3A; color: #FFFFFF; padding: 6px 14px; border-radius: 8px; display: inline-block; margin: 6px 0; }
            .token-title { font-size: 11px; letter-spacing: 1px; margin: 0; color: #FF8A1F; font-weight: bold; }
            .token-num { font-size: 26px; font-weight: 900; margin: 2px 0 0; }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-weight: bold; font-size: 11px; }
            .paid { background-color: #E4F6EE; color: #14A36B; }
            .cash { background-color: #FFF1E0; color: #FF8A1F; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .total { font-size: 18px; font-weight: bold; margin-top: 12px; border-top: 2px solid #0E1A3A; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0; font-size: 18px;">${vendorName}</h2>
            <div class="token-box">
              <div class="token-title">PICKUP TOKEN</div>
              <div class="token-num">#${tokenNumber}</div>
            </div>
            <p style="margin: 4px 0 0; font-size: 11px; color: #4A5578;">Order #${order.orderNumber}</p>
          </div>
          <div>
            <p style="margin: 2px 0;"><strong>Customer:</strong> ${order.customerName || 'Walk-in'}</p>
            <p style="margin: 2px 0;"><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
            <p style="margin: 2px 0;"><strong>Payment:</strong> 
              <span class="badge ${order.paymentStatus === 'SUCCESS' || order.paymentStatus === 'CASH_COLLECTED' ? 'paid' : 'cash'}">
                ${order.paymentStatus}
              </span>
            </p>
          </div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #0E1A3A; font-size: 11px; text-transform: uppercase;">
                <th style="text-align: left; padding-bottom: 4px;">Item</th>
                <th style="text-align: right; padding-bottom: 4px;">Pages</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total" style="display: flex; justify-content: space-between;">
            <span>Total Amount:</span>
            <span>₹${totalInr}</span>
          </div>
          <p style="text-align: center; font-size: 11px; color: #8A94A6; margin-top: 20px;">Thank you for printing with Print2Me!</p>
        </body>
      </html>
    `;
  },

  /**
   * Generate daily shift settlement and paper consumption summary slip
   */
  formatDailySettlementSlipHtml(summary: any, vendorName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; padding: 20px; color: #0E1A3A; }
            .header { text-align: center; border-bottom: 2px dashed #0E1A3A; padding-bottom: 12px; margin-bottom: 14px; }
            .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #EEE; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; font-weight: bold; border-top: 2px solid #0E1A3A; margin-top: 10px; }
            .section { font-size: 11px; font-weight: bold; color: #FF8A1F; text-transform: uppercase; margin: 14px 0 6px; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0; font-size: 18px;">${vendorName}</h2>
            <p style="margin: 4px 0 0; font-size: 12px; color: #4A5578;">DAILY REGISTER SETTLEMENT SLIP</p>
            <p style="margin: 4px 0 0; font-size: 11px; color: #8A94A6;">Generated: ${new Date().toLocaleString()}</p>
          </div>

          <div class="section">Financial Reconciliation</div>
          <div class="row"><span>Cash Collected in Drawer:</span><strong>₹${summary.cashRevenue}</strong></div>
          <div class="row"><span>Online UPI Payments:</span><strong>₹${summary.onlineRevenue}</strong></div>
          <div class="total-row"><span>Total Gross Revenue:</span><strong>₹${summary.totalRevenue}</strong></div>

          <div class="section">Paper & Volume Consumption</div>
          <div class="row"><span>Total Orders Processed:</span><strong>${summary.totalOrders}</strong></div>
          <div class="row"><span>Total Sheets Printed:</span><strong>${summary.totalSheets} sheets</strong></div>
          <div class="row"><span>B&W Pages:</span><strong>${summary.bwSheets}</strong></div>
          <div class="row"><span>Color Pages:</span><strong>${summary.colorSheets}</strong></div>

          <div class="section">Status Breakdown</div>
          <div class="row"><span>Ready / Completed:</span><strong>${summary.completedOrders}</strong></div>
          <div class="row"><span>Pending Action:</span><strong>${summary.pendingOrders}</strong></div>

          <p style="text-align: center; font-size: 11px; color: #8A94A6; margin-top: 24px;">Print2Me Campus Workstation Network</p>
        </body>
      </html>
    `;
  },
};
