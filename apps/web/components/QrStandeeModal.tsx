'use client';

import { useState } from 'react';
import { QrCode, Download, Printer, X, Check, Store, ShieldCheck, Sparkles, Smartphone, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

interface QrStandeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorName: string;
  vendorSlug: string;
  address?: string;
}

export function QrStandeeModal({
  isOpen,
  onClose,
  vendorName,
  vendorSlug,
  address,
}: QrStandeeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/v/${vendorSlug}` : `/v/${vendorSlug}`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[95vh] overflow-y-auto"
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Counter QR Standee Generator</h2>
            <p className="text-xs text-slate-400">Place this standee at your shop counter for walk-in customer self-printing</p>
          </div>
        </div>

        {/* High-Resolution Printable Standee Plaque */}
        <div 
          id="printable-standee" 
          className="bg-white rounded-3xl p-6 sm:p-8 text-slate-950 shadow-2xl space-y-5 text-center border-4 border-slate-900 relative overflow-hidden"
        >
          {/* Top Banner */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-extrabold text-[10px] uppercase tracking-widest shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Smart Print Station</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-none pt-1">
              {vendorName || 'Print Shop'}
            </h3>
            {address && (
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto line-clamp-1">
                {address}
              </p>
            )}
          </div>

          {/* QR Code Container */}
          <div className="bg-gradient-to-b from-slate-50 to-slate-100 p-5 rounded-2xl border-2 border-slate-900 inline-block mx-auto shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSvgUrl}
              alt={`${vendorName} QR Code`}
              className="w-52 h-52 sm:w-60 sm:h-60 mx-auto transition-transform hover:scale-105 duration-300"
            />
          </div>

          {/* 3 Step Instruction Guide for Walk-In Customers */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase text-indigo-600 block">Step 1</span>
              <p className="text-xs font-bold text-slate-900">Scan QR</p>
              <p className="text-[10px] text-slate-500 leading-tight">With phone camera</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase text-emerald-600 block">Step 2</span>
              <p className="text-xs font-bold text-slate-900">Upload PDF</p>
              <p className="text-[10px] text-slate-500 leading-tight">Select B&W or Color</p>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-black uppercase text-purple-600 block">Step 3</span>
              <p className="text-xs font-bold text-slate-900">Collect Print</p>
              <p className="text-[10px] text-slate-500 leading-tight">Direct from counter</p>
            </div>
          </div>

          <div className="pt-2.5 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Powered by</span>
              <BrandLogo variant="horizontal" height={22} />
            </div>
            <span className="font-mono font-bold text-slate-800 text-xs">print2me.in/v/{vendorSlug}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            onClick={copyUrl}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <QrCode className="w-4 h-4" />}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Kiosk Link'}</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <a
              href={`/api/qr/${vendorSlug}?format=svg&download=1`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              download
            >
              <Download className="w-4 h-4" />
              <span>SVG QR</span>
            </a>

            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Print A4 Plaque</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
