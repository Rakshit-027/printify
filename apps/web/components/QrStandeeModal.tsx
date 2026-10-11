'use client';

import { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Printer,
  X,
  Check,
  Sparkles,
  MapPin,
  Clock,
  Phone,
  RefreshCw,
  Copy,
  Layers,
  IndianRupee,
  Share2
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

interface PricingTier {
  paperSize: string;
  colorMode: string;
  isDuplex: boolean;
  pricePerSideMinor: number;
}

interface VendorRealData {
  id: string;
  name: string;
  slug: string;
  address?: string;
  contactPhone?: string | null;
  operatingHours?: string | null;
  pricingConfig?: PricingTier[];
}

interface QrStandeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName?: string;
  vendorSlug: string;
  address?: string;
}

export function QrStandeeModal({
  isOpen,
  onClose,
  vendorName: initialName,
  vendorSlug,
  address: initialAddress,
}: QrStandeeModalProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vendorData, setVendorData] = useState<VendorRealData | null>(null);

  // Fetch real vendor details directly from the API whenever modal opens or slug changes
  useEffect(() => {
    if (!isOpen || !vendorSlug) return;

    let isMounted = true;
    async function fetchRealVendorDetails() {
      setLoading(true);
      try {
        const res = await fetch(`/api/qr/${vendorSlug}?format=json`);
        if (!res.ok) throw new Error('Failed to load shop details');
        const data = await res.json();
        if (isMounted && data.vendor) {
          setVendorData(data.vendor);
        }
      } catch (err) {
        console.error('Error fetching live standee vendor details:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchRealVendorDetails();
    return () => {
      isMounted = false;
    };
  }, [isOpen, vendorSlug]);

  if (!isOpen) return null;

  const resolvedName = vendorData?.name || initialName || 'Print Shop';
  const resolvedAddress = vendorData?.address || initialAddress || 'Campus Counter, Main Arcade';
  const resolvedPhone = vendorData?.contactPhone || null;
  const resolvedHours = vendorData?.operatingHours || null;
  const pricingTiers = vendorData?.pricingConfig || [];

  // Find lowest B&W price and Color price from actual vendor pricing
  const bwTier = pricingTiers.find((t) => t.colorMode === 'BLACK_AND_WHITE');
  const colorTier = pricingTiers.find((t) => t.colorMode === 'COLOR');
  const bwPrice = bwTier ? `₹${(bwTier.pricePerSideMinor / 100).toFixed(2)}` : '₹2.00';
  const colorPrice = colorTier ? `₹${(colorTier.pricePerSideMinor / 100).toFixed(2)}` : '₹10.00';

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/v/${vendorSlug}` : `https://print2me.in/v/${vendorSlug}`;
  const qrSvgUrl = `/api/qr/${vendorSlug}?format=svg&color=%230f172a`;

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-[32px] p-5 sm:p-7 shadow-2xl space-y-5 relative max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-saffron to-amber-500 flex items-center justify-center text-white font-bold shadow-lg shadow-saffron/20 flex-shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div className="min-w-0 pr-8">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2 truncate">
              <span>Counter QR Standee Plaque</span>
              {loading && <RefreshCw className="w-3.5 h-3.5 text-saffron animate-spin" />}
            </h2>
            <p className="text-xs text-slate-400 truncate">
              Live counter QR with real shop rates, address, and mobile self-checkout
            </p>
          </div>
        </div>

        {/* HIGH-RESOLUTION PRINTABLE COUNTER PLAQUE */}
        <div
          id="printable-standee"
          className="bg-white rounded-3xl p-6 sm:p-8 text-slate-950 shadow-2xl space-y-4 text-center border-4 border-slate-900 relative overflow-hidden"
        >
          {/* Top Pill & Shop Title */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-widest shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Express Counter Self-Printing</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight pt-1">
              {resolvedName}
            </h3>

            {resolvedAddress && (
              <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-saffron shrink-0" />
                <span className="line-clamp-2">{resolvedAddress}</span>
              </p>
            )}

            {resolvedHours && (
              <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{resolvedHours}</span>
              </p>
            )}
          </div>

          {/* QR Code Graphic with High Contrast Frame */}
          <div className="bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-5 rounded-2xl border-2 border-slate-900 inline-block mx-auto shadow-inner relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSvgUrl}
              alt={`Counter QR Code for ${resolvedName}`}
              width={240}
              height={240}
              className="w-48 h-48 sm:w-56 sm:h-56 mx-auto transition-transform hover:scale-105 duration-300"
            />
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold tracking-wider">
              SCAN WITH PHONE CAMERA
            </div>
          </div>

          {/* Real Counter Rates Badge Strip */}
          <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">B&amp;W Xerox / Print</div>
              <div className="font-sora font-extrabold text-sm sm:text-base text-slate-900">{bwPrice} <span className="text-[10px] text-slate-500 font-normal">/ side</span></div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Color Printout</div>
              <div className="font-sora font-extrabold text-sm sm:text-base text-slate-900">{colorPrice} <span className="text-[10px] text-slate-500 font-normal">/ side</span></div>
            </div>
          </div>

          {/* 3 Step Instruction Guide */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase text-indigo-600 block">Step 1</span>
              <p className="text-xs font-bold text-slate-900">Scan QR</p>
              <p className="text-[10px] text-slate-500 leading-tight">No app install</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase text-emerald-600 block">Step 2</span>
              <p className="text-xs font-bold text-slate-900">Upload File</p>
              <p className="text-[10px] text-slate-500 leading-tight">PDF, JPG, PNG</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase text-purple-600 block">Step 3</span>
              <p className="text-xs font-bold text-slate-900">Collect Print</p>
              <p className="text-[10px] text-slate-500 leading-tight">Fast token pickup</p>
            </div>
          </div>

          {/* Footer Branding and URL */}
          <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Network</span>
              <BrandLogo variant="horizontal" height={20} />
            </div>
            <span className="font-mono font-bold text-slate-800 text-[11px]">
              print2me.in/v/{vendorSlug}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            onClick={copyUrl}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Copy Kiosk Link'}</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <a
              href={`/api/qr/${vendorSlug}?format=svg&download=1`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              download
            >
              <Download className="w-4 h-4" />
              <span>Download SVG</span>
            </a>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-saffron to-amber-500 hover:from-saffron/90 hover:to-amber-500/90 text-white font-bold text-xs shadow-lg shadow-saffron/20 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Print A4 Plaque</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
