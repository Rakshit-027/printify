'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Printer, ArrowRight, ShieldCheck, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/primitives';
import { BrandLogo } from '@/components/BrandLogo';

export default function TrackLandingPage() {
  const router = useRouter();
  const [trackingInput, setTrackingInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = trackingInput.trim();
    if (!token) {
      setError('Please enter your 6-character tracking token or order reference');
      return;
    }
    setError('');
    router.push(`/track/${encodeURIComponent(token)}`);
  };

  return (
    <div className="min-h-screen bg-canvas py-12 md:py-20 px-6">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-saffron-tint text-saffron text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5" />
            Live Spooler Telemetry
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold font-sora text-ink tracking-tight">
            Track Your Print Order
          </h1>
          <p className="text-sm text-ink-soft max-w-md mx-auto">
            Check live queue position, spooler status, and counter pickup readiness using your tracking token.
          </p>
        </div>

        <div className="bg-surface p-8 md:p-10 rounded-[32px] border border-hairline shadow-ink-soft space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="track-input" className="text-xs font-bold uppercase tracking-wider text-ink font-sora">
                Enter Tracking Token / Reference
              </label>
              <div className="relative">
                <Search className="w-5 h-5 text-ink-soft absolute left-4 top-4" />
                <input
                  id="track-input"
                  type="text"
                  value={trackingInput}
                  onChange={(e) => {
                    setTrackingInput(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. 7k3x9a or P2M-0419"
                  className="w-full bg-paper border border-hairline rounded-[16px] pl-12 pr-5 py-4 font-mono font-bold text-ink text-lg placeholder:text-ink-soft/40 focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all uppercase"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-danger font-semibold">{error}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-14 text-base font-bold rounded-pill"
            >
              <span>Inspect Live Status</span>
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          <div className="border-t border-hairline pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-ink-soft">
            <div className="flex items-start gap-2.5">
              <Printer className="w-4 h-4 text-saffron flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-ink block">Where do I find my token?</span>
                It appears on your screen immediately after submitting documents at the shop counter.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-ink block">Encrypted Document Link</span>
                Your files remain strictly confidential and are purged automatically after printing.
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-ink-soft">
          Need to place a new print job?{' '}
          <Link href="/locations" className="text-saffron font-bold hover:underline">
            Find nearby Xerox stores
          </Link>
        </div>
      </div>
    </div>
  );
}
