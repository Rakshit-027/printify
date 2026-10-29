// hallmark:v1 theme=sticker shape=workbench density=balanced
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Store, User, Mail, Lock, Phone, MapPin, ArrowRight, ArrowLeft, CheckCircle2, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/primitives';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    password: '',
    phoneNumber: '',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // OTP Verification state
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInitiateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setStep('otp');
      setResendTimer(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }
      setResendTimer(60);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, otp: otp.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Success -> Redirect to vendor dashboard
      window.location.href = '/vendor';
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const generatedSlug = formData.storeName
    ? formData.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : 'your-store-name';

  return (
    <div className="max-w-xl mx-auto px-6 py-10 md:py-16 text-ink">
      <div className="bg-surface p-6 sm:p-10 rounded-24 border border-hairline shadow-ink-soft space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-16 bg-saffron-tint text-saffron flex items-center justify-center mx-auto">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-sora font-extrabold text-ink tracking-tight">
            Register your print shop
          </h1>
          <p className="text-xs text-ink-soft max-w-sm mx-auto">
            Accept online orders with a 14-day free trial. Setup counter standees and automated spooling.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-14 bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {step === 'otp' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setErrorMessage('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to edit details</span>
              </button>
              <span className="text-[10px] font-bold text-saffron bg-saffron-tint px-2.5 py-0.5 rounded-pill flex items-center gap-1">
                <KeyRound className="w-3 h-3" /> Step 2 of 2
              </span>
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-xl font-sora font-extrabold text-ink">
                Verify Your Email
              </h2>
              <p className="text-xs text-ink-soft">
                Enter the 6-digit verification code sent to <span className="font-bold text-ink">{formData.email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="space-y-1.5 text-center">
                <label className="text-[11px] font-bold text-ink-soft block uppercase tracking-wider">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="w-full max-w-[260px] mx-auto bg-paper border-2 border-hairline rounded-18 py-3 text-2xl font-mono text-center font-extrabold tracking-[10px] text-saffron placeholder:text-ink-soft/20 focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all shadow-inner"
                />
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-ink-soft">
                <span>Didn't receive the email?</span>
                {resendTimer > 0 ? (
                  <span className="text-ink-soft/70 font-medium">
                    Resend in <span className="text-saffron font-bold">{resendTimer}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-saffron font-bold hover:underline inline-flex items-center gap-1"
                  >
                    {isResending && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>Resend Code</span>
                  </button>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                variant="primary"
                className="w-full h-11 text-xs font-semibold"
              >
                {isLoading ? (
                  <span>Verifying & setting up store…</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Code & Complete Registration</span>
                  </div>
                )}
              </Button>
            </form>

            <p className="text-[10px] text-center text-ink-soft/60">
              Tip: Check your spam or promotions tab if you don't see the email within 1 minute.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInitiateRegister} className="space-y-4">
            
            {/* Store Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Shop name *</label>
              <div className="relative">
                <Store className="w-4 h-4 text-ink-soft absolute left-3.5 top-3.5" />
                <input
                  required
                  type="text"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  placeholder="Apex Xerox & Digital Prints"
                  className="w-full pl-10 pr-4 py-2.5 rounded-14 bg-paper border border-hairline text-ink text-xs placeholder:text-ink-soft/50 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-colors"
                />
              </div>
              {formData.storeName && (
                <p className="text-xs text-ink-soft pl-1">
                  Kiosk link: <span className="text-saffron font-semibold">print2me.in/v/{generatedSlug}</span>
                </p>
              )}
            </div>

            {/* Owner Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">Owner full name *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-ink-soft absolute left-3.5 top-3.5" />
                  <input
                    required
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    placeholder="Rahul Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-14 bg-paper border border-hairline text-ink text-xs placeholder:text-ink-soft/50 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">Contact phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-ink-soft absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-14 bg-paper border border-hairline text-ink text-xs placeholder:text-ink-soft/50 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">Email address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-soft absolute left-3.5 top-3.5" />
                  <input
                    required
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="shop@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-14 bg-paper border border-hairline text-ink text-xs placeholder:text-ink-soft/50 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-soft absolute left-3.5 top-3.5" />
                  <input
                    required
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-14 bg-paper border border-hairline text-ink text-xs placeholder:text-ink-soft/50 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Shop Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink">Shop address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-ink-soft absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Shop No. 12, College Gate Road"
                  className="w-full pl-10 pr-4 py-2.5 rounded-14 bg-paper border border-hairline text-ink text-xs placeholder:text-ink-soft/50 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/20 transition-colors"
                />
              </div>
            </div>

            {/* Features badge */}
            <div className="p-3.5 rounded-16 bg-success-tint border border-success/20 space-y-1 text-ink">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                <CheckCircle2 className="w-4 h-4" />
                <span>Includes 14-day free SaaS trial</span>
              </div>
              <p className="text-xs text-ink-soft">
                Direct counter QR standee artwork, Windows desktop spooler, and Razorpay payment setup included.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              className="w-full h-11 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              {isLoading ? (
                <span>Sending verification code…</span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span>Continue to Email Verification</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </Button>
          </form>
        )}

        <div className="text-center text-xs text-ink-soft pt-2 border-t border-hairline">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-saffron hover:underline font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
