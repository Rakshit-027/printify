import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Printer,
  Wifi,
  DollarSign,
  Clock,
  MapPin,
  Server,
  LogOut,
  CheckCircle,
  Coins,
  Save,
  ShieldCheck,
  ExternalLink,
  FileText,
  Search,
  X,
} from 'lucide-react-native';
import { Palette, Shadows } from '@/constants/theme';
import { useAuth } from '@/services/authContext';
import { PrintService } from '@/services/printService';
import { StorageService } from '@/services/storage';
import { Api } from '@/services/api';
import { DEFAULT_SERVER_URL } from '@/constants/serverConfig';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [cashOnDesk, setCashOnDesk] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [autoPrint, setAutoPrintState] = useState(true);
  const [apiUrl, setApiUrl] = useState(DEFAULT_SERVER_URL);
  const [testingPrint, setTestingPrint] = useState(false);
  const [selectingPrinter, setSelectingPrinter] = useState(false);
  const [savedPrinterUrl, setSavedPrinterUrl] = useState<string | null>(null);

  // Editable pricing states (in Rupees)
  const [bwSingle, setBwSingle] = useState('2.00');
  const [bwDouble, setBwDouble] = useState('1.75');
  const [colorSingle, setColorSingle] = useState('10.00');
  const [minOrder, setMinOrder] = useState('5.00');
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  const fetchPricing = async () => {
    try {
      setLoadingPricing(true);
      const rules = await Api.getPricing();
      for (const rule of rules) {
        const rateInRupees = (rule.price_per_side_minor / 100).toFixed(2);
        if (rule.color_mode === 'BLACK_AND_WHITE') {
          if (!rule.is_duplex) setBwSingle(rateInRupees);
          else setBwDouble(rateInRupees);
        } else if (rule.color_mode === 'COLOR') {
          if (!rule.is_duplex) setColorSingle(rateInRupees);
        }
        if (rule.minimum_order_minor) {
          setMinOrder((rule.minimum_order_minor / 100).toFixed(2));
        }
      }
    } catch (err) {
      console.warn('Failed to load pricing:', err);
    } finally {
      setLoadingPricing(false);
    }
  };

  useEffect(() => {
    StorageService.getApiBaseUrl().then((url) => {
      if (url) setApiUrl(url);
    });
    StorageService.getAutoPrint().then(setAutoPrintState);
    StorageService.getPrinterUrl().then(setSavedPrinterUrl);
    if (user?.vendor?.allowCashOnDesk !== undefined) {
      setCashOnDesk(user.vendor.allowCashOnDesk);
    }
    fetchPricing();
  }, [user]);

  const handleToggleAutoPrint = async (val: boolean) => {
    setAutoPrintState(val);
    await StorageService.setAutoPrint(val);
  };

  const handleSaveApiUrl = async () => {
    await StorageService.setApiBaseUrl(apiUrl);
    Alert.alert('Saved', 'API base URL updated successfully.');
  };

  const handleSaveRates = async () => {
    const bwSingleNum = parseFloat(bwSingle);
    const bwDoubleNum = parseFloat(bwDouble);
    const colorSingleNum = parseFloat(colorSingle);
    const minOrderNum = parseFloat(minOrder);

    if (isNaN(bwSingleNum) || isNaN(bwDoubleNum) || isNaN(colorSingleNum) || isNaN(minOrderNum)) {
      Alert.alert('Invalid Rates', 'Please enter valid numerical prices.');
      return;
    }

    setSavingPricing(true);
    try {
      const payload = [
        {
          paper_size: 'A4',
          color_mode: 'BLACK_AND_WHITE',
          is_duplex: false,
          price_per_side_minor: Math.round(bwSingleNum * 100),
          sheet_charge_minor: 0,
          minimum_order_minor: Math.round(minOrderNum * 100),
          version: 1,
        },
        {
          paper_size: 'A4',
          color_mode: 'BLACK_AND_WHITE',
          is_duplex: true,
          price_per_side_minor: Math.round(bwDoubleNum * 100),
          sheet_charge_minor: 0,
          minimum_order_minor: Math.round(minOrderNum * 100),
          version: 1,
        },
        {
          paper_size: 'A4',
          color_mode: 'COLOR',
          is_duplex: false,
          price_per_side_minor: Math.round(colorSingleNum * 100),
          sheet_charge_minor: 0,
          minimum_order_minor: Math.round(minOrderNum * 100),
          version: 1,
        },
      ];

      await Api.updatePricing(payload);
      Alert.alert('Success', 'Printing rates updated and synced with backend!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update rates.');
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSelectPrinter = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Android Printer Setup',
        'On Android, your printer is detected automatically via Mopria Print Service when you tap "Run Test Print". Ensure your printer is on the same WiFi network and Mopria is installed.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectingPrinter(true);
    try {
      const printerUrl = await PrintService.selectAndSavePrinter();
      if (printerUrl) {
        setSavedPrinterUrl(printerUrl);
        Alert.alert('Printer Saved', 'Your WiFi printer has been selected and saved. All future print jobs will go directly to this printer.');
      }
    } catch (err: any) {
      Alert.alert('Printer Error', err?.message || 'Could not open printer picker.');
    } finally {
      setSelectingPrinter(false);
    }
  };

  const handleClearPrinter = async () => {
    await StorageService.setPrinterUrl(null);
    setSavedPrinterUrl(null);
    Alert.alert('Printer Cleared', 'Printer preference removed. The system picker will appear on the next print.');
  };

  const handleTestPrint = async () => {
    setTestingPrint(true);
    try {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px; color: #0E1A3A;">
            <h1 style="color: #FF8A1F; font-size: 28px;">Print2Me WiFi Test Print</h1>
            <p style="font-size: 16px;">This page confirms your mobile device is connected to your shop printer via WiFi.</p>
            <div style="border: 2px dashed #0E1A3A; padding: 20px; margin: 30px auto; max-width: 400px; border-radius: 12px;">
              <p><strong>Vendor:</strong> ${user?.vendor?.name || 'Campus Print Station'}</p>
              <p><strong>Status:</strong> ✅ Wireless Spooler Operational</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="font-size: 12px; color: #8A94A6;">Print2Me Mobile Platform</p>
          </body>
        </html>
      `;
      await PrintService.printReceiptSlip(testHtml);
      Alert.alert('Success', 'Test page sent to printer dialog.');
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Could not test printer.');
    } finally {
      setTestingPrint(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Screen Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Store & Rates Setup</Text>
          <Text style={styles.headerSubtitle}>
            Configure printing rates, wireless printing, and counter payment rules.
          </Text>
        </View>

        {/* Section: Pricing Matrix */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Coins size={18} color={Palette.saffron.DEFAULT} />
              <Text style={styles.sectionTitle}>Printing Rates (₹ / side)</Text>
            </View>
            {loadingPricing && <ActivityIndicator size="small" color={Palette.saffron.DEFAULT} />}
          </View>
          <Text style={styles.sectionDesc}>
            Set your per-side charges. Customers will automatically see these rates when ordering:
          </Text>

          <View style={styles.ratesGrid}>
            <View style={styles.rateBox}>
              <Text style={styles.rateLabel}>B&W (Single Sided)</Text>
              <View style={styles.rateInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.rateInput}
                  value={bwSingle}
                  onChangeText={setBwSingle}
                  keyboardType="decimal-pad"
                  placeholder="2.00"
                  placeholderTextColor={Palette.ink.muted}
                />
                <Text style={styles.rateUnit}>/ side</Text>
              </View>
            </View>

            <View style={styles.rateBox}>
              <Text style={styles.rateLabel}>B&W (Double Sided)</Text>
              <View style={styles.rateInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.rateInput}
                  value={bwDouble}
                  onChangeText={setBwDouble}
                  keyboardType="decimal-pad"
                  placeholder="1.75"
                  placeholderTextColor={Palette.ink.muted}
                />
                <Text style={styles.rateUnit}>/ side</Text>
              </View>
            </View>

            <View style={styles.rateBox}>
              <Text style={styles.rateLabel}>Color (Single Sided)</Text>
              <View style={styles.rateInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.rateInput}
                  value={colorSingle}
                  onChangeText={setColorSingle}
                  keyboardType="decimal-pad"
                  placeholder="10.00"
                  placeholderTextColor={Palette.ink.muted}
                />
                <Text style={styles.rateUnit}>/ side</Text>
              </View>
            </View>

            <View style={styles.rateBox}>
              <Text style={styles.rateLabel}>Minimum Order</Text>
              <View style={styles.rateInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.rateInput}
                  value={minOrder}
                  onChangeText={setMinOrder}
                  keyboardType="decimal-pad"
                  placeholder="5.00"
                  placeholderTextColor={Palette.ink.muted}
                />
                <Text style={styles.rateUnit}>total</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveRatesBtn, savingPricing && { opacity: 0.7 }]}
            onPress={handleSaveRates}
            disabled={savingPricing}
          >
            {savingPricing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.saveRatesBtnText}>Save Rates to Server</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Section: WiFi Printer Setup */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Wifi size={18} color={Palette.saffron.DEFAULT} />
            <Text style={styles.sectionTitle}>Wireless Printing</Text>
          </View>

          <Text style={styles.sectionDesc}>
            Print2Me connects directly to any WiFi or Network printer on your local shop router
            using AirPrint or Android Mopria Print Framework.
          </Text>

          {/* Saved Printer Info */}
          {savedPrinterUrl ? (
            <View style={styles.printerSavedRow}>
              <CheckCircle size={14} color={Palette.success.DEFAULT} />
              <Text style={styles.printerSavedText} numberOfLines={1}>
                {savedPrinterUrl}
              </Text>
              <TouchableOpacity onPress={handleClearPrinter} hitSlop={8}>
                <X size={14} color={Palette.ink.soft} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.printerSavedRow}>
              <Search size={14} color={Palette.ink.muted} />
              <Text style={[styles.printerSavedText, { color: Palette.ink.muted }]}>
                No printer saved — tap below to select
              </Text>
            </View>
          )}

          {/* Select Printer Button */}
          <TouchableOpacity
            style={[styles.selectPrinterBtn, selectingPrinter && { opacity: 0.7 }]}
            onPress={handleSelectPrinter}
            disabled={selectingPrinter}
          >
            {selectingPrinter ? (
              <ActivityIndicator size="small" color={Palette.ink.DEFAULT} />
            ) : (
              <>
                <Search size={15} color={Palette.ink.DEFAULT} />
                <Text style={styles.selectPrinterBtnText}>
                  {Platform.OS === 'ios' ? 'Select WiFi Printer (AirPrint)' : 'Setup via Mopria (Android)'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testPrintBtn}
            onPress={handleTestPrint}
            disabled={testingPrint}
          >
            <Printer size={16} color="#FFFFFF" />
            <Text style={styles.testPrintBtnText}>Run Test Print via WiFi</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Counter Payment Rules */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <DollarSign size={18} color={Palette.success.DEFAULT} />
            <Text style={styles.sectionTitle}>Counter Payment Rules</Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Allow Cash on Counter</Text>
              <Text style={styles.toggleSub}>
                Customers can choose to pay cash at your counter when collecting.
              </Text>
            </View>
            <Switch
              value={cashOnDesk}
              onValueChange={setCashOnDesk}
              trackColor={{ false: Palette.hairline, true: Palette.success.DEFAULT }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Require Approval Before Printing</Text>
              <Text style={styles.toggleSub}>
                Review page counts and payment before documents are sent to printer.
              </Text>
            </View>
            <Switch
              value={requireApproval}
              onValueChange={setRequireApproval}
              trackColor={{ false: Palette.hairline, true: Palette.saffron.DEFAULT }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.toggleLabel}>Auto-Print Online Paid Orders</Text>
                <View style={styles.noPcBadge}>
                  <Text style={styles.noPcBadgeText}>NO PC NEEDED</Text>
                </View>
              </View>
              <Text style={styles.toggleSub}>
                Instantly sends documents to your WiFi printer as soon as customer pays online.
              </Text>
            </View>
            <Switch
              value={autoPrint}
              onValueChange={handleToggleAutoPrint}
              trackColor={{ false: Palette.hairline, true: Palette.success.DEFAULT }}
            />
          </View>
        </View>

        {/* Section: Backend API Connection */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <Server size={18} color={Palette.ink.DEFAULT} />
            <Text style={styles.sectionTitle}>Backend API Server</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Backend server endpoint (also directly configurable in server.config.json):
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={apiUrl}
              onChangeText={setApiUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={DEFAULT_SERVER_URL}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiUrl}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Legal & Privacy */}
        <View style={styles.card}>
          <View style={styles.sectionTitleRow}>
            <ShieldCheck size={18} color={Palette.success.DEFAULT} />
            <Text style={styles.sectionTitle}>Privacy & Legal Compliance</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Print2Me strictly complies with Indian IT Rules and the DPDP Act 2023. Customer files are automatically purged within 30 days.
          </Text>

          <TouchableOpacity
            style={styles.legalLinkRow}
            onPress={() => Linking.openURL('https://print2me.in/privacy')}
          >
            <View style={styles.legalLinkLeft}>
              <FileText size={16} color={Palette.ink.DEFAULT} />
              <Text style={styles.legalLinkText}>Privacy Policy (print2me.in/privacy)</Text>
            </View>
            <ExternalLink size={14} color={Palette.ink.soft} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.legalLinkRow}
            onPress={() => Linking.openURL('https://print2me.in/terms')}
          >
            <View style={styles.legalLinkLeft}>
              <FileText size={16} color={Palette.ink.DEFAULT} />
              <Text style={styles.legalLinkText}>Terms & Conditions</Text>
            </View>
            <ExternalLink size={14} color={Palette.ink.soft} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.legalLinkRow}
            onPress={() => Linking.openURL('https://print2me.in/refund')}
          >
            <View style={styles.legalLinkLeft}>
              <FileText size={16} color={Palette.ink.DEFAULT} />
              <Text style={styles.legalLinkText}>Refund & Cancellation Policy</Text>
            </View>
            <ExternalLink size={14} color={Palette.ink.soft} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={16} color={Palette.danger.DEFAULT} />
          <Text style={styles.logoutBtnText}>Logout Vendor Account</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 130,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Palette.ink.soft,
    marginTop: 4,
  },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Palette.hairline,
    padding: 16,
    marginBottom: 16,
    ...Shadows.soft,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
  },
  sectionDesc: {
    fontSize: 12,
    color: Palette.ink.soft,
    lineHeight: 18,
    marginBottom: 14,
  },
  printerSavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  printerSavedText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: Palette.ink.DEFAULT,
  },
  selectPrinterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.paper,
    borderWidth: 1.5,
    borderColor: Palette.ink.DEFAULT,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  selectPrinterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  testPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.saffron.DEFAULT,
    paddingVertical: 12,
    borderRadius: 14,
  },
  testPrintBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  noPcBadge: {
    backgroundColor: Palette.saffron.tint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.saffron.DEFAULT + '40',
  },
  noPcBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Palette.saffron.dark,
    letterSpacing: 0.3,
  },
  toggleSub: {
    fontSize: 11,
    color: Palette.ink.soft,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.hairline,
    marginVertical: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  rateBox: {
    width: '48%',
    backgroundColor: Palette.paper,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  rateLabel: {
    fontSize: 11,
    color: Palette.ink.soft,
    fontWeight: '700',
  },
  rateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.hairline,
    borderRadius: 10,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
    marginRight: 4,
  },
  rateInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
    paddingVertical: 4,
  },
  rateUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.ink.muted,
    marginLeft: 2,
  },
  saveRatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.saffron.DEFAULT,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
    ...Shadows.soft,
  },
  saveRatesBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.hairline,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Palette.ink.DEFAULT,
  },
  saveBtn: {
    backgroundColor: Palette.ink.DEFAULT,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.danger.tint,
    borderWidth: 1,
    borderColor: '#F8B4B4',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.danger.DEFAULT,
  },
  legalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  legalLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  legalLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.ink.DEFAULT,
  },
});
