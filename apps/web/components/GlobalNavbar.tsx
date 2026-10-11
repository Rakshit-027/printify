'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Printer,
  Search,
  Store,
  ShieldCheck,
  LogIn,
  LogOut,
  ChevronDown,
  Sparkles,
  QrCode,
  User,
  Plus,
} from 'lucide-react';
import { OrderTrackModal } from './OrderTrackModal';
import { BrandLogo } from '@/components/BrandLogo';

interface UserSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  vendor?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function GlobalNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isKioskUploadPage = pathname?.startsWith('/v/');
  const [session, setSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setSession(data.user);
          }
        }
      } catch (err) {
        console.error('Navbar auth check failed:', err);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setSession(null);
      setUserMenuOpen(false);
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // On walk-in upload kiosk pages (/v/[vendorSlug]), hide the global header so walk-in users don't see Sign In or Register Shop
  if (isKioskUploadPage) {
    return (
      <OrderTrackModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-hairline px-4 sm:px-6 py-3 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <BrandLogo variant="horizontal" height={34} className="group-hover:opacity-90 transition-opacity" />
              <span className="hidden xl:inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Live
              </span>
            </Link>

            {/* Quick Track Search Button */}
            <button
              onClick={() => setIsTrackModalOpen(true)}
              className="hidden xl:flex items-center gap-2.5 px-3.5 py-1.5 rounded-pill bg-paper border border-hairline text-ink-soft hover:text-ink hover:border-saffron/40 hover:bg-surface transition-all text-xs font-medium shadow-sm group"
            >
              <Search className="w-3.5 h-3.5 text-saffron group-hover:scale-110 transition-transform" />
              <span>Track Print Order...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-surface border border-hairline rounded text-ink-soft/70">
                ORD
              </kbd>
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex items-center gap-1.5 sm:gap-2.5 text-sm font-medium">
            
            {/* Public SEO Nav Links (Hidden on walk-in upload kiosk pages) */}
            {!isKioskUploadPage && (
              <>
                <Link
                  href="/how-it-works"
                  className="hidden md:flex items-center text-ink-soft hover:text-ink transition-colors px-2.5 py-1.5 rounded-14 hover:bg-paper text-xs font-semibold"
                >
                  How It Works
                </Link>

                <Link
                  href="/document-printing"
                  className="hidden lg:flex items-center text-ink-soft hover:text-ink transition-colors px-2.5 py-1.5 rounded-14 hover:bg-paper text-xs font-semibold"
                >
                  Document Printing
                </Link>

                <Link
                  href="/campus-printing"
                  className="hidden lg:flex items-center text-ink-soft hover:text-ink transition-colors px-2.5 py-1.5 rounded-14 hover:bg-paper text-xs font-semibold"
                >
                  Campus
                </Link>

                <Link
                  href="/partner"
                  className="hidden md:flex items-center text-ink-soft hover:text-ink transition-colors px-2.5 py-1.5 rounded-14 hover:bg-paper text-xs font-semibold"
                >
                  Partner
                </Link>
              </>
            )}

            {/* Mobile Track button */}
            <button
              onClick={() => setIsTrackModalOpen(true)}
              className="xl:hidden flex items-center justify-center w-9 h-9 rounded-full bg-paper border border-hairline text-ink-soft hover:text-ink transition-colors"
              aria-label="Track Order"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Demo Link */}
            <Link
              href="/v/speedy-express"
              className="hidden 2xl:flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors px-2.5 py-1.5 rounded-14 hover:bg-paper text-xs font-semibold"
            >
              <QrCode className="w-3.5 h-3.5 text-ink-soft" />
              <span>Demo Kiosk</span>
            </Link>

            {/* If Logged in */}
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-pill bg-paper border border-hairline text-ink hover:border-saffron/50 transition-all text-xs font-semibold shadow-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-saffron text-white flex items-center justify-center text-[11px] font-bold">
                    {session.fullName ? session.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {session.vendor?.name || session.fullName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-ink-soft" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 rounded-20 bg-surface border border-hairline shadow-ink-soft p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-hairline/80 mb-1">
                      <p className="text-xs font-bold text-ink truncate">{session.fullName}</p>
                      <p className="text-[10px] text-ink-soft truncate">{session.email}</p>
                      <span className="inline-block mt-1 text-[9px] font-mono px-2 py-0.5 rounded bg-saffron-tint text-saffron font-bold">
                        {session.role}
                      </span>
                    </div>

                    <Link
                      href="/vendor"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-14 text-xs text-ink hover:bg-paper transition-colors font-medium"
                    >
                      <Store className="w-4 h-4 text-saffron" />
                      <span>Vendor Dashboard</span>
                    </Link>

                    {(session.role === 'ADMIN' || session.role === 'SUPER_ADMIN') && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-14 text-xs text-ink hover:bg-paper transition-colors font-medium"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Admin Hub</span>
                      </Link>
                    )}

                    <div className="border-t border-hairline/80 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-14 text-xs text-danger hover:bg-danger/10 transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4 text-danger" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : isKioskUploadPage ? (
              /* Dedicated walk-in customer kiosk view: Keep header minimal & focused on printing */
              <div className="flex items-center gap-1.5 text-xs text-ink-soft bg-paper px-2.5 py-1 rounded-pill border border-hairline font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Express Kiosk</span>
              </div>
            ) : (
              /* If Logged Out on regular public pages */
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-ink hover:text-saffron transition-colors px-3 py-1.5 rounded-14 hover:bg-paper text-xs font-semibold"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>

                <Link
                  href="/register-vendor"
                  className="flex items-center gap-1.5 bg-ink hover:bg-ink/90 active:scale-95 text-white px-3.5 py-2 rounded-pill text-xs font-bold transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 text-saffron" />
                  <span>Register Shop</span>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Global Order Track Modal */}
      <OrderTrackModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />
    </>
  );
}
