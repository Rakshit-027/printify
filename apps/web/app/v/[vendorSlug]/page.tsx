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
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Droplet,
  Copy,
  Trash2,
  ChevronUp,
  Lock,
  CreditCard,
  Banknote
} from 'lucide-react';
import { QrStandeeModal } from '@/components/QrStandeeModal';
import { Button, Chip, SegmentedControl, Stepper, Skeleton } from '@/components/primitives';

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
  error?: string;
}

export default function VendorPublicOrderPage() {
  const params = useParams();
  const router = useRouter();
  const vendorSlug = params.vendorSlug as string;

  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [vendorError, setVendorError] = useState('');

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);

  // UI state
  const [showQrModal, setShowQrModal] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'CASH_ON_COLLECTION'>('RAZORPAY');
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
        
        const activeConfig = data.vendor?.pricingConfig?.length > 0
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
          allowCashOnDesk: true,
        });
      } catch (err: any) {
        // Fallback for demo
        setVendor({
          id: 'demo-vendor-uuid',
          name: 'SpeedyPrint Express',
          slug: vendorSlug,
          contactPhone: '+91 98765 00001',
          address: 'Near Gate 2, XYZ College',
          operatingHours: '09:00 AM - 09:00 PM',
          isActive: true,
          isApproved: true,
          allowCashOnDesk: true,
          pricingConfig: [
            { paperSize: 'A4', colorMode: 'BLACK_AND_WHITE', isDuplex: false, pricePerSideMinor: 200, minimumOrderMinor: 500 },
            { paperSize: 'A4', colorMode: 'BLACK_AND_WHITE', isDuplex: true, pricePerSideMinor: 175, minimumOrderMinor: 500 },
            { paperSize: 'A4', colorMode: 'COLOR', isDuplex: false, pricePerSideMinor: 1000, minimumOrderMinor: 500 },
          ],
        });
      } finally {
        setLoadingVendor(false);
      }
    }
    if (vendorSlug) fetchVendor();
  }, [vendorSlug]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setIsUploading(true);
    setUploadProgress(10);

    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Max 50MB per file allowed.');
      
      let pageCount = 1;
      if (file.type === 'application/pdf') {
        try {
          const buffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
        } catch {
          throw new Error('This PDF might be password protected.');
        }
      }
      setUploadProgress(40);

      const initRes = await fetch('/api/uploads/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorSlug, filename: file.name, fileSizeBytes: file.size, mimeType: file.type }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Init failed');
      
      setUploadProgress(60);
      const putRes = await fetch(initData.uploadUrl, {
        method: 'PUT',
        headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok && putRes.status !== 201) throw new Error('Upload failed');
      
      setUploadProgress(85);
      const verifyRes = await fetch('/api/uploads/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: initData.sessionToken, pageCount }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Verify failed');

      setDocuments(prev => [...prev, {
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
      }]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateDocConfig = (index: number, updates: Partial<UploadedDoc>) => {
    setDocuments(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const calculateBreakdown = () => {
    let totalPaise = 0;
    let totalSheets = 0;
    const minOrder = vendor?.pricingConfig[0]?.minimumOrderMinor || 500;

    documents.forEach(doc => {
      const tier = vendor?.pricingConfig.find(
        t => t.paperSize === doc.paperSize && t.colorMode === doc.colorMode && t.isDuplex === doc.isDuplex
      );
      const pricePerSide = tier ? tier.pricePerSideMinor : 200;
      const totalSides = doc.pageCount * doc.copies;
      totalSheets += Math.ceil(doc.pageCount / (doc.isDuplex ? 2 : 1)) * doc.copies;
      totalPaise += totalSides * pricePerSide;
    });
    
    const topUp = totalPaise > 0 && totalPaise < minOrder ? minOrder - totalPaise : 0;
    return {
      totalPaise: totalPaise > 0 ? Math.max(totalPaise, minOrder) : 0,
      totalSheets,
      topUp
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
          customerName: 'Guest',
          paymentMethod,
          items: documents.map(d => ({
            documentId: d.id,
            paperSize: d.paperSize,
            colorMode: d.colorMode,
            duplexMode: d.isDuplex ? 'DOUBLE_SIDED_LONG_EDGE' : 'SINGLE_SIDED',
            copies: d.copies,
            pageRange: d.pageRange,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/track/${data.order.trackingToken}`);
    } catch (err: any) {
      alert(err.message || 'Error creating order');
      setIsPlacingOrder(false);
    }
  };

  if (loadingVendor) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (vendorError || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[70vh]">
        <AlertCircle className="w-12 h-12 text-danger mb-4" />
        <h2 className="text-xl font-sora font-bold text-ink mb-2">Shop Not Available</h2>
        <p className="text-sm text-ink-soft">This link is inactive or the shop is offline.</p>
      </div>
    );
  }

  const { totalPaise, totalSheets, topUp } = calculateBreakdown();
  const totalRupees = (totalPaise / 100).toFixed(2);
  const activeSizes = Array.from(new Set(vendor.pricingConfig.map(p => p.paperSize)));

  return (
    <div className="min-h-screen pb-32">
      {/* 1. WELCOME HEADER */}
      <div className="bg-surface px-6 pt-6 pb-8 rounded-b-[40px] shadow-ink-soft">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 rounded-full bg-saffron-tint flex items-center justify-center text-saffron font-sora font-bold text-xl">
              {vendor.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-sora font-extrabold text-ink text-2xl tracking-tight">{vendor.name}</h1>
              <p className="text-ink-soft text-sm flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {vendor.address}
              </p>
            </div>
          </div>
          <div className="bg-success-tint text-success px-3 py-1 rounded-pill text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Open now
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide text-xs text-ink-soft font-medium whitespace-nowrap">
          <span className="bg-paper px-3 py-1.5 rounded-pill border border-hairline flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> No app, no login
          </span>
          <span className="bg-paper px-3 py-1.5 rounded-pill border border-hairline flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Files auto-delete in 30 days
          </span>
          <span className="bg-paper px-3 py-1.5 rounded-pill border border-hairline flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> UPI & Cash
          </span>
        </div>
      </div>

      <div className="px-4 mt-8 space-y-6 max-w-lg mx-auto">
        {step === 'UPLOAD' ? (
          <>
            {/* DROPZONE */}
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-hairline bg-surface rounded-[24px] p-8 text-center cursor-pointer hover:bg-paper transition-colors active:scale-[0.98]"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
              
              {isUploading ? (
                <div className="space-y-4">
                  <RefreshCw className="w-10 h-10 text-saffron animate-spin mx-auto" />
                  <div className="font-sora font-bold text-ink text-lg">Uploading...</div>
                  <div className="w-full bg-paper rounded-pill h-2 overflow-hidden border border-hairline">
                    <div className="bg-saffron h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto bg-saffron-tint rounded-full flex items-center justify-center">
                    <UploadCloud className="w-10 h-10 text-saffron" />
                  </div>
                  <div>
                    <h2 className="font-sora font-bold text-ink text-xl">Tap to upload files</h2>
                    <p className="text-ink-soft text-sm mt-1">PDF, JPG, PNG (Max 50MB)</p>
                  </div>
                </div>
              )}
            </div>

            {/* 2. FILE LIST & CUSTOMIZER */}
            {documents.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-sora font-bold text-ink text-lg px-2">Your files</h3>
                {documents.map((doc, idx) => (
                  <div key={doc.id} className="bg-surface border border-hairline rounded-[20px] shadow-ink-soft overflow-hidden">
                    <div className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-14 bg-paper flex items-center justify-center shrink-0 border border-hairline">
                        {doc.mimeType === 'application/pdf' ? <FileText className="w-6 h-6 text-danger" /> : <ImageIcon className="w-6 h-6 text-saffron" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink truncate text-sm">{doc.originalName}</div>
                        <div className="text-xs text-ink-soft mt-0.5">{doc.pageCount} pages · {(doc.fileSize/1024/1024).toFixed(1)} MB</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success" />
                        <button onClick={() => setDocuments(docs => docs.filter((_, i) => i !== idx))} className="text-ink-soft hover:text-danger p-2 -mr-2 rounded-full">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* CUSTOMIZER OPTIONS */}
                    <div className="bg-paper p-4 border-t border-hairline space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <SegmentedControl
                          value={doc.colorMode}
                          onChange={(v: any) => updateDocConfig(idx, { colorMode: v })}
                          options={[
                            { value: 'BLACK_AND_WHITE', label: 'B&W', icon: <Droplet className="w-3.5 h-3.5" /> },
                            { value: 'COLOR', label: 'Color', icon: <Droplet className="w-3.5 h-3.5 text-saffron" /> }
                          ]}
                        />
                        <SegmentedControl
                          value={doc.isDuplex ? 'DUPLEX' : 'SINGLE'}
                          onChange={(v: any) => updateDocConfig(idx, { isDuplex: v === 'DUPLEX' })}
                          options={[
                            { value: 'SINGLE', label: '1-sided', icon: <FileText className="w-3.5 h-3.5" /> },
                            { value: 'DUPLEX', label: '2-sided', icon: <Copy className="w-3.5 h-3.5" /> }
                          ]}
                        />
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1 overflow-x-auto scrollbar-hide flex gap-2">
                          {['A4', 'A3', 'Legal', 'Letter'].map(size => {
                            const available = activeSizes.includes(size.toUpperCase());
                            return (
                              <Chip 
                                key={size}
                                active={doc.paperSize === size.toUpperCase()}
                                disabled={!available}
                                onClick={() => updateDocConfig(idx, { paperSize: size.toUpperCase() })}
                              >
                                {size}
                              </Chip>
                            );
                          })}
                        </div>
                        <div className="shrink-0 w-32">
                          <Stepper value={doc.copies} onChange={(v: any) => updateDocConfig(idx, { copies: v })} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* 5. PAYMENT */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="font-sora font-extrabold text-2xl text-ink">How would you like to pay?</h2>
            
            <div className="space-y-3">
              <label 
                className={`block relative p-5 rounded-[20px] border-2 cursor-pointer transition-all ${
                  paymentMethod === 'RAZORPAY' ? 'border-ink bg-surface shadow-md' : 'border-hairline bg-surface/50 hover:bg-surface'
                }`}
              >
                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'RAZORPAY'} onChange={() => setPaymentMethod('RAZORPAY')} />
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    paymentMethod === 'RAZORPAY' ? 'border-ink bg-ink' : 'border-ink-soft'
                  }`}>
                    {paymentMethod === 'RAZORPAY' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-sora font-bold text-ink text-lg">Pay online</span>
                      <span className="bg-saffron-tint text-saffron text-[10px] uppercase font-bold px-2 py-0.5 rounded-pill">Fastest</span>
                    </div>
                    <p className="text-sm text-ink-soft mt-1">UPI, GPay, PhonePe, Cards</p>
                  </div>
                </div>
              </label>

              <label 
                className={`block relative p-5 rounded-[20px] border-2 cursor-pointer transition-all ${
                  paymentMethod === 'CASH_ON_COLLECTION' ? 'border-ink bg-surface shadow-md' : 'border-hairline bg-surface/50 hover:bg-surface'
                }`}
              >
                <input type="radio" name="payment" className="hidden" checked={paymentMethod === 'CASH_ON_COLLECTION'} onChange={() => setPaymentMethod('CASH_ON_COLLECTION')} />
                <div className="flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                    paymentMethod === 'CASH_ON_COLLECTION' ? 'border-ink bg-ink' : 'border-ink-soft'
                  }`}>
                    {paymentMethod === 'CASH_ON_COLLECTION' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="font-sora font-bold text-ink text-lg">Pay cash at counter</span>
                    <p className="text-sm text-ink-soft mt-1 flex items-start gap-1.5">
                      <Banknote className="w-4 h-4 shrink-0 mt-0.5" />
                      Your print starts after the shop confirms cash.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-ink-soft font-medium pt-4">
              <Lock className="w-3.5 h-3.5" /> Secure end-to-end processing
            </div>
          </div>
        )}
      </div>

      {/* 4. STICKY PRICE BAR */}
      {documents.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe z-40">
          <div className="max-w-lg mx-auto bg-surface/90 backdrop-blur-xl border border-hairline rounded-[24px] shadow-ink-soft p-4 flex flex-col gap-4 relative overflow-hidden transition-all">
            
            {/* Expanded Receipt */}
            {expandedReceipt && (
              <div className="pb-4 mb-2 border-b border-dashed border-hairline animate-in fade-in slide-in-from-bottom-2">
                <div className="font-sora font-bold text-ink mb-3">Order Breakdown</div>
                <div className="space-y-2 text-sm font-medium">
                  {documents.map((doc, i) => {
                    const tier = vendor?.pricingConfig.find(t => t.paperSize === doc.paperSize && t.colorMode === doc.colorMode && t.isDuplex === doc.isDuplex);
                    const cost = ((doc.pageCount * doc.copies * (tier?.pricePerSideMinor || 200)) / 100).toFixed(2);
                    return (
                      <div key={i} className="flex justify-between text-ink-soft">
                        <span className="truncate pr-4 flex-1">{doc.originalName} (x{doc.copies})</span>
                        <span className="font-mono text-ink">₹{cost}</span>
                      </div>
                    );
                  })}
                  {topUp > 0 && (
                    <div className="flex justify-between text-warning pt-2">
                      <span>Minimum order top-up</span>
                      <span className="font-mono">₹{(topUp/100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button 
                className="flex items-center gap-2 text-left group"
                onClick={() => setExpandedReceipt(!expandedReceipt)}
              >
                <div>
                  <div className="text-ink-soft text-xs font-semibold uppercase tracking-wider">{documents.length} files · {totalSheets} sheets</div>
                  <div className="font-sora font-extrabold text-ink text-3xl tabular-nums animate-countUp flex items-center gap-1">
                    ₹{totalRupees}
                    <ChevronUp className={`w-5 h-5 text-ink-soft transition-transform ${expandedReceipt ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </button>
              <Button 
                variant="primary" 
                className="w-40 h-14 text-base"
                onClick={() => {
                  if (step === 'UPLOAD') {
                    setStep('PAYMENT');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    handleProceedToPayment();
                  }
                }}
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? 'Processing...' : step === 'UPLOAD' ? 'Continue' : 'Pay now'}
              </Button>
            </div>
            {step === 'PAYMENT' && (
               <button onClick={() => setStep('UPLOAD')} className="absolute top-2 right-2 text-xs text-ink-soft p-2 font-medium">
                  Back to files
               </button>
            )}
          </div>
        </div>
      )}

      <QrStandeeModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} vendorName={vendor?.name || ''} vendorSlug={vendor?.slug || ''} address={vendor?.address || ''} />
    </div>
  );
}
