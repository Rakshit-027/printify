import Link from 'next/link';
import { FileQuestion, Home, Printer, HelpCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/primitives';

export const metadata = {
  title: 'Page Not Found (404) | Print2Me',
  description: 'The requested page could not be found on Print2Me. Explore our document printing solutions or return to the homepage.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-6 py-20 bg-paper">
      <div className="max-w-xl w-full text-center space-y-8 animate-in fade-in duration-500">
        <div className="w-20 h-20 rounded-32 bg-saffron-tint text-saffron flex items-center justify-center mx-auto shadow-sm">
          <FileQuestion className="w-10 h-10" />
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-paper border border-hairline text-ink-soft text-xs font-mono">
            <span>HTTP 404 · Page Not Found</span>
          </div>
          <h1 className="font-sora text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Looks like this page took a wrong turn
          </h1>
          <p className="text-ink-soft text-base leading-relaxed max-w-md mx-auto">
            The page you are looking for might have been moved, removed, or is temporarily unavailable. Let&apos;s get you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full sm:w-auto h-12 px-6 gap-2">
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
          <Link href="/how-it-works" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto h-12 px-6 gap-2">
              <span>How It Works</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="pt-8 border-t border-hairline text-left">
          <h2 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-4 text-center sm:text-left">
            Popular destinations on Print2Me
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Link
              href="/document-printing"
              className="p-3.5 rounded-16 bg-surface border border-hairline hover:border-saffron/40 hover:shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-saffron" />
                <span className="font-medium text-ink group-hover:text-saffron transition-colors">
                  Online Document Printing
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-soft group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/campus-printing"
              className="p-3.5 rounded-16 bg-surface border border-hairline hover:border-saffron/40 hover:shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-ink group-hover:text-saffron transition-colors">
                  Campus &amp; College Printing
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-soft group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/partner"
              className="p-3.5 rounded-16 bg-surface border border-hairline hover:border-saffron/40 hover:shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-ink group-hover:text-saffron transition-colors">
                  Partner Your Print Shop
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-soft group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/faq"
              className="p-3.5 rounded-16 bg-surface border border-hairline hover:border-saffron/40 hover:shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-ink group-hover:text-saffron transition-colors">
                  Help &amp; FAQs
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-ink-soft group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
