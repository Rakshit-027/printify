import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Linking,
  Share,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as ExpoLinking from 'expo-linking';
import RazorpayCheckout from 'react-native-razorpay';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  Menu,
  X,
  RefreshCw,
  Layers,
  Zap,
  Printer,
  Search,
  Store,
  QrCode,
  Settings,
  ExternalLink,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ChevronRight,
  SunMedium,
  BellRing,
  PieChart,
  FileCheck2,
  Bell,
  CreditCard,
  AlertTriangle,
  Check,
  Tag,
  Sparkles,
} from 'lucide-react-native';
import { Palette, Shadows } from '@/constants/theme';
import { OrderCard } from '@/components/OrderCard';
import { StatsBar } from '@/components/StatsBar';
import { Api, Order, VendorSubscription, SubscriptionPlanItem } from '@/services/api';
import { useAuth } from '@/services/authContext';
import { PrintService } from '@/services/printService';
import { StorageService } from '@/services/storage';
import { SoundService } from '@/services/soundService';
import {
  registerForPushNotificationsAsync,
  PushNotificationState,
} from '@/services/notificationService';

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'AWAITING_VENDOR_APPROVAL', label: 'Pending' },
  { key: 'CONFIRMED', label: 'In Spool' },
  { key: 'READY_FOR_PICKUP', label: 'Ready' },
  { key: 'COMPLETED', label: 'Done' },
];

export default function VendorDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [autoPrintActive, setAutoPrintActive] = useState(true);
  const [keepAwakeActive, setKeepAwakeActive] = useState(true);
  const [soundAlertActive, setSoundAlertActive] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [batchPrinting, setBatchPrinting] = useState(false);
  const [pushState, setPushState] = useState<PushNotificationState>({
    hasPermission: false,
    fcmToken: null,
    expoPushToken: null,
    error: null,
  });
  const [subscription, setSubscription] = useState<VendorSubscription | null>(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlanItem[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState('PRO');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [couponInput, setCouponInput] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  // Auto-print tracker refs to prevent duplicate runs
  const printedOrdersRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);
  const isAutoPrintingRef = useRef(false);
  const prevOrdersCountRef = useRef(0);

  const vendorName = user?.vendor?.name || 'Campus Station';
  const vendorEmail = user?.email || 'vendor@print2me.in';
  const vendorSlug = user?.vendor?.slug || 'campus-print';
  const vendorStoreUrl = `https://print2me.in/v/${vendorSlug}`;

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await Api.getSubscription();
      if (res) {
        setSubscription(res.subscription);
        if (res.plans && res.plans.length > 0) {
          setAvailablePlans(res.plans);
        }
      }
    } catch {}
  }, []);

  const handleOpenSubscription = useCallback(() => {
    setSubscriptionModalOpen(true);
    fetchSubscription();
  }, [fetchSubscription]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponValidating(true);
    setCouponError(null);
    try {
      const res = await Api.validateCoupon(couponInput.trim(), selectedPlanCode, billingCycle);
      if (res && res.valid) {
        setAppliedCoupon(res);
      } else {
        setAppliedCoupon(null);
        setCouponError(res?.error || 'Invalid or expired coupon code');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err?.message || 'Failed to validate coupon');
    } finally {
      setCouponValidating(false);
    }
  };

  const handleConfirmSubscription = async () => {
    setSubscribing(true);
    try {
      const res = await Api.checkoutSubscription(
        selectedPlanCode,
        billingCycle,
        appliedCoupon ? couponInput.trim() : undefined
      );

      if (res && res.activated) {
        Alert.alert(
          '🎉 Subscription Active!',
          `Your ${selectedPlanCode} plan has been successfully activated! Customer orders are online.`,
          [{ text: 'Awesome', onPress: () => setSubscriptionModalOpen(false) }]
        );
        fetchSubscription();
        return;
      }

      if (res && res.razorpayOrderId) {
        if (res.isMock) {
          // Placeholder credentials active in .env
          Alert.alert(
            '💳 Razorpay Test Sandbox',
            `You are currently using placeholder test credentials.\n\nTo test the live native Razorpay UPI/Cards sheet, paste your real 'rzp_test_...' key in .env.\n\nWould you like to simulate successful test payment?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Simulate Success',
                onPress: async () => {
                  setSubscribing(true);
                  try {
                    const verifyRes = await Api.verifySubscription({
                      planCode: selectedPlanCode,
                      billingCycle,
                      couponCode: appliedCoupon ? couponInput.trim() : undefined,
                      razorpayPaymentId: `pay_test_${Date.now()}`,
                      razorpayOrderId: res.razorpayOrderId,
                      razorpaySignature: `mock_sig_${Date.now()}`,
                    });

                    if (verifyRes && verifyRes.verified) {
                      Alert.alert(
                        '🎉 Payment Completed!',
                        `Your ${selectedPlanCode} subscription is renewed until ${new Date(verifyRes.expiresAt).toLocaleDateString()}. Receipt #${verifyRes.invoiceNumber || ''} generated.`,
                        [{ text: 'Done', onPress: () => setSubscriptionModalOpen(false) }]
                      );
                      fetchSubscription();
                    }
                  } catch (e: any) {
                    Alert.alert('Verification Failed', e?.message);
                  } finally {
                    setSubscribing(false);
                  }
                },
              },
            ]
          );
          return;
        }

        // Official Razorpay Native In-App Checkout (No Browser Redirect)
        const options = {
          description: `${selectedPlanCode} SaaS Subscription`,
          currency: 'INR',
          key: res.keyId,
          amount: String(res.amountMinor || res.finalAmountMinor || 0),
          name: 'Print2Me SaaS Platform',
          order_id: res.razorpayOrderId,
          prefill: {
            email: user?.email || 'vendor@printflow.in',
            contact: user?.vendor?.contactPhone || '9999999999',
            name: user?.fullName || user?.vendor?.name || 'Store Owner',
          },
          theme: { color: '#0F172A' },
        };

        try {
          const data: any = await RazorpayCheckout.open(options);
          // Native Razorpay modal completed payment successfully
          const verifyRes = await Api.verifySubscription({
            planCode: selectedPlanCode,
            billingCycle,
            couponCode: appliedCoupon ? couponInput.trim() : undefined,
            razorpayPaymentId: data.razorpay_payment_id,
            razorpayOrderId: data.razorpay_order_id || res.razorpayOrderId,
            razorpaySignature: data.razorpay_signature,
          });

          if (verifyRes && verifyRes.verified) {
            Alert.alert(
              '🎉 Payment Completed!',
              `Your ${selectedPlanCode} subscription is renewed until ${new Date(verifyRes.expiresAt).toLocaleDateString()}. Receipt #${verifyRes.invoiceNumber || ''} generated.`,
              [{ text: 'Done', onPress: () => setSubscriptionModalOpen(false) }]
            );
            fetchSubscription();
          } else {
            Alert.alert('Verification Failed', 'Could not verify payment with the server.');
          }
        } catch (error: any) {
          // Native modal closed/cancelled or payment failed
          if (error?.code === 0 || error?.description?.toLowerCase()?.includes('cancel')) {
            Alert.alert('Payment Cancelled', 'Transaction was cancelled. Subscription has not been activated.');
          } else {
            Alert.alert('Payment Incomplete', error?.description || 'Payment was not completed.');
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Checkout Note', err?.message || 'Failed to complete subscription');
    } finally {
      setSubscribing(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const data = await Api.getOrders('ALL');
      setOrders(data);

      if (!initialLoadDoneRef.current) {
        for (const o of data) {
          printedOrdersRef.current.add(o.id);
        }
        initialLoadDoneRef.current = true;
        prevOrdersCountRef.current = data.length;
      } else if (data.length > prevOrdersCountRef.current) {
        // New order arrival alert!
        SoundService.playNewOrderAlert();
        prevOrdersCountRef.current = data.length;
      }
    } catch (err) {
      console.warn('Orders fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
    StorageService.getAutoPrint().then(setAutoPrintActive);
    StorageService.getSoundAlert().then(setSoundAlertActive);
    StorageService.getKeepAwake().then((active) => {
      setKeepAwakeActive(active);
      if (active) activateKeepAwakeAsync().catch(() => {});
    });
    registerForPushNotificationsAsync().then((state) => {
      setPushState(state);
      if (state.fcmToken) {
        console.log('[Print2Me FCM Token]', state.fcmToken);
        // Register token with our server so real orders trigger push notifications
        Api.registerFcmToken(state.fcmToken);
      }
    });
  }, [fetchSubscription]);

  useEffect(() => {
    setLoading(true);
    fetchOrders();

    // 4-second live background polling
    const interval = setInterval(async () => {
      try {
        const data = await Api.getOrders('ALL');
        setOrders(data);

        // Chime if new order detected
        if (initialLoadDoneRef.current && data.length > prevOrdersCountRef.current) {
          SoundService.playNewOrderAlert();
          prevOrdersCountRef.current = data.length;
        }

        const autoPrint = await StorageService.getAutoPrint();
        setAutoPrintActive(autoPrint);

        if (autoPrint && initialLoadDoneRef.current && !isAutoPrintingRef.current) {
          const newPaidJobs = data.filter(
            (o) =>
              (o.paymentStatus === 'SUCCESS' || o.paymentStatus === 'CASH_COLLECTED') &&
              o.status === 'CONFIRMED' &&
              !printedOrdersRef.current.has(o.id)
          );

          if (newPaidJobs.length > 0) {
            isAutoPrintingRef.current = true;
            for (const order of newPaidJobs) {
              printedOrdersRef.current.add(order.id);
              try {
                const docs = await Api.getOrderDocuments(order.id);
                if (docs && docs.length > 0) {
                  for (const doc of docs) {
                    await PrintService.printRemoteDocument(doc.downloadUrl, doc.filename, {
                      copies: doc.copies || 1,
                      duplex: doc.duplexMode?.includes('DOUBLE'),
                    });
                  }
                  if (order.status !== 'READY_FOR_PICKUP' && order.status !== 'COMPLETED') {
                    await Api.updateOrderStatus(order.id, 'MARK_READY');
                  }
                }
              } catch (printErr) {
                console.warn('[PRINT2ME AUTO-PRINT] Print error:', printErr);
              }
            }
            isAutoPrintingRef.current = false;
          }
        }
      } catch {
        // Silent error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    fetchSubscription();
  };

  const handleToggleAutoPrint = async () => {
    const nextVal = !autoPrintActive;
    setAutoPrintActive(nextVal);
    await StorageService.setAutoPrint(nextVal);
  };

  const handleToggleKeepAwake = async (val: boolean) => {
    setKeepAwakeActive(val);
    await StorageService.setKeepAwake(val);
    if (val) {
      activateKeepAwakeAsync().catch(() => {});
    } else {
      deactivateKeepAwake();
    }
  };

  const handleToggleSoundAlert = async (val: boolean) => {
    setSoundAlertActive(val);
    await StorageService.setSoundAlert(val);
    if (val) {
      SoundService.playNewOrderAlert();
    }
  };

  const handleStatusUpdate = async (orderId: string, action: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        if (action === 'MARK_CASH_COLLECTED' || action === 'APPROVE_CASH') {
          return {
            ...o,
            paymentStatus: 'CASH_COLLECTED',
            status: o.status === 'AWAITING_VENDOR_APPROVAL' ? 'CONFIRMED' : o.status,
          };
        }
        if (action === 'APPROVE') return { ...o, status: 'CONFIRMED' };
        if (action === 'REJECT') return { ...o, status: 'REJECTED' };
        if (action === 'MARK_READY') return { ...o, status: 'READY_FOR_PICKUP' };
        if (action === 'MARK_COMPLETED') return { ...o, status: 'COMPLETED' };
        return o;
      })
    );

    try {
      await Api.updateOrderStatus(orderId, action);
      fetchOrders();
    } catch {
      fetchOrders();
    }
  };

  const handleFetchDocument = async (orderId: string) => {
    return await Api.getOrderDocuments(orderId);
  };

  // Rush Hour Batch Print All Spool Jobs
  const handleBatchPrintSpool = async () => {
    const spoolJobs = orders.filter(
      (o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING'
    );
    if (spoolJobs.length === 0) {
      Alert.alert('Queue Clear', 'No active spool jobs waiting to be printed.');
      return;
    }

    Alert.alert(
      'Rush Hour Batch Print',
      `Dispatch all ${spoolJobs.length} queued jobs directly to your WiFi printer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Print All (${spoolJobs.length} Jobs)`,
          style: 'default',
          onPress: async () => {
            setBatchPrinting(true);
            try {
              for (const order of spoolJobs) {
                const docs = await Api.getOrderDocuments(order.id);
                if (docs && docs.length > 0) {
                  for (const doc of docs) {
                    await PrintService.printRemoteDocument(doc.downloadUrl, doc.filename, {
                      copies: doc.copies || 1,
                      duplex: doc.duplexMode?.includes('DOUBLE'),
                    });
                  }
                }
                await Api.updateOrderStatus(order.id, 'MARK_READY');
              }
              await fetchOrders();
              Alert.alert(
                'Batch Print Complete',
                `All ${spoolJobs.length} print orders dispatched successfully.`
              );
            } catch (err: any) {
              Alert.alert('Batch Print Error', err.message || 'Could not print all jobs.');
            } finally {
              setBatchPrinting(false);
            }
          },
        },
      ]
    );
  };

  const handleShareStoreUrl = async () => {
    try {
      await Share.share({
        message: `Upload and print your documents instantly at ${vendorName}: ${vendorStoreUrl}`,
        url: vendorStoreUrl,
        title: `${vendorName} - Print2Me Store`,
      });
    } catch {
      Alert.alert('Store URL', vendorStoreUrl);
    }
  };

  const handleOpenStoreInBrowser = () => {
    Linking.openURL(vendorStoreUrl).catch(() => {
      Alert.alert('Storefront', vendorStoreUrl);
    });
  };

  const handleTestPrintSlip = async () => {
    setTestPrinting(true);
    try {
      const testHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: -apple-system, system-ui, sans-serif; padding: 24px; color: #0E1A3A; text-align: center; }
              .logo { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
              .saffron { color: #FF8A1F; }
              .badge { display: inline-block; padding: 4px 10px; background: #E4F6EE; color: #14A36B; border-radius: 99px; font-size: 12px; font-weight: bold; margin: 8px 0; }
              .box { border: 1.5px dashed #0E1A3A; border-radius: 10px; padding: 14px; margin: 16px 0; text-align: left; }
            </style>
          </head>
          <body>
            <div class="logo">Print<span class="saffron">2</span>Me</div>
            <p style="margin: 2px 0 6px; font-size: 13px; color: #4A5578;">PARTNER WORKSTATION TEST SLIP</p>
            <div class="badge">PRINTER ONLINE & READY</div>
            <div class="box">
              <p style="margin: 4px 0;"><strong>Station:</strong> ${vendorName}</p>
              <p style="margin: 4px 0;"><strong>Public URL:</strong> print2me.in/v/${vendorSlug}</p>
              <p style="margin: 4px 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
              <p style="margin: 4px 0;"><strong>Mode:</strong> No-PC Wireless Spooler</p>
            </div>
            <p style="font-size: 12px; color: #8A94A6;">Your WiFi printer is connected and ready to process instant Print2Me orders.</p>
          </body>
        </html>
      `;
      await PrintService.printReceiptSlip(testHtml);
      Alert.alert('Test Sent', 'Test slip dispatched to your printer successfully.');
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Could not send test slip.');
    } finally {
      setTestPrinting(false);
    }
  };

  // Daily Shift Settlement & Paper Summary Calculation
  const shiftSummary = useMemo(() => {
    let cash = 0;
    let online = 0;
    let totalSheets = 0;
    let bwSheets = 0;
    let colorSheets = 0;
    let completed = 0;
    let pending = 0;

    for (const o of orders) {
      const amt = (o.totalAmountMinor || 0) / 100;
      if (o.paymentStatus === 'CASH_COLLECTED') {
        cash += amt;
      } else if (o.paymentStatus === 'SUCCESS') {
        online += amt;
      }

      if (o.status === 'COMPLETED' || o.status === 'READY_FOR_PICKUP') {
        completed++;
      } else {
        pending++;
      }

      for (const item of o.items || []) {
        const pgs = (item.document?.pageCount || 1) * (item.copies || 1);
        totalSheets += pgs;
        if (item.colorMode === 'COLOR') {
          colorSheets += pgs;
        } else {
          bwSheets += pgs;
        }
      }
    }

    return {
      cashRevenue: cash.toFixed(2),
      onlineRevenue: online.toFixed(2),
      totalRevenue: (cash + online).toFixed(2),
      totalOrders: orders.length,
      totalSheets,
      bwSheets,
      colorSheets,
      completedOrders: completed,
      pendingOrders: pending,
    };
  }, [orders]);

  const handlePrintDailySettlement = async () => {
    try {
      const html = PrintService.formatDailySettlementSlipHtml(shiftSummary, vendorName);
      await PrintService.printReceiptSlip(html);
      Alert.alert('Settlement Printed', 'Daily closing register slip sent to printer.');
    } catch (err: any) {
      Alert.alert('Print Error', err.message || 'Could not print settlement report.');
    }
  };

  const handleLogoutConfirm = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of your Print2Me station?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSidebarOpen(false);
          await logout();
        },
      },
    ]);
  };

  // Tab counts
  const counts = useMemo(() => {
    return {
      ALL: orders.length,
      AWAITING_VENDOR_APPROVAL: orders.filter(
        (o) =>
          o.status === 'AWAITING_VENDOR_APPROVAL' ||
          o.paymentStatus === 'CASH_PENDING' ||
          o.paymentStatus === 'PENDING'
      ).length,
      CONFIRMED: orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING').length,
      READY_FOR_PICKUP: orders.filter((o) => o.status === 'READY_FOR_PICKUP').length,
      COMPLETED: orders.filter((o) => o.status === 'COMPLETED').length,
    };
  }, [orders]);

  const inSpoolCount = counts.CONFIRMED;

  // Filtered orders
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeTab === 'AWAITING_VENDOR_APPROVAL') {
      result = result.filter(
        (o) =>
          o.status === 'AWAITING_VENDOR_APPROVAL' ||
          o.paymentStatus === 'CASH_PENDING' ||
          o.paymentStatus === 'PENDING'
      );
    } else if (activeTab === 'CONFIRMED') {
      result = result.filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING');
    } else if (activeTab === 'READY_FOR_PICKUP') {
      result = result.filter((o) => o.status === 'READY_FOR_PICKUP');
    } else if (activeTab === 'COMPLETED') {
      result = result.filter((o) => o.status === 'COMPLETED');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) => {
        const orderNum = (o.orderNumber || '').toLowerCase();
        const name = (o.customerName || '').toLowerCase();
        const phone = (o.customerPhone || '').toLowerCase();
        return orderNum.includes(q) || name.includes(q) || phone.includes(q);
      });
    }

    return result;
  }, [orders, activeTab, searchQuery]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Sleek Top Header with Hamburger Sidebar Trigger */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setSidebarOpen(true)}
            activeOpacity={0.7}
          >
            <Menu size={20} color={Palette.ink.DEFAULT} />
          </TouchableOpacity>

          <View style={styles.logoBadge}>
            <Printer size={15} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.logoTitle}>
              Print<Text style={styles.logoAccent}>2</Text>Me
            </Text>
            <View style={styles.storeSubtitleRow}>
              <Text style={styles.storeNameText} numberOfLines={1}>
                {vendorName}
              </Text>
              <Text style={styles.dotSeparator}>•</Text>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Quick Auto-Print Pill */}
          <TouchableOpacity
            style={[
              styles.autoPrintPill,
              autoPrintActive ? styles.autoPrintOn : styles.autoPrintOff,
            ]}
            onPress={handleToggleAutoPrint}
            activeOpacity={0.7}
          >
            <Zap
              size={11}
              color={autoPrintActive ? Palette.saffron.dark : Palette.ink.soft}
            />
            <Text
              style={[
                styles.autoPrintText,
                autoPrintActive ? styles.autoPrintTextOn : styles.autoPrintTextOff,
              ]}
            >
              {autoPrintActive ? 'Auto-Print' : 'Manual'}
            </Text>
          </TouchableOpacity>

          {/* Search Toggle */}
          <TouchableOpacity
            style={[styles.circleBtn, showSearch && styles.circleBtnActive]}
            onPress={() => {
              if (showSearch && searchQuery) setSearchQuery('');
              setShowSearch(!showSearch);
            }}
            activeOpacity={0.7}
          >
            <Search size={15} color={showSearch ? Palette.saffron.DEFAULT : Palette.ink.DEFAULT} />
          </TouchableOpacity>

          {/* Refresh */}
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <RefreshCw size={14} color={Palette.ink.DEFAULT} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Expandable Search Input */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Search size={15} color={Palette.ink.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order #, customer, phone..."
            placeholderTextColor={Palette.ink.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
              <X size={15} color={Palette.ink.soft} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 2. Slide-out Navigation Sidebar Drawer Modal */}
      <Modal
        visible={sidebarOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSidebarOpen(false)}
      >
        <View style={styles.drawerBackdrop}>
          <TouchableOpacity
            style={styles.backdropClickable}
            activeOpacity={1}
            onPress={() => setSidebarOpen(false)}
          />

          <View style={styles.drawerContainer}>
            <SafeAreaView style={styles.drawerSafeArea} edges={['top', 'left', 'bottom']}>
              {/* Drawer Top Branding */}
              <View style={styles.drawerHeader}>
                <View style={styles.drawerLogoRow}>
                  <View style={styles.drawerLogoBadge}>
                    <Printer size={18} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.drawerBrandText}>
                      Print<Text style={{ color: Palette.saffron.DEFAULT }}>2</Text>Me
                    </Text>
                    <Text style={styles.drawerBrandSub}>Partner Workstation</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.drawerCloseBtn}
                  onPress={() => setSidebarOpen(false)}
                  hitSlop={10}
                >
                  <X size={18} color={Palette.ink.DEFAULT} />
                </TouchableOpacity>
              </View>

              {/* Station Info Card */}
              <View style={styles.drawerStoreCard}>
                <View style={styles.drawerStoreRow}>
                  <View style={styles.drawerStoreAvatar}>
                    <Store size={20} color={Palette.saffron.DEFAULT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={styles.drawerStoreName} numberOfLines={1}>
                        {vendorName}
                      </Text>
                      <ShieldCheck size={14} color={Palette.success.DEFAULT} />
                    </View>
                    <Text style={styles.drawerStoreEmail} numberOfLines={1}>
                      {vendorEmail}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.drawerUrlPill}
                  onPress={handleShareStoreUrl}
                  activeOpacity={0.7}
                >
                  <Text style={styles.drawerUrlText} numberOfLines={1}>
                    print2me.in/v/{vendorSlug}
                  </Text>
                  <Copy size={11} color={Palette.saffron.DEFAULT} />
                </TouchableOpacity>
              </View>

              {/* Navigation Menu Links */}
              <ScrollView style={styles.drawerNavList} showsVerticalScrollIndicator={false}>
                {/* 1. Orders Dashboard */}
                <TouchableOpacity
                  style={[styles.drawerNavItem, styles.drawerNavItemActive]}
                  onPress={() => setSidebarOpen(false)}
                  activeOpacity={0.7}
                >
                  <View style={styles.drawerNavIconWrapActive}>
                    <Layers size={17} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.drawerNavText, styles.drawerNavTextActive]}>
                    Order Queue Workstation
                  </Text>
                  <ChevronRight size={14} color={Palette.ink.DEFAULT} />
                </TouchableOpacity>

                {/* 2. Daily Shift Settlement & Paper Summary */}
                <TouchableOpacity
                  style={styles.drawerNavItem}
                  onPress={() => {
                    setSidebarOpen(false);
                    setSettlementModalOpen(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.drawerNavIconWrap, { backgroundColor: '#FEF3C7' }]}>
                    <PieChart size={17} color="#D97706" />
                  </View>
                  <Text style={styles.drawerNavText}>Daily Shift Settlement</Text>
                  <ChevronRight size={14} color={Palette.ink.muted} />
                </TouchableOpacity>

                {/* 3. Standee QR Code */}
                <TouchableOpacity
                  style={styles.drawerNavItem}
                  onPress={() => {
                    setSidebarOpen(false);
                    router.push('/standee');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.drawerNavIconWrap}>
                    <QrCode size={17} color={Palette.saffron.DEFAULT} />
                  </View>
                  <Text style={styles.drawerNavText}>Counter Standee QR</Text>
                  <ChevronRight size={14} color={Palette.ink.muted} />
                </TouchableOpacity>

                {/* 4. Pricing & Rates */}
                <TouchableOpacity
                  style={styles.drawerNavItem}
                  onPress={() => {
                    setSidebarOpen(false);
                    router.push('/settings');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.drawerNavIconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <Settings size={17} color="#4F46E5" />
                  </View>
                  <Text style={styles.drawerNavText}>Print Pricing & Rates</Text>
                  <ChevronRight size={14} color={Palette.ink.muted} />
                </TouchableOpacity>

                {/* 5. Test Printer Slip */}
                <TouchableOpacity
                  style={styles.drawerNavItem}
                  onPress={() => {
                    setSidebarOpen(false);
                    handleTestPrintSlip();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.drawerNavIconWrap, { backgroundColor: Palette.success.tint }]}>
                    {testPrinting ? (
                      <ActivityIndicator size="small" color={Palette.success.DEFAULT} />
                    ) : (
                      <Printer size={17} color={Palette.success.DEFAULT} />
                    )}
                  </View>
                  <Text style={styles.drawerNavText}>Print Test Page Slip</Text>
                  <ChevronRight size={14} color={Palette.ink.muted} />
                </TouchableOpacity>

                {/* 6. Customer Web Storefront */}
                <TouchableOpacity
                  style={styles.drawerNavItem}
                  onPress={() => {
                    setSidebarOpen(false);
                    handleOpenStoreInBrowser();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.drawerNavIconWrap, { backgroundColor: '#F0F9FF' }]}>
                    <ExternalLink size={17} color="#0284C7" />
                  </View>
                  <Text style={styles.drawerNavText}>View Customer Storefront</Text>
                  <ChevronRight size={14} color={Palette.ink.muted} />
                </TouchableOpacity>

                {/* 7. SaaS Subscription & Plan */}
                <TouchableOpacity
                  style={styles.drawerNavItem}
                  onPress={() => {
                    setSidebarOpen(false);
                    handleOpenSubscription();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.drawerNavIconWrap, { backgroundColor: subscription?.isExpired ? '#FEE2E2' : '#EEF2FF' }]}>
                    <CreditCard size={17} color={subscription?.isExpired ? '#DC2626' : '#4F46E5'} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.drawerNavText}>SaaS Subscription</Text>
                    <Text style={{ fontSize: 11, color: subscription?.isExpired ? '#DC2626' : Palette.ink.muted, marginTop: 1, fontWeight: '600' }}>
                      {subscription
                        ? subscription.isExpired
                          ? 'Subscription Expired'
                          : `${subscription.plan?.name || subscription.planCode} • ${subscription.daysRemaining}d left`
                        : 'Manage Plan & Billing'}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={Palette.ink.muted} />
                </TouchableOpacity>

                {/* Counter Mode Preferences */}
                <View style={styles.preferencesSection}>
                  <Text style={styles.prefSectionTitle}>WORKSTATION PREFERENCES</Text>

                  {/* Keep Awake Toggle */}
                  <View style={styles.prefRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <SunMedium size={14} color={Palette.ink.DEFAULT} />
                        <Text style={styles.prefTitle}>Keep Screen Awake</Text>
                      </View>
                      <Text style={styles.prefDesc}>Never lock screen while on counter dock</Text>
                    </View>
                    <Switch
                      value={keepAwakeActive}
                      onValueChange={handleToggleKeepAwake}
                      trackColor={{ false: Palette.hairline, true: '#FFD7B0' }}
                      thumbColor={keepAwakeActive ? Palette.saffron.DEFAULT : '#F4F3F0'}
                    />
                  </View>

                  {/* Sound & Haptic Chime Toggle */}
                  <View style={styles.prefRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <BellRing size={14} color={Palette.ink.DEFAULT} />
                        <Text style={styles.prefTitle}>Sound & Vibration Alert</Text>
                      </View>
                      <Text style={styles.prefDesc}>Ring chime when new job arrives</Text>
                    </View>
                    <Switch
                      value={soundAlertActive}
                      onValueChange={handleToggleSoundAlert}
                      trackColor={{ false: Palette.hairline, true: '#FFD7B0' }}
                      thumbColor={soundAlertActive ? Palette.saffron.DEFAULT : '#F4F3F0'}
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Drawer Bottom Footer */}
              <View style={styles.drawerFooter}>
                <TouchableOpacity
                  style={styles.drawerLogoutBtn}
                  onPress={handleLogoutConfirm}
                  activeOpacity={0.7}
                >
                  <LogOut size={16} color={Palette.danger.DEFAULT} />
                  <Text style={styles.drawerLogoutText}>Sign Out Station</Text>
                </TouchableOpacity>

                <Text style={styles.drawerVersionText}>Print2Me Workstation • v1.0.0</Text>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

      {/* 2.5 In-App SaaS Subscription & Billing Modal */}
      <Modal
        visible={subscriptionModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSubscriptionModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.modalBackdropClickable}
              activeOpacity={1}
              onPress={() => setSubscriptionModalOpen(false)}
            />
            <View style={styles.subModalCard}>
              <View style={styles.subModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.subIconBadge}>
                    <CreditCard size={20} color="#4F46E5" />
                  </View>
                  <View>
                    <Text style={styles.subModalTitle}>Vendor Subscription</Text>
                    <Text style={styles.subModalSub}>Dynamic SaaS Plans & Billing</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSubscriptionModalOpen(false)} hitSlop={10}>
                  <X size={20} color={Palette.ink.DEFAULT} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: Math.round(Dimensions.get('window').height * 0.60) }}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={true}
              >
              {/* Current Status Pill */}
              <View style={[styles.subStatusCard, { backgroundColor: subscription?.isExpired ? '#FEF2F2' : '#F0FDF4', borderColor: subscription?.isExpired ? '#FCA5A5' : '#BBF7D0' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: subscription?.isExpired ? '#991B1B' : '#166534' }}>
                    Status: {subscription?.isExpired ? 'EXPIRED' : 'ACTIVE'}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: subscription?.isExpired ? '#DC2626' : '#15803D' }}>
                    {subscription ? `${subscription.plan?.name || subscription.planCode} (${subscription.daysRemaining}d left)` : 'Trial'}
                  </Text>
                </View>
                {subscription?.expiresAt && (
                  <Text style={{ fontSize: 11, color: subscription?.isExpired ? '#B91C1C' : '#15803D', marginTop: 2 }}>
                    Expires on {new Date(subscription.expiresAt).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {/* Billing Cycle Toggle */}
              <View style={styles.billingToggleWrap}>
                <TouchableOpacity
                  style={[styles.billingToggleBtn, billingCycle === 'MONTHLY' && styles.billingToggleBtnActive]}
                  onPress={() => {
                    setBillingCycle('MONTHLY');
                    setAppliedCoupon(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.billingToggleText, billingCycle === 'MONTHLY' && styles.billingToggleTextActive]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.billingToggleBtn, billingCycle === 'YEARLY' && styles.billingToggleBtnActive]}
                  onPress={() => {
                    setBillingCycle('YEARLY');
                    setAppliedCoupon(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.billingToggleText, billingCycle === 'YEARLY' && styles.billingToggleTextActive]}>
                    Annual (Save 20%)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Plan Options */}
              <View style={{ gap: 8, marginBottom: 14 }}>
                {(availablePlans.length > 0 ? availablePlans : [
                  { id: '1', code: 'STARTER', name: 'Starter Plan', description: 'Zero-touch Auto-Printing for single counter stall & walk-up queue', priceMonthlyMinor: 49900, priceYearlyMinor: 499900 },
                  { id: '2', code: 'PRO', name: 'Professional Plan', description: 'Zero-touch Auto-Printing with multi-printer split routing & priority spooler', priceMonthlyMinor: 99900, priceYearlyMinor: 999900 },
                  { id: '3', code: 'ENTERPRISE', name: 'Campus Enterprise', description: 'Zero-touch Auto-Printing across unlimited workstation fleet with custom SLA', priceMonthlyMinor: 199900, priceYearlyMinor: 1999900 }
                ]).map((plan) => {
                  const isSelected = selectedPlanCode === plan.code;
                  const price = billingCycle === 'YEARLY' ? plan.priceYearlyMinor / 100 : plan.priceMonthlyMinor / 100;
                  return (
                    <TouchableOpacity
                      key={plan.code}
                      style={[styles.planCard, isSelected && styles.planCardSelected]}
                      onPress={() => {
                        setSelectedPlanCode(plan.code);
                        setAppliedCoupon(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.planNameText, isSelected && { color: '#4F46E5' }]}>{plan.name}</Text>
                          {plan.code === 'PRO' && (
                            <View style={styles.popularBadge}>
                              <Text style={styles.popularBadgeText}>POPULAR</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.planDescText} numberOfLines={2}>{plan.description}</Text>
                        <View style={styles.autoPrintHeroBadge}>
                          <Zap size={11} color="#15803D" />
                          <Text style={styles.autoPrintHeroText}>Zero-Touch Auto-Printing Included</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                        <Text style={[styles.planPriceText, isSelected && { color: '#4F46E5' }]}>₹{price}</Text>
                        <Text style={styles.planCycleSub}>{billingCycle === 'YEARLY' ? '/year' : '/month'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Promo / Coupon Box */}
              <View style={styles.couponContainer}>
                <Text style={styles.couponLabel}>HAVE A PROMO CODE OR VIP PASS?</Text>
                <View style={styles.couponInputRow}>
                  <TextInput
                    style={styles.couponTextInput}
                    placeholder="e.g. PRINT2ME30, WELCOME50"
                    placeholderTextColor={Palette.ink.muted}
                    value={couponInput}
                    onChangeText={(txt) => setCouponInput(txt.toUpperCase())}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[styles.couponApplyBtn, couponValidating && { opacity: 0.6 }]}
                    onPress={handleApplyCoupon}
                    disabled={couponValidating}
                    activeOpacity={0.7}
                  >
                    {couponValidating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.couponApplyBtnText}>Apply</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {appliedCoupon && appliedCoupon.valid && (
                  <View style={styles.couponSuccessBadge}>
                    <Sparkles size={14} color="#15803D" />
                    <Text style={styles.couponSuccessText}>
                      ✓ {appliedCoupon.coupon?.code} applied: {appliedCoupon.isFreePass ? '100% Free VIP 30 Days Pass!' : `₹${(appliedCoupon.discountMinor / 100).toFixed(0)} discount!`}
                    </Text>
                  </View>
                )}

                {couponError && (
                  <Text style={styles.couponErrorText}>{couponError}</Text>
                )}
              </View>

              {/* Order Summary */}
              {(() => {
                const plan = (availablePlans.length > 0 ? availablePlans : [
                  { id: '1', code: 'STARTER', name: 'Starter Plan', priceMonthlyMinor: 49900, priceYearlyMinor: 499900 },
                  { id: '2', code: 'PRO', name: 'Professional Plan', priceMonthlyMinor: 99900, priceYearlyMinor: 999900 },
                  { id: '3', code: 'ENTERPRISE', name: 'Campus Enterprise', priceMonthlyMinor: 199900, priceYearlyMinor: 1999900 }
                ]).find(p => p.code === selectedPlanCode) || { priceMonthlyMinor: 99900, priceYearlyMinor: 999900 };
                const orig = billingCycle === 'YEARLY' ? plan.priceYearlyMinor : plan.priceMonthlyMinor;
                const disc = appliedCoupon ? appliedCoupon.discountMinor : 0;
                const finalAmt = appliedCoupon ? appliedCoupon.finalAmountMinor : orig;
                const isZero = finalAmt === 0;

                return (
                  <View style={styles.subSummaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Plan Base Rate</Text>
                      <Text style={styles.summaryVal}>₹{(orig / 100).toFixed(0)}</Text>
                    </View>
                    {disc > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: '#16A34A' }]}>Coupon Discount</Text>
                        <Text style={[styles.summaryVal, { color: '#16A34A' }]}>-₹{(disc / 100).toFixed(0)}</Text>
                      </View>
                    )}
                    <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: Palette.hairline, paddingTop: 8, marginTop: 4 }]}>
                      <Text style={[styles.summaryLabel, { fontWeight: '800', color: Palette.ink.DEFAULT }]}>Total Payable</Text>
                      <Text style={[styles.summaryVal, { fontSize: 18, fontWeight: '900', color: isZero ? '#16A34A' : '#4F46E5' }]}>
                        {isZero ? 'FREE' : `₹${(finalAmt / 100).toFixed(0)}`}
                      </Text>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                      style={[styles.confirmSubBtn, isZero && { backgroundColor: '#16A34A' }]}
                      onPress={handleConfirmSubscription}
                      disabled={subscribing}
                      activeOpacity={0.8}
                    >
                      {subscribing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <CreditCard size={16} color="#FFFFFF" />
                          <Text style={styles.confirmSubBtnText}>
                            {isZero ? 'Activate 30 Free Days Pass' : `Proceed to Pay ₹${(finalAmt / 100).toFixed(0)}`}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 3. Daily Shift Settlement & Paper Consumption Modal */}
      <Modal
        visible={settlementModalOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSettlementModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropClickable}
            activeOpacity={1}
            onPress={() => setSettlementModalOpen(false)}
          />
          <View style={styles.settlementModalCard}>
            <View style={styles.settlementHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.settlementIconBadge}>
                  <PieChart size={20} color={Palette.saffron.DEFAULT} />
                </View>
                <View>
                  <Text style={styles.settlementTitle}>Daily Register Settlement</Text>
                  <Text style={styles.settlementSub}>{new Date().toLocaleDateString()}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSettlementModalOpen(false)} hitSlop={10}>
                <X size={18} color={Palette.ink.DEFAULT} />
              </TouchableOpacity>
            </View>

          <ScrollView
            style={styles.settlementScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Financial Reconciliation Cards */}
            <View style={styles.settlementGrid}>
              <View style={styles.settlementBox}>
                <Text style={styles.settlementBoxLabel}>CASH IN DRAWER</Text>
                <Text style={styles.settlementBoxVal}>₹{shiftSummary.cashRevenue}</Text>
              </View>
              <View style={styles.settlementBox}>
                <Text style={styles.settlementBoxLabel}>ONLINE UPI</Text>
                <Text style={styles.settlementBoxVal}>₹{shiftSummary.onlineRevenue}</Text>
              </View>
            </View>

            <View style={styles.grossRevenueRow}>
              <Text style={styles.grossRevenueLabel}>Total Today's Gross:</Text>
              <Text style={styles.grossRevenueVal}>₹{shiftSummary.totalRevenue}</Text>
            </View>

            {/* Paper & Volume Consumption */}
            <View style={styles.paperUsageCard}>
              <Text style={styles.paperSectionTitle}>PAPER USAGE & VOLUME</Text>
              <View style={styles.paperUsageRow}>
                <Text style={styles.paperUsageLabel}>Total Orders Processed:</Text>
                <Text style={styles.paperUsageVal}>{shiftSummary.totalOrders} jobs</Text>
              </View>
              <View style={styles.paperUsageRow}>
                <Text style={styles.paperUsageLabel}>Total Sheets Printed:</Text>
                <Text style={styles.paperUsageVal}>{shiftSummary.totalSheets} sheets</Text>
              </View>
              <View style={styles.paperUsageRow}>
                <Text style={styles.paperUsageLabel}>Black & White Pages:</Text>
                <Text style={styles.paperUsageVal}>{shiftSummary.bwSheets} pgs</Text>
              </View>
              <View style={styles.paperUsageRow}>
                <Text style={styles.paperUsageLabel}>Color Pages:</Text>
                <Text style={styles.paperUsageVal}>{shiftSummary.colorSheets} pgs</Text>
              </View>
            </View>

            {/* Print Settlement Slip Button */}
            <TouchableOpacity
              style={styles.printSettlementBtn}
              onPress={handlePrintDailySettlement}
            >
              <Printer size={16} color="#FFFFFF" />
              <Text style={styles.printSettlementBtnText}>Print Register Settlement Slip</Text>
            </TouchableOpacity>
          </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Palette.saffron.DEFAULT}
            colors={[Palette.saffron.DEFAULT]}
          />
        }
      >
        {/* 4. Compact 2-Tile Overview */}
        <StatsBar
          orders={orders}
          activeTab={activeTab}
          onSelectTab={(tabKey) => setActiveTab(tabKey)}
        />

        {/* Subscription Expired Alert Banner */}
        {subscription?.isExpired && (
          <View style={styles.subExpiredCard}>
            <View style={styles.subExpiredTop}>
              <View style={styles.subExpiredIconWrap}>
                <AlertTriangle size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subExpiredTitle}>Vendor Subscription Expired</Text>
                <Text style={styles.subExpiredSub}>
                  Customer orders are currently paused. Renew your plan to resume receiving print jobs.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.subRenewBtn}
              onPress={handleOpenSubscription}
              activeOpacity={0.8}
            >
              <CreditCard size={14} color="#FFFFFF" />
              <Text style={styles.subRenewBtnText}>Renew Plan / Apply Coupon</Text>
              <ExternalLink size={13} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* 5. Rush Hour Batch Print Banner (Appears when Spool Jobs > 0) */}
        {inSpoolCount > 0 && (
          <TouchableOpacity
            style={styles.rushHourBanner}
            onPress={handleBatchPrintSpool}
            disabled={batchPrinting}
            activeOpacity={0.8}
          >
            <View style={styles.rushHourLeft}>
              <View style={styles.rushHourIconWrap}>
                <Printer size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.rushHourTitle}>Rush Hour: Batch Print</Text>
                <Text style={styles.rushHourSub}>
                  {inSpoolCount} {inSpoolCount === 1 ? 'order' : 'orders'} waiting in print spool
                </Text>
              </View>
            </View>
            <View style={styles.rushHourBtn}>
              {batchPrinting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.rushHourBtnText}>Print All ({inSpoolCount})</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* 6. Filter Tabs with Live Badges */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {TABS.map((tab) => {
              const isSelected = activeTab === tab.key;
              const count = counts[tab.key as keyof typeof counts] ?? 0;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                  style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                >
                  <Text
                    style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={[
                      styles.tabBadge,
                      isSelected ? styles.tabBadgeActive : styles.tabBadgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        isSelected ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 7. Orders List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Palette.saffron.DEFAULT} />
            <Text style={styles.loadingText}>Syncing orders with print queue...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Layers size={28} color={Palette.ink.muted} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No Orders Found' : 'Queue Empty'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No orders matching "${searchQuery}".`
                : 'Customer orders submitted via your Print2Me QR standee will show up here.'}
            </Text>
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.emptyActionBtn}
              >
                <Text style={styles.emptyActionBtnText}>Clear Search</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              vendorName={vendorName}
              onStatusUpdate={handleStatusUpdate}
              onFetchDocument={handleFetchDocument}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hairline,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  logoBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: Palette.ink.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
    letterSpacing: -0.4,
  },
  logoAccent: {
    color: Palette.saffron.DEFAULT,
  },
  storeSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  storeNameText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Palette.ink.soft,
    maxWidth: 110,
  },
  dotSeparator: {
    fontSize: 10,
    color: Palette.ink.muted,
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Palette.success.DEFAULT,
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: Palette.success.DEFAULT,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoPrintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  autoPrintOn: {
    backgroundColor: Palette.saffron.tint,
    borderColor: '#F8D8B6',
  },
  autoPrintOff: {
    backgroundColor: '#F1F5F9',
    borderColor: Palette.hairline,
  },
  autoPrintText: {
    fontSize: 10,
    fontWeight: '800',
  },
  autoPrintTextOn: {
    color: Palette.saffron.dark,
  },
  autoPrintTextOff: {
    color: Palette.ink.soft,
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnActive: {
    borderColor: Palette.saffron.DEFAULT,
    backgroundColor: Palette.saffron.tint,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hairline,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Palette.ink.DEFAULT,
    padding: 0,
  },
  container: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 90,
  },

  /* Rush Hour Banner */
  rushHourBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.ink.DEFAULT,
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    ...Shadows.soft,
  },
  rushHourLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rushHourIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Palette.saffron.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rushHourTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rushHourSub: {
    fontSize: 10.5,
    color: '#CBD5E1',
    marginTop: 1,
  },
  rushHourBtn: {
    backgroundColor: Palette.saffron.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  rushHourBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  tabsWrapper: {
    marginBottom: 10,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  tabButtonActive: {
    backgroundColor: Palette.ink.DEFAULT,
    borderColor: Palette.ink.DEFAULT,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.ink.soft,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tabBadgeTextInactive: {
    color: Palette.ink.soft,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: Palette.ink.soft,
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.hairline,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Palette.ink.soft,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
  emptyActionBtn: {
    marginTop: 12,
    backgroundColor: Palette.ink.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* Drawer Sidebar Styles */
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(14, 26, 58, 0.5)',
    flexDirection: 'row',
  },
  backdropClickable: {
    flex: 1,
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 320,
    backgroundColor: Palette.surface,
    ...Shadows.soft,
  },
  drawerSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hairline,
  },
  drawerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerLogoBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: Palette.ink.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBrandText: {
    fontSize: 19,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
    letterSpacing: -0.4,
  },
  drawerBrandSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Palette.ink.soft,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerStoreCard: {
    margin: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  drawerStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  drawerStoreAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Palette.saffron.tint,
    borderWidth: 1,
    borderColor: '#F8D8B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerStoreName: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
    flexShrink: 1,
  },
  drawerStoreEmail: {
    fontSize: 11,
    color: Palette.ink.soft,
    marginTop: 1,
  },
  drawerUrlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  drawerUrlText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.saffron.DEFAULT,
    flex: 1,
  },
  drawerNavList: {
    flex: 1,
    paddingHorizontal: 14,
  },
  drawerNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  drawerNavItemActive: {
    backgroundColor: Palette.paper,
  },
  drawerNavIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Palette.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawerNavIconWrapActive: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Palette.ink.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  drawerNavText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  drawerNavTextActive: {
    color: Palette.ink.DEFAULT,
    fontWeight: '800',
  },
  preferencesSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Palette.hairline,
    marginBottom: 14,
  },
  prefSectionTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Palette.ink.muted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  prefTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  prefDesc: {
    fontSize: 10,
    color: Palette.ink.soft,
    marginTop: 1,
  },
  drawerFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Palette.hairline,
  },
  drawerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF2F2',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F8BDBD',
    marginBottom: 8,
  },
  drawerLogoutText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.danger.DEFAULT,
  },
  drawerVersionText: {
    fontSize: 10,
    color: Palette.ink.muted,
    textAlign: 'center',
    fontWeight: '600',
  },

  /* Settlement Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(14, 26, 58, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBackdropClickable: {
    ...(StyleSheet.absoluteFill as any),
  },
  settlementScroll: {
    maxHeight: Math.round(Dimensions.get('window').height * 0.55),
  },
  settlementModalCard: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    padding: 18,
    ...Shadows.soft,
  },
  settlementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  settlementIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Palette.saffron.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settlementTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
  },
  settlementSub: {
    fontSize: 11,
    color: Palette.ink.soft,
    marginTop: 1,
  },
  settlementGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  settlementBox: {
    flex: 1,
    backgroundColor: Palette.paper,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.hairline,
  },
  settlementBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Palette.ink.soft,
    letterSpacing: 0.5,
  },
  settlementBoxVal: {
    fontSize: 20,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
    marginTop: 4,
  },
  grossRevenueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#FADBB8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  grossRevenueLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.saffron.dark,
  },
  grossRevenueVal: {
    fontSize: 20,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
  },
  paperUsageCard: {
    backgroundColor: Palette.paper,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.hairline,
    marginBottom: 14,
  },
  paperSectionTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Palette.ink.muted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  paperUsageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  paperUsageLabel: {
    fontSize: 12,
    color: Palette.ink.soft,
  },
  paperUsageVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
  },
  printSettlementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Palette.ink.DEFAULT,
    paddingVertical: 12,
    borderRadius: 12,
  },
  printSettlementBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  subExpiredCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  subExpiredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  subExpiredIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subExpiredTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  subExpiredSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 15,
  },
  subRenewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  subRenewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  /* In-App Subscription Modal Styles */
  subModalCard: {
    backgroundColor: Palette.surface,
    borderRadius: 24,
    padding: 20,
    maxHeight: '90%',
    ...Shadows.soft,
  },
  subModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  subIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
  },
  subModalSub: {
    fontSize: 11,
    color: Palette.ink.soft,
    marginTop: 1,
  },
  subStatusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  billingToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  billingToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  billingToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    ...Shadows.soft,
  },
  billingToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.ink.muted,
  },
  billingToggleTextActive: {
    color: '#4F46E5',
    fontWeight: '800',
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.paper,
    borderWidth: 1.5,
    borderColor: Palette.hairline,
    borderRadius: 14,
    padding: 12,
  },
  planCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF30',
  },
  planNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.ink.DEFAULT,
  },
  planDescText: {
    fontSize: 11,
    color: Palette.ink.muted,
    marginTop: 2,
    lineHeight: 14,
  },
  autoPrintHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  autoPrintHeroText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  popularBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
  },
  planPriceText: {
    fontSize: 16,
    fontWeight: '900',
    color: Palette.ink.DEFAULT,
  },
  planCycleSub: {
    fontSize: 10,
    color: Palette.ink.muted,
  },
  couponContainer: {
    backgroundColor: Palette.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.hairline,
    padding: 12,
    marginBottom: 12,
  },
  couponLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Palette.ink.soft,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Palette.hairline,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  couponApplyBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  couponSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
  },
  couponSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  couponErrorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 6,
  },
  subSummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.hairline,
    padding: 12,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: Palette.ink.soft,
  },
  summaryVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Palette.ink.DEFAULT,
  },
  confirmSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    ...Shadows.soft,
  },
  confirmSubBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
