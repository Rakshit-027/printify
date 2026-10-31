// hallmark:v1 theme=sticker shape=workbench density=balanced
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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
  ChevronDown,
  Lock,
  CreditCard,
  Banknote,
  Sparkles,
  ArrowRight,
  Plus,
  Layers,
  Clock,
  Eye,
  SlidersHorizontal,
  Check,
  X,
  Leaf,
  Tag,
  MessageSquare,
  Camera,
  RotateCw,
  Crop,
  Wand2,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import Link from 'next/link';
import { parsePageRangeCount } from '@/lib/pricing-engine';

const QrStandeeModal = dynamic(
  () => import('@/components/QrStandeeModal').then((m) => m.QrStandeeModal),
  { ssr: false }
);

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
  allowOnlinePayment: boolean;
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
  pageRangeMode: 'ALL' | 'CUSTOM' | 'ODD' | 'EVEN';
  customPageSelection?: string;
  pagesPerSheet: 1 | 2 | 4;
  orientation: 'AUTO' | 'PORTRAIT' | 'LANDSCAPE';
  scaleMode: 'FIT' | 'ACTUAL';
  blobUrl?: string;
  file?: File;
  notes?: string;
  error?: string;
}

// -------------------------------------------------------------
// Document Cropping Coordinates
// -------------------------------------------------------------
interface CropRect {
  left: number; // 0.0 to 1.0 (normalized percentage of image)
  top: number;
  right: number;
  bottom: number;
}

// -------------------------------------------------------------
// Document Image Processing Filter (CamScanner / Xerox style)
// -------------------------------------------------------------
function applyDocumentFilter(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  filter: 'MAGIC_BW' | 'MAGIC_COLOR' | 'GRAYSCALE' | 'ORIGINAL',
  rotation: number,
  crop: CropRect
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isRotated = rotation === 90 || rotation === 270;
  const rawW = img.naturalWidth || img.width;
  const rawH = img.naturalHeight || img.height;
  if (!rawW || !rawH) return;

  // First create a temporary rotated canvas to crop from
  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = isRotated ? rawH : rawW;
  rotCanvas.height = isRotated ? rawW : rawH;
  const rotCtx = rotCanvas.getContext('2d');
  if (!rotCtx) return;

  rotCtx.save();
  rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
  rotCtx.rotate((rotation * Math.PI) / 180);
  rotCtx.drawImage(img, -rawW / 2, -rawH / 2, rawW, rawH);
  rotCtx.restore();

  // Extract custom crop box from the rotated image
  const cropX = Math.max(0, Math.round(crop.left * rotCanvas.width));
  const cropY = Math.max(0, Math.round(crop.top * rotCanvas.height));
  const cropW = Math.max(30, Math.min(rotCanvas.width - cropX, Math.round((crop.right - crop.left) * rotCanvas.width)));
  const cropH = Math.max(30, Math.min(rotCanvas.height - cropY, Math.round((crop.bottom - crop.top) * rotCanvas.height)));

  canvas.width = cropW;
  canvas.height = cropH;
  ctx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  if (filter === 'ORIGINAL') return;

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const totalPixels = data.length / 4;
  if (totalPixels === 0) return;

  // Compute 256-bin luminance histogram for accurate document contrast enhancement
  const hist = new Int32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    const luma = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    hist[Math.min(255, Math.max(0, luma))]++;
  }

  // Find 4th percentile (dark ink/text) and 94th percentile (paper background)
  let count = 0;
  let minLuma = 40;
  let maxLuma = 220;
  const lowThresh = Math.round(totalPixels * 0.04);
  const highThresh = Math.round(totalPixels * 0.94);

  for (let l = 0; l < 256; l++) {
    count += hist[l];
    if (minLuma === 40 && count >= lowThresh) {
      minLuma = l;
    }
    if (count >= highThresh) {
      maxLuma = l;
      break;
    }
  }

  // Ensure minimum dynamic range so contrast is always balanced
  const range = Math.max(35, maxLuma - minLuma);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // Normalized luminance relative to paper & ink [0.0 = ink, 1.0 = paper]
    const norm = Math.max(0, Math.min(1, (gray - minLuma) / range));

    if (filter === 'MAGIC_BW') {
      // Magic B&W (CamScanner Xerox filter):
      // Clean paper (>0.58 of dynamic range) is pushed to crisp white
      // Text and lines (<0.58) are darkened into rich black ink
      if (norm > 0.58) {
        const whiteVal = Math.min(255, Math.round(238 + ((norm - 0.58) / 0.42) * 17));
        data[i] = whiteVal;
        data[i + 1] = whiteVal;
        data[i + 2] = whiteVal;
      } else {
        const inkVal = Math.max(0, Math.round(Math.pow(norm / 0.58, 1.4) * 90));
        data[i] = inkVal;
        data[i + 1] = inkVal;
        data[i + 2] = inkVal;
      }
    } else if (filter === 'GRAYSCALE') {
      // High-contrast clean grayscale
      const grayVal = Math.round(norm * 255);
      data[i] = grayVal;
      data[i + 1] = grayVal;
      data[i + 2] = grayVal;
    } else if (filter === 'MAGIC_COLOR') {
      // Magic Color: brighten paper background while boosting saturation of text/stamps
      const paperFactor = norm > 0.55 ? 1.0 + (norm - 0.55) * 0.4 : 0.92;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const isColor = maxC - minC > 15;
      const sat = isColor ? 1.3 : 1.0;
      data[i] = Math.min(255, Math.max(0, Math.round((r * paperFactor - 128) * sat + 128)));
      data[i + 1] = Math.min(255, Math.max(0, Math.round((g * paperFactor - 128) * sat + 128)));
      data[i + 2] = Math.min(255, Math.max(0, Math.round((b * paperFactor - 128) * sat + 128)));
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

// -------------------------------------------------------------
// Industry-Level Hand Cropper & Document Studio Modal
// -------------------------------------------------------------
type AspectPreset = 'FREE' | 'A4' | 'CARD' | 'SQUARE';

function CameraScanStudioModal({
  photoFile,
  onSave,
  onClose,
}: {
  photoFile: File;
  onSave: (processedFile: File) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<'ORIGINAL' | 'MAGIC_BW' | 'MAGIC_COLOR' | 'GRAYSCALE'>('ORIGINAL');
  const [rotation, setRotation] = useState<number>(0);
  // Default to a generous, clean 94% crop frame (user adjusts by hand)
  const [crop, setCrop] = useState<CropRect>({ left: 0.03, top: 0.03, right: 0.97, bottom: 0.97 });
  const [activeTab, setActiveTab] = useState<'CROP' | 'FILTER'>('CROP');
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [rotatedSrc, setRotatedSrc] = useState<string>('');
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const [activePreset, setActivePreset] = useState<AspectPreset>('FREE');
  const [isProcessing, setIsProcessing] = useState(false);

  // Direct ref to the wrapper around the visible document image
  const imageBoxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    handle: 'TL' | 'TR' | 'BL' | 'BR' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'MOVE' | null;
    startX: number;
    startY: number;
    initialCrop: CropRect;
  }>({
    handle: null,
    startX: 0,
    startY: 0,
    initialCrop: { left: 0.03, top: 0.03, right: 0.97, bottom: 0.97 },
  });

  // 1. Load original photo
  useEffect(() => {
    const img = new Image();
    const url = URL.createObjectURL(photoFile);
    img.src = url;
    img.onload = () => {
      setImageObj(img);
      URL.revokeObjectURL(url);
    };
  }, [photoFile]);

  // 2. Generate an exact rotated canvas data URL so the DOM image has true physical dimensions
  useEffect(() => {
    if (!imageObj) return;
    const isRot = rotation === 90 || rotation === 270;
    const rawW = imageObj.naturalWidth || imageObj.width;
    const rawH = imageObj.naturalHeight || imageObj.height;
    const targetW = isRot ? rawH : rawW;
    const targetH = isRot ? rawW : rawH;

    const rotCanvas = document.createElement('canvas');
    rotCanvas.width = targetW;
    rotCanvas.height = targetH;
    const ctx = rotCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(targetW / 2, targetH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(imageObj, -rawW / 2, -rawH / 2, rawW, rawH);
    ctx.restore();

    setRotatedSrc(rotCanvas.toDataURL('image/jpeg', 0.92));
    setDimensions({ width: targetW, height: targetH });
  }, [imageObj, rotation]);

  // 3. Update filter preview canvas whenever filter, crop, rotation, or tab changes
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    applyDocumentFilter(imageObj, canvasRef.current, filter, rotation, crop);
  }, [imageObj, filter, rotation, crop, activeTab]);

  // Hand Dragging Handlers (Normalized directly against imageBox bounding client rect)
  const startDrag = (
    handle: 'TL' | 'TR' | 'BL' | 'BR' | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'MOVE',
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialCrop: { ...crop },
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const { handle, startX, startY, initialCrop } = dragRef.current;
    if (!handle || !imageBoxRef.current) return;

    const rect = imageBoxRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const deltaX = (e.clientX - startX) / rect.width;
    const deltaY = (e.clientY - startY) / rect.height;
    const minSize = 0.08; // Min 8% dimension to prevent handle collapsing

    setCrop(() => {
      const next = { ...initialCrop };

      if (handle === 'TL') {
        next.left = Math.max(0, Math.min(initialCrop.right - minSize, initialCrop.left + deltaX));
        next.top = Math.max(0, Math.min(initialCrop.bottom - minSize, initialCrop.top + deltaY));
      } else if (handle === 'TR') {
        next.right = Math.min(1, Math.max(initialCrop.left + minSize, initialCrop.right + deltaX));
        next.top = Math.max(0, Math.min(initialCrop.bottom - minSize, initialCrop.top + deltaY));
      } else if (handle === 'BL') {
        next.left = Math.max(0, Math.min(initialCrop.right - minSize, initialCrop.left + deltaX));
        next.bottom = Math.min(1, Math.max(initialCrop.top + minSize, initialCrop.bottom + deltaY));
      } else if (handle === 'BR') {
        next.right = Math.min(1, Math.max(initialCrop.left + minSize, initialCrop.right + deltaX));
        next.bottom = Math.min(1, Math.max(initialCrop.top + minSize, initialCrop.bottom + deltaY));
      } else if (handle === 'TOP') {
        next.top = Math.max(0, Math.min(initialCrop.bottom - minSize, initialCrop.top + deltaY));
      } else if (handle === 'BOTTOM') {
        next.bottom = Math.min(1, Math.max(initialCrop.top + minSize, initialCrop.bottom + deltaY));
      } else if (handle === 'LEFT') {
        next.left = Math.max(0, Math.min(initialCrop.right - minSize, initialCrop.left + deltaX));
      } else if (handle === 'RIGHT') {
        next.right = Math.min(1, Math.max(initialCrop.left + minSize, initialCrop.right + deltaX));
      } else if (handle === 'MOVE') {
        const width = initialCrop.right - initialCrop.left;
        const height = initialCrop.bottom - initialCrop.top;
        const newLeft = Math.max(0, Math.min(1 - width, initialCrop.left + deltaX));
        const newTop = Math.max(0, Math.min(1 - height, initialCrop.top + deltaY));
        next.left = newLeft;
        next.top = newTop;
        next.right = newLeft + width;
        next.bottom = newTop + height;
      }

      return next;
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragRef.current.handle) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragRef.current.handle = null;
    }
  };

  // Preset Ratio Applier
  const applyPreset = (preset: AspectPreset | 'FULL') => {
    if (preset === 'FULL') {
      setCrop({ left: 0, top: 0, right: 1, bottom: 1 });
      setActivePreset('FREE');
      return;
    }

    setActivePreset(preset);
    if (preset === 'FREE') return;

    const imgAspect = dimensions.width / Math.max(1, dimensions.height);
    let targetPhysicalRatio = 1.0;

    if (preset === 'A4') {
      // Standard A4 aspect ratio (1 : 1.414)
      targetPhysicalRatio = imgAspect >= 1 ? 1.414 : 1 / 1.414;
    } else if (preset === 'CARD') {
      // Standard ID card ratio (3 : 2 = 1.58)
      targetPhysicalRatio = 1.58;
    } else if (preset === 'SQUARE') {
      targetPhysicalRatio = 1.0;
    }

    // Normalized ratio = targetPhysicalRatio / imgAspect
    const normAspect = targetPhysicalRatio / imgAspect;
    let newNormW = 0.9;
    let newNormH = newNormW / normAspect;

    if (newNormH > 0.9) {
      newNormH = 0.9;
      newNormW = newNormH * normAspect;
    }

    const left = Math.max(0, (1 - newNormW) / 2);
    const top = Math.max(0, (1 - newNormH) / 2);
    setCrop({
      left,
      top,
      right: Math.min(1, left + newNormW),
      bottom: Math.min(1, top + newNormH),
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    // Keep generous crop on rotation
    setCrop({ left: 0.03, top: 0.03, right: 0.97, bottom: 0.97 });
  };

  const handleDone = () => {
    if (!canvasRef.current || !imageObj) return;
    setIsProcessing(true);
    // Guarantee that canvas has the latest filter and crop drawn before converting to blob
    applyDocumentFilter(imageObj, canvasRef.current, filter, rotation, crop);
    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) {
          setIsProcessing(false);
          return;
        }
        const scannedFile = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onSave(scannedFile);
        setIsProcessing(false);
      },
      'image/jpeg',
      0.92
    );
  };

  // Calculate live visual crop dimensions
  const cropWPercent = Math.round((crop.right - crop.left) * 100);
  const cropHPercent = Math.round((crop.bottom - crop.top) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none duration-200">
      <div className="bg-surface rounded-3xl sm:rounded-3xl border border-hairline max-w-lg w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-hairline flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-12 bg-saffron-tint text-saffron flex items-center justify-center shrink-0">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-sora font-bold text-ink text-sm sm:text-base leading-tight">
                Document Scanner &amp; Crop
              </h3>
              <p className="text-[11px] text-ink-soft">
                Drag corners by hand to set borders precisely
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-paper hover:bg-hairline flex items-center justify-center text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher Tabs: Custom Crop vs Document Filters */}
        <div className="px-3 sm:px-4 pt-2 pb-1.5 bg-surface border-b border-hairline flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('CROP')}
            className={`flex-1 py-1.5 rounded-12 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'CROP'
                ? 'bg-ink text-white shadow-xs'
                : 'bg-paper text-ink-soft hover:text-ink'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>1. Hand Crop &amp; Rotate</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('FILTER');
              if (imageObj && canvasRef.current) {
                applyDocumentFilter(imageObj, canvasRef.current, filter, rotation, crop);
              }
            }}
            className={`flex-1 py-1.5 rounded-12 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'FILTER'
                ? 'bg-ink text-white shadow-xs'
                : 'bg-paper text-ink-soft hover:text-ink'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>2. Document Filters</span>
          </button>
        </div>

        {/* Main Work Canvas Area */}
        <div
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex-1 overflow-hidden p-3 sm:p-4 bg-ink flex flex-col items-center justify-center relative min-h-[300px] select-none touch-none"
        >
          {/* 1. INTERACTIVE HAND CROPPER CONTAINER (Visible on CROP tab) */}
          {rotatedSrc && (
            <div
              ref={imageBoxRef}
              className={`relative max-h-[46vh] max-w-full rounded-12 overflow-hidden shadow-2xl border border-white/10 bg-black touch-none select-none ${
                activeTab === 'CROP' ? 'inline-block' : 'hidden'
              }`}
            >
              {/* Clean Rotated Base Image with exact DOM bounds */}
              <img
                src={rotatedSrc}
                alt="Scan to crop"
                style={{
                  maxHeight: '44vh',
                  maxWidth: '100%',
                  display: 'block',
                }}
                className="pointer-events-none select-none object-contain"
              />

              {/* 4 Bulletproof Dark Scrims outside the active crop window */}
              <div
                className="absolute top-0 left-0 right-0 bg-black/65 pointer-events-none"
                style={{ height: `${crop.top * 100}%` }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 bg-black/65 pointer-events-none"
                style={{ height: `${(1 - crop.bottom) * 100}%` }}
              />
              <div
                className="absolute left-0 bg-black/65 pointer-events-none"
                style={{
                  top: `${crop.top * 100}%`,
                  height: `${(crop.bottom - crop.top) * 100}%`,
                  width: `${crop.left * 100}%`,
                }}
              />
              <div
                className="absolute right-0 bg-black/65 pointer-events-none"
                style={{
                  top: `${crop.top * 100}%`,
                  height: `${(crop.bottom - crop.top) * 100}%`,
                  width: `${(1 - crop.right) * 100}%`,
                }}
              />

              {/* Active Crop Selection Box */}
              <div
                style={{
                  left: `${crop.left * 100}%`,
                  top: `${crop.top * 100}%`,
                  width: `${(crop.right - crop.left) * 100}%`,
                  height: `${(crop.bottom - crop.top) * 100}%`,
                }}
                className="absolute border border-white/90 shadow-sm touch-none"
              >
                {/* Center Area Drag: Move entire box */}
                <div
                  onPointerDown={(e) => startDrag('MOVE', e)}
                  className="absolute inset-0 cursor-move touch-none flex items-center justify-center"
                >
                  {/* Subtle Rule-of-Thirds Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  {/* Dimension pill badge */}
                  <span className="pointer-events-none opacity-85 px-2 py-0.5 rounded-pill bg-black/75 text-[11px] text-white tabular-nums shadow-xs">
                    {cropWPercent}% × {cropHPercent}%
                  </span>
                </div>

                {/* CamScanner Style 4 Corner L-Brackets with 44px Touch Targets */}
                {/* TOP-LEFT */}
                <div
                  onPointerDown={(e) => startDrag('TL', e)}
                  className="absolute -top-5 -left-5 w-11 h-11 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                >
                  <div className="w-5 h-5 border-t-3 border-l-3 border-white drop-shadow-sm relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-saffron border border-white shadow group-active:scale-125 transition-transform" />
                  </div>
                </div>

                {/* TOP-RIGHT */}
                <div
                  onPointerDown={(e) => startDrag('TR', e)}
                  className="absolute -top-5 -right-5 w-11 h-11 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                >
                  <div className="w-5 h-5 border-t-3 border-r-3 border-white drop-shadow-sm relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-saffron border border-white shadow group-active:scale-125 transition-transform" />
                  </div>
                </div>

                {/* BOTTOM-LEFT */}
                <div
                  onPointerDown={(e) => startDrag('BL', e)}
                  className="absolute -bottom-5 -left-5 w-11 h-11 flex items-center justify-center cursor-nesw-resize touch-none z-30 group"
                >
                  <div className="w-5 h-5 border-b-3 border-l-3 border-white drop-shadow-sm relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-saffron border border-white shadow group-active:scale-125 transition-transform" />
                  </div>
                </div>

                {/* BOTTOM-RIGHT */}
                <div
                  onPointerDown={(e) => startDrag('BR', e)}
                  className="absolute -bottom-5 -right-5 w-11 h-11 flex items-center justify-center cursor-nwse-resize touch-none z-30 group"
                >
                  <div className="w-5 h-5 border-b-3 border-r-3 border-white drop-shadow-sm relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-saffron border border-white shadow group-active:scale-125 transition-transform" />
                  </div>
                </div>

                {/* 4 Mid-Edge Touch Bars */}
                {/* TOP */}
                <div
                  onPointerDown={(e) => startDrag('TOP', e)}
                  className="absolute -top-3.5 inset-x-8 h-7 flex items-center justify-center cursor-ns-resize touch-none z-20 group"
                >
                  <div className="w-10 h-1.5 bg-white rounded-full shadow-sm group-active:h-2 transition-colors" />
                </div>
                {/* BOTTOM */}
                <div
                  onPointerDown={(e) => startDrag('BOTTOM', e)}
                  className="absolute -bottom-3.5 inset-x-8 h-7 flex items-center justify-center cursor-ns-resize touch-none z-20 group"
                >
                  <div className="w-10 h-1.5 bg-white rounded-full shadow-sm group-active:h-2 transition-colors" />
                </div>
                {/* LEFT */}
                <div
                  onPointerDown={(e) => startDrag('LEFT', e)}
                  className="absolute -left-3.5 inset-y-8 w-7 flex items-center justify-center cursor-ew-resize touch-none z-20 group"
                >
                  <div className="h-10 w-1.5 bg-white rounded-full shadow-sm group-active:w-2 transition-colors" />
                </div>
                {/* RIGHT */}
                <div
                  onPointerDown={(e) => startDrag('RIGHT', e)}
                  className="absolute -right-3.5 inset-y-8 w-7 flex items-center justify-center cursor-ew-resize touch-none z-20 group"
                >
                  <div className="h-10 w-1.5 bg-white rounded-full shadow-sm group-active:w-2 transition-colors" />
                </div>
              </div>
            </div>
          )}

          {/* 2. FILTER PREVIEW CANVAS CONTAINER (Always mounted in DOM, displayed on FILTER tab) */}
          <div
            className={`rounded-16 shadow-2xl overflow-hidden border border-white/20 bg-black/40 max-w-full flex items-center justify-center p-1 ${
              activeTab === 'FILTER' ? 'inline-block' : 'hidden'
            }`}
          >
            <canvas ref={canvasRef} aria-hidden="true" className="max-h-[46vh] max-w-full block rounded-10 shadow-lg object-contain" />
          </div>
        </div>

        {/* Toolbar: Dynamic controls depending on active tab */}
        <div className="px-3 sm:px-4 py-2 bg-paper border-t border-hairline flex items-center justify-between text-xs gap-1.5 overflow-x-auto">
          {activeTab === 'CROP' ? (
            <>
              {/* Preset Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-semibold text-ink-soft mr-1">Preset:</span>
                {[
                  { id: 'FREE', label: 'Free' },
                  { id: 'A4', label: 'A4 Document' },
                  { id: 'CARD', label: 'ID Card' },
                  { id: 'SQUARE', label: '1:1' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id as AspectPreset)}
                    className={`px-2 py-1 rounded-10 text-xs font-bold transition-colors ${
                      activePreset === p.id
                        ? 'bg-ink text-white shadow-xs'
                        : 'bg-surface border border-hairline text-ink-soft hover:text-ink'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => applyPreset('FULL')}
                  className="px-2 py-1 rounded-10 bg-surface border border-hairline text-xs font-bold text-ink-soft hover:text-ink transition-colors"
                  title="Reset to 100% full frame"
                >
                  Full Frame
                </button>
              </div>

              {/* Rotate 90° Clockwise */}
              <button
                type="button"
                onClick={handleRotate}
                className="px-2.5 py-1 rounded-10 bg-surface border border-hairline text-ink font-bold flex items-center gap-1 hover:bg-hairline transition-colors active:scale-95 shadow-xs shrink-0"
                title="Rotate image 90 degrees"
              >
                <RotateCw className="w-3 h-3 text-saffron" />
                <span className="text-xs">Rotate 90°</span>
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setActiveTab('CROP')}
                className="px-2.5 py-1 rounded-10 bg-surface border border-hairline text-ink font-bold flex items-center gap-1.5 hover:bg-hairline transition-colors"
              >
                <Crop className="w-3.5 h-3.5 text-saffron" />
                <span className="text-xs">← Re-adjust Crop Edges</span>
              </button>
              <span className="text-xs text-ink-soft font-medium">
                Live document filter applied
              </span>
            </div>
          )}
        </div>

        {/* Filter Selection & Action Footer */}
        <div className="p-3 sm:p-4 bg-surface border-t border-hairline space-y-3">
          <label className="text-xs font-bold  text-ink-soft flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5 text-saffron" />
              <span>Document Filter</span>
            </span>
            <span className="text-[11px] text-emerald-600 font-semibold">
              High-Res Enhancement
            </span>
          </label>

          <div className="grid grid-cols-4 gap-1.5 bg-paper p-1 rounded-16 border border-hairline">
            {[
              { id: 'ORIGINAL', label: 'Original', sub: 'Natural' },
              { id: 'MAGIC_BW', label: 'Magic B&W', sub: 'Clean Xerox' },
              { id: 'MAGIC_COLOR', label: 'Magic Color', sub: 'Crisp Color' },
              { id: 'GRAYSCALE', label: 'Grayscale', sub: 'Smooth Gray' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilter(f.id as any);
                  setActiveTab('FILTER');
                }}
                className={`py-1.5 sm:py-2 px-1 rounded-12 text-center transition-colors ${
                  filter === f.id
                    ? 'bg-ink text-white shadow-xs font-bold'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <div className="text-xs font-bold leading-tight">{f.label}</div>
                <div className={`text-[11px] ${filter === f.id ? 'text-white/80' : 'text-ink-soft/70'}`}>
                  {f.sub}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-pill border border-hairline text-xs font-bold text-ink-soft hover:bg-paper transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleDone}
              className="flex-2 py-2.5 rounded-pill bg-ink hover:bg-ink/90 text-white text-xs font-bold shadow-md shadow-ink/20 flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 motion-safe:animate-spin text-saffron" />
                  <span>Processing High-Res Crop...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Save &amp; Add to Print Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Interactive PDF & Image Preview Modal with Canvas Renderer
// -------------------------------------------------------------
function DocumentPreviewModal({
  doc,
  onClose,
}: {
  doc: UploadedDoc;
  onClose: () => void;
}) {
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState(doc.pageCount || 1);
  const [loading, setLoading] = useState(true);
  const [pdfJsLoaded, setPdfJsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (doc.mimeType !== 'application/pdf') {
      setLoading(false);
      return;
    }

    if ((window as any).pdfjsLib) {
      setPdfJsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        setPdfJsLoaded(true);
      }
    };
    script.onerror = () => {
      setLoadError(true);
      setLoading(false);
    };
    document.head.appendChild(script);
  }, [doc.mimeType]);

  useEffect(() => {
    if (!pdfJsLoaded || !doc.blobUrl || doc.mimeType !== 'application/pdf') return;

    let isMounted = true;
    async function loadDocument() {
      try {
        setLoading(true);
        setLoadError(false);
        const loadingTask = (window as any).pdfjsLib.getDocument(doc.blobUrl);
        const pdf = await loadingTask.promise;
        if (!isMounted) return;
        pdfInstanceRef.current = pdf;
        setNumPages(pdf.numPages);
        renderPage(1, pdf);
      } catch (err) {
        console.error('PDF.js parse error:', err);
        setLoadError(true);
        setLoading(false);
      }
    }

    loadDocument();
    return () => {
      isMounted = false;
    };
  }, [pdfJsLoaded, doc.blobUrl]);

  const renderPage = async (pageIdx: number, pdfRefParam?: any) => {
    const pdf = pdfRefParam || pdfInstanceRef.current;
    if (!pdf || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      const page = await pdf.getPage(pageIdx);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewportUnscaled = page.getViewport({ scale: 1.0 });
      const maxWidth = Math.min(window.innerWidth - 48, 550);
      const scale = maxWidth / viewportUnscaled.width;
      const viewport = page.getViewport({ scale: Math.max(0.7, Math.min(scale, 1.6)) });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const task = page.render({
        canvasContext: context,
        viewport,
      });
      renderTaskRef.current = task;
      await task.promise;
      setLoading(false);
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Canvas render error:', err);
      }
      setLoading(false);
    }
  };

  const changePage = (offset: number) => {
    const newPage = Math.max(1, Math.min(numPages, pageNumber + offset));
    setPageNumber(newPage);
    renderPage(newPage);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 sm:p-4 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none duration-200">
      <div className="bg-surface rounded-3xl border border-hairline max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-hairline flex items-center justify-between gap-3 bg-surface">
          <div className="min-w-0 flex-1">
            <h3 className="font-sora font-bold text-ink text-sm sm:text-base truncate">
              {doc.originalName}
            </h3>
            <p className="text-xs text-ink-soft flex items-center gap-1.5 mt-0.5">
              <span>{numPages} {numPages === 1 ? 'page' : 'pages'}</span>
              <span>•</span>
              <span>{(doc.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {doc.blobUrl && (
              <a
                href={doc.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-12 bg-paper hover:bg-hairline text-ink text-xs font-bold border border-hairline flex items-center gap-1 transition-colors"
                title="Open in new window"
              >
                <span>Full Tab</span>
                <ArrowRight className="w-3 h-3 -rotate-45" />
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-paper hover:bg-hairline flex items-center justify-center text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 bg-paper flex flex-col items-center justify-center relative min-h-[350px]">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/80 backdrop-blur-xs z-10 space-y-2">
              <RefreshCw className="w-6 h-6 motion-safe:animate-spin text-saffron" />
              <span className="text-xs text-ink-soft font-medium">Rendering page preview...</span>
            </div>
          )}

          {doc.mimeType === 'application/pdf' ? (
            loadError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                <FileText className="w-12 h-12 text-ink-soft/60" />
                <p className="text-xs text-ink-soft max-w-xs">
                  Native browser preview is ready. Open the full PDF in a new tab to inspect.
                </p>
                {doc.blobUrl && (
                  <a
                    href={doc.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-pill bg-ink text-white font-bold text-xs"
                  >
                    Open PDF in Viewer ↗
                  </a>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center w-full">
                <div className="rounded-16 shadow-lg overflow-hidden border border-hairline/80 bg-white">
                  <canvas ref={canvasRef} aria-hidden="true" className="max-w-full block" />
                </div>
              </div>
            )
          ) : doc.blobUrl ? (
            <img
              src={doc.blobUrl}
              alt={doc.originalName}
              className="max-h-[65vh] max-w-full object-contain rounded-16 shadow-md"
            />
          ) : (
            <div className="text-center py-12 text-ink-soft text-xs">
              Preview not available.
            </div>
          )}
        </div>

        {/* Bottom Bar with Pagination */}
        <div className="p-3.5 bg-paper border-t border-hairline flex items-center justify-between text-xs">
          {doc.mimeType === 'application/pdf' && numPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pageNumber <= 1}
                onClick={() => changePage(-1)}
                className="px-3 py-1.5 rounded-12 bg-surface border border-hairline text-ink font-bold disabled:opacity-40 transition-colors hover:bg-hairline/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                Previous
              </button>
              <span className="tabular-nums text-xs font-bold text-ink px-1">
                {pageNumber} / {numPages}
              </span>
              <button
                type="button"
                disabled={pageNumber >= numPages}
                onClick={() => changePage(1)}
                className="px-3 py-1.5 rounded-12 bg-surface border border-hairline text-ink font-bold disabled:opacity-40 transition-colors hover:bg-hairline/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                Next
              </button>
            </div>
          ) : (
            <span className="text-xs text-ink-soft">Inspect margins, orientation &amp; text clarity.</span>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-pill bg-ink text-white font-bold text-xs shadow-xs hover:bg-ink/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// IndexedDB Draft Persister for Mobile Sessions (Survives Refresh)
// -------------------------------------------------------------
const DRAFT_DB_NAME = 'print2me_draft_v1';
const DRAFT_STORE_NAME = 'drafts';

function openDraftDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = window.indexedDB.open(DRAFT_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
        db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'vendorSlug' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveDraftToIDB(vendorSlug: string, docs: UploadedDoc[]) {
  try {
    const db = await openDraftDB();
    const tx = db.transaction(DRAFT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DRAFT_STORE_NAME);
    if (!docs || docs.length === 0) {
      store.delete(vendorSlug);
      return;
    }
    const serializedDocs = docs.map((d) => ({
      ...d,
      blobUrl: undefined,
      file: d.file,
    }));
    store.put({
      vendorSlug,
      docs: serializedDocs,
      savedAt: Date.now(),
    });
  } catch (e) {
    console.warn('Draft save error:', e);
  }
}

async function loadDraftFromIDB(vendorSlug: string): Promise<UploadedDoc[] | null> {
  try {
    const db = await openDraftDB();
    const tx = db.transaction(DRAFT_STORE_NAME, 'readonly');
    const store = tx.objectStore(DRAFT_STORE_NAME);
    const req = store.get(vendorSlug);
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const data = req.result;
        if (!data || !data.docs || !Array.isArray(data.docs) || data.docs.length === 0) {
          resolve(null);
          return;
        }
        if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
          resolve(null);
          return;
        }
        const restored: UploadedDoc[] = data.docs.map((item: any) => {
          let blobUrl: string | undefined = undefined;
          if (item.file) {
            blobUrl = URL.createObjectURL(item.file);
          }
          return {
            ...item,
            blobUrl,
          };
        });
        resolve(restored);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function clearDraftFromIDB(vendorSlug: string) {
  try {
    const db = await openDraftDB();
    const tx = db.transaction(DRAFT_STORE_NAME, 'readwrite');
    tx.objectStore(DRAFT_STORE_NAME).delete(vendorSlug);
  } catch {}
}

// -------------------------------------------------------------
// Main Vendor Public Order Page Component
// -------------------------------------------------------------
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

  // Advanced settings expandable toggle per document (collapsed by default)
  const [expandedDocAdvanced, setExpandedDocAdvanced] = useState<{ [docId: string]: boolean }>({});

  // Camera capture state
  const [scannedPhotoFile, setScannedPhotoFile] = useState<File | null>(null);

  // Password-Protected PDF handling
  const [pendingPasswordFile, setPendingPasswordFile] = useState<{ file: File; buffer: ArrayBuffer } | null>(null);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<UploadedDoc | null>(null);

  // Copy-to-all Toast
  const [toastMessage, setToastMessage] = useState('');

  // UI state
  const [showQrModal, setShowQrModal] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'CASH_ON_COLLECTION'>('RAZORPAY');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [pickupTiming, setPickupTiming] = useState<'IMMEDIATE' | 'IN_15_MINS' | 'LATER_TODAY'>('IMMEDIATE');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [step, setStep] = useState<'UPLOAD' | 'PAYMENT'>('UPLOAD');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<Set<string>>(new Set());

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

        const allowCash = data.vendor.allowCashOnDesk ?? true;
        const allowOnline = data.vendor.allowOnlinePayment ?? true;

        setVendor({
          ...data.vendor,
          pricingConfig: activeConfig,
          name: data.vendor.name || 'SpeedyPrint Express',
          address: data.vendor.address || 'Campus Arcade, Near Gate 2',
          allowCashOnDesk: allowCash,
          allowOnlinePayment: allowOnline,
        });

        if (!allowOnline && allowCash) {
          setPaymentMethod('CASH_ON_COLLECTION');
        } else if (allowOnline && !allowCash) {
          setPaymentMethod('RAZORPAY');
        }
      } catch {
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
          allowOnlinePayment: true,
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

  // Restore draft documents from IndexedDB on refresh / return to page
  const hasLoadedDraftRef = useRef(false);
  useEffect(() => {
    if (!vendorSlug || hasLoadedDraftRef.current) return;
    hasLoadedDraftRef.current = true;
    loadDraftFromIDB(vendorSlug).then((draft) => {
      if (draft && draft.length > 0) {
        draft.forEach((d) => {
          if (d.blobUrl) blobUrlsRef.current.add(d.blobUrl);
        });
        setDocuments(draft);
        showToast('Restored previous upload session');
      }
    });
  }, [vendorSlug]);

  // Persist documents to IndexedDB whenever changed
  useEffect(() => {
    if (!vendorSlug || !hasLoadedDraftRef.current) return;
    saveDraftToIDB(vendorSlug, documents);
  }, [vendorSlug, documents]);

  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const getEffectiveDocPages = (doc: UploadedDoc): number => {
    if (doc.pageRangeMode === 'ODD') {
      return Math.ceil(doc.pageCount / 2);
    }
    if (doc.pageRangeMode === 'EVEN') {
      return Math.floor(doc.pageCount / 2);
    }
    if (doc.pageRangeMode === 'CUSTOM' && doc.customPageSelection) {
      return parsePageRangeCount(doc.customPageSelection, doc.pageCount);
    }
    return doc.pageCount;
  };

  const getFormattedPageRange = (doc: UploadedDoc): string => {
    if (doc.pageRangeMode === 'CUSTOM' && doc.customPageSelection) {
      return doc.customPageSelection;
    }
    if (doc.pageRangeMode === 'ODD') {
      return Array.from({ length: doc.pageCount }, (_, i) => i + 1)
        .filter((p) => p % 2 !== 0)
        .join(', ');
    }
    if (doc.pageRangeMode === 'EVEN') {
      return Array.from({ length: doc.pageCount }, (_, i) => i + 1)
        .filter((p) => p % 2 === 0)
        .join(', ');
    }
    return 'ALL';
  };

  const processUploadedFile = async (file: File) => {
    setUploadError('');
    setIsUploading(true);
    setUploadFileName(file.name);
    setUploadProgress(15);

    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('File limit exceeded. Max 50MB per file.');

      let pageCount = 1;
      const finalFile = file;

      if (file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        try {
          const { PDFDocument } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
        } catch (loadErr: any) {
          const msg = loadErr?.message?.toLowerCase() || '';
          if (msg.includes('password') || msg.includes('encrypted') || msg.includes('decrypt')) {
            setIsUploading(false);
            setPendingPasswordFile({ file, buffer });
            return;
          }
          throw new Error('This PDF might be corrupted or unreadable.');
        }
      }
      setUploadProgress(40);

      const initRes = await fetch('/api/uploads/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorSlug, filename: finalFile.name, fileSizeBytes: finalFile.size, mimeType: finalFile.type }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Server upload session initiation failed');

      setUploadProgress(65);
      const putRes = await fetch(initData.uploadUrl, {
        method: 'PUT',
        headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': finalFile.type },
        body: finalFile,
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

      const blobUrl = URL.createObjectURL(finalFile);
      blobUrlsRef.current.add(blobUrl);

      const newDoc: UploadedDoc = {
        id: verifyData.document.id,
        originalName: finalFile.name,
        fileSize: finalFile.size,
        mimeType: finalFile.type,
        pageCount,
        paperSize: 'A4',
        colorMode: 'BLACK_AND_WHITE',
        isDuplex: false,
        copies: 1,
        pageRangeMode: 'ALL',
        pagesPerSheet: 1,
        orientation: 'AUTO',
        scaleMode: 'FIT',
        blobUrl,
        file: finalFile,
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

  const handleUnlockPdfModalClose = () => {
    setPendingPasswordFile(null);
    setUploadError('Password-protected PDF detected. Please upload an unlocked PDF to ensure print station compatibility.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await processUploadedFile(files[i]);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setScannedPhotoFile(file);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
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

  const applyToAllDocs = (sourceIdx: number) => {
    const source = documents[sourceIdx];
    if (!source || documents.length <= 1) return;

    setDocuments((prev) =>
      prev.map((doc, idx) => {
        if (idx === sourceIdx) return doc;
        return {
          ...doc,
          colorMode: source.colorMode,
          isDuplex: source.isDuplex,
          paperSize: source.paperSize,
          copies: source.copies,
          pagesPerSheet: source.pagesPerSheet,
          orientation: source.orientation,
          scaleMode: source.scaleMode,
          pageRangeMode: source.pageRangeMode,
        };
      })
    );
    showToast(`Applied settings to all ${documents.length} documents!`);
  };

  const moveDoc = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= documents.length) return;

    setDocuments((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setActiveDocIndex(targetIndex);
  };

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code');
      return;
    }
    if (code === 'STUDENT10') {
      setAppliedCoupon('STUDENT10');
      showToast('10% Student Discount Applied!');
    } else if (code === 'CAMPUS5') {
      setAppliedCoupon('CAMPUS5');
      showToast('₹5 Campus Discount Applied!');
    } else {
      setCouponError('Invalid coupon code. Try STUDENT10 or CAMPUS5');
    }
  };

  const calculateBreakdown = () => {
    let totalPaise = 0;
    let totalSheets = 0;
    let totalSides = 0;
    let standardSingleSheets = 0;
    const minOrder = vendor?.pricingConfig[0]?.minimumOrderMinor || 500;

    documents.forEach((doc) => {
      const tier = vendor?.pricingConfig.find(
        (t) => t.paperSize === doc.paperSize && t.colorMode === doc.colorMode && t.isDuplex === doc.isDuplex
      );
      const pricePerSide = tier ? tier.pricePerSideMinor : doc.colorMode === 'COLOR' ? 1000 : 200;

      const effectivePages = getEffectiveDocPages(doc);
      const nUp = doc.pagesPerSheet || 1;
      const impressionFaces = Math.ceil(effectivePages / nUp);

      const sides = impressionFaces * doc.copies;
      const sheets = Math.ceil(impressionFaces / (doc.isDuplex ? 2 : 1)) * doc.copies;

      totalSides += sides;
      totalSheets += sheets;
      standardSingleSheets += effectivePages * doc.copies;
      totalPaise += sides * pricePerSide;
    });

    let discountPaise = 0;
    if (appliedCoupon === 'STUDENT10') {
      discountPaise = Math.round(totalPaise * 0.1);
    } else if (appliedCoupon === 'CAMPUS5') {
      discountPaise = Math.min(totalPaise, 500);
    }

    const discountedTotal = Math.max(0, totalPaise - discountPaise);
    const topUp = discountedTotal > 0 && discountedTotal < minOrder ? minOrder - discountedTotal : 0;
    const basePrintPaise = discountedTotal > 0 ? Math.max(discountedTotal, minOrder) : 0;
    const sheetsSaved = Math.max(0, standardSingleSheets - totalSheets);

    // Exact paise gross-up: Gross = Math.round(Base / 0.9764), Fee = Gross - Base
    const isOnline = vendor?.allowOnlinePayment && paymentMethod === 'RAZORPAY';
    const gatewayFeePaise = isOnline && basePrintPaise > 0
      ? Math.round(basePrintPaise / (1 - 0.0236)) - basePrintPaise
      : 0;

    const finalTotalPaise = basePrintPaise + gatewayFeePaise;

    return {
      totalPaise: finalTotalPaise,
      basePrintPaise,
      gatewayFeePaise,
      rawPaise: totalPaise,
      discountPaise,
      totalSheets,
      totalSides,
      sheetsSaved,
      topUp,
    };
  };

  const handleProceedToPayment = async () => {
    if (documents.length === 0 || !vendor) return;
    setIsPlacingOrder(true);

    try {
      const timingLabel =
        pickupTiming === 'IMMEDIATE'
          ? 'Urgent (At Shop Counter)'
          : pickupTiming === 'IN_15_MINS'
          ? 'Collect in 15-30 Mins'
          : 'Collect Later Today';

      const combinedCustomerNotes = [
        `[Pickup: ${timingLabel}]`,
        customerNotes.trim(),
        appliedCoupon ? `[Coupon: ${appliedCoupon}]` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const effectivePaymentMethod: 'RAZORPAY' | 'CASH_ON_COLLECTION' =
        !vendor.allowOnlinePayment || paymentMethod === 'CASH_ON_COLLECTION'
          ? 'CASH_ON_COLLECTION'
          : 'RAZORPAY';

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorSlug,
          customerName: customerName.trim() || 'Guest Customer',
          customerPhone: customerPhone.trim() || undefined,
          customerNotes: combinedCustomerNotes,
          paymentMethod: effectivePaymentMethod,
          items: documents.map((d) => {
            const pageRangeStr = getFormattedPageRange(d);
            const nUpTag = d.pagesPerSheet > 1 ? ` [${d.pagesPerSheet}-UP]` : '';
            const orientationTag = d.orientation !== 'AUTO' ? ` [${d.orientation}]` : '';

            return {
              documentId: d.id,
              paperSize: d.paperSize,
              colorMode: d.colorMode,
              duplexMode: d.isDuplex ? 'DOUBLE_SIDED_LONG_EDGE' : 'SINGLE_SIDED',
              copies: d.copies,
              pageRange: `${pageRangeStr}${nUpTag}${orientationTag}`,
            };
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      // Clear draft since order is placed
      clearDraftFromIDB(vendorSlug);

      // If counter cash order, redirect directly to live order ticket
      if (effectivePaymentMethod === 'CASH_ON_COLLECTION') {
        router.push(`/track/${data.order.trackingToken}`);
        return;
      }

      // Online payment (Razorpay) -> Launch payment gateway directly!
      try {
        const initRes = await fetch('/api/payments/razorpay/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackingToken: data.order.trackingToken }),
        });

        const paymentInit = await initRes.json();
        if (!initRes.ok) throw new Error(paymentInit.error || 'Failed to initialize payment gateway');

        const loadRzpScript = (): Promise<boolean> => {
          return new Promise((resolve) => {
            if ((window as any).Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const scriptLoaded = await loadRzpScript();
        if (!scriptLoaded || paymentInit.isMock) {
          // If script blocked or mock sandbox mode, route to pay page
          router.push(`/pay/${data.order.trackingToken}`);
          return;
        }

        const options = {
          key: paymentInit.razorpayKeyId,
          amount: paymentInit.amountMinor,
          currency: paymentInit.currency || 'INR',
          name: paymentInit.vendorName || (vendor ? vendor.name : 'Print2Me Station'),
          description: `Print Order #${paymentInit.orderNumber}`,
          order_id: paymentInit.razorpayOrderId,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch('/api/payments/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  trackingToken: data.order.trackingToken,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || 'Payment verification failed');
              router.push(`/track/${data.order.trackingToken}`);
            } catch (vErr: any) {
              alert(vErr.message || 'Payment signature verification failed.');
              router.push(`/pay/${data.order.trackingToken}`);
            }
          },
          modal: {
            ondismiss: function () {
              setIsPlacingOrder(false);
            },
          },
          prefill: {
            name: customerName.trim() || 'Print Customer',
            email: 'orders@print2me.in',
            contact: customerPhone.trim() || vendor?.contactPhone || '+919999999999',
            method: 'upi',
          },
          readonly: {
            contact: true,
            email: true,
            name: true,
          },
          method: {
            netbanking: false,
            card: false,
            wallet: false,
            upi: true,
            paylater: false,
            emi: false,
          },
          config: {
            display: {
              hide: [
                { method: 'card' },
                { method: 'netbanking' },
                { method: 'wallet' },
                { method: 'emi' },
                { method: 'paylater' },
              ],
              preferences: {
                show_default_blocks: true,
              },
            },
          },
          theme: {
            color: '#0e1a3a',
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (failureRes: any) {
          console.error('Payment failed', failureRes);
          setIsPlacingOrder(false);
          const failureMsg = failureRes?.error?.description || 'Payment was cancelled or could not be completed.';
          alert(failureMsg);
        });
        rzp.open();
        setIsPlacingOrder(false);
      } catch (payErr: any) {
        console.warn('Direct Razorpay launch fallback:', payErr);
        router.push(`/pay/${data.order.trackingToken}`);
      }
    } catch (err: any) {
      alert(err.message || 'Error creating order');
      setIsPlacingOrder(false);
    }
  };

  if (loadingVendor) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-24 bg-saffron-tint flex items-center justify-center text-saffron shadow-sm">
          <RefreshCw className="w-8 h-8 motion-safe:animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="font-sora font-bold text-ink text-lg">Connecting to Print Station</h2>
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
        <h2 className="text-2xl font-sora font-bold text-ink mb-2">Print Station Offline</h2>
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

  const { totalPaise, basePrintPaise, gatewayFeePaise, discountPaise, totalSheets, totalSides, sheetsSaved, topUp } = calculateBreakdown();
  const totalRupees = (totalPaise / 100).toFixed(2);
  const activeSizes = Array.from(new Set(vendor.pricingConfig.map((p) => p.paperSize)));

  return (
    <div className="min-h-screen bg-paper pb-44 text-ink antialiased selection:bg-saffron selection:text-white [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-saffron/60 [&_button:focus-visible]:ring-offset-2">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleCameraCapture}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed top-18 inset-x-0 mx-auto w-max max-w-sm z-50 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-reduce:animate-none duration-300">
          <div className="bg-ink text-white px-4 py-2.5 rounded-pill shadow-xl text-xs font-bold flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 1. HEADER */}
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-xl border-b border-hairline/60">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-saffron text-white font-sora font-bold text-xl flex items-center justify-center">
              {vendor.name.charAt(0)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-surface rounded-full" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-sora font-bold text-ink text-lg leading-tight truncate">{vendor.name}</h1>
            <p className="text-sm text-ink-soft truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-saffron shrink-0" />
              <span className="truncate">{vendor.address}</span>
            </p>
          </div>
          <button
            onClick={() => setShowQrModal(true)}
            className="w-11 h-11 rounded-2xl bg-paper border border-hairline text-ink flex items-center justify-center active:scale-95 transition-transform"
            aria-label="View counter QR"
          >
            <QrCode className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. PROGRESS */}
      <div className="px-4 pt-5 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo variant="horizontal" height={22} />
          </Link>
          <span className="text-xs font-semibold text-ink-soft">Step {step === 'UPLOAD' ? 1 : 2} of 2</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setStep('UPLOAD')} className="text-left">
            <div className="h-1.5 rounded-pill bg-saffron" />
            <span className={`mt-2 block text-sm font-bold ${step === 'UPLOAD' ? 'text-ink' : 'text-ink-soft'}`}>
              Upload{documents.length > 0 ? ` (${documents.length})` : ''}
            </span>
          </button>
          <button
            type="button"
            disabled={documents.length === 0}
            onClick={() => documents.length > 0 && setStep('PAYMENT')}
            className="text-left disabled:cursor-not-allowed"
          >
            <div className={`h-1.5 rounded-pill ${step === 'PAYMENT' ? 'bg-saffron' : 'bg-hairline'}`} />
            <span className={`mt-2 block text-sm font-bold ${step === 'PAYMENT' ? 'text-ink' : 'text-ink-soft'}`}>
              Review &amp; pay
            </span>
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="px-4 pt-4 max-w-xl mx-auto space-y-4">
        {step === 'UPLOAD' ? (
          <>
            {/* UPLOAD HERO */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`rounded-3xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
                isDragging ? 'border-saffron bg-saffron-tint' : 'border-saffron/40 bg-surface hover:border-saffron'
              }`}
            >
              {isUploading ? (
                <div className="space-y-4">
                  <p className="font-sora font-bold text-ink text-lg">Uploading {uploadProgress}%</p>
                  <div className="max-w-xs mx-auto bg-paper rounded-pill h-2.5 overflow-hidden border border-hairline">
                    <div className="bg-saffron h-full rounded-pill transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-sm text-ink-soft truncate max-w-xs mx-auto">{uploadFileName}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-saffron-tint text-saffron flex items-center justify-center">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h2 className="font-sora font-bold text-ink text-xl tracking-tight">
                    {documents.length > 0 ? 'Add another file' : 'Upload your files'}
                  </h2>
                  <p className="text-sm text-ink-soft">PDF, JPG or PNG, up to 50MB each</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className="min-h-[56px] rounded-2xl bg-ink text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <FileText className="w-5 h-5" />
                <span>Browse files</span>
              </button>
              <button
                type="button"
                onClick={() => !isUploading && cameraInputRef.current?.click()}
                className="min-h-[56px] rounded-2xl bg-saffron-tint border border-saffron/40 text-ink text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Camera className="w-5 h-5 text-saffron" />
                <span>Scan with camera</span>
              </button>
            </div>

            {/* ERROR BANNER */}
            {uploadError && (
              <div className="p-3.5 rounded-20 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Notice:</span> {uploadError}
                </div>
                <button onClick={() => setUploadError('')} className="text-rose-600 hover:text-rose-800">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TRUST */}
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs font-semibold text-ink-soft">
              <li className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-saffron" />Encrypted upload</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />Deleted after printing</li>
              <li className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-blue-600" />UPI or cash</li>
            </ul>

            {/* RICH EMPTY STATE: LIVE RATE CARD & STEP-BY-STEP KIOSK GUIDE */}
            {documents.length === 0 && vendor && (
              <div className="space-y-4 pt-1 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none duration-300">
                {/* 1. VENDOR PRINTING RATE CARD */}
                <div className="bg-surface rounded-3xl border border-hairline/80 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-10 bg-saffron-tint text-saffron flex items-center justify-center">
                        <Tag className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-sora font-bold text-xs text-ink">
                        Printing rates
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      Live Prices
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* B&W Single */}
                    <div className="p-3 rounded-16 bg-paper border border-hairline flex flex-col justify-between">
                      <div className="text-xs font-bold text-ink">A4 B&amp;W Single</div>
                      <div className="text-[11px] text-ink-soft">Standard 1-sided</div>
                      <div className="mt-2 text-base font-bold font-sora text-ink">
                        ₹{(((vendor.pricingConfig.find((t) => t.colorMode === 'BLACK_AND_WHITE' && !t.isDuplex)?.pricePerSideMinor || 200)) / 100).toFixed(2)}
                        <span className="text-[11px] font-normal text-ink-soft">/page</span>
                      </div>
                    </div>

                    {/* B&W Duplex */}
                    <div className="p-3 rounded-16 bg-paper border border-hairline flex flex-col justify-between">
                      <div className="text-xs font-bold text-ink flex items-center gap-1">
                        <span>A4 B&amp;W Both Sides</span>
                        <Leaf className="w-3 h-3 text-emerald-600" />
                      </div>
                      <div className="text-[11px] text-ink-soft">Back-to-back eco</div>
                      <div className="mt-2 text-base font-bold font-sora text-emerald-700">
                        ₹{(((vendor.pricingConfig.find((t) => t.colorMode === 'BLACK_AND_WHITE' && t.isDuplex)?.pricePerSideMinor || 175)) / 100).toFixed(2)}
                        <span className="text-[11px] font-normal text-ink-soft">/side</span>
                      </div>
                    </div>

                    {/* Color Single */}
                    <div className="p-3 rounded-16 bg-paper border border-hairline flex flex-col justify-between">
                      <div className="text-xs font-bold text-ink">A4 Color Single</div>
                      <div className="text-[11px] text-ink-soft">Vibrant graphics</div>
                      <div className="mt-2 text-base font-bold font-sora text-ink">
                        ₹{(((vendor.pricingConfig.find((t) => t.colorMode === 'COLOR' && !t.isDuplex)?.pricePerSideMinor || 1000)) / 100).toFixed(2)}
                        <span className="text-[11px] font-normal text-ink-soft">/page</span>
                      </div>
                    </div>

                    {/* Color Duplex */}
                    <div className="p-3 rounded-16 bg-paper border border-hairline flex flex-col justify-between">
                      <div className="text-xs font-bold text-ink flex items-center gap-1">
                        <span>A4 Color Both Sides</span>
                        <Leaf className="w-3 h-3 text-emerald-600" />
                      </div>
                      <div className="text-[11px] text-ink-soft">Full color back-to-back</div>
                      <div className="mt-2 text-base font-bold font-sora text-emerald-700">
                        ₹{(((vendor.pricingConfig.find((t) => t.colorMode === 'COLOR' && t.isDuplex)?.pricePerSideMinor || 900)) / 100).toFixed(2)}
                        <span className="text-[11px] font-normal text-ink-soft">/side</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. HOW IT WORKS */}
                <ol className="grid grid-cols-3 gap-2 text-center">
                  {[['Upload', 'Add a PDF or scan a page'], ['Choose', 'Colour, sides and copies'], ['Collect', 'Pay online or at the desk']].map(([t, d], i) => (
                    <li key={t} className="px-1 py-2">
                      <div className="mx-auto w-8 h-8 rounded-full bg-ink text-white text-sm font-bold flex items-center justify-center">{i + 1}</div>
                      <div className="mt-2 text-sm font-bold text-ink">{t}</div>
                      <p className="text-xs text-ink-soft mt-0.5 leading-snug">{d}</p>
                    </li>
                  ))}
                </ol>

                {/* 3. COUNTER HOURS & LOCATION */}
                <div className="p-3.5 rounded-20 bg-paper border border-hairline flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-saffron shrink-0" />
                    <div className="truncate">
                      <div className="font-bold text-ink truncate">{vendor.operatingHours || 'Counter Open Today'}</div>
                      <div className="text-[11px] text-ink-soft truncate">{vendor.address}</div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="text-[11px] font-bold text-ink bg-surface px-2 py-1 rounded-full border border-hairline">
                      {vendor.allowCashOnDesk ? 'Cash & UPI OK' : 'UPI Only'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* DOCUMENT QUEUE CARDS */}
            {documents.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-sora font-bold text-ink text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-saffron" />
                    <span>Selected Documents ({documents.length})</span>
                  </h3>
                  <div className="flex items-center gap-3">
                    {documents.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm('Clear all uploaded documents?')) {
                            documents.forEach((d) => {
                              if (d.blobUrl) {
                                URL.revokeObjectURL(d.blobUrl);
                                blobUrlsRef.current.delete(d.blobUrl);
                              }
                            });
                            setDocuments([]);
                            setActiveDocIndex(0);
                            clearDraftFromIDB(vendorSlug);
                          }
                        }}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-saffron hover:text-amber-600 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add more</span>
                    </button>
                  </div>
                </div>

                {documents.map((doc, idx) => {
                  const isActive = activeDocIndex === idx;
                  const isAdvancedOpen = !!expandedDocAdvanced[doc.id];
                  const hasAdvancedConfigured =
                    doc.pageRangeMode !== 'ALL' || doc.pagesPerSheet > 1 || doc.orientation !== 'AUTO';

                  const tier = vendor.pricingConfig.find(
                    (t) => t.paperSize === doc.paperSize && t.colorMode === doc.colorMode && t.isDuplex === doc.isDuplex
                  );
                  const pricePerSide = tier ? tier.pricePerSideMinor : doc.colorMode === 'COLOR' ? 1000 : 200;

                  const effectivePages = getEffectiveDocPages(doc);
                  const nUp = doc.pagesPerSheet || 1;
                  const impressionFaces = Math.ceil(effectivePages / nUp);
                  const sides = impressionFaces * doc.copies;
                  const docCostRupees = ((sides * pricePerSide) / 100).toFixed(2);

                  return (
                    <div
                      key={doc.id}
                      className={`bg-surface rounded-3xl border transition-colors overflow-hidden shadow-sm ${
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
                        <div className="w-12 h-12 rounded-16 bg-paper border border-hairline flex items-center justify-center shrink-0">
                          {doc.mimeType === 'application/pdf' ? (
                            <FileText className="w-6 h-6 text-danger" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-saffron" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-ink text-[15px] truncate flex items-center gap-2">
                            <span className="truncate">{doc.originalName}</span>
                          </div>
                          <div className="text-xs text-ink-soft flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-semibold text-ink">
                              <span className="tabular-nums">{effectivePages}</span> of <span className="tabular-nums">{doc.pageCount}</span>p
                            </span>
                            <span aria-hidden="true" className="text-hairline">/</span>
                            <span>{doc.copies} {doc.copies === 1 ? 'copy' : 'copies'}</span>
                            <span aria-hidden="true" className="text-hairline">/</span>
                            <span className="font-bold text-saffron">₹{docCostRupees}</span>
                          </div>
                        </div>

                        {/* Top action controls: Preview, Reorder, Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Preview button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewDoc(doc);
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-ink hover:text-saffron hover:bg-saffron-tint transition-colors"
                            title="Preview document pages"
                            aria-label="Preview document"
                          >
                            <Eye className="w-5 h-5" />
                          </button>

                          {/* Reorder Up/Down */}
                          {documents.length > 1 && (
                            <div className="flex flex-col">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveDoc(idx, 'UP');
                                }}
                                className="w-8 h-5 text-ink-soft hover:text-ink disabled:opacity-20 flex items-center justify-center"
                                title="Move up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === documents.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveDoc(idx, 'DOWN');
                                }}
                                className="w-8 h-5 text-ink-soft hover:text-ink disabled:opacity-20 flex items-center justify-center"
                                title="Move down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Delete Document */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (doc.blobUrl) {
                                URL.revokeObjectURL(doc.blobUrl);
                                blobUrlsRef.current.delete(doc.blobUrl);
                              }
                              setDocuments((docs) => docs.filter((_, i) => i !== idx));
                              if (activeDocIndex >= documents.length - 1) {
                                setActiveDocIndex(Math.max(0, documents.length - 2));
                              }
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-soft hover:text-danger hover:bg-rose-50 transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* MAIN CONFIGURATION SECTION */}
                      <div className="bg-surface p-4 border-t border-hairline/60 space-y-4">
                        {/* 1. Color vs B&W (Visual Toggle) */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold  text-ink-soft flex items-center justify-between">
                            <span>Color Mode</span>
                            <span className="text-[11px] text-ink-soft font-normal">
                              {doc.colorMode === 'COLOR' ? '₹10.00 / side' : '₹2.00 / side'}
                            </span>
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => updateDocConfig(idx, { colorMode: 'BLACK_AND_WHITE' })}
                              className={`p-3 rounded-16 border-2 flex items-center gap-3 transition-colors ${
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
                                <div className="text-[11px] text-ink-soft">Economical Xerox</div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateDocConfig(idx, { colorMode: 'COLOR' })}
                              className={`p-3 rounded-16 border-2 flex items-center gap-3 transition-colors ${
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
                                <div className="text-[11px] text-saffron font-semibold">Crisp Graphics</div>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* 2. Sides (Single vs Double Duplex) */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold  text-ink-soft flex items-center justify-between">
                            <span>Sides</span>
                            <span className="text-[11px] text-emerald-600 font-semibold">
                              {doc.isDuplex ? 'Saves paper & 20% discount' : 'Standard 1-sided'}
                            </span>
                          </label>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => updateDocConfig(idx, { isDuplex: false })}
                              className={`min-h-[48px] p-3 rounded-16 border-2 flex items-center justify-center gap-2 text-sm font-bold transition-colors ${
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
                              className={`min-h-[48px] p-3 rounded-16 border-2 flex items-center justify-center gap-2 text-sm font-bold transition-colors ${
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

                        {/* 3. Paper Size & Copies in compact row */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold  text-ink-soft">
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
                                    className={`flex-1 min-h-[44px] py-2 rounded-14 text-sm font-bold border transition-colors ${
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

                          <div className="space-y-1.5">
                            <label className="text-xs font-bold  text-ink-soft flex justify-between">
                              <span>Copies</span>
                              <span className="text-ink font-bold"><span className="tabular-nums">{doc.copies}</span> {doc.copies === 1 ? 'set' : 'sets'}</span>
                            </label>

                            <div className="flex items-center justify-between bg-surface border border-hairline rounded-14 p-1 h-[48px] shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateDocConfig(idx, { copies: Math.max(1, doc.copies - 1) })}
                                disabled={doc.copies <= 1}
                                className="w-11 h-10 rounded-12 bg-paper hover:bg-hairline/60 active:scale-95 disabled:opacity-40 flex items-center justify-center font-bold text-ink text-sm transition-colors"
                              >
                                -
                              </button>
                              <span className="font-sora font-bold text-sm text-ink tabular-nums">
                                {doc.copies}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateDocConfig(idx, { copies: Math.min(50, doc.copies + 1) })}
                                disabled={doc.copies >= 50}
                                className="w-11 h-10 rounded-12 bg-paper hover:bg-hairline/60 active:scale-95 disabled:opacity-40 flex items-center justify-center font-bold text-ink text-sm transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* -------------------------------------------------- */}
                        {/* 4. ADVANCED OPTIONS ACCORDION (HIDDEN BY DEFAULT)  */}
                        {/* -------------------------------------------------- */}
                        <div className="pt-1 border-t border-hairline/60">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDocAdvanced((prev) => ({
                                ...prev,
                                [doc.id]: !prev[doc.id],
                              }))
                            }
                            className={`w-full py-2.5 px-3.5 rounded-16 border flex items-center justify-between text-xs font-bold transition-colors ${
                              isAdvancedOpen
                                ? 'bg-ink text-white border-ink shadow-xs'
                                : 'bg-surface hover:bg-paper border-hairline text-ink-soft hover:text-ink'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <SlidersHorizontal className={`w-3.5 h-3.5 ${isAdvancedOpen ? 'text-saffron' : 'text-ink-soft'}`} />
                              <span>Advanced Options</span>
                              {hasAdvancedConfigured && (
                                <span className={`text-[11px] px-2 py-0.5 rounded-pill font-bold ${
                                  isAdvancedOpen ? 'bg-saffron text-white' : 'bg-saffron-tint text-saffron'
                                }`}>
                                  Customized
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs font-normal">
                              <span>{isAdvancedOpen ? 'Hide' : 'Page range, N-up & orientation'}</span>
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isAdvancedOpen ? 'rotate-180 text-white' : 'text-ink-soft'
                                }`}
                              />
                            </div>
                          </button>

                          {/* EXPANDED ADVANCED CONTENT */}
                          {isAdvancedOpen && (
                            <div className="mt-3 p-3.5 bg-paper rounded-20 border border-hairline/80 space-y-3.5 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none duration-200">
                              {/* A. Custom Page Range Selection */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-bold  text-ink-soft">
                                    Pages to Print
                                  </label>
                                  <span className="text-xs text-saffron font-bold">
                                    <span className="tabular-nums">{effectivePages}</span> of <span className="tabular-nums">{doc.pageCount}</span> pages selected
                                  </span>
                                </div>

                                <div className="grid grid-cols-4 gap-1.5 bg-surface p-1 rounded-14 border border-hairline">
                                  {(['ALL', 'CUSTOM', 'ODD', 'EVEN'] as const).map((mode) => (
                                    <button
                                      key={mode}
                                      type="button"
                                      onClick={() => updateDocConfig(idx, { pageRangeMode: mode })}
                                      className={`py-1.5 rounded-10 text-xs font-bold transition-colors ${
                                        doc.pageRangeMode === mode
                                          ? 'bg-ink text-white shadow-xs'
                                          : 'text-ink-soft hover:text-ink'
                                      }`}
                                    >
                                      {mode === 'ALL'
                                        ? 'All'
                                        : mode === 'CUSTOM'
                                        ? 'Custom'
                                        : mode === 'ODD'
                                        ? 'Odd'
                                        : 'Even'}
                                    </button>
                                  ))}
                                </div>

                                {doc.pageRangeMode === 'CUSTOM' && (
                                  <div className="space-y-1 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none pt-1">
                                    <input
                                      type="text"
                                      value={doc.customPageSelection || ''}
                                      onChange={(e) => updateDocConfig(idx, { customPageSelection: e.target.value })}
                                      placeholder="e.g. 1-4, 7, 9-12"
                                      className="w-full bg-surface border border-hairline rounded-12 px-3 py-2 text-xs tabular-nums text-ink focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink"
                                    />
                                    <p className="text-[11px] text-ink-soft">
                                      Enter comma-separated page numbers or ranges (e.g. 1-3, 5, 8).
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* B. Pages Per Sheet (N-Up Printing) & Orientation */}
                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold  text-ink-soft flex items-center justify-between">
                                    <span>Pages Per Sheet</span>
                                    {doc.pagesPerSheet > 1 && (
                                      <span className="text-[11px] text-emerald-600 font-bold">
                                        {doc.pagesPerSheet === 2 ? '50% cut' : '75% cut'}
                                      </span>
                                    )}
                                  </label>
                                  <div className="flex gap-1.5 bg-surface p-1 rounded-14 border border-hairline">
                                    {([1, 2, 4] as const).map((n) => (
                                      <button
                                        key={n}
                                        type="button"
                                        onClick={() => updateDocConfig(idx, { pagesPerSheet: n })}
                                        className={`flex-1 py-1.5 rounded-10 text-xs font-bold transition-colors ${
                                          doc.pagesPerSheet === n
                                            ? 'bg-ink text-white shadow-xs'
                                            : 'text-ink-soft hover:text-ink'
                                        }`}
                                      >
                                        {n} {n === 1 ? 'Page' : `${n}-Up`}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold  text-ink-soft">
                                    Orientation
                                  </label>
                                  <div className="flex gap-1.5 bg-surface p-1 rounded-14 border border-hairline">
                                    {(['AUTO', 'PORTRAIT', 'LANDSCAPE'] as const).map((ori) => (
                                      <button
                                        key={ori}
                                        type="button"
                                        onClick={() => updateDocConfig(idx, { orientation: ori })}
                                        className={`flex-1 py-1.5 rounded-10 text-[11px] font-bold transition-colors ${
                                          doc.orientation === ori
                                            ? 'bg-ink text-white shadow-xs'
                                            : 'text-ink-soft hover:text-ink'
                                        }`}
                                      >
                                        {ori === 'AUTO' ? 'Auto' : ori === 'PORTRAIT' ? 'Port' : 'Land'}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* C. Apply to All Documents */}
                              {documents.length > 1 && (
                                <div className="pt-2 border-t border-hairline/80 flex items-center justify-between">
                                  <span className="text-xs text-ink-soft">
                                    Copy these settings to other files?
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => applyToAllDocs(idx)}
                                    className="px-3 py-1.5 rounded-pill bg-surface border border-hairline text-ink text-xs font-bold hover:bg-hairline transition-colors flex items-center gap-1.5"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-saffron" />
                                    <span>Apply to all files</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
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
          <div className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none duration-300">
            {/* 1. ORDER SUMMARY */}
            <section className="bg-surface rounded-3xl border border-hairline p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-sora font-bold text-lg text-ink">Your order</h2>
                <button type="button" onClick={() => setStep('UPLOAD')} className="text-sm font-bold text-saffron px-2 py-1 -mr-2 rounded-lg">
                  Edit
                </button>
              </div>

              <ul className="divide-y divide-hairline/70">
                {documents.map((doc) => {
                  const tier = vendor.pricingConfig.find(
                    (t) => t.paperSize === doc.paperSize && t.colorMode === doc.colorMode && t.isDuplex === doc.isDuplex
                  );
                  const rate = tier ? tier.pricePerSideMinor : doc.colorMode === 'COLOR' ? 1000 : 200;
                  const pages = getEffectiveDocPages(doc);
                  const sides = Math.ceil(pages / (doc.pagesPerSheet || 1)) * doc.copies;
                  return (
                    <li key={doc.id} className="py-3 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-paper border border-hairline flex items-center justify-center shrink-0">
                        {doc.mimeType === 'application/pdf' ? <FileText className="w-5 h-5 text-danger" /> : <ImageIcon className="w-5 h-5 text-saffron" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink truncate">{doc.originalName}</p>
                        <p className="text-xs text-ink-soft mt-0.5">
                          {pages} {pages === 1 ? 'page' : 'pages'}, {doc.copies} {doc.copies === 1 ? 'copy' : 'copies'}, {doc.colorMode === 'COLOR' ? 'colour' : 'B&W'}, {doc.isDuplex ? 'both sides' : 'one side'}, {doc.paperSize}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-ink tabular-nums">₹{((sides * rate) / 100).toFixed(2)}</span>
                    </li>
                  );
                })}
              </ul>

              <dl className="mt-3 pt-3 border-t border-dashed border-hairline space-y-1.5 text-sm">
                {discountPaise > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <dt>Promo ({appliedCoupon})</dt>
                    <dd className="tabular-nums">-₹{(discountPaise / 100).toFixed(2)}</dd>
                  </div>
                )}
                {topUp > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <dt>Minimum order top-up</dt>
                    <dd className="tabular-nums">+₹{(topUp / 100).toFixed(2)}</dd>
                  </div>
                )}
                {gatewayFeePaise > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <dt>Online payment fee</dt>
                    <dd className="tabular-nums">+₹{(gatewayFeePaise / 100).toFixed(2)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between pt-1">
                  <dt className="font-bold text-ink">Total</dt>
                  <dd className="font-sora font-bold text-2xl text-ink tabular-nums">
                    <span className="text-saffron">₹</span>{totalRupees}
                  </dd>
                </div>
                <p className="text-xs text-ink-soft">{totalSheets} sheets, {totalSides} sides printed</p>
              </dl>

              {sheetsSaved > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-sm flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>You&apos;re saving <strong>{sheetsSaved} sheets</strong> of paper.</span>
                </div>
              )}
            </section>

            {/* 2. PICKUP & DETAILS */}
            <section className="bg-surface rounded-3xl border border-hairline p-5 space-y-4">
              <div className="space-y-2">
                <h3 className="font-sora font-bold text-base text-ink">When will you collect?</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'IMMEDIATE', label: 'Now', sub: 'At the counter' },
                    { key: 'IN_15_MINS', label: '15-30 min', sub: 'Skip the line' },
                    { key: 'LATER_TODAY', label: 'Later today', sub: 'Flexible' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setPickupTiming(t.key as any)}
                      aria-pressed={pickupTiming === t.key}
                      className={`min-h-[56px] px-2 py-2 rounded-2xl border-2 text-center transition-colors ${
                        pickupTiming === t.key ? 'border-ink bg-ink text-white' : 'border-hairline bg-paper text-ink hover:border-ink/30'
                      }`}
                    >
                      <div className="text-sm font-bold leading-tight">{t.label}</div>
                      <div className={`text-xs mt-0.5 ${pickupTiming === t.key ? 'text-white/75' : 'text-ink-soft'}`}>{t.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* COLLAPSIBLE YOUR DETAILS */}
              <details
                open={Boolean(customerName || customerPhone || customerNotes)}
                className="group pt-3.5 border-t border-hairline/80"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none select-none text-ink hover:text-ink/80 transition-colors">
                  <span className="flex items-center gap-2 font-sora font-bold text-sm text-ink">
                    <span>Your details</span>
                    <span className="text-xs font-normal text-ink-soft">(optional)</span>
                    {(customerName || customerPhone) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-emerald-50 text-emerald-700">
                        Added
                      </span>
                    )}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-paper border border-hairline flex items-center justify-center text-ink-soft group-hover:text-ink transition-colors">
                    <ChevronDown className="w-4 h-4 transition-transform duration-200 group-open:rotate-180" />
                  </div>
                </summary>

                <div className="pt-3.5 space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="cust-name" className="text-xs font-bold text-ink-soft">Name</label>
                    <input
                      id="cust-name"
                      type="text"
                      autoComplete="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Rahul S."
                      className="w-full h-11 bg-paper border border-hairline rounded-xl px-3.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/15"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="cust-phone" className="text-xs font-bold text-ink-soft">Mobile number</label>
                    <input
                      id="cust-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full h-11 bg-paper border border-hairline rounded-xl px-3.5 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/15"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="cust-notes" className="text-xs font-bold text-ink-soft">
                      Note for shopkeeper <span className="font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="cust-notes"
                      rows={2}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Staple top-left, need it urgently"
                      className="w-full bg-paper border border-hairline rounded-xl p-3 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/15 resize-none"
                    />
                  </div>
                </div>
              </details>
            </section>

            {/* 3. PAYMENT METHOD (MINIMALISTIC & ACCESSIBLE) */}
            <section className="bg-surface rounded-3xl border border-hairline p-5 space-y-3">
              <h3 className="font-sora font-bold text-base text-ink">How do you want to pay?</h3>

              <div className="space-y-2.5">
                {vendor.allowOnlinePayment && (
                  <label
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99] select-none ${
                      paymentMethod === 'RAZORPAY'
                        ? 'border-ink bg-paper/60 shadow-xs'
                        : 'border-hairline bg-paper/20 hover:border-hairline/80 hover:bg-paper/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="sr-only"
                      checked={paymentMethod === 'RAZORPAY'}
                      onChange={() => setPaymentMethod('RAZORPAY')}
                    />
                    <div className="w-10 h-10 rounded-xl bg-surface border border-hairline flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5 text-ink" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-sm">Pay online</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-saffron-tint text-saffron">
                          Instant
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft truncate mt-0.5">
                        UPI, Cards, NetBanking
                        {gatewayFeePaise > 0 && <span className="tabular-nums"> · +₹{(gatewayFeePaise / 100).toFixed(2)} fee</span>}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        paymentMethod === 'RAZORPAY' ? 'border-ink bg-ink' : 'border-hairline bg-surface'
                      }`}
                    >
                      {paymentMethod === 'RAZORPAY' && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </label>
                )}

                {vendor.allowCashOnDesk && (
                  <label
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99] select-none ${
                      paymentMethod === 'CASH_ON_COLLECTION' || !vendor.allowOnlinePayment
                        ? 'border-ink bg-paper/60 shadow-xs'
                        : 'border-hairline bg-paper/20 hover:border-hairline/80 hover:bg-paper/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      className="sr-only"
                      checked={paymentMethod === 'CASH_ON_COLLECTION' || !vendor.allowOnlinePayment}
                      onChange={() => setPaymentMethod('CASH_ON_COLLECTION')}
                    />
                    <div className="w-10 h-10 rounded-xl bg-surface border border-hairline flex items-center justify-center shrink-0">
                      <Banknote className="w-5 h-5 text-ink" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink text-sm">Pay at counter</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-emerald-50 text-emerald-700">
                          Zero fee
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft truncate mt-0.5">
                        Cash or shop QR on pickup
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        paymentMethod === 'CASH_ON_COLLECTION' || !vendor.allowOnlinePayment ? 'border-ink bg-ink' : 'border-hairline bg-surface'
                      }`}
                    >
                      {(paymentMethod === 'CASH_ON_COLLECTION' || !vendor.allowOnlinePayment) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </label>
                )}
              </div>

              {!vendor.allowOnlinePayment && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>This shop only accepts payment at the counter.</span>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Kiosk Trust & Privacy Protection Footer */}
        <div className="pt-8 pb-4 text-center space-y-2 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-paper border border-hairline text-ink-soft text-xs font-medium shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
            <span>Ephemeral Privacy: Files encrypted &amp; auto-purged within 30 days</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-ink-soft">
            <Link href="/privacy" target="_blank" className="hover:text-ink hover:underline transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">Privacy policy</Link>
            <Link href="/terms" target="_blank" className="hover:text-ink hover:underline transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">Terms of service</Link>
            <Link href="/refund" target="_blank" className="hover:text-ink hover:underline transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded">Refund policy</Link>
          </div>
        </div>
      </main>

      {/* 4. MODERN STICKY BOTTOM CHECKOUT TRAY */}
      {documents.length > 0 && (
        <aside aria-label="Order Checkout Bar" className="fixed bottom-0 inset-x-0 p-3 sm:p-4 z-40 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] pointer-events-none">
          <div className="max-w-xl mx-auto bg-surface/95 backdrop-blur-2xl border border-hairline/80 rounded-3xl shadow-ink-soft p-3.5 pointer-events-auto transition-colors">
            {expandedReceipt && (
              <div className="pb-3.5 mb-3 border-b border-dashed border-hairline motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-reduce:animate-none text-xs">
                <div className="flex items-center justify-between font-sora font-bold text-ink mb-2.5">
                  <span>Price breakdown</span>
                  <button
                    onClick={() => setExpandedReceipt(false)}
                    className="text-ink-soft hover:text-ink text-xs px-2 py-1.5 -mr-2 rounded-lg"
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

                    const effectivePages = getEffectiveDocPages(doc);
                    const nUp = doc.pagesPerSheet || 1;
                    const sides = Math.ceil(effectivePages / nUp) * doc.copies;
                    const docTotal = ((sides * rate) / 100).toFixed(2);

                    return (
                      <div key={i} className="flex justify-between text-ink-soft">
                        <span className="truncate pr-3 flex-1 font-medium">
                          {doc.originalName} ({effectivePages}p {doc.pagesPerSheet > 1 ? `[${doc.pagesPerSheet}-up]` : ''} × {doc.copies}c @ ₹{(rate / 100).toFixed(2)})
                        </span>
                        <span className="tabular-nums text-ink font-bold">₹{docTotal}</span>
                      </div>
                    );
                  })}

                  {discountPaise > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium pt-1">
                      <span>Promo Discount ({appliedCoupon})</span>
                      <span className="tabular-nums">-₹{(discountPaise / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {topUp > 0 && (
                    <div className="flex justify-between text-amber-700 pt-1 font-medium">
                      <span>Minimum store top-up charge</span>
                      <span className="tabular-nums">₹{(topUp / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {gatewayFeePaise > 0 && (
                    <div className="flex justify-between text-ink-soft pt-1.5 border-t border-hairline/60">
                      <div className="flex items-center gap-1.5">
                        <span>Online Gateway Fee</span>
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded tabular-nums font-medium">
                          2% + 18% GST
                        </span>
                      </div>
                      <span className="tabular-nums text-ink font-bold">+₹{(gatewayFeePaise / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setExpandedReceipt(!expandedReceipt)}
                className="flex items-center gap-2 text-left group min-w-0"
              >
                <div>
                  <div className="text-[11px] font-bold text-ink-soft  flex items-center gap-1">
                    <span>{documents.length} {documents.length === 1 ? 'file' : 'files'}</span>
                    <span>•</span>
                    <span>{totalSheets} {totalSheets === 1 ? 'sheet' : 'sheets'}</span>
                    <ChevronUp
                      className={`w-3.5 h-3.5 text-saffron transition-transform duration-200 ${
                        expandedReceipt ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <div className="font-sora font-bold text-ink text-2xl sm:text-3xl tabular-nums tracking-tight flex items-baseline gap-1">
                    <span className="text-saffron">₹</span>
                    <span>{totalRupees}</span>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-2">
                {step === 'PAYMENT' && (
                  <button
                    type="button"
                    onClick={() => setStep('UPLOAD')}
                    className="px-4 py-4 min-h-[52px] rounded-pill bg-paper border border-hairline text-ink text-sm font-bold hover:bg-hairline/40 transition-colors active:scale-95"
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
                  className="px-6 py-4 min-h-[52px] rounded-pill bg-ink hover:bg-ink/90 active:scale-95 text-white font-sora font-bold text-sm shadow-md shadow-ink/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isPlacingOrder ? (
                    <>
                      <RefreshCw className="w-4 h-4 motion-safe:animate-spin text-saffron" />
                      <span>{vendor?.allowOnlinePayment && paymentMethod === 'RAZORPAY' ? 'Launching Payment...' : 'Creating Order...'}</span>
                    </>
                  ) : step === 'UPLOAD' ? (
                    <>
                      <span>Review &amp; Pay</span>
                      <ArrowRight className="w-4 h-4 text-saffron" />
                    </>
                  ) : vendor?.allowOnlinePayment && paymentMethod === 'RAZORPAY' ? (
                    <>
                      <span>Pay Online &amp; Print</span>
                      <Lock className="w-4 h-4 text-emerald-400" />
                    </>
                  ) : (
                    <>
                      <span>Place Order &amp; Pay at Desk</span>
                      <Check className="w-4 h-4 text-emerald-400" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 5. INTERACTIVE DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* 6. CAMERA SCAN STUDIO MODAL */}
      {scannedPhotoFile && (
        <CameraScanStudioModal
          photoFile={scannedPhotoFile}
          onSave={async (processedFile) => {
            setScannedPhotoFile(null);
            await processUploadedFile(processedFile);
            showToast('Document enhanced & added to print queue!');
          }}
          onClose={() => setScannedPhotoFile(null)}
        />
      )}

      {/* 7. PASSWORD-PROTECTED PDF PROMPT MODAL */}
      {pendingPasswordFile && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none duration-200">
          <div className="bg-surface rounded-3xl border border-hairline p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-20 bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-sora font-bold text-ink text-base sm:text-lg">
                Password-Protected Document
              </h3>
              <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                <strong>{pendingPasswordFile.file.name}</strong> is encrypted. Automated print stations cannot print locked files directly.
              </p>
            </div>

            <div className="bg-paper p-3.5 rounded-16 border border-hairline/80 space-y-2 text-xs">
              <div className="font-bold text-ink flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-saffron" />
                <span>How to print this file:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-ink-soft leading-relaxed text-xs">
                <li>Open this PDF on your device and enter the password.</li>
                <li>Tap <strong>Share / Print</strong> and choose <strong>"Save as PDF"</strong>.</li>
                <li>Upload the new unlocked PDF here to print instantly!</li>
              </ol>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleUnlockPdfModalClose}
                className="w-full py-3 rounded-pill bg-ink text-white text-xs font-bold hover:bg-ink/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Got It, Choose Another File</span>
              </button>
            </div>
          </div>
        </div>
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