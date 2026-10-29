// hallmark:v1 theme=sticker shape=workbench density=balanced
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ShieldAlert,
  ArrowRight,
  Store,
  ShieldCheck,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

type RoleTab = 'VENDOR' | 'ADMIN';

export default function LoginPage() {
  const router = useRouter();
  const [activeRole, setActiveRole] = useState<RoleTab>('VENDOR');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleRoleSwitch = (role: RoleTab) => {
    setActiveRole(role);
    setErrorMessage('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your email and password.');
      }

      // Hard redirect to load fresh authorized dashboard state
      const role = (data.user?.role || '').toUpperCase();
      if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || role === 'ADMIN') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/vendor';
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-8 text-ink">
      <div className="w-full max-w-[420px] bg-surface p-6 sm:p-8 rounded-[24px] border border-hairline shadow-ink-soft space-y-5">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <BrandLogo variant="horizontal" height={36} withLink href="/" />
          </div>
          <div>
            <h1 className="text-xl font-sora font-extrabold text-ink tracking-tight mb-0.5">
              Welcome back
            </h1>
            <p className="text-xs text-ink-soft font-medium">
              Sign in to manage printing stations, queues, and platform telemetry
            </p>
          </div>
        </div>

        {/* Role Segmented Switcher */}
        <div className="bg-paper p-1 rounded-[16px] border border-hairline grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => handleRoleSwitch('VENDOR')}
            className={`py-2 px-3 rounded-[12px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron active:scale-95 motion-reduce:transform-none disabled:opacity-50 ${
              activeRole === 'VENDOR'
                ? 'bg-surface text-ink shadow-xs border border-hairline/80'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Store className={`w-3.5 h-3.5 ${activeRole === 'VENDOR' ? 'text-saffron' : 'text-ink-soft'}`} />
            <span>Vendor desk</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleSwitch('ADMIN')}
            className={`py-2 px-3 rounded-[12px] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron active:scale-95 motion-reduce:transform-none disabled:opacity-50 ${
              activeRole === 'ADMIN'
                ? 'bg-surface text-ink shadow-xs border border-hairline/80'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeRole === 'ADMIN' ? 'text-success' : 'text-ink-soft'}`} />
            <span>Super admin</span>
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-3 rounded-[14px] bg-danger/10 border border-danger/20 text-danger text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-semibold">{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-danger/70 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger rounded"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email field with guaranteed flex spacing (no absolute overlap) */}
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-xs font-bold text-ink ml-1 block">
              Email address
            </label>
            <div className="flex items-center gap-2.5 bg-paper border border-hairline rounded-[14px] px-3.5 py-2.5 focus-within:border-saffron focus-within:ring-2 focus-within:ring-saffron/20 transition-colors">
              <Mail className="w-4 h-4 text-ink-soft shrink-0" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={activeRole === 'VENDOR' ? 'shopkeeper@campusprint.in' : 'admin@print2me.in'}
                className="w-full bg-transparent border-0 outline-none text-xs font-medium text-ink placeholder:text-ink-soft/50 p-0 focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          {/* Password field with guaranteed flex spacing (no absolute overlap) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label htmlFor="login-password" className="text-xs font-bold text-ink block">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[11px] font-semibold text-saffron hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
              >
                Forgot password?
              </button>
            </div>
            <div className="flex items-center gap-2.5 bg-paper border border-hairline rounded-[14px] px-3.5 py-2.5 focus-within:border-saffron focus-within:ring-2 focus-within:ring-saffron/20 transition-colors">
              <Lock className="w-4 h-4 text-ink-soft shrink-0" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent border-0 outline-none text-xs font-medium text-ink placeholder:text-ink-soft/50 p-0 focus:ring-0 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded p-0.5 shrink-0"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Session Checkbox */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-hairline text-ink focus:ring-saffron/20 focus:ring-2 accent-saffron"
              />
              <span className="text-xs text-ink-soft font-medium">Keep me signed in on this station</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-pill bg-ink text-white font-sora font-bold text-xs shadow-md shadow-ink/20 flex items-center justify-center gap-2 hover:bg-ink/90 active:scale-95 motion-reduce:transform-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block motion-safe:animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <div className="flex items-center gap-1.5">
                <span>Sign in to {activeRole === 'VENDOR' ? 'station' : 'portal'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="text-center text-xs font-medium text-ink-soft pt-1 space-y-1.5 border-t border-hairline/60">
          <div className="pt-2">
            Want to register your print shop?{' '}
            <Link
              href="/register-vendor"
              className="text-saffron font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
            >
              Register business
            </Link>
          </div>
          <div className="text-[11px] text-ink-soft/70">
            Need technical help? Email{' '}
            <a
              href="mailto:support@print2me.in"
              className="hover:text-ink text-ink font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
            >
              support@print2me.in
            </a>
          </div>
        </div>

        {/* Security Trust Strip */}
        <div className="pt-2 border-t border-hairline/40 flex items-center justify-center gap-4 text-[10px] text-ink-soft/70">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-ink-soft" />
            <span>256-bit TLS</span>
          </span>
          <span aria-hidden="true" className="text-hairline">/</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-success" />
            <span>Session verified</span>
          </span>
          <span aria-hidden="true" className="text-hairline">/</span>
          <span>Zero plain text</span>
        </div>
      </div>

      {/* Forgot Password Help Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none duration-200">
          <div className="bg-surface rounded-[24px] border border-hairline p-6 max-w-sm w-full shadow-ink-soft space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[12px] bg-saffron-tint text-saffron flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h2 className="font-sora font-extrabold text-sm text-ink">
                  Credential Recovery
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-7 h-7 rounded-full bg-paper hover:bg-hairline flex items-center justify-center text-ink-soft hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-soft leading-relaxed">
              For security compliance, kiosk and admin accounts cannot be reset via unverified emails. Please contact your organization administrator or our support team:
            </p>

            <div className="bg-paper p-3 rounded-[14px] border border-hairline text-xs text-ink space-y-1">
              <div>Email: <span className="font-mono font-medium">support@print2me.in</span></div>
              <div>Counter Hotline: <span className="font-mono font-medium">+91 98765 43210</span></div>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-pill bg-ink text-white text-xs font-bold hover:bg-ink/90 active:scale-95 motion-reduce:transform-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
