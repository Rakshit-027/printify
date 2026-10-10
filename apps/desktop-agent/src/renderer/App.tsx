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
  Sparkles,
  ShieldCheck,
  Smartphone,
  HardDrive
} from "lucide-react";

declare global {
  interface Window {
    printAgentApi: any;
  }
}

type TabType = "queue" | "printers" | "logs";

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

  // Auth / Login State
  const [authMode, setAuthMode] = useState<"login" | "code">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [backendUrl, setBackendUrl] = useState("http://localhost:3000");
  const [deviceName, setDeviceName] = useState("Counter-Station-1");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Printer Preferences
  const [bwPrinter, setBwPrinter] = useState("");
  const [colorPrinter, setColorPrinter] = useState("");

  const logEndRef = useRef<HTMLDivElement>(null);

  const refreshStatus = async () => {
    if (!window.printAgentApi) return;
    try {
      const res = await window.printAgentApi.getStatus();
      setStatus(res);
      setPrinters(res.printers || []);
      setIsPolling(res.config?.isPollingActive ?? true);
      if (res.config?.defaultBwPrinter) setBwPrinter(res.config.defaultBwPrinter);
      if (res.config?.defaultColorPrinter) setColorPrinter(res.config.defaultColorPrinter);
    } catch (err) {
      console.error("Error refreshing status:", err);
    }
  };

  const fetchOrders = async () => {
    if (!window.printAgentApi || !status?.isEnrolled) return;
    setLoadingOrders(true);
    try {
      const res = await window.printAgentApi.getOrders(orderFilter);
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    refreshStatus();

    if (window.printAgentApi?.onLog) {
      const unsubscribe = window.printAgentApi.onLog((log: any) => {
        setLogs((prev) => [...prev.slice(-150), log]);
      });
      return () => unsubscribe();
    }
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

  const isEnrolled = Boolean(status?.isEnrolled);
  const vendorName = status?.config?.vendorName || "Print Store";

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "ALL") return true;
    if (orderFilter === "PENDING") return o.status === "AWAITING_VENDOR_APPROVAL" || o.status === "AWAITING_PAYMENT";
    if (orderFilter === "CONFIRMED") return o.status === "CONFIRMED" || o.status === "PRINTING";
    if (orderFilter === "READY") return o.status === "READY_FOR_PICKUP";
    if (orderFilter === "COMPLETED") return o.status === "COMPLETED";
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "#0E1A3A", display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif" }}>
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
          <div style={{ width: 44, height: 44, borderRadius: 16, background: "#FAF7F2", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Printer size={22} color="#0E1A3A" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: "800", display: "flex", alignItems: "center", gap: 8, color: "#0E1A3A" }}>
              <span>PrintFlow Station</span>
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
      <main style={{ flex: 1, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {!isEnrolled ? (
          /* ========================================================= */
          /* AUTHENTICATION & PAIRING VIEW */
          /* ========================================================= */
          <div style={{ maxWidth: 480, margin: "60px auto", width: "100%", background: "#FFFFFF", borderRadius: 32, border: "1px solid #E2E8F0", padding: 40, boxShadow: "0 4px 20px rgba(14, 26, 58, 0.05)" }}>
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
            <div style={{ display: "flex", background: "#FAF7F2", padding: 6, borderRadius: 16, border: "1px solid #E2E8F0", marginBottom: 24 }}>
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 12,
                  border: "none",
                  background: authMode === "login" ? "#FFFFFF" : "transparent",
                  color: authMode === "login" ? "#0E1A3A" : "#64748B",
                  fontWeight: "700",
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: authMode === "login" ? "0 2px 8px rgba(14, 26, 58, 0.05)" : "none"
                }}
              >
                Vendor Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("code")}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 12,
                  border: "none",
                  background: authMode === "code" ? "#FFFFFF" : "transparent",
                  color: authMode === "code" ? "#0E1A3A" : "#64748B",
                  fontWeight: "700",
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: authMode === "code" ? "0 2px 8px rgba(14, 26, 58, 0.05)" : "none"
                }}
              >
                Enrollment Code
              </button>
            </div>

            {authError && (
              <div style={{ padding: "12px 16px", background: "#EF444415", border: "1px solid #EF444430", borderRadius: 16, color: "#EF4444", fontSize: 13, marginBottom: 24, fontWeight: "600" }}>
                {authError}
              </div>
            )}

            {authMode === "login" ? (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Vendor Email</label>
                  <input
                    type="email"
                    required
                    placeholder="vendor@printflow.in"
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

                <div>
                  <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Server URL</label>
                  <input
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 16, color: "#0E1A3A", fontSize: 14, marginTop: 8, outline: "none", fontWeight: "500" }}
                  />
                </div>

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

                <div>
                  <label style={{ fontSize: 13, fontWeight: "700", color: "#0E1A3A" }}>Server URL</label>
                  <input
                    type="text"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                    style={{ width: "100%", background: "#FAF7F2", border: "1px solid #E2E8F0", padding: "14px 16px", borderRadius: 16, color: "#0E1A3A", fontSize: 14, marginTop: 8, outline: "none", fontWeight: "500" }}
                  />
                </div>

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
                  onClick={() => setActiveTab("printers")}
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
                      const isPendingApproval = order.status === "AWAITING_VENDOR_APPROVAL";
                      const isCashPending = order.paymentMethod === "CASH_ON_COLLECTION" && order.paymentStatus !== "CASH_COLLECTED";

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
                                  background: order.status === "COMPLETED" ? "#10B98115" : order.status === "CONFIRMED" ? "#0E1A3A" : "#FF8A1F15",
                                  borderColor: order.status === "COMPLETED" ? "#10B98130" : "#0E1A3A",
                                  color: order.status === "COMPLETED" ? "#10B981" : order.status === "CONFIRMED" ? "#FFFFFF" : "#FF8A1F",
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
                                  background: order.paymentMethod === "CASH_ON_COLLECTION" ? "#FF8A1F15" : "#10B98115",
                                  borderColor: order.paymentMethod === "CASH_ON_COLLECTION" ? "#FF8A1F30" : "#10B98130",
                                  color: order.paymentMethod === "CASH_ON_COLLECTION" ? "#FF8A1F" : "#10B981",
                                }}>
                                  {order.paymentMethod === "CASH_ON_COLLECTION" ? "💵 Cash on Desk" : "💳 Online Razorpay"}
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
                              <div style={{ fontSize: 12, color: "#64748B", fontWeight: "600", marginTop: 2 }}>
                                {order.paymentStatus}
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
                    Automatically route jobs based on customer color settings. PrintFlow will send B&amp;W jobs to your high-speed laser printer and color jobs to your color printer.
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
                          {p.displayName || p.systemName} {p.supportsColor ? "🎨 (Color Ready)" : ""}
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
                    {printers.map((p, idx) => (
                      <div key={idx} style={{ background: "#FAF7F2", padding: "16px 20px", borderRadius: 16, border: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: "800", color: "#0E1A3A", display: "flex", alignItems: "center", gap: 10 }}>
                            <span>{p.displayName || p.systemName}</span>
                            {p.isDefault && (
                              <span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 8, background: "#10B98115", border: "1px solid #10B98130", color: "#10B981", textTransform: "uppercase" }}>Default</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "#64748B", marginTop: 6, fontWeight: "500" }}>
                            {p.supportsColor ? "Color" : "B&W Laser"} • {p.supportsDuplex ? "Duplex Supported" : "Single-Sided"} • {p.supportedSizes?.join(", ")}
                          </div>
                        </div>

                        <button
                          onClick={() => handleTestPrint(p.systemName)}
                          disabled={testPrintLoading === p.systemName}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 12,
                            background: "#FFFFFF",
                            border: "1px solid #E2E8F0",
                            color: "#0E1A3A",
                            fontSize: 12,
                            fontWeight: "700",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(14, 26, 58, 0.05)"
                          }}
                        >
                          {testPrintLoading === p.systemName ? "Printing..." : "Test Print"}
                        </button>
                      </div>
                    ))}
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
