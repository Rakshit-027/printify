'use client';

import { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  ShieldCheck,
  IndianRupee,
  Save,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles,
  Sliders,
  FileText
} from 'lucide-react';

interface VendorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

interface PricingItem {
  id?: string;
  paperSize: string;
  colorMode: string;
  isDuplex: boolean;
  pricePerSideMinor: number;
  sheetChargeMinor?: number;
  minimumOrderMinor?: number;
  isActive: boolean;
}

export function VendorSettingsModal({ isOpen, onClose, onUpdated }: VendorSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'PRICING' | 'PAYMENT'>('PRICING');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Store & Payment Settings
  const [settings, setSettings] = useState({
    name: '',
    contactPhone: '',
    address: '',
    allowCashOnDesk: true,
    allowOnlinePayment: true,
    razorpayKeyId: '',
    razorpayKeySecret: '',
    upiId: '',
    subscriptionPlan: 'TRIAL',
    subscriptionExpiresAt: '',
  });

  // Pricing Matrix State
  const [pricingList, setPricingList] = useState<PricingItem[]>([]);
  const [minOrderRupees, setMinOrderRupees] = useState<number>(5);

  useEffect(() => {
    if (isOpen) {
      loadAllSettings();
    }
  }, [isOpen]);

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Load General Settings
      const resSettings = await fetch('/api/vendor/settings');
      const dataSettings = await resSettings.json();
      if (resSettings.ok && dataSettings.settings) {
        setSettings({
          name: dataSettings.settings.name || '',
          contactPhone: dataSettings.settings.contactPhone || '',
          address: dataSettings.settings.address || '',
          allowCashOnDesk: Boolean(dataSettings.settings.allowCashOnDesk),
          allowOnlinePayment: Boolean(dataSettings.settings.allowOnlinePayment),
          razorpayKeyId: dataSettings.settings.razorpayKeyId || '',
          razorpayKeySecret: dataSettings.settings.razorpayKeySecretMasked || '',
          upiId: dataSettings.settings.upiId || '',
          subscriptionPlan: dataSettings.settings.subscriptionPlan || 'TRIAL',
          subscriptionExpiresAt: dataSettings.settings.subscriptionExpiresAt || '',
        });
      }

      // Load Pricing Matrix
      const resPricing = await fetch('/api/vendor/pricing');
      const dataPricing = await resPricing.json();
      if (resPricing.ok && dataPricing.pricing) {
        setPricingList(dataPricing.pricing);
        if (dataPricing.minimumOrderMinor !== undefined) {
          setMinOrderRupees(dataPricing.minimumOrderMinor / 100);
        }
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (paperSize: string, colorMode: string, isDuplex: boolean): number => {
    const item = pricingList.find(
      (p) => p.paperSize === paperSize && p.colorMode === colorMode && p.isDuplex === isDuplex
    );
    return item ? item.pricePerSideMinor / 100 : 2;
  };

  const isSizeActive = (paperSize: string): boolean => {
    const items = pricingList.filter((p) => p.paperSize === paperSize);
    return items.some((p) => p.isActive);
  };

  const updatePrice = (paperSize: string, colorMode: string, isDuplex: boolean, rupees: number) => {
    const minor = Math.max(10, Math.round(rupees * 100));
    setPricingList((prev) =>
      prev.map((p) => {
        if (p.paperSize === paperSize && p.colorMode === colorMode && p.isDuplex === isDuplex) {
          return { ...p, pricePerSideMinor: minor };
        }
        return p;
      })
    );
  };

  const toggleSizeActive = (paperSize: string, active: boolean) => {
    setPricingList((prev) =>
      prev.map((p) => (p.paperSize === paperSize ? { ...p, isActive: active } : p))
    );
  };

  const applyPreset = (bw1: number, bw2: number, c1: number, c2: number, minOrder: number) => {
    setMinOrderRupees(minOrder);
    setPricingList((prev) =>
      prev.map((p) => {
        let price = p.pricePerSideMinor;
        if (p.paperSize === 'A4' || p.paperSize === 'LETTER') {
          if (p.colorMode === 'BLACK_AND_WHITE') {
            price = p.isDuplex ? bw2 * 100 : bw1 * 100;
          } else {
            price = p.isDuplex ? c2 * 100 : c1 * 100;
          }
        } else if (p.paperSize === 'A3') {
          if (p.colorMode === 'BLACK_AND_WHITE') {
            price = p.isDuplex ? bw2 * 2.5 * 100 : bw1 * 2.5 * 100;
          } else {
            price = p.isDuplex ? c2 * 2 * 100 : c1 * 2 * 100;
          }
        } else if (p.paperSize === 'LEGAL') {
          if (p.colorMode === 'BLACK_AND_WHITE') {
            price = p.isDuplex ? (bw2 + 0.5) * 100 : (bw1 + 0.5) * 100;
          } else {
            price = p.isDuplex ? (c2 + 2) * 100 : (c1 + 2) * 100;
          }
        }
        return { ...p, pricePerSideMinor: Math.round(price) };
      })
    );
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      if (activeTab === 'PRICING') {
        const res = await fetch('/api/vendor/pricing', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pricing: pricingList,
            minimumOrderMinor: Math.round(minOrderRupees * 100),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save pricing matrix');
        setMessage({ text: 'Per-page pricing and paper sizes saved successfully!', type: 'success' });
      } else {
        const res = await fetch('/api/vendor/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save store settings');
        setMessage({ text: 'Store & payment settings saved successfully!', type: 'success' });
      }

      if (onUpdated) onUpdated();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setMessage({ text: err.message || 'Error saving settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Vendor Control &amp; Pricing Station</h2>
            <p className="text-xs text-slate-400">Configure per-page pricing, paper sizes &amp; payment credentials</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('PRICING')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PRICING'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>Per-Page Pricing &amp; Sizes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PAYMENT')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PAYMENT'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Store &amp; Payment Gateway</span>
          </button>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading vendor configuration...</div>
        ) : (
          <form onSubmit={handleSaveAll} className="space-y-6">
            {/* TAB 1: PRICING & PAPER SIZES */}
            {activeTab === 'PRICING' && (
              <div className="space-y-5">
                {/* Presets Strip */}
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Quick Pricing Presets
                    </span>
                    <span className="text-[11px] text-slate-400">Click to apply standard rates</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => applyPreset(2.0, 1.75, 10.0, 9.0, 5)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-indigo-500/30 font-semibold transition-colors"
                    >
                      Campus: ₹2 B&amp;W • ₹10 Color
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(1.5, 1.25, 8.0, 7.5, 5)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-indigo-500/30 font-semibold transition-colors"
                    >
                      Discount: ₹1.50 B&amp;W • ₹8 Color
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset(3.0, 2.5, 15.0, 12.0, 10)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-indigo-500/30 font-semibold transition-colors"
                    >
                      Photo/Premium: ₹3 B&amp;W • ₹15 Color
                    </button>
                  </div>
                </div>

                {/* Minimum Order Value */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4 text-emerald-400" />
                      Minimum Order Value
                    </div>
                    <div className="text-[11px] text-slate-400">Enforced at counter checkout for walk-up orders</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="100"
                      value={minOrderRupees}
                      onChange={(e) => setMinOrderRupees(parseFloat(e.target.value) || 1)}
                      className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold text-xs text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Paper Sizes Configuration Matrix */}
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Paper Sizes &amp; Per-Side Pricing (₹)</span>
                    <span className="text-[11px] text-slate-500">Toggle sizes to offer or hide them from customers</span>
                  </div>

                  {[
                    { key: 'A4', label: 'A4 (Standard 210 × 297 mm)', desc: 'Standard office & college documents' },
                    { key: 'A3', label: 'A3 (Large Format 297 × 420 mm)', desc: 'Architectural drawings, posters, charts' },
                    { key: 'LEGAL', label: 'Legal (8.5 × 14 in)', desc: 'Court affidavits, stamp papers & contracts' },
                    { key: 'LETTER', label: 'Letter (8.5 × 11 in)', desc: 'Standard international letterhead' },
                  ].map((size) => {
                    const active = isSizeActive(size.key);
                    return (
                      <div
                        key={size.key}
                        className={`p-4 rounded-2xl border transition-all ${
                          active
                            ? 'bg-slate-950/70 border-slate-800'
                            : 'bg-slate-950/30 border-slate-900 opacity-60'
                        }`}
                      >
                        {/* Size Header with Toggle */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'}`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">{size.label}</div>
                              <div className="text-[10px] text-slate-400">{size.desc}</div>
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <span className={active ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                              {active ? 'Available' : 'Disabled'}
                            </span>
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={(e) => toggleSizeActive(size.key, e.target.checked)}
                              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                            />
                          </label>
                        </div>

                        {/* Rate Inputs */}
                        {active && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400">B&amp;W 1-Sided</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] text-slate-500">₹</span>
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0.5"
                                  value={getPrice(size.key, 'BLACK_AND_WHITE', false)}
                                  onChange={(e) => updatePrice(size.key, 'BLACK_AND_WHITE', false, parseFloat(e.target.value) || 0)}
                                  className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-400">B&amp;W Duplex (per side)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] text-slate-500">₹</span>
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0.5"
                                  value={getPrice(size.key, 'BLACK_AND_WHITE', true)}
                                  onChange={(e) => updatePrice(size.key, 'BLACK_AND_WHITE', true, parseFloat(e.target.value) || 0)}
                                  className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-indigo-400">Color 1-Sided</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] text-slate-500">₹</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="1"
                                  value={getPrice(size.key, 'COLOR', false)}
                                  onChange={(e) => updatePrice(size.key, 'COLOR', false, parseFloat(e.target.value) || 0)}
                                  className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-indigo-400">Color Duplex (per side)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[11px] text-slate-500">₹</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="1"
                                  value={getPrice(size.key, 'COLOR', true)}
                                  onChange={(e) => updatePrice(size.key, 'COLOR', true, parseFloat(e.target.value) || 0)}
                                  className="w-full pl-6 pr-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: STORE & PAYMENT GATEWAY */}
            {activeTab === 'PAYMENT' && (
              <div className="space-y-5">
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>100% Direct Payouts</strong>: Customer payments go directly to your personal bank account via your own Razorpay keys or Cash. Print2Me never holds your print funds.
                  </p>
                </div>

                {/* Razorpay Partner Integration Callout */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Razorpay Partner Direct Bank Settlement</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Connect your Razorpay account securely through the <strong>Payments</strong> section in your dashboard. You never need to enter or share private API secrets on Print2Me.
                  </p>
                </div>

                {/* Direct UPI ID */}
                <div className="space-y-1.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4 text-cyan-400" />
                    Store Direct UPI ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. shopname@okaxis or 9876543210@paytm"
                    value={settings.upiId}
                    onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  />
                  <p className="text-[11px] text-slate-500">
                    Shown to counter customers wishing to scan and pay directly via GPay, PhonePe, or Paytm.
                  </p>
                </div>

                {/* Payment Method Toggles */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300">Accepted Customer Payment Options</div>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer hover:bg-slate-900/60 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-white">Accept Cash on Desk</div>
                      <div className="text-[11px] text-slate-400">Customer pays physical cash at your counter</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.allowCashOnDesk}
                      onChange={(e) => setSettings({ ...settings, allowCashOnDesk: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer hover:bg-slate-900/60 transition-colors">
                    <div>
                      <div className="text-xs font-semibold text-white">Accept Online Payment (Razorpay)</div>
                      <div className="text-[11px] text-slate-400">Customer pays online before print spooling</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.allowOnlinePayment}
                      onChange={(e) => setSettings({ ...settings, allowOnlinePayment: e.target.checked })}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Changes...' : activeTab === 'PRICING' ? 'Save Rates & Sizes' : 'Save Store Settings'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
