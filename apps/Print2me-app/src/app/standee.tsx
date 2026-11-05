import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { Image } from 'expo-image';
import { QrCode, Share2, Printer, Store, ArrowUpRight } from 'lucide-react-native';
import { Palette, Shadows } from '@/constants/theme';
import { useAuth } from '@/services/authContext';
import { PrintService } from '@/services/printService';
import { StorageService } from '@/services/storage';

export default function StandeeScreen() {
  const { user } = useAuth();
  const [printing, setPrinting] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);

  const vendorName = user?.vendor?.name || 'Campus Print Station';
  const vendorSlug = user?.vendor?.slug || 'campus-print';
  const targetUrl = `https://print2me.in/v/${vendorSlug}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    targetUrl
  )}&color=0E1A3A&bgcolor=FFFFFF&margin=1`;

  useEffect(() => {
    let isMounted = true;
    const loadQrCode = async () => {
      setLoadingQr(true);
      try {
        const baseUrl = await StorageService.getApiBaseUrl();
        const url = `${baseUrl.replace(/\/+$/, '')}/api/qr/${vendorSlug}`;
        const res = await fetch(url);
        if (res.ok) {
          const svg = await res.text();
          if (isMounted && svg.includes('<svg')) {
            setSvgContent(svg);
            setLoadingQr(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Backend QR fetch failed, using fallback:', err);
      }
      if (isMounted) setLoadingQr(false);
    };

    loadQrCode();
    return () => {
      isMounted = false;
    };
  }, [vendorSlug]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Print documents instantly at ${vendorName}: ${targetUrl}`,
        url: targetUrl,
        title: `${vendorName} - Online Printing`,
      });
    } catch (err: any) {
      console.warn('Share error:', err);
    }
  };

  const handlePrintStandeeSheet = async () => {
    setPrinting(true);
    try {
      const standeeHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                margin: 0;
                padding: 40px;
                color: #0E1A3A;
                text-align: center;
              }
              .border-frame {
                border: 4px solid #0E1A3A;
                border-radius: 24px;
                padding: 40px 20px;
                background-color: #FAF7F2;
              }
              .tag {
                display: inline-block;
                background-color: #FF8A1F;
                color: #FFFFFF;
                padding: 8px 20px;
                border-radius: 999px;
                font-size: 16px;
                font-weight: 800;
                letter-spacing: 1px;
                text-transform: uppercase;
                margin-bottom: 20px;
              }
              h1 {
                font-size: 36px;
                margin: 0 0 10px 0;
                font-weight: 900;
              }
              p {
                font-size: 18px;
                color: #4A5578;
                margin: 0 0 30px 0;
              }
              .qr-box {
                background: #FFFFFF;
                padding: 24px;
                display: inline-block;
                border-radius: 20px;
                border: 2px solid #E7E1D6;
                box-shadow: 0 8px 24px rgba(14,26,58,0.08);
              }
              .qr-box img {
                width: 280px;
                height: 280px;
              }
              .instructions {
                margin-top: 30px;
                font-size: 16px;
                font-weight: 700;
                color: #0E1A3A;
              }
              .url {
                margin-top: 10px;
                font-family: monospace;
                font-size: 18px;
                color: #FF8A1F;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="border-frame">
              <div class="tag">⚡ Express Print Station</div>
              <h1>${vendorName}</h1>
              <p>Scan with your phone camera to send print jobs directly to our counter</p>
              
              <div class="qr-box">
                <img src="${qrImageUrl}" alt="Scan to print" />
              </div>

              <div class="instructions">
                1. Scan QR with Camera or Google Lens<br/>
                2. Upload your PDF & choose Color / B&W<br/>
                3. Collect your fresh prints right here!
              </div>

              <div class="url">${targetUrl}</div>
            </div>
          </body>
        </html>
      `;

      await PrintService.printReceiptSlip(standeeHtml);
      Alert.alert('Sent to Printer', 'Counter standee sheet sent to your WiFi printer.');
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Could not print standee.');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Standee Board Card */}
        <View style={styles.standeeCard}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>COUNTER QR STANDEE</Text>
            </View>
          </View>

          <Text style={styles.storeTitle}>{vendorName}</Text>
          <Text style={styles.scanSubtitle}>
            Customers scan this code with their phone camera to upload and pay for prints.
          </Text>

          {/* QR Container */}
          <View style={styles.qrContainer}>
            <View style={styles.qrImageFrame}>
              {loadingQr ? (
                <View style={styles.qrLoaderBox}>
                  <ActivityIndicator size="large" color={Palette.saffron.DEFAULT} />
                </View>
              ) : svgContent ? (
                <SvgXml xml={svgContent} width={220} height={220} />
              ) : (
                <Image
                  source={{ uri: qrImageUrl }}
                  style={{ width: 220, height: 220, borderRadius: 10 }}
                  contentFit="contain"
                />
              )}
            </View>
            <View style={styles.urlPill}>
              <Text style={styles.urlText}>print2me.in/v/{vendorSlug}</Text>
            </View>
          </View>

          {/* Instructions Box */}
          <View style={styles.stepsBox}>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <Text style={styles.stepDesc}>Customer scans code with camera or UPI</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <Text style={styles.stepDesc}>Uploads PDF & chooses B&W or Color</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <Text style={styles.stepDesc}>Orders arrive on your phone ready to print</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.printStandeeBtn}
              onPress={handlePrintStandeeSheet}
              disabled={printing}
            >
              <Printer size={18} color="#FFFFFF" />
              <Text style={styles.printStandeeBtnText}>Print A4 Standee via WiFi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Share2 size={16} color={Palette.ink.DEFAULT} />
              <Text style={styles.shareBtnText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  container: {
    padding: 16,
    paddingBottom: 90,
  },
  standeeCard: {
    backgroundColor: Palette.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Palette.hairline,
    padding: 24,
    alignItems: 'center',
    ...Shadows.card,
  },
  badgeRow: {
    marginBottom: 12,
  },
  badge: {
    backgroundColor: Palette.saffron.tint,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F7D6B3',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.saffron.dark,
    letterSpacing: 0.5,
  },
  storeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
    textAlign: 'center',
    marginBottom: 6,
  },
  scanSubtitle: {
    fontSize: 13,
    color: Palette.ink.soft,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  qrContainer: {
    backgroundColor: Palette.paper,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.hairline,
    alignItems: 'center',
    marginBottom: 20,
    ...Shadows.soft,
  },
  qrImageFrame: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  qrLoaderBox: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlPill: {
    backgroundColor: Palette.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.hairline,
    marginTop: 14,
  },
  urlText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.saffron.DEFAULT,
  },
  stepsBox: {
    width: '100%',
    backgroundColor: Palette.paper,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.saffron.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.ink.DEFAULT,
    flex: 1,
  },
  actionsRow: {
    width: '100%',
    gap: 10,
  },
  printStandeeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.saffron.DEFAULT,
    paddingVertical: 14,
    borderRadius: 16,
    ...Shadows.soft,
  },
  printStandeeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.hairline,
    paddingVertical: 12,
    borderRadius: 16,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
});
