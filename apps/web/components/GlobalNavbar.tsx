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
  CreditCard,
  Menu,
  X,
  HelpCircle,
  Mail,
  FileText,
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

// In-memory session cache to prevent repeated API hits across page navigation
let cachedUserSession: { user: UserSession | null; fetchedAt: number } | null = null;
const SESSION_CACHE_TTL = 60 * 1000; // 60 seconds

export function GlobalNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isKioskUploadPage = pathname?.startsWith('/v/');
  const [session, setSession] = useState<UserSession | null>(null);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isKioskUploadPage) return;

    if (cachedUserSession && Date.now() - cachedUserSession.fetchedAt < SESSION_CACHE_TTL) {
      setSession(cachedUserSession.user);
      return;
    }

    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          const user = data.authenticated && data.user ? data.user : null;
          cachedUserSession = { user, fetchedAt: Date.now() };
          if (isMounted) setSession(user);
        } else {
          cachedUserSession = { user: null, fetchedAt: Date.now() };
        }
      } catch (err) {
        console.error('Navbar auth check failed:', err);
      }
    }
    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [isKioskUploadPage]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      cachedUserSession = null;
      setSession(null);
      setUserMenuOpen(false);
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // On dashboard pages (/vendor, /admin), hide consumer navbar for full-screen SaaS layout
  if (pathname?.startsWith('/vendor') || pathname?.startsWith('/admin')) {
    return null;
  }

  // On walk-in upload kiosk pages (/v/[vendorSlug]), header is clean and minimal
  if (isKioskUploadPage) {
    return (
      <OrderTrackModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />
    );
  }

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'For Vendors', href: '/partner' },
    { label: 'Services', href: '/document-printing' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-hairline px-3 sm:px-6 py-2.5 sm:py-3 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0 min-w-0">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <BrandLogo variant="horizontal" height={27} className="sm:hidden shrink-0" />
              <BrandLogo variant="horizontal" height={34} className="hidden sm:inline-flex shrink-0 group-hover:opacity-90 transition-opacity" />
              <span className="hidden xl:inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                Live
              </span>
            </Link>

            {/* Quick Track Search Button (Desktop) */}
            <button
              onClick={() => setIsTrackModalOpen(true)}
              className="hidden xl:flex items-center gap-2.5 px-3.5 py-1.5 rounded-pill bg-paper border border-hairline text-ink-soft hover:text-ink hover:border-saffron/40 hover:bg-surface transition-all text-xs font-medium shadow-sm group shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-saffron group-hover:scale-110 transition-transform" />
              <span>Track Print Order...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-surface border border-hairline rounded text-ink-soft/70">
                ORD
              </kbd>
            </button>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="flex items-center gap-1 sm:gap-2.5 text-sm font-medium shrink-0">
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-14 text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-paper text-ink border border-hairline'
                        : 'text-ink-soft hover:text-ink hover:bg-paper'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Mobile Track button */}
            <button
              onClick={() => setIsTrackModalOpen(true)}
              className="xl:hidden flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-paper border border-hairline text-ink-soft hover:text-ink hover:border-saffron/40 transition-colors shrink-0"
              aria-label="Track Order"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-saffron" />
            </button>

            {/* Authenticated user menu */}
            {session ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-pill bg-paper border border-hairline text-ink hover:border-saffron/50 transition-all text-xs font-semibold shadow-sm shrink-0 whitespace-nowrap"
                >
                  <div className="w-6 h-6 rounded-full bg-saffron text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    {session.fullName ? session.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {session.vendor?.name || session.fullName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-ink-soft shrink-0" />
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

                    {/* If Vendor Owner: show store links */}
                    {session.vendor && (
                      <>
                        <Link
                          href="/vendor"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-14 text-xs text-ink hover:bg-paper transition-colors font-medium"
                        >
                          <Store className="w-4 h-4 text-saffron" />
                          <span>Vendor Dashboard</span>
                        </Link>

                        <Link
                          href="/vendor/subscription"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-14 text-xs text-ink hover:bg-paper transition-colors font-semibold"
                        >
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <span>SaaS Subscription</span>
                        </Link>
                      </>
                    )}

                    {/* If Admin / Super Admin: show Platform Admin link */}
                    {(session.role === 'ADMIN' || session.role === 'SUPER_ADMIN') && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-14 text-xs text-ink hover:bg-paper transition-colors font-bold"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Platform Admin Hub</span>
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
            ) : (
              /* If Logged Out */
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Link
                  href="/login"
                  className="flex items-center gap-1 sm:gap-1.5 text-ink hover:text-saffron transition-colors px-2.5 py-1.5 rounded-14 hover:bg-paper text-xs font-semibold whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign In</span>
                </Link>

                <Link
                  href="/register-vendor"
                  className="flex items-center gap-1 sm:gap-1.5 bg-ink hover:bg-ink/90 active:scale-95 text-white px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-pill text-xs font-bold transition-all shadow-sm whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-saffron shrink-0" />
                  <span className="hidden sm:inline">Register Shop</span>
                  <span className="sm:hidden">Register</span>
                </Link>
              </div>
            )}

            {/* Mobile hamburger menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full bg-paper border border-hairline text-ink hover:bg-surface transition-colors ml-1"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </nav>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-hairline mt-2.5 pt-3 pb-4 px-2 space-y-1.5 animate-in slide-in-from-top-2 duration-150">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 rounded-14 text-sm font-semibold transition-colors ${
                  pathname === link.href ? 'bg-paper text-ink font-bold' : 'text-ink-soft hover:bg-paper'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-2 border-t border-hairline/80 mt-2 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsTrackModalOpen(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-14 text-sm font-semibold text-ink bg-paper border border-hairline"
              >
                <Search className="w-4 h-4 text-saffron" />
                <span>Track Print Order</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Global Order Track Modal */}
      <OrderTrackModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
      />
    </>
  );
}
