'use client';

import { useState } from 'react';
import { QrCode, Download, Printer, X, Check, Store } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-700 p-6 md:p-8 shadow-2xl space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Vendor QR Counter Standee</h2>
            <p className="text-xs text-slate-400">Print or display this plaque on your counter for customer self-ordering</p>
          </div>
        </div>

        {/* Printable Standee Plaque Preview */}
        <div id="printable-standee" className="bg-white rounded-2xl p-6 text-slate-900 shadow-xl space-y-4 text-center border-4 border-slate-900">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] uppercase tracking-wider">
              <Store className="w-3.5 h-3.5" />
              <span>Self-Service Print Station</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-950 tracking-tight">{vendorName}</h3>
            {address && <p className="text-xs text-slate-600 line-clamp-1">{address}</p>}
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-300 inline-block mx-auto shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSvgUrl}
              alt={`${vendorName} QR Code`}
              className="w-48 h-48 mx-auto"
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900">Scan with Phone Camera</p>
            <p className="text-xs text-slate-600">Upload documents • Select print settings • Collect prints</p>
          </div>

          <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
            Direct Link: {publicUrl}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={copyUrl}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <QrCode className="w-4 h-4" />}
            <span>{copied ? 'Link Copied!' : 'Copy Direct URL'}</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={`/api/qr/${vendorSlug}?format=svg&download=1`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              download
            >
              <Download className="w-4 h-4" />
              <span>Download SVG</span>
            </a>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Print Standee</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
