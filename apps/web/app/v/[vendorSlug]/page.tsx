'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PDFDocument } from 'pdf-lib';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  MapPin,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Droplet,
  Copy,
  Trash2,
  ChevronUp,
  Lock,
  CreditCard,
  Banknote,
  Sparkles,
  ArrowRight,
  Plus,
  Layers,
  Phone,
  Clock,
  ChevronRight,
  FileCheck,
  SlidersHorizontal,
  Info,
  Check,
  X
} from 'lucide-react';
import { QrStandeeModal } from '@/components/QrStandeeModal';
import { BrandLogo } from '@/components/BrandLogo';
import Link from 'next/link';

interface VendorData {
  id: string;
  name: string;
  slug: string;
  contactPhone: string;
  address: string;
  operatingHours: string | null;
  isActive: boolean;
  isApproved: boolean;
  allowCashOnDesk: boolean;
  pricingConfig: Array<{
    paperSize: string;
    colorMode: string;
    isDuplex: boolean;
    pricePerSideMinor: number;
    minimumOrderMinor: number;
    isActive?: boolean;
  }>;
}

interface UploadedDoc {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  pageCount: number;
  paperSize: string;
  colorMode: 'BLACK_AND_WHITE' | 'COLOR';
  isDuplex: boolean;
  copies: number;
  pageRange: string;
  customPageSelection?: string;
  notes?: string;
  error?: string;
}

export default function VendorPublicOrderPage() {
  const params = useParams();
  const router = useRouter();
  const vendorSlug = (params?.vendorSlug as string) || 'speedy-express';

  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [vendorError, setVendorError] = useState('');

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [activeDocIndex, setActiveDocIndex] = useState<number>(0);

  // UI state
  const [showQrModal, setShowQrModal] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'CASH_ON_COLLECTION'>('RAZORPAY');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [step, setStep] = useState<'UPLOAD' | 'PAYMENT'>('UPLOAD');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchVendor() {
      try {
        setLoadingVendor(true);
        const res = await fetch(`/api/qr/${vendorSlug}?format=json`);
        if (!res.ok) throw new Error('Vendor not found');
        const data = await res.json();

        const activeConfig =
          data.vendor?.pricingConfig?.length > 0
            ? data.vendor.pricingConfig
            : [
                { paperSize: 'A4', colorMode: 'BLACK_AND_WHITE', isDuplex: false, pricePerSideMinor: 200, minimumOrderMinor: 500, isActive: true },
                { paperSize: 'A4', colorMode: 'BLACK_AND_WHITE', isDuplex: true, pricePerSideMinor: 175, minimumOrderMinor: 500, isActive: true },
                { paperSize: 'A4', colorMode: 'COLOR', isDuplex: false, pricePerSideMinor: 1000, minimumOrderMinor: 500, isActive: true },
                { paperSize: 'A4', colorMode: 'COLOR', isDuplex: true, pricePerSideMinor: 900, minimumOrderMinor: 500, isActive: true },
              ];

        setVendor({
          ...data.vendor,
          pricingConfig: activeConfig,
          name: data.vendor.name || 'SpeedyPrint Express',
          address: data.vendor.address || 'Campus Arcade, Near Gate 2',
          allowCashOnDesk: data.vendor.allowCashOnDesk ?? true,
        });
      } catch {
        // Fallback demo for preview or offline
        setVendor({
          id: 'demo-vendor-uuid',
          name: 'SpeedyPrint Express',
          slug: vendorSlug,
          contactPhone: '+91 98765 00001',
          address: 'Near Campus Gate 2, Student Arcade',
          operatingHours: '08:30 AM - 09:30 PM',
          isActive: true,
          isApproved: true,
          allowCashOnDesk: true,
          pricingConfig: [
            { paperSize: 'A4', colorMode: 'BLACK_AND_WHITE', isDuplex: false, pricePerSideMinor: 200, minimumOrderMinor: 500 },
            { paperSize: 'A4', colorMode: 'BLACK_AND_WHITE', isDuplex: true, pricePerSideMinor: 175, minimumOrderMinor: 500 },
            { paperSize: 'A4', colorMode: 'COLOR', isDuplex: false, pricePerSideMinor: 1000, minimumOrderMinor: 500 },
            { paperSize: 'A4', colorMode: 'COLOR', isDuplex: true, pricePerSideMinor: 900, minimumOrderMinor: 500 },
          ],
        });
      } finally {
        setLoadingVendor(false);
      }
    }
    if (vendorSlug) fetchVendor();
  }, [vendorSlug]);

  const processUploadedFile = async (file: File) => {
    setUploadError('');
    setIsUploading(true);
    setUploadFileName(file.name);
    setUploadProgress(15);

    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('File limit exceeded. Max 50MB per file.');

      let pageCount = 1;
      if (file.type === 'application/pdf') {
        try {
          const buffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
        } catch {
          throw new Error('This PDF might be password protected or corrupted.');
        }
      }
      setUploadProgress(40);

      const initRes = await fetch('/api/uploads/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorSlug, filename: file.name, fileSizeBytes: file.size, mimeType: file.type }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Server upload session initiation failed');

      setUploadProgress(65);
      const putRes = await fetch(initData.uploadUrl, {
        method: 'PUT',
        headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok && putRes.status !== 201) throw new Error('Could not upload file payload');

      setUploadProgress(90);
      const verifyRes = await fetch('/api/uploads/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: initData.sessionToken, pageCount }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'File integrity verification failed');

      setUploadProgress(100);

      const newDoc: UploadedDoc = {
        id: verifyData.document.id,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        pageCount,
        paperSize: 'A4',
        colorMode: 'BLACK_AND_WHITE',
        isDuplex: false,
        copies: 1,
        pageRange: 'ALL',
      };

      setDocuments((prev) => {
        const next = [...prev, newDoc];
        setActiveDocIndex(next.length - 1);
        return next;
      });
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadFileName('');
      }, 400);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await processUploadedFile(files[i]);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await processUploadedFile(files[i]);
    }
  };

  const updateDocConfig = (index: number, updates: Partial<UploadedDoc>) => {
    setDocuments((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const calculateBreakdown = () => {
    let totalPaise = 0;
    let totalSheets = 0;
    let totalSides = 0;
    const minOrder = vendor?.pricingConfig[0]?.minimumOrderMinor || 500;

    documents.forEach((doc) => {
      const tier = vendor?.pricingConfig.find(
        (t) => t.paperSize === doc.paperSize && t.colorMode === doc.colorMode && t.isDuplex === doc.isDuplex
      );
      const pricePerSide = tier ? tier.pricePerSideMinor : doc.colorMode === 'COLOR' ? 1000 : 200;
      const sides = doc.pageCount * doc.copies;
      totalSides += sides;
      totalSheets += Math.ceil(doc.pageCount / (doc.isDuplex ? 2 : 1)) * doc.copies;
      totalPaise += sides * pricePerSide;
    });

    const topUp = totalPaise > 0 && totalPaise < minOrder ? minOrder - totalPaise : 0;
    return {
      totalPaise: totalPaise > 0 ? Math.max(totalPaise, minOrder) : 0,
      rawPaise: totalPaise,
      totalSheets,
      totalSides,
      topUp,
    };
  };

  const handleProceedToPayment = async () => {
    if (documents.length === 0) return;
    setIsPlacingOrder(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorSlug,
          customerName: customerName.trim() || 'Guest Customer',
          customerPhone: customerPhone.trim() || undefined,
          paymentMethod,
          items: documents.map((d) => ({
            documentId: d.id,
            paperSize: d.paperSize,
            colorMode: d.colorMode,
            duplexMode: d.isDuplex ? 'DOUBLE_SIDED_LONG_EDGE' : 'SINGLE_SIDED',
            copies: d.copies,
            pageRange: d.pageRange === 'CUSTOM' && d.customPageSelection ? d.customPageSelection : 'ALL',
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      if (paymentMethod === 'RAZORPAY') {
        router.push(`/pay/${data.order.trackingToken}`);
      } else {
        router.push(`/track/${data.order.trackingToken}`);
      }
    } catch (err: any) {
      alert(err.message || 'Error creating order');
      setIsPlacingOrder(false);
    }
  };

  if (loadingVendor) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-24 bg-saffron-tint flex items-center justify-center text-saffron animate-bounce shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="font-sora font-extrabold text-ink text-lg">Connecting to Print Station</h2>
          <p className="text-xs text-ink-soft">Loading shop pricing and counter spooler status...</p>
        </div>
      </div>
    );
  }

  if (vendorError || !vendor) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-32 bg-danger/10 text-danger flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-sora font-extrabold text-ink mb-2">Print Station Offline</h2>
        <p className="text-sm text-ink-soft max-w-sm mb-6">
          This print shop kiosk is currently inactive or the QR link has expired.
        </p>
        <button
          onClick={() => router.push('/locations')}
          className="px-6 py-3 rounded-pill bg-ink text-white font-bold text-xs"
        >
          Find Active Print Shops
        </button>
      </div>
    );
  }

  const { totalPaise, rawPaise, totalSheets, totalSides, topUp } = calculateBreakdown();
  const totalRupees = (totalPaise / 100).toFixed(2);
  const activeSizes = Array.from(new Set(vendor.pricingConfig.map((p) => p.paperSize)));
  const currentDoc = documents[activeDocIndex] || documents[0];

  return (
    <div className="min-h-screen bg-[#F6F8FB] pb-40 text-ink selection:bg-saffron selection:text-white">
      {/* 1. ULTRA-SLEEK MOBILE APP HEADER WITH PRINT2ME LOGO & SHOP INFO */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-xl border-b border-hairline/60 shadow-[0_2px_12px_rgba(14,26,58,0.04)]">
        {/* Brand Bar */}
        <div className="border-b border-hairline/40 px-4 py-2 bg-paper/60">
          <div className="max-w-xl mx-auto flex items-center justify-between">
            <Link href="/" className="inline-flex items-center hover:opacity-90 transition-opacity">
              <BrandLogo variant="horizontal" height={28} />
            </Link>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-soft bg-surface px-2.5 py-1 rounded-pill border border-hairline font-semibold shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Instant Kiosk</span>
            </div>
          </div>
        </div>

        {/* Vendor Shop Information */}
        <div className="px-4 py-2.5">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-20 bg-gradient-to-tr from-saffron to-amber-500 text-white font-sora font-extrabold text-base flex items-center justify-center shadow-md shadow-saffron/20 shrink-0">
                  {vendor.name.charAt(0)}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-sora font-extrabold text-ink text-sm sm:text-base tracking-tight truncate">
                    {vendor.name}
                  </h1>
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Counter Ready
                  </span>
                </div>
                <p className="text-xs text-ink-soft truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-saffron shrink-0" />
                  <span className="truncate">{vendor.address}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQrModal(true)}
                className="w-8 h-8 rounded-12 bg-paper border border-hairline hover:border-saffron/40 flex items-center justify-center text-ink-soft hover:text-ink transition-all active:scale-95 shadow-sm"
                title="View Counter Standee QR"
                aria-label="View QR"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. PROGRESS STEPPER PILL */}
      <div className="px-4 pt-4 max-w-xl mx-auto">
        <div className="bg-surface rounded-20 p-1.5 border border-hairline/80 shadow-sm flex items-center gap-1">
          <button
            onClick={() => setStep('UPLOAD')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-14 text-xs font-bold transition-all ${
              step === 'UPLOAD'
                ? 'bg-ink text-white shadow-sm'
                : 'text-ink-soft hover:text-ink hover:bg-paper'
            }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${step === 'UPLOAD' ? 'bg-saffron text-white' : 'bg-hairline text-ink-soft'}`}>
              1
            </div>
            <span>Upload &amp; Options</span>
            {documents.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-pill font-mono ${step === 'UPLOAD' ? 'bg-white/20' : 'bg-paper text-ink-soft'}`}>
                {documents.length}
              </span>
            )}
          </button>

          <button
            onClick={() => documents.length > 0 && setStep('PAYMENT')}
            disabled={documents.length === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-14 text-xs font-bold transition-all ${
              step === 'PAYMENT'
                ? 'bg-ink text-white shadow-sm'
                : documents.length > 0
                ? 'text-ink-soft hover:text-ink hover:bg-paper'
                : 'text-ink-soft/40 cursor-not-allowed'
            }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${step === 'PAYMENT' ? 'bg-saffron text-white' : 'bg-hairline text-ink-soft'}`}>
              2
            </div>
            <span>Payment &amp; Token</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="px-4 pt-4 max-w-xl mx-auto space-y-4">
        {step === 'UPLOAD' ? (
          <>
            {/* COMPACT INTERACTIVE UPLOAD HERO */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative overflow-hidden rounded-[28px] border-2 border-dashed p-6 text-center cursor-pointer transition-all active:scale-[0.99] group ${
                isDragging
                  ? 'border-saffron bg-saffron-tint/80 shadow-lg scale-[1.01]'
                  : 'border-saffron/40 bg-surface hover:border-saffron hover:bg-gradient-to-b hover:from-white hover:to-saffron-tint/20 shadow-ink-soft'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />

              {/* Decorative Subtle Corner Accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-saffron/15 to-transparent rounded-bl-full pointer-events-none" />

              {isUploading ? (
                <div className="py-4 space-y-4 animate-in fade-in">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-hairline" />
                    <div
                      className="absolute inset-0 rounded-full border-4 border-saffron border-t-transparent animate-spin"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-mono font-extrabold text-ink">{uploadProgress}%</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="font-sora font-extrabold text-ink text-base">
                      Uploading Document...
                    </h2>
                    <p className="text-xs text-ink-soft truncate max-w-xs mx-auto mt-0.5 font-medium">
                      {uploadFileName}
                    </p>
                  </div>
                  <div className="max-w-xs mx-auto bg-paper rounded-pill h-2 overflow-hidden border border-hairline/80">
                    <div
                      className="bg-gradient-to-r from-saffron to-amber-500 h-full transition-all duration-300 rounded-pill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-ink-soft/80">Counting pages &amp; securing encrypted token...</p>
                </div>
              ) : (
                <div className="py-2 space-y-3">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="w-16 h-16 rounded-24 bg-gradient-to-br from-saffron-tint to-amber-100 flex items-center justify-center text-saffron shadow-sm group-hover:scale-105 transition-transform duration-300">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-xs shadow">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <div>
                    <h2 className="font-sora font-extrabold text-ink text-lg sm:text-xl">
                      {documents.length > 0 ? 'Add another document' : 'Tap to upload files'}
                    </h2>
                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                      PDF, JPG, or PNG · Up to 50MB per file
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-paper border border-hairline text-[11px] font-semibold text-ink-soft">
                    <Sparkles className="w-3 h-3 text-saffron" />
                    <span>Auto-detects page count &amp; duplex</span>
                  </div>
                </div>
              )}
            </div>

            {/* ERROR BANNER */}
            {uploadError && (
              <div className="p-3.5 rounded-20 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Upload Error:</span> {uploadError}
                </div>
                <button onClick={() => setUploadError('')} className="text-rose-600 hover:text-rose-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TRUST BADGES BAR */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-16 bg-surface border border-hairline/80 shadow-xs flex flex-col items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-saffron mb-1" />
                <span className="text-[10px] font-bold text-ink">Zero Pen Drive</span>
                <span className="text-[9px] text-ink-soft">Encrypted direct SAS</span>
              </div>
              <div className="p-2.5 rounded-16 bg-surface border border-hairline/80 shadow-xs flex flex-col items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mb-1" />
                <span className="text-[10px] font-bold text-ink">Auto-Purged</span>
                <span className="text-[9px] text-ink-soft">Deleted after printing</span>
              </div>
              <div className="p-2.5 rounded-16 bg-surface border border-hairline/80 shadow-xs flex flex-col items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-blue-600 mb-1" />
                <span className="text-[10px] font-bold text-ink">UPI &amp; Cash</span>
                <span className="text-[9px] text-ink-soft">Pay online or on desk</span>
              </div>
            </div>

            {/* DOCUMENT QUEUE CARDS & EXPANDED CUSTOMIZER */}
            {documents.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-sora font-extrabold text-ink text-sm sm:text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-saffron" />
                    <span>Selected Documents ({documents.length})</span>
                  </h3>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-saffron hover:text-amber-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add more</span>
                  </button>
                </div>

                {documents.map((doc, idx) => {
                  const isActive = activeDocIndex === idx;
                  const tier = vendor.pricingConfig.find(
                    (t) => t.paperSize === doc.paperSize && t.colorMode === doc.colorMode && t.isDuplex === doc.isDuplex
                  );
                  const pricePerSide = tier ? tier.pricePerSideMinor : doc.colorMode === 'COLOR' ? 1000 : 200;
                  const docCostRupees = ((doc.pageCount * doc.copies * pricePerSide) / 100).toFixed(2);

                  return (
                    <div
                      key={doc.id}
                      className={`bg-surface rounded-[24px] border transition-all overflow-hidden shadow-sm ${
                        isActive
                          ? 'border-ink shadow-ink-soft ring-2 ring-ink/5'
                          : 'border-hairline hover:border-hairline/80'
                      }`}
                    >
                      {/* Document Card Header */}
                      <div
                        onClick={() => setActiveDocIndex(idx)}
                        className="p-4 flex items-center gap-3.5 cursor-pointer select-none"
                      >
                        <div className="w-11 h-11 rounded-16 bg-paper border border-hairline flex items-center justify-center shrink-0">
                          {doc.mimeType === 'application/pdf' ? (
                            <FileText className="w-6 h-6 text-danger" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-saffron" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-ink text-sm truncate">
                            {doc.originalName}
                          </div>
                          <div className="text-[11px] text-ink-soft flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-ink font-mono">{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</span>
                            <span>•</span>
                            <span>{(doc.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                            <span>•</span>
                            <span className="font-bold text-saffron">₹{docCostRupees}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocuments((docs) => docs.filter((_, i) => i !== idx));
                              if (activeDocIndex >= documents.length - 1) {
                                setActiveDocIndex(Math.max(0, documents.length - 2));
                              }
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-danger hover:bg-rose-50 transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* TABS & CUSTOMIZATION SECTION */}
                      <div className="bg-[#FAFBFD] p-4 border-t border-hairline/60 space-y-4">
                        {/* 1. Color vs B&W (Visual Toggle with Live Pricing Badge) */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-ink-soft flex items-center justify-between">
                            <span>Color Mode</span>
                            <span className="text-[10px] text-ink-soft font-normal">
                              {doc.colorMode === 'COLOR' ? '₹10.00 / side' : '₹2.00 / side'}
                            </span>
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => updateDocConfig(idx, { colorMode: 'BLACK_AND_WHITE' })}
                              className={`p-3 rounded-16 border-2 flex items-center gap-3 transition-all ${
                                doc.colorMode === 'BLACK_AND_WHITE'
                                  ? 'border-ink bg-surface shadow-xs font-bold text-ink'
                                  : 'border-hairline bg-surface/60 text-ink-soft hover:bg-surface'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                                <Droplet className="w-3.5 h-3.5" />
                              </div>
                              <div className="text-left min-w-0">
                                <div className="text-xs font-bold leading-tight">Black &amp; White</div>
                                <div className="text-[10px] text-ink-soft">Economical Xerox</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateDocConfig(idx, { colorMode: 'COLOR' })}
                              className={`p-3 rounded-16 border-2 flex items-center gap-3 transition-all ${
                                doc.colorMode === 'COLOR'
                                  ? 'border-saffron bg-saffron-tint/60 shadow-xs font-bold text-ink'
                                  : 'border-hairline bg-surface/60 text-ink-soft hover:bg-surface'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0">
                                <Sparkles className="w-3.5 h-3.5" />
                              </div>
                              <div className="text-left min-w-0">
                                <div className="text-xs font-bold leading-tight">Full Color</div>
                                <div className="text-[10px] text-saffron font-semibold">Crisp Graphics</div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* 2. Sides (Single vs Double Duplex) */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-ink-soft flex items-center justify-between">
                            <span>Sides &amp; Orientation</span>
                            <span className="text-[10px] text-emerald-600 font-semibold">
                              {doc.isDuplex ? 'Saves paper & 20% discount' : 'Standard 1-sided'}
                            </span>
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => updateDocConfig(idx, { isDuplex: false })}
                              className={`p-2.5 rounded-16 border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                                !doc.isDuplex
                                  ? 'border-ink bg-surface shadow-xs text-ink'
                                  : 'border-hairline bg-surface/60 text-ink-soft hover:bg-surface'
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                              <span>Single Sided</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateDocConfig(idx, { isDuplex: true })}
                              className={`p-2.5 rounded-16 border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                                doc.isDuplex
                                  ? 'border-ink bg-surface shadow-xs text-ink'
                                  : 'border-hairline bg-surface/60 text-ink-soft hover:bg-surface'
                              }`}
                            >
                              <Copy className="w-4 h-4 text-emerald-600" />
                              <span>Double Sided (Duplex)</span>
                            </button>
                          </div>
                        </div>

                        {/* 3. Paper Size & Number of Copies in compact row */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          {/* Paper Size selector */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                              Paper Size
                            </label>
                            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                              {['A4', 'A3', 'Legal'].map((size) => {
                                const isAvailable = activeSizes.includes(size.toUpperCase());
                                const isSelected = doc.paperSize === size.toUpperCase();
                                return (
                                  <button
                                    key={size}
                                    type="button"
                                    disabled={!isAvailable}
                                    onClick={() => updateDocConfig(idx, { paperSize: size.toUpperCase() })}
                                    className={`flex-1 py-2 rounded-12 text-xs font-bold border transition-all ${
                                      isSelected
                                        ? 'bg-ink text-white border-ink shadow-xs'
                                        : isAvailable
                                        ? 'bg-surface border-hairline text-ink-soft hover:text-ink'
                                        : 'bg-paper border-hairline/40 text-ink-soft/40 cursor-not-allowed'
                                    }`}
                                  >
                                    {size}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Number of Copies Stepper */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-ink-soft flex justify-between">
                              <span>Copies</span>
                              <span className="font-mono text-ink font-bold">{doc.copies} set</span>
                            </label>

                            <div className="flex items-center justify-between bg-surface border border-hairline rounded-14 p-1 h-[42px] shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateDocConfig(idx, { copies: Math.max(1, doc.copies - 1) })}
                                disabled={doc.copies <= 1}
                                className="w-9 h-8 rounded-10 bg-paper hover:bg-hairline/60 active:scale-95 disabled:opacity-40 flex items-center justify-center font-bold text-ink text-sm transition-all"
                              >
                                -
                              </button>
                              <span className="font-sora font-extrabold text-sm text-ink font-mono tabular-nums">
                                {doc.copies}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateDocConfig(idx, { copies: Math.min(50, doc.copies + 1) })}
                                disabled={doc.copies >= 50}
                                className="w-9 h-8 rounded-10 bg-paper hover:bg-hairline/60 active:scale-95 disabled:opacity-40 flex items-center justify-center font-bold text-ink text-sm transition-all"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ========================================================= */
          /* STEP 2: CHECKOUT & PAYMENT METHOD */
          /* ========================================================= */
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header summary banner */}
            <div className="bg-surface rounded-[24px] p-5 border border-hairline shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-saffron font-mono">
                    Order Summary
                  </div>
                  <h2 className="font-sora font-extrabold text-xl text-ink">
                    {documents.length} {documents.length === 1 ? 'Document' : 'Documents'}
                  </h2>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-soft">Total Amount</div>
                  <div className="font-sora font-extrabold text-2xl text-ink font-mono text-saffron">
                    ₹{totalRupees}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-hairline/80 flex items-center justify-between text-xs text-ink-soft">
                <span>Total Calculated Sheets: <strong>{totalSheets} sheets</strong></span>
                <span>Sides: <strong>{totalSides} sides</strong></span>
              </div>
            </div>

            {/* Optional Customer Contact (For pickup notification) */}
            <div className="bg-surface rounded-[24px] p-5 border border-hairline shadow-sm space-y-3">
              <h3 className="font-sora font-bold text-sm text-ink flex items-center gap-1.5">
                <span>Pickup Details</span>
                <span className="text-[10px] text-ink-soft font-normal">(Optional for faster collection)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-ink-soft">Your Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul S."
                    className="w-full bg-paper border border-hairline rounded-14 px-3.5 py-2.5 text-xs font-medium text-ink focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-ink-soft">Mobile Number</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-paper border border-hairline rounded-14 px-3.5 py-2.5 text-xs font-medium text-ink focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2.5">
              <h3 className="font-sora font-bold text-sm text-ink px-1">
                Select Payment Mode
              </h3>

              {/* Razorpay Online */}
              <label
                className={`block relative p-4 rounded-[22px] border-2 cursor-pointer transition-all ${
                  paymentMethod === 'RAZORPAY'
                    ? 'border-ink bg-surface shadow-md'
                    : 'border-hairline bg-surface/60 hover:bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="hidden"
                  checked={paymentMethod === 'RAZORPAY'}
                  onChange={() => setPaymentMethod('RAZORPAY')}
                />
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                      paymentMethod === 'RAZORPAY' ? 'border-ink bg-ink' : 'border-ink-soft/40'
                    }`}
                  >
                    {paymentMethod === 'RAZORPAY' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sora font-bold text-ink text-base">Pay Online (UPI / Cards)</span>
                      <span className="bg-saffron-tint text-saffron text-[10px] uppercase font-bold px-2 py-0.5 rounded-pill">
                        Instant Print
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                      Google Pay, PhonePe, Paytm, Debit/Credit Card or NetBanking. Order releases to print spooler immediately.
                    </p>
                  </div>
                </div>
              </label>

              {/* Cash On Desk */}
              {vendor.allowCashOnDesk && (
                <label
                  className={`block relative p-4 rounded-[22px] border-2 cursor-pointer transition-all ${
                    paymentMethod === 'CASH_ON_COLLECTION'
                      ? 'border-ink bg-surface shadow-md'
                      : 'border-hairline bg-surface/60 hover:bg-surface'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="hidden"
                    checked={paymentMethod === 'CASH_ON_COLLECTION'}
                    onChange={() => setPaymentMethod('CASH_ON_COLLECTION')}
                  />
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                        paymentMethod === 'CASH_ON_COLLECTION' ? 'border-ink bg-ink' : 'border-ink-soft/40'
                      }`}
                    >
                      {paymentMethod === 'CASH_ON_COLLECTION' && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sora font-bold text-ink text-base">Pay Cash at Counter</span>
                      </div>
                      <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                        Pay physical cash to the shopkeeper at the counter. Printing starts after vendor marks cash received.
                      </p>
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 4. MODERN STICKY BOTTOM CHECKOUT TRAY (MOBILE OPTIMIZED) */}
      {documents.length > 0 && (
        <aside aria-label="Order Checkout Bar" className="fixed bottom-0 inset-x-0 p-3 sm:p-4 z-40 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pointer-events-none">
          <div className="max-w-xl mx-auto bg-surface/95 backdrop-blur-2xl border border-hairline/80 rounded-[26px] shadow-[0_16px_40px_rgba(14,26,58,0.18)] p-3.5 pointer-events-auto transition-all">
            {/* Expandable Order Breakdown Sheet */}
            {expandedReceipt && (
              <div className="pb-3.5 mb-3 border-b border-dashed border-hairline animate-in fade-in slide-in-from-bottom-2 text-xs">
                <div className="flex items-center justify-between font-sora font-bold text-ink mb-2.5">
                  <span>Price Calculation Matrix</span>
                  <button
                    onClick={() => setExpandedReceipt(false)}
                    className="text-ink-soft hover:text-ink text-[11px]"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {documents.map((doc, i) => {
                    const tier = vendor.pricingConfig.find(
                      (t) => t.paperSize === doc.paperSize && t.colorMode === doc.colorMode && t.isDuplex === doc.isDuplex
                    );
                    const rate = tier ? tier.pricePerSideMinor : doc.colorMode === 'COLOR' ? 1000 : 200;
                    const docTotal = ((doc.pageCount * doc.copies * rate) / 100).toFixed(2);
                    return (
                      <div key={i} className="flex justify-between text-ink-soft">
                        <span className="truncate pr-3 flex-1 font-medium">
                          {doc.originalName} ({doc.pageCount}p × {doc.copies}c @ ₹{(rate / 100).toFixed(2)})
                        </span>
                        <span className="font-mono text-ink font-bold">₹{docTotal}</span>
                      </div>
                    );
                  })}

                  {topUp > 0 && (
                    <div className="flex justify-between text-amber-700 pt-1 font-medium">
                      <span>Minimum store top-up charge</span>
                      <span className="font-mono">₹{(topUp / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Bar Controls */}
            <div className="flex items-center justify-between gap-3">
              {/* Cost and breakdown toggle button */}
              <button
                type="button"
                onClick={() => setExpandedReceipt(!expandedReceipt)}
                className="flex items-center gap-2 text-left group min-w-0"
              >
                <div>
                  <div className="text-[10px] font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1">
                    <span>{documents.length} {documents.length === 1 ? 'file' : 'files'}</span>
                    <span>•</span>
                    <span>{totalSheets} {totalSheets === 1 ? 'sheet' : 'sheets'}</span>
                    <ChevronUp
                      className={`w-3.5 h-3.5 text-saffron transition-transform duration-200 ${
                        expandedReceipt ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <div className="font-sora font-extrabold text-ink text-2xl sm:text-3xl font-mono tabular-nums flex items-baseline gap-1">
                    <span className="text-saffron">₹</span>
                    <span>{totalRupees}</span>
                  </div>
                </div>
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {step === 'PAYMENT' && (
                  <button
                    type="button"
                    onClick={() => setStep('UPLOAD')}
                    className="px-3 py-3 rounded-pill bg-paper border border-hairline text-ink text-xs font-bold hover:bg-hairline/40 transition-all active:scale-95"
                  >
                    Back
                  </button>
                )}

                <button
                  type="button"
                  disabled={isPlacingOrder || documents.length === 0}
                  onClick={() => {
                    if (step === 'UPLOAD') {
                      setStep('PAYMENT');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      handleProceedToPayment();
                    }
                  }}
                  className="px-6 py-3.5 rounded-pill bg-ink hover:bg-ink/90 active:scale-95 text-white font-sora font-bold text-xs sm:text-sm shadow-md shadow-ink/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isPlacingOrder ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-saffron" />
                      <span>Creating Order...</span>
                    </>
                  ) : step === 'UPLOAD' ? (
                    <>
                      <span>Review &amp; Pay</span>
                      <ArrowRight className="w-4 h-4 text-saffron" />
                    </>
                  ) : (
                    <>
                      <span>Confirm &amp; Pay</span>
                      <Check className="w-4 h-4 text-emerald-400" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* QR Standee Preview Modal */}
      <QrStandeeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        vendorName={vendor?.name || ''}
        vendorSlug={vendor?.slug || ''}
        address={vendor?.address || ''}
      />
    </div>
  );
}
