'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, ArrowRight, Printer, CheckCircle2, Clock } from 'lucide-react';

interface OrderTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrderTrackModal({ isOpen, onClose }: OrderTrackModalProps) {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) {
      setError('Please enter a tracking token or order number');
      return;
    }

    setIsSearching(true);
    setError('');

    // If customer entered full URL or token
    const token = clean.includes('/track/') ? clean.split('/track/')[1] : clean;
    router.push(`/track/${token}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-surface rounded-[28px] border border-hairline shadow-2xl p-6 sm:p-8 space-y-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-ink-soft hover:text-ink p-2 rounded-full hover:bg-paper transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-20 bg-saffron-tint flex items-center justify-center text-saffron">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-sora font-extrabold text-ink">Track Your Print Order</h3>
            <p className="text-xs text-ink-soft">Enter your order ID or tracking token</p>
          </div>
        </div>

        <form onSubmit={handleTrack} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink">Order Tracking Code</label>
            <div className="relative">
              <Search className="w-4 h-4 text-ink-soft/70 absolute left-4 top-4" />
              <input
                type="text"
                autoFocus
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setError('');
                }}
                placeholder="e.g. ord-83921 or 64-char token"
                className="w-full bg-paper border border-hairline rounded-14 pl-11 pr-4 py-3.5 text-sm font-mono text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all"
              />
            </div>
            {error && <p className="text-xs text-danger font-medium pl-1">{error}</p>}
          </div>

          <div className="bg-paper p-3.5 rounded-14 border border-hairline/80 space-y-1.5 text-xs text-ink-soft">
            <div className="flex items-center gap-1.5 font-semibold text-ink text-[11px] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-saffron" />
              <span>Where to find your tracking code?</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Found on your upload confirmation screen or in the SMS / WhatsApp receipt sent after paying at the counter.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="w-full py-3.5 rounded-pill bg-ink hover:bg-ink/90 active:scale-95 text-white font-inter font-semibold text-sm transition-all shadow-ink-soft flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>View Live Print Status</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
