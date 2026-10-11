'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Lock, Mail, ShieldAlert, ArrowRight, Store, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/primitives';
import { BrandLogo } from '@/components/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
        throw new Error(data.error || 'Login failed');
      }

      // Route according to user role
      if (data.user.role === 'SUPER_ADMIN' || data.user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/vendor');
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12 md:py-24 min-h-screen">
      <div className="bg-surface p-8 md:p-10 rounded-[32px] border border-hairline shadow-ink-soft space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-1">
            <BrandLogo variant="horizontal" height={42} withLink href="/" />
          </div>
          <div>
            <h1 className="text-2xl font-sora font-extrabold text-ink tracking-tight mb-1">Welcome back</h1>
            <p className="text-xs text-ink-soft font-medium">Access your Vendor Store or Administrative Command Portal</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-[16px] bg-danger/10 border border-danger/20 text-danger text-sm flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink ml-1">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-ink-soft absolute left-4 top-4" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourdomain.com"
                className="w-full bg-paper border border-hairline rounded-[16px] pl-12 pr-5 py-4 font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all placeholder:text-ink-soft/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-ink ml-1">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-ink-soft absolute left-4 top-4" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-paper border border-hairline rounded-[16px] pl-12 pr-5 py-4 font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all placeholder:text-ink-soft/50"
              />
            </div>
          </div>

          <Button
            variant="primary"
            type="submit"
            disabled={isLoading}
            className="w-full h-14 text-base"
          >
            {isLoading ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <div className="flex items-center gap-2">
                Authenticate Session
                <ArrowRight className="w-5 h-5" />
              </div>
            )}
          </Button>
        </form>

        <div className="text-center text-xs font-medium text-ink-soft pt-2 space-y-2">
          <div>
            Want to register your print shop?{' '}
            <Link href="/register-vendor" className="text-saffron font-bold hover:underline">
              Register Business
            </Link>
          </div>
          <div className="text-[11px] text-ink-soft/70">
            Need assistance? Reach us at{' '}
            <a href="mailto:support@print2me.in" className="hover:text-ink text-ink font-semibold underline">
              support@print2me.in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
