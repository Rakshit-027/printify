/**
 * NOTE: Active Workstation Desktop Agent Renderer
 * The desktop workstation UI is modularized in src/renderer/:
 *  - index.html (Clean HTML layout)
 *  - styles/    (base, sidebar, header, overview, queue, printers, pricing, standee, terminal, modals)
 *  - scripts/   (state, navigation, app, and views/ [overview, orders, printers, pricing, terminal])
 */
import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  Layers,
  Terminal,
  RefreshCw,
  FolderOpen,
  Power,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogOut,
  LogIn,
  Sliders,
  ShoppingBag,
  FileText,
  DollarSign,
  ChevronRight,
  Send,
  ShieldCheck,
  Smartphone,
  HardDrive,
  CreditCard,
} from "lucide-react";

declare global {
  interface Window {
    printAgentApi: any;
  }
}

type TabType = "queue" | "printers" | "payments" | "logs";

export function App() {
  const [status, setStatus] = useState<any>(null);
  const [printers, setPrinters] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("queue");
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [testPrintLoading, setTestPrintLoading] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [paymentAccount, setPaymentAccount] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Auth / Login State
  const [authMode, setAuthMode] = useState<"login" | "signup" | "code">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [backendUrl, setBackendUrl] = useState("https://api.print2me.in");
  const [deviceName, setDeviceName] = useState("Counter-Station-1");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Signup Specific State
  const [signupStoreName, setSignupStoreName] = useState("");
  const [signupOwnerName, setSignupOwnerName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupAddress, setSignupAddress] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Printer Preferences
  const [bwPrinter, setBwPrinter] = useState("");
  const [colorPrinter, setColorPrinter] = useState("");
  const [subscription, setSubscription] = useState<any>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchSubscription = async (currentStatus?: any) => {
    const activeCfg = currentStatus?.config || status?.config;
    if (!activeCfg?.backendUrl) return;
    try {
      const res = await fetch(`${activeCfg.backendUrl}/api/vendor/subscription`, {
        headers: {
          'x-device-id': activeCfg.deviceId || '',
          'x-device-token': activeCfg.deviceToken || '',
          ...(activeCfg.sessionToken ? { Authorization: `Bearer ${activeCfg.sessionToken}` } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.subscription) {
          setSubscription(json.subscription);
        }
      }
    } catch {}
  };

  const handleOpenSubscriptionPortal = () => {
    const url = `${status?.config?.backendUrl || "https://www.print2me.in"}/vendor/subscription`;
    if (window.printAgentApi?.openExternalUrl) {
      window.printAgentApi.openExternalUrl(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const refreshStatus = async () => {
    if (!window.printAgentApi) return;
    try {
      const res = await window.printAgentApi.getStatus();
      setStatus(res);
      setPrinters(res.printers || []);
      setIsPolling(res.config?.isPollingActive ?? true);
      if (res.config?.defaultBwPrinter) setBwPrinter(res.config.defaultBwPrinter);
      if (res.config?.defaultColorPrinter) setColorPrinter(res.config.defaultColorPrinter);
      fetchSubscription(res);
    } catch (err) {
      console.error("Error refreshing status:", err);
    }
  };

  const prevOrderCountRef = useRef<number>(-1);

  const playOrderChime = () => {
    try {
      const audio = new Audio("./assets/sounds/order_bell.wav");
      audio.play().catch(() => {});
    } catch {}
  };

  const fetchOrders = async () => {
    if (!window.printAgentApi || !status?.isEnrolled) return;
    setLoadingOrders(true);
    try {
      const res = await window.printAgentApi.getOrders(orderFilter);
      if (res.success) {
        const newOrders = res.orders || [];
        if (prevOrderCountRef.current !== -1 && newOrders.length > prevOrderCountRef.current) {
          playOrderChime();
        }
        prevOrderCountRef.current = newOrders.length;
        setOrders(newOrders);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    refreshStatus();

    let unsubLog: (() => void) | undefined;
    if (window.printAgentApi?.onLog) {
      unsubLog = window.printAgentApi.onLog((log: any) => {
        setLogs((prev) => [...prev.slice(-150), log]);
      });
    }

    let unsubJob: (() => void) | undefined;
    if (window.printAgentApi?.onNewJob) {
      unsubJob = window.printAgentApi.onNewJob((job: any) => {
        playOrderChime();
        setBannerNotice(`Order #${job.orderNumber || ''} claimed`);
        fetchOrders();
      });
    }

    return () => {
      if (unsubLog) unsubLog();
      if (unsubJob) unsubJob();
    };
  }, []);

  useEffect(() => {
    if (status?.isEnrolled) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 6000);
      return () => clearInterval(interval);
    }
  }, [status?.isEnrolled, orderFilter]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await window.printAgentApi.login({
        backendUrl,
        email,
        password,
        deviceName,
      });
      if (res.success) {
        setBannerNotice(`Logged in successfully as ${res.user.fullName || res.user.email}!`);
        await refreshStatus();
        await fetchOrders();
      } else {
        setAuthError(res.error || "Login failed");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to contact backend server");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEnrollByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await window.printAgentApi.enrollDevice({
        backendUrl,
        enrollmentCode: enrollmentCode.trim(),
        deviceName,
      });
      if (res.success) {
        setBannerNotice(`Station enrolled for ${res.vendorName}!`);
        await refreshStatus();
        await fetchOrders();
      } else {
        setAuthError(res.error || "Enrollment code failed");
      }
    } catch (err: any) {
      setAuthError(err.message || "Enrollment failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email || !email.includes("@")) {
      setAuthError("Please enter a valid email address first.");
      return;
    }
    setOtpLoading(true);
    setAuthError("");
    try {
      const res = await window.printAgentApi.sendOtp({ backendUrl, email });
      if (res.success) {
        setOtpSent(true);
        setResendCooldown(60);
        setBannerNotice(res.message || "Verification code sent to your email.");
      } else {
        setAuthError(res.error || "Failed to send verification code.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to send OTP.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (signupOtp.trim().length !== 6) {
      setAuthError("Please enter the 6-digit verification code.");
      return;
    }
    setOtpLoading(true);
    setAuthError("");
    try {
      const res = await window.printAgentApi.verifyOtp({ backendUrl, email, otp: signupOtp.trim() });
      if (res.success) {
        setOtpVerified(true);
        setBannerNotice("Email verified successfully! You can now finish registration.");
      } else {
        setAuthError(res.error || "Incorrect or expired code.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to verify code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRegisterVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerified && !signupOtp) {
      setAuthError("Please verify your email address before registering.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await window.printAgentApi.registerVendor({
        backendUrl,
        email,
        password,
        fullName: signupOwnerName,
        vendorName: signupStoreName,
        contactPhone: signupPhone,
        address: signupAddress,
        otp: signupOtp.trim() || undefined,
        deviceName,
      });
      if (res.success) {
        setBannerNotice(`Welcome, ${signupStoreName}! Station successfully paired.`);
        await refreshStatus();
        await fetchOrders();
      } else {
        setAuthError(res.error || "Registration failed");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to contact backend server");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Disconnect and log out this print station?")) {
      await window.printAgentApi.logout();
      setStatus(null);
      setOrders([]);
      await refreshStatus();
    }
  };

  const handleTogglePolling = async () => {
    const nextState = !isPolling;
    await window.printAgentApi.togglePolling(nextState);
    setIsPolling(nextState);
  };

  const handleOpenPrintsFolder = async () => {
    await window.printAgentApi.openPrintsFolder();
  };

  const handleSyncPrinters = async () => {
    const res = await window.printAgentApi.syncPrinters();
    if (res.success) {
      setPrinters(res.printers || []);
      setBannerNotice("Printers and hardware spoolers synchronized.");
    }
  };

  const handleSavePrinterPreferences = async (newBw: string, newColor: string) => {
    setBwPrinter(newBw);
    setColorPrinter(newColor);
    await window.printAgentApi.setPrinterPreference({
      defaultBwPrinter: newBw,
      defaultColorPrinter: newColor,
    });
    setBannerNotice("Default printer routing saved!");
  };

  const handleTestPrint = async (printerName: string) => {
    setTestPrintLoading(printerName);
    try {
      const res = await window.printAgentApi.testPrint(printerName);
      if (res.success) {
        setBannerNotice(`Test page spooled to ${printerName}! Check virtual output or paper tray.`);
      } else {
        alert("Test print failed: " + res.message);
      }
    } finally {
      setTestPrintLoading(null);
    }
  };

  const handleOrderStatusAction = async (orderId: string, action: string) => {
    setActionLoading(orderId);
    try {
      const res = await window.printAgentApi.updateOrderStatus({ orderId, action });
      if (res.success) {
        await fetchOrders();
        setBannerNotice(`Order updated: ${action}`);
      } else {
        alert("Failed to update order: " + res.error);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleLoadPaymentStatus = async () => {
    setPaymentLoading(true);
    try {
      const res = await window.printAgentApi.getRazorpayStatus();
      if (res?.success) {
        setPaymentAccount(res.account);
      }
    } catch (err: any) {
      console.error("Payment status load error:", err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleConnectRazorpay = async () => {
    try {
      const res = await window.printAgentApi.connectRazorpay();
      if (res?.authorizeUrl) {
        await window.printAgentApi.openExternalUrl(res.authorizeUrl);
        setBannerNotice("Razorpay partner onboarding opened in your browser.");
      } else {
        alert("Could not start onboarding: " + (res?.error || "Unknown"));
      }
    } catch (err: any) {
      setBannerNotice("Failed to launch Razorpay onboarding: " + err.message);
    }
  };

  const handleSyncRazorpay = async () => {
    setPaymentLoading(true);
    try {
      const res = await window.printAgentApi.syncRazorpay();
      if (res?.success !== false) {
        await handleLoadPaymentStatus();
        setBannerNotice("Razorpay status refreshed successfully.");
      } else {
        alert("Sync result: " + (res?.message || res?.error));
      }
    } catch (err: any) {
      setBannerNotice("Failed to sync Razorpay: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDisconnectRazorpay = async () => {
    if (!confirm("Are you sure you want to disconnect your Razorpay account?")) return;
    setPaymentLoading(true);
    try {
      const res = await window.printAgentApi.disconnectRazorpay();
      if (res?.success !== false) {
        await handleLoadPaymentStatus();
        setBannerNotice("Razorpay account disconnected.");
      }
    } catch (err: any) {
      setBannerNotice("Failed to disconnect: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const isEnrolled = Boolean(status?.isEnrolled);
  const vendorName = status?.config?.vendorName || "Print Store";

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "ALL") return true;
    if (orderFilter === "PENDING") {
      return o.status !== "CANCELLED" && o.status !== "REJECTED" && (
        o.status === "AWAITING_VENDOR_APPROVAL" || 
        (o.paymentMethod === "CASH_ON_COLLECTION" && o.paymentStatus !== "CASH_COLLECTED" && o.paymentStatus !== "SUCCESS")
      );
    }
    if (orderFilter === "CONFIRMED") return o.status === "CONFIRMED" || o.status === "PRINTING";
    if (orderFilter === "READY") return o.status === "READY_FOR_PICKUP";
    if (orderFilter === "COMPLETED") return o.status === "COMPLETED";
    return true;
  });

  return (
    <div style={{ height: "100vh", overflow: "hidden", background: "#FAF7F2", color: "#0E1A3A", display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Top Banner Notice */}
      {bannerNotice && (
        <div style={{ background: "#10B981", padding: "8px 24px", fontSize: 13, fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff" }}>
          <span>{bannerNotice}</span>
          <button onClick={() => setBannerNotice(null)} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>✕</button>
        </div>
      )}

      {/* Main Top Header */}
      <header style={{ borderBottom: "1px solid #E2E8F0", background: "#FFFFFF", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 16, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}>
            <img src="brand/print2me-icon.png" alt="Print2Me" style={{ width: 34, height: "auto", objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: "800", display: "flex", alignItems: "center", gap: 8, color: "#0E1A3A" }}>
              <span>Print2Me Station</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#10B98115", color: "#10B981", border: "1px solid #10B98130", textTransform: "uppercase" }}>v1.0 Agent</span>
            </div>
            <div style={{ fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontWeight: "500" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: isEnrolled ? "#10B981" : "#EF4444" }}></span>
              <span>{isEnrolled ? `Connected: ${vendorName}` : "Station Disconnected"}</span>
            </div>
          </div>
        </div>

        {isEnrolled && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Auto Print Polling Toggle */}
            <button
              onClick={handleTogglePolling}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                borderRadius: 12,
                background: isPolling ? "#10B98115" : "#FAF7F2",
                border: isPolling ? "1px solid #10B98130" : "1px solid #E2E8F0",
                color: isPolling ? "#10B981" : "#64748B",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              <Power size={14} />
              <span>{isPolling ? "Auto-Print: ACTIVE" : "Auto-Print: PAUSED"}</span>
            </button>

            {/* Virtual Prints Folder */}
            <button
              onClick={handleOpenPrintsFolder}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                borderRadius: 12,
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                color: "#0E1A3A",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              <FolderOpen size={14} color="#0E1A3A" />
              <span>Virtual Prints</span>
            </button>

            {/* SaaS Subscription Plan Badge */}
            <button
              onClick={handleOpenSubscriptionPortal}
              title={subscription ? `Plan: ${subscription.plan?.name || subscription.planCode} (${subscription.daysRemaining} days left)` : "Manage Subscription"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 12,
                background: subscription?.isExpired ? "#EF444415" : "#6366F115",
                border: subscription?.isExpired ? "1px solid #EF444440" : "1px solid #6366F130",
                color: subscription?.isExpired ? "#DC2626" : "#4F46E5",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: 12,
                transition: "all 0.2s",
              }}
            >
              <CreditCard size={14} />
              <span>
                {subscription
                  ? subscription.isExpired
                    ? "Subscription Expired"
                    : `${subscription.plan?.name || subscription.planCode} • ${subscription.daysRemaining}d`
                  : "Subscription"}
              </span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => { refreshStatus(); fetchOrders(); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                color: "#0E1A3A",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={14} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "#EF444415",
                border: "1px solid #EF444430",
                color: "#EF4444",
                cursor: "pointer",
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </header>

      {/* Main Content Body */}
      <main style={{ flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", minHeight: 0 }}>
        {/* Subscription Expired Warning Banner */}
        {isEnrolled && subscription?.isExpired && (
          <div
            style={{
              background: "linear-gradient(135deg, #FEF2F2, #FEE2E2)",
              border: "1px solid #FCA5A5",
              borderRadius: 16,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 2px 10px rgba(239, 68, 68, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "#EF4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#991B1B" }}>
                  Vendor SaaS Subscription Expired
                </div>
                <div style={{ fontSize: 12, color: "#B91C1C", marginTop: 2 }}>
                  Your subscription ended on {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'recently'}. Customer orders are currently paused by the server.
                </div>
              </div>
            </div>
            <button
              onClick={handleOpenSubscriptionPortal}
              style={{
                background: "#DC2626",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 12,
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 6px rgba(220, 38, 38, 0.3)",
              }}
            >
              <span>Renew Subscription</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
        {!isEnrolled ? (
          /* ========================================================= */
          /* AUTHENTICATION & PAIRING VIEW */
          /* ========================================================= */
          <div style={{ maxWidth: 480, margin: "40px auto", width: "100%", background: "#FFFFFF", borderRadius: 32, border: "1px solid #E2E8F0", padding: 40, boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)", maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ width: 64, height: 64, margin: "0 auto 16px", borderRadius: 20, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Printer size={32} color="#0E1A3A" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: "800", margin: "0 0 8px 0", color: "#0E1A3A" }}>Pair Workstation</h2>
              <p style={{ fontSize: 14, color: "#64748B", margin: 0, fontWeight: "500" }}>
                Link this counter computer to your vendor store to automatically receive and print orders.
              </p>
            </div>

            {/* Auth Mode Toggle */}
            <div style={{ display: "flex", background: "#FAF7F2", padding: 6, borderRadius: 16, border: "1px solid #E2E8F0", marginBottom: 24, gap: 4 }}>
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                style={{
                  flex: 1,
                  padding: "9px 6px",
                  borderRadius: 12,
                  border: "none",
                  background: authMode === "login" ? "#FFFFFF" : "transparent",
                  color: authMode === "login" ? "#0E1A3A" : "#64748B",
                  fontWeight: "700",
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow: authMode === "login" ? "0 2px 8px rgba(14, 26, 58, 0.05)" : "none"
                }}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                style={{
                  flex: 1,
                  padding: "9px 6px",
                  borderRadius: 12,
                  border: "none",
                  background: authMode === "signup" ? "#FFFFFF" : "transparent",
                  color: authMode === "signup" ? "#0E1A3A" : "#64748B",
                  fontWeight: "700",
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow: authMode === "signup" ? "0 2px 8px rgba(14, 26, 58, 0.05)" : "none"
                }}
              >
                Sign Up
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("code")}
                style={{
                  flex: 1,
                  padding: "9px 6px",
                  borderRadius: 12,
                  border: "none",
                  background: authMode === "code" ? "#FFFFFF" : "transparent",
                  color: authMode === "code" ? "#0E1A3A" : "#64748B",
                  fontWeight: "700",
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow: authMode === "code" ? "0 2px 8px rgba(14, 26, 58, 0.05)" : "none"
                }}
              >
                Enroll Code
              </button>
            </div>

            {authError && (
              <div style={{ padding: "12px 16px", background: "#EF444415", border: "1px solid #EF444430", borderRadius: 16, color: "#EF4444", fontSize: 13, marginBottom: 24, fontWeight: "600" }}>
                {authError}
              </div>
            )}

            {authMode === "signup" ? (
              <form onSubmit={handleRegisterVendor} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: "700", color: "#0E1A3A" }}>Store Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Print Studio"
                      value={signupStoreName}
                      onChange={(e) => setSignupStoreName(e.target.value)}
                      style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: 14, color: "#0E1A3A", fontSize: 13, marginTop: 6, outline: "none", fontWeight: "500" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: "700", color: "#0E1A3A" }}>Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={signupOwnerName}
                      onChange={(e) => setSignupOwnerName(e.target.value)}
                      style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: 14, color: "#0E1A3A", fontSize: 13, marginTop: 6, outline: "none", fontWeight: "500" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: "700", color: "#0E1A3A" }}>Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={signupPhone}
                      onChange={(e) => setSignupPhone(e.target.value)}
                      style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: 14, color: "#0E1A3A", fontSize: 13, marginTop: 6, outline: "none", fontWeight: "500" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: "700", color: "#0E1A3A" }}>Store Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="Counter #1, Campus Market"
                      value={signupAddress}
                      onChange={(e) => setSignupAddress(e.target.value)}
                      style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: 14, color: "#0E1A3A", fontSize: 13, marginTop: 6, outline: "none", fontWeight: "500" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: "700", color: "#0E1A3A" }}>Work Email *</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      type="email"
                      required
                      disabled={otpVerified}
                      placeholder="vendor@print2me.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ flex: 1, background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: 14, color: "#0E1A3A", fontSize: 13, outline: "none", fontWeight: "500" }}
                    />
                    <button
                      type="button"
                      disabled={otpLoading || resendCooldown > 0 || otpVerified}
                      onClick={handleSendOtp}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 14,
                        border: "none",
                        background: otpVerified ? "#10B981" : "#0E1A3A",
                        color: "#FFFFFF",
                        fontSize: 12,
                        fontWeight: "700",
                        cursor: otpVerified || resendCooldown > 0 ? "default" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {otpVerified ? "Verified" : resendCooldown > 0 ? `Resend (${resendCooldown}s)` : otpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>
                </div>

                {otpSent && !otpVerified && (
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 16, padding: "14px" }}>
                    <label style={{ fontSize: 12, fontWeight: "700", color: "#166534" }}>Enter 6-Digit Email OTP *</label>
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="123456"
                        value={signupOtp}
                        onChange={(e) => setSignupOtp(e.target.value)}
                        style={{ flex: 1, background: "#FFFFFF", border: "1px solid #86EFAC", padding: "10px 14px", borderRadius: 12, fontSize: 16, fontWeight: "800", letterSpacing: 4, textAlign: "center", outline: "none" }}
                      />
                      <button
                        type="button"
                        disabled={otpLoading}
                        onClick={handleVerifyOtp}
                        style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "#16A34A", color: "#FFFFFF", fontWeight: "700", fontSize: 12, cursor: "pointer" }}
                      >
                        {otpLoading ? "Verifying..." : "Verify Code"}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 12, fontWeight: "700", color: "#0E1A3A" }}>Account Password (Min 8 chars) *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: 14, color: "#0E1A3A", fontSize: 13, marginTop: 6, outline: "none", fontWeight: "500" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: "700", color: "#0E1A3A" }}>Station Name</label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "12px 14px", borderRadius: 14, color: "#0E1A3A", fontSize: 13, marginTop: 6, outline: "none", fontWeight: "500" }}
                  />
                </div>

                <details style={{ marginTop: 2, marginBottom: 4, fontSize: 11, color: "#64748B" }}>
                  <summary style={{ cursor: "pointer", opacity: 0.8, userSelect: "none" }}>Advanced: Custom Server URL</summary>
                  <div style={{ marginTop: 6 }}>
                    <input
                      type="text"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      placeholder="https://www.print2me.in"
                      style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "10px 14px", borderRadius: 12, color: "#0E1A3A", fontSize: 12, outline: "none", fontWeight: "500" }}
                    />
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    marginTop: 6,
                    padding: "16px",
                    borderRadius: 16,
                    background: "#0E1A3A",
                    color: "#FFFFFF",
                    border: "none",
                    fontWeight: "800",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  {authLoading ? "Creating Account & Pairing..." : "Register & Pair Station"}
                </button>
              </form>
            ) : authMode === "login" ? (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Vendor Email</label>
                  <input
                    type="email"
                    required
                    placeholder="vendor@print2me.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 16, color: "#0E1A3A", fontSize: 14, marginTop: 8, outline: "none", fontWeight: "500" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 16, color: "#0E1A3A", fontSize: 14, marginTop: 8, outline: "none", fontWeight: "500" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Station Name</label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 16, color: "#0E1A3A", fontSize: 14, marginTop: 8, outline: "none", fontWeight: "500" }}
                  />
                </div>

                <details style={{ marginTop: 4, marginBottom: 8, fontSize: 12, color: "#64748B" }}>
                  <summary style={{ cursor: "pointer", opacity: 0.8, userSelect: "none" }}>Advanced: Custom Server URL</summary>
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      placeholder="https://www.print2me.in"
                      style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "10px 14px", borderRadius: 12, color: "#0E1A3A", fontSize: 13, outline: "none", fontWeight: "500" }}
                    />
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    marginTop: 8,
                    padding: "16px",
                    borderRadius: 16,
                    background: "#0E1A3A",
                    color: "#FFFFFF",
                    border: "none",
                    fontWeight: "800",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  {authLoading ? "Authenticating & Pairing..." : "Login & Pair Station"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleEnrollByCode} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>One-Time Enrollment Code</label>
                  <input
                    type="text"
                    required
                    placeholder="ENROLL-APEX-A8F2"
                    value={enrollmentCode}
                    onChange={(e) => setEnrollmentCode(e.target.value)}
                    style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 16, color: "#0E1A3A", fontSize: 14, marginTop: 8, outline: "none", fontWeight: "500", textTransform: "uppercase" }}
                  />
                  <p style={{ fontSize: 12, color: "#64748B", marginTop: 8, fontWeight: "500" }}>
                    Find this code in your Vendor Dashboard under Desktop Agent.
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Station Name</label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 16, color: "#0E1A3A", fontSize: 14, marginTop: 8, outline: "none", fontWeight: "500" }}
                  />
                </div>

                <details style={{ marginTop: 4, marginBottom: 8, fontSize: 12, color: "#64748B" }}>
                  <summary style={{ cursor: "pointer", opacity: 0.8, userSelect: "none" }}>Advanced: Custom Server URL</summary>
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      placeholder="https://www.print2me.in"
                      style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "10px 14px", borderRadius: 12, color: "#0E1A3A", fontSize: 13, outline: "none", fontWeight: "500" }}
                    />
                  </div>
                </details>

                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    marginTop: 8,
                    padding: "16px",
                    borderRadius: 16,
                    background: "#0E1A3A",
                    color: "#FFFFFF",
                    border: "none",
                    fontWeight: "800",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  {authLoading ? "Linking Station..." : "Enroll Device"}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ========================================================= */
          /* FULL FEATURE-RICH WORKSTATION DASHBOARD */
          /* ========================================================= */
          <>
            {/* Top Stat KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: "20px 24px", boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Incoming Queue</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FF8A1F15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={16} color="#FF8A1F" />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: "800", marginTop: 8, color: "#0E1A3A" }}>
                  {orders.filter((o) => o.status === "AWAITING_VENDOR_APPROVAL" || o.status === "CONFIRMED").length}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, fontWeight: "500" }}>Awaiting print or approval</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: "20px 24px", boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Total Store Orders</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#10B98115", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShoppingBag size={16} color="#10B981" />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: "800", marginTop: 8, color: "#0E1A3A" }}>
                  {orders.length}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, fontWeight: "500" }}>Synced from cloud</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: "20px 24px", boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Active Spooler</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Printer size={16} color="#0E1A3A" />
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: "800", marginTop: 12, color: "#0E1A3A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {bwPrinter || printers.find((p) => p.isDefault)?.displayName || "Default Printer"}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, fontWeight: "500" }}>{printers.length} detected printers</div>
              </div>

              <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: "20px 24px", boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                <div style={{ fontSize: 13, color: "#64748B", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Hardware Mode</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <HardDrive size={16} color="#0E1A3A" />
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: "800", marginTop: 12, color: "#0E1A3A" }}>
                  Virtual Emulator
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, fontWeight: "500" }}>Zero-cost local spooler</div>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: 16 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setActiveTab("queue")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: activeTab === "queue" ? "#0E1A3A" : "transparent",
                    background: activeTab === "queue" ? "#0E1A3A" : "transparent",
                    color: activeTab === "queue" ? "#FFFFFF" : "#64748B",
                    fontWeight: "700",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <ShoppingBag size={16} />
                  <span>Live Queue ({orders.length})</span>
                </button>

                <button
                  onClick={() => { setActiveTab("printers"); handleSyncPrinters(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: activeTab === "printers" ? "#0E1A3A" : "transparent",
                    background: activeTab === "printers" ? "#0E1A3A" : "transparent",
                    color: activeTab === "printers" ? "#FFFFFF" : "#64748B",
                    fontWeight: "700",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <Sliders size={16} />
                  <span>Printers & Routing ({printers.length})</span>
                </button>

                <button
                  onClick={() => { setActiveTab("payments"); handleLoadPaymentStatus(); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: activeTab === "payments" ? "#0E1A3A" : "transparent",
                    background: activeTab === "payments" ? "#0E1A3A" : "transparent",
                    color: activeTab === "payments" ? "#FFFFFF" : "#64748B",
                    fontWeight: "700",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <CreditCard size={16} />
                  <span>Razorpay Payments</span>
                </button>

                <button
                  onClick={() => setActiveTab("logs")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: activeTab === "logs" ? "#0E1A3A" : "transparent",
                    background: activeTab === "logs" ? "#0E1A3A" : "transparent",
                    color: activeTab === "logs" ? "#FFFFFF" : "#64748B",
                    fontWeight: "700",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <Terminal size={16} />
                  <span>Activity Terminal ({logs.length})</span>
                </button>
              </div>

              {activeTab === "queue" && (
                <div style={{ display: "flex", gap: 8 }}>
                  {["ALL", "PENDING", "CONFIRMED", "READY", "COMPLETED"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setOrderFilter(f)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: "700",
                        border: "1px solid",
                        borderColor: orderFilter === f ? "#0E1A3A" : "#E2E8F0",
                        background: orderFilter === f ? "#FFFFFF" : "#FAF7F2",
                        color: orderFilter === f ? "#0E1A3A" : "#64748B",
                        cursor: "pointer",
                        boxShadow: orderFilter === f ? "0 2px 8px rgba(14, 26, 58, 0.05)" : "none"
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* TAB CONTENT 1: QUEUE & ORDERS */}
            {activeTab === "queue" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                {loadingOrders && orders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#64748B", fontWeight: "600" }}>Loading store orders...</div>
                ) : filteredOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, background: "#FFFFFF", borderRadius: 24, border: "1px solid #E2E8F0", boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                      <ShoppingBag size={32} color="#0E1A3A" />
                    </div>
                    <div style={{ fontSize: 18, fontWeight: "800", color: "#0E1A3A" }}>No orders in this view</div>
                    <p style={{ fontSize: 14, color: "#64748B", fontWeight: "500", marginTop: 4 }}>Customer orders placed via your QR code will appear here automatically.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filteredOrders.map((order) => {
                      const totalSheets = order.items?.reduce((acc: number, i: any) => acc + (i.totalSheets || 1), 0) || 0;
                      const isCancelled = order.status === "CANCELLED" || order.status === "REJECTED";
                      const isPendingApproval = !isCancelled && order.status === "AWAITING_VENDOR_APPROVAL";
                      const isCashPending = !isCancelled && order.paymentMethod === "CASH_ON_COLLECTION" && order.paymentStatus !== "CASH_COLLECTED";
                      const isOnlineAwaiting = !isCancelled && (order.paymentMethod === "RAZORPAY" || order.paymentMethod === "ONLINE") && (order.status === "AWAITING_PAYMENT" || order.paymentStatus === "PENDING");

                      let paymentDisplay = order.paymentStatus;
                      if (isCancelled) paymentDisplay = "Cancelled";
                      else if (order.paymentStatus === "SUCCESS") paymentDisplay = "● Razorpay Paid";
                      else if (order.paymentStatus === "CASH_COLLECTED") paymentDisplay = "● Cash Paid";
                      else if (order.paymentStatus === "FAILED") paymentDisplay = "● Payment Failed";
                      else if (isOnlineAwaiting) paymentDisplay = "● Online Checkout Pending";
                      else if (isCashPending) paymentDisplay = "● Cash Due at Desk";

                      return (
                        <div
                          key={order.id}
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            borderRadius: 20,
                            padding: "20px 24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 20,
                            opacity: isCancelled ? 0.65 : 1,
                            boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <FileText size={24} color="#0E1A3A" />
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 18, fontWeight: "800", color: "#0E1A3A" }}>{order.orderNumber}</span>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: "800",
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  textTransform: "uppercase",
                                  border: "1px solid",
                                  background: isCancelled ? "#DC262615" : order.status === "COMPLETED" ? "#10B98115" : order.status === "CONFIRMED" ? "#0E1A3A" : "#FF8A1F15",
                                  borderColor: isCancelled ? "#DC262630" : order.status === "COMPLETED" ? "#10B98130" : "#0E1A3A",
                                  color: isCancelled ? "#DC2626" : order.status === "COMPLETED" ? "#10B981" : order.status === "CONFIRMED" ? "#FFFFFF" : "#FF8A1F",
                                }}>
                                  {order.status}
                                </span>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: "800",
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  textTransform: "uppercase",
                                  border: "1px solid",
                                  background: isCancelled ? "#94A3B815" : order.paymentMethod === "CASH_ON_COLLECTION" ? "#FF8A1F15" : "#10B98115",
                                  borderColor: isCancelled ? "#94A3B830" : order.paymentMethod === "CASH_ON_COLLECTION" ? "#FF8A1F30" : "#10B98130",
                                  color: isCancelled ? "#94A3B8" : order.paymentMethod === "CASH_ON_COLLECTION" ? "#FF8A1F" : "#10B981",
                                }}>
                                  {order.paymentMethod === "CASH_ON_COLLECTION" ? "Cash on Desk" : "Online Razorpay"}
                                </span>
                              </div>
                              <div style={{ fontSize: 13, color: "#64748B", marginTop: 6, fontWeight: "500" }}>
                                Customer: <strong style={{ color: "#0E1A3A" }}>{order.customerName || "Customer"}</strong> ({order.customerPhone || "No phone"}) • {order.items?.length || 1} file(s) ({totalSheets} sheets)
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 20, fontWeight: "800", color: "#0E1A3A" }}>
                                ₹{((order.totalAmountMinor || 0) / 100).toFixed(2)}
                              </div>
                              <div style={{ fontSize: 12, color: isCancelled ? "#94A3B8" : "#64748B", fontWeight: "600", marginTop: 2 }}>
                                {paymentDisplay}
                              </div>
                            </div>

                            {/* Order Action Buttons */}
                            <div style={{ display: "flex", gap: 10 }}>
                              {isPendingApproval && (
                                <button
                                  onClick={() => handleOrderStatusAction(order.id, "APPROVE")}
                                  disabled={actionLoading === order.id}
                                  style={{
                                    padding: "10px 16px",
                                    borderRadius: 12,
                                    background: "#0E1A3A",
                                    border: "none",
                                    color: "#FFFFFF",
                                    fontWeight: "800",
                                    fontSize: 13,
                                    cursor: "pointer",
                                  }}
                                >
                                  {actionLoading === order.id ? "Approving..." : "Approve & Print"}
                                </button>
                              )}

                              {isOnlineAwaiting && (
                                <>
                                  <button
                                    onClick={() => handleOrderStatusAction(order.id, "CONVERT_TO_CASH")}
                                    disabled={actionLoading === order.id}
                                    style={{
                                      padding: "10px 16px",
                                      borderRadius: 12,
                                      background: "#FF8A1F",
                                      border: "none",
                                      color: "#FFFFFF",
                                      fontWeight: "800",
                                      fontSize: 13,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Pay Cash
                                  </button>
                                  <button
                                    onClick={() => handleOrderStatusAction(order.id, "CANCEL")}
                                    disabled={actionLoading === order.id}
                                    style={{
                                      padding: "10px 16px",
                                      borderRadius: 12,
                                      background: "#FFFFFF",
                                      border: "1px solid #E2E8F0",
                                      color: "#DC2626",
                                      fontWeight: "800",
                                      fontSize: 13,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}

                              {isCancelled && (
                                <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: "600" }}>
                                  Order cancelled
                                </span>
                              )}

                              {isCashPending && (
                                <button
                                  onClick={() => handleOrderStatusAction(order.id, "MARK_CASH_COLLECTED")}
                                  disabled={actionLoading === order.id}
                                  style={{
                                    padding: "10px 16px",
                                    borderRadius: 12,
                                    background: "#FF8A1F",
                                    border: "none",
                                    color: "#FFFFFF",
                                    fontWeight: "800",
                                    fontSize: 13,
                                    cursor: "pointer",
                                  }}
                                >
                                  Collect ₹{((order.totalAmountMinor || 0) / 100).toFixed(0)}
                                </button>
                              )}

                              {order.status === "CONFIRMED" && (
                                <button
                                  onClick={() => handleOrderStatusAction(order.id, "MARK_READY")}
                                  disabled={actionLoading === order.id}
                                  style={{
                                    padding: "10px 16px",
                                    borderRadius: 12,
                                    background: "#FFFFFF",
                                    border: "1px solid #E2E8F0",
                                    color: "#0E1A3A",
                                    fontWeight: "800",
                                    fontSize: 13,
                                    cursor: "pointer",
                                  }}
                                >
                                  Mark Ready
                                </button>
                              )}

                              {order.status === "READY_FOR_PICKUP" && (
                                <button
                                  onClick={() => handleOrderStatusAction(order.id, "MARK_COMPLETED")}
                                  disabled={actionLoading === order.id}
                                  style={{
                                    padding: "10px 16px",
                                    borderRadius: 12,
                                    background: "#10B98115",
                                    border: "1px solid #10B98130",
                                    color: "#10B981",
                                    fontWeight: "800",
                                    fontSize: 13,
                                    cursor: "pointer",
                                  }}
                                >
                                  Complete Order
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: PRINTERS & HARDWARE ROUTING */}
            {activeTab === "printers" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* Hardware Preferences Card */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: "800", color: "#0E1A3A", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Sliders size={20} color="#0E1A3A" />
                      </div>
                      <span>Smart Printer Routing</span>
                    </div>
                    <button
                      onClick={handleSyncPrinters}
                      style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: 12, color: "#0E1A3A", cursor: "pointer", fontSize: 13, fontWeight: "700" }}
                    >
                      Sync Spoolers
                    </button>
                  </div>

                  <p style={{ fontSize: 14, color: "#64748B", margin: 0, fontWeight: "500", lineHeight: "1.5" }}>
                    Automatically route jobs based on customer color settings. Print2Me will send B&amp;W jobs to your high-speed laser printer and color jobs to your color printer.
                  </p>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Default Black &amp; White Printer</label>
                    <select
                      value={bwPrinter}
                      onChange={(e) => handleSavePrinterPreferences(e.target.value, colorPrinter)}
                      style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 16, color: "#0E1A3A", fontSize: 14, marginTop: 8, outline: "none", fontWeight: "500", cursor: "pointer" }}
                    >
                      <option value="">System Default Printer</option>
                      {printers.map((p, idx) => (
                        <option key={idx} value={p.systemName}>
                          {p.displayName || p.systemName} {p.isDefault ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Default Color Printer</label>
                    <select
                      value={colorPrinter}
                      onChange={(e) => handleSavePrinterPreferences(bwPrinter, e.target.value)}
                      style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 16, color: "#0E1A3A", fontSize: 14, marginTop: 8, outline: "none", fontWeight: "500", cursor: "pointer" }}
                    >
                      <option value="">Auto-Route (Same as B&amp;W)</option>
                      {printers.map((p, idx) => (
                        <option key={idx} value={p.systemName}>
                          {p.displayName || p.systemName} {p.supportsColor ? "(Color)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Detected Printers List */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                  <div style={{ fontSize: 18, fontWeight: "800", color: "#0E1A3A", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Printer size={20} color="#0E1A3A" />
                    </div>
                    <span>Detected Printers ({printers.length})</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 380, overflowY: "auto", paddingRight: 8 }}>
                    {printers.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px 20px", background: "#FAF7F2", borderRadius: 16, border: "1px dashed #E2E8F0" }}>
                        <div style={{ width: 52, height: 52, borderRadius: 16, background: "#FFFFFF", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                          <Printer size={26} color="#CBD5E1" />
                        </div>
                        <div style={{ fontSize: 15, fontWeight: "800", color: "#0E1A3A", marginBottom: 6 }}>No Printers Detected</div>
                        <div style={{ fontSize: 12, color: "#64748B", fontWeight: "500", lineHeight: 1.6, marginBottom: 16 }}>
                          Make sure your printer is <strong>turned on</strong> and connected to this PC via USB or the same WiFi network.<br />
                          On Windows, open <em>Settings → Bluetooth &amp; devices → Printers &amp; scanners</em> to install a printer first.
                        </div>
                        <button
                          onClick={handleSyncPrinters}
                          style={{
                            padding: "10px 20px",
                            borderRadius: 12,
                            background: "#0E1A3A",
                            border: "none",
                            color: "#FFFFFF",
                            fontSize: 13,
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <RefreshCw size={14} />
                          Refresh Printer List
                        </button>
                      </div>
                    ) : (
                      printers.map((p, idx) => (
                        <div key={idx} style={{ background: "#FAF7F2", padding: "16px 20px", borderRadius: 16, border: `1px solid ${p.isOnline === false ? '#FCA5A5' : '#E2E8F0'}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: "800", color: "#0E1A3A", display: "flex", alignItems: "center", gap: 10 }}>
                              <span
                                style={{
                                  width: 8, height: 8, borderRadius: "50%",
                                  background: p.isOnline === false ? "#EF4444" : p.status === "PRINTING" ? "#FF8A1F" : "#10B981",
                                  flexShrink: 0,
                                }}
                              />
                              <span>{p.displayName || p.systemName}</span>
                              {p.isDefault && (
                                <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "#10B98115", border: "1px solid #10B98130", color: "#10B981", textTransform: "uppercase" }}>Default</span>
                              )}
                              {p.isOnline === false && (
                                <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "#EF444415", border: "1px solid #EF444430", color: "#EF4444", textTransform: "uppercase" }}>Offline</span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748B", marginTop: 6, fontWeight: "500" }}>
                              {p.status || "Ready"} • {p.supportsColor ? "Color" : "B&W Laser"} • {p.supportsDuplex ? "Duplex" : "Single-Sided"} • {p.portName || "Network"}
                            </div>
                          </div>

                          <button
                            onClick={() => handleTestPrint(p.systemName)}
                            disabled={testPrintLoading === p.systemName || p.isOnline === false}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 12,
                              background: "#FFFFFF",
                              border: "1px solid #E2E8F0",
                              color: p.isOnline === false ? "#CBD5E1" : "#0E1A3A",
                              fontSize: 12,
                              fontWeight: "700",
                              cursor: p.isOnline === false ? "not-allowed" : "pointer",
                              boxShadow: "0 2px 4px rgba(14, 26, 58, 0.05)"
                            }}
                          >
                            {testPrintLoading === p.systemName ? "Printing..." : "Test Print"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: RAZORPAY ONBOARDING & PAYMENTS */}
            {activeTab === "payments" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: 32, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)", flexWrap: "wrap", gap: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: paymentAccount?.authStatus === "AUTHORIZED" ? "#10B98115" : "#FF8A1F15", border: "1px solid " + (paymentAccount?.authStatus === "AUTHORIZED" ? "#10B98130" : "#FF8A1F30"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CreditCard size={28} color={paymentAccount?.authStatus === "AUTHORIZED" ? "#10B981" : "#FF8A1F"} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 20, fontWeight: "800", color: "#0E1A3A" }}>Razorpay Partner Gateway</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: "800",
                          padding: "4px 12px",
                          borderRadius: 999,
                          textTransform: "uppercase",
                          background: paymentAccount?.authStatus === "AUTHORIZED" ? "#10B98115" : "#64748B15",
                          color: paymentAccount?.authStatus === "AUTHORIZED" ? "#10B981" : "#64748B",
                          border: "1px solid " + (paymentAccount?.authStatus === "AUTHORIZED" ? "#10B98130" : "#64748B30")
                        }}>
                          {paymentAccount?.authStatus === "AUTHORIZED" ? "Connected" : "Not Connected"}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                        {paymentAccount?.authStatus === "AUTHORIZED"
                          ? "Your Razorpay account is active. Customer payments from store QR scans are deposited directly into your bank account."
                          : "Connect your store's Razorpay account to accept instant UPI (GPay, PhonePe, Paytm) and cards when customers scan your counter QR."}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    {paymentAccount?.authStatus === "AUTHORIZED" ? (
                      <>
                        <button
                          onClick={handleSyncRazorpay}
                          disabled={paymentLoading}
                          style={{ padding: "10px 18px", borderRadius: 12, background: "#FAF7F2", border: "1px solid #E2E8F0", color: "#0E1A3A", fontWeight: "700", fontSize: 13, cursor: "pointer" }}
                        >
                          {paymentLoading ? "Syncing..." : "Sync Status"}
                        </button>
                        <button
                          onClick={handleDisconnectRazorpay}
                          disabled={paymentLoading}
                          style={{ padding: "10px 18px", borderRadius: 12, background: "#EF444415", border: "1px solid #EF444430", color: "#EF4444", fontWeight: "700", fontSize: 13, cursor: "pointer" }}
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleConnectRazorpay}
                        style={{ padding: "12px 24px", borderRadius: 14, background: "#0284C7", border: "none", color: "#FFFFFF", fontWeight: "800", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                      >
                        <CreditCard size={16} />
                        <span>Connect Razorpay</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24 }}>
                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: 28, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                    <div style={{ fontSize: 16, fontWeight: "800", color: "#0E1A3A" }}>Merchant Account Specifications</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#FAF7F2", borderRadius: 10 }}>
                        <span style={{ color: "#64748B", fontWeight: "600" }}>Razorpay Merchant ID</span>
                        <strong style={{ color: "#0E1A3A" }}>{paymentAccount?.razorpayAccountId || "Unassigned"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#FAF7F2", borderRadius: 10 }}>
                        <span style={{ color: "#64748B", fontWeight: "600" }}>Partner Onboarding</span>
                        <strong style={{ color: "#0E1A3A" }}>{paymentAccount?.partnerApp || "Print2me"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#FAF7F2", borderRadius: 10 }}>
                        <span style={{ color: "#64748B", fontWeight: "600" }}>KYC &amp; Activation State</span>
                        <strong style={{ color: "#0E1A3A" }}>{paymentAccount?.activationStatus || "NOT_ACTIVATED"}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#FAF7F2", borderRadius: 10 }}>
                        <span style={{ color: "#64748B", fontWeight: "600" }}>Settlement Mode</span>
                        <strong style={{ color: "#0E1A3A" }}>Direct Bank Route (Daily T+1 IMPS)</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: 28, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                    <div style={{ fontSize: 16, fontWeight: "800", color: "#0E1A3A" }}>Quick Setup Guide</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#FF8A1F", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "800" }}>1</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Initiate Onboarding</div>
                          <div style={{ fontSize: 12, color: "#64748B" }}>Authorize Print2Me through Razorpay's secure OAuth flow.</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#FF8A1F", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "800" }}>2</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Link Bank Account</div>
                          <div style={{ fontSize: 12, color: "#64748B" }}>Provide store IFSC and account number for daily automatic payouts.</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#FF8A1F", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "800" }}>3</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Start Accepting UPI</div>
                          <div style={{ fontSize: 12, color: "#64748B" }}>Customers scan your QR standee and pay instantly on mobile.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: ACTIVITY STREAM LOGS */}
            {activeTab === "logs" && (
              <div style={{ flex: 1, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 24, padding: 24, display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: "800", color: "#0E1A3A", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Terminal size={18} color="#0E1A3A" />
                    </div>
                    <span>Real-Time Windows Spooler &amp; Agent Activity Log</span>
                  </div>
                  <button
                    onClick={() => setLogs([])}
                    style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", padding: "8px 16px", borderRadius: 10, color: "#0E1A3A", fontSize: 12, fontWeight: "700", cursor: "pointer" }}
                  >
                    Clear Stream
                  </button>
                </div>

                <div style={{ flex: 1, background: "#0E1A3A", borderRadius: 16, padding: 20, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, overflowY: "auto", maxHeight: 500, display: "flex", flexDirection: "column", gap: 8, border: "1px solid #E2E8F0", boxShadow: "inset 0 4px 12px rgba(0,0,0,0.2)" }}>
                  {logs.length === 0 ? (
                    <div style={{ color: "#64748B", fontStyle: "italic" }}>Listening for spooler events and print queue jobs...</div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} style={{ color: log.level === "error" ? "#EF4444" : log.level === "warn" ? "#FF8A1F" : "#F8FAFC" }}>
                        <span style={{ color: "#64748B", marginRight: 10 }}>[{log.timestamp}]</span>
                        <span>{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
