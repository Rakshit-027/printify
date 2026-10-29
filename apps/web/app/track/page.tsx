// hallmark:v1 theme=sticker shape=workbench density=balanced
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Printer, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/primitives';

export default function TrackLandingPage() {
  const router = useRouter();
  const [trackingInput, setTrackingInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = trackingInput.trim();
    if (!token) {
      setError('Please enter your tracking token or order reference');
      return;
    }
    setError('');
    router.push(`/track/${encodeURIComponent(token)}`);
  };

  return (
    <div className="min-h-screen bg-paper py-12 md:py-20 px-6 text-ink">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-4xl font-extrabold font-sora text-ink tracking-tight">
            Track your print order
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft max-w-md mx-auto">
            Check live queue position, spooler status, and counter pickup readiness.
          </p>
        </div>

        <div className="bg-surface p-6 sm:p-8 rounded-24 border border-hairline shadow-ink-soft space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="track-input" className="text-xs font-bold text-ink">
                Tracking token or order reference
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-ink-soft absolute left-3.5 top-3.5" />
                <input
                  id="track-input"
                  type="text"
                  value={trackingInput}
                  onChange={(e) => {
                    setTrackingInput(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. 7k3x9a or P2M-0419"
                  className="w-full bg-paper border border-hairline rounded-14 pl-10 pr-4 py-2.5 font-bold text-ink text-sm placeholder:text-ink-soft/40 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-colors"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-danger font-semibold">{error}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full h-11 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              <div className="flex items-center gap-1.5">
                <span>Inspect live status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Button>
          </form>

          <div className="border-t border-hairline pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-ink-soft">
            <div className="flex items-start gap-2">
              <Printer className="w-4 h-4 text-saffron shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-ink block">Where is my token?</span>
                It appears on your screen immediately after submitting documents at the shop counter.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-ink block">Confidential link</span>
                Your files remain strictly confidential and are purged automatically after printing.
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-ink-soft">
          Need to place a new print job?{' '}
          <Link
            href="/locations"
            className="text-saffron font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
          >
            Find nearby print stores
          </Link>
        </div>
      </div>
    </div>
  );
}
