'use client';

import { useState, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Store,
  Building2,
  Link as LinkIcon,
  Mail,
  Lock,
  Phone,
  MapPin,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Printer,
  IndianRupee,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/primitives';
import { BrandLogo } from '@/components/BrandLogo';

export default function RegisterVendorPage() {
  const router = useRouter();
  const slugInputId = useId();

  const [formData, setFormData] = useState({
    vendorName: '',
    vendorSlug: '',
    fullName: '',
    email: '',
    password: '',
    contactPhone: '',
    address: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleVendorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => {
      const next = { ...prev, vendorName: val };
      if (!slugManuallyEdited) {
        next.vendorSlug = val
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 20);
      }
      return next;
    });
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugManuallyEdited(true);
    const formatted = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .slice(0, 20);
    setFormData((prev) => ({ ...prev, vendorSlug: formatted }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (formData.contactPhone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete registration');
      }

      router.push('/vendor');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-paper flex items-center justify-center p-3 sm:p-5 lg:p-6">
      <div className="w-full max-w-5xl bg-surface rounded-[24px] sm:rounded-[32px] border border-hairline shadow-ink-soft overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Column: Compact Benefits (5 cols) */}
          <div className="lg:col-span-5 bg-paper/60 p-5 sm:p-7 border-b lg:border-b-0 lg:border-r border-hairline flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <BrandLogo variant="horizontal" height={36} withLink href="/" />
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-saffron-tint text-saffron text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-saffron" />
                  <span>Partner Portal</span>
                </div>
              </div>

              <div>
                <h1 className="font-sora text-xl sm:text-2xl font-extrabold text-ink tracking-tight leading-snug">
                  Partner your print shop with <span className="text-saffron">Print2Me</span>
                </h1>
                <p className="text-xs text-ink-soft mt-1.5 leading-relaxed">
                  Eliminate counter queues. Let customers scan your print2me.in QR standee, upload files, and pay online.
                </p>
              </div>

              {/* 3 Step Micro-List */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2.5 p-2 rounded-14 bg-surface border border-hairline/70">
                  <span className="w-5 h-5 rounded-full bg-saffron text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    1
                  </span>
                  <p className="text-xs font-semibold text-ink">Place your counter QR standee</p>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-14 bg-surface border border-hairline/70">
                  <span className="w-5 h-5 rounded-full bg-saffron text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    2
                  </span>
                  <p className="text-xs font-semibold text-ink">Walk-ins upload & pay via UPI</p>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-14 bg-surface border border-hairline/70">
                  <span className="w-5 h-5 rounded-full bg-saffron text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    3
                  </span>
                  <p className="text-xs font-semibold text-ink">Auto-spool straight to your printer</p>
                </div>
              </div>
            </div>

            {/* Micro Feature Badges */}
            <div className="pt-3 border-t border-hairline/80 flex items-center justify-between text-[11px] text-ink-soft font-medium">
              <span className="flex items-center gap-1 text-success font-semibold">
                <Check className="w-3.5 h-3.5" /> 14-Day Free Access
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-saffron" /> Zero Setup Fees
              </span>
            </div>
          </div>

          {/* Right Column: Compact Fit-in-Viewport Form (7 cols) */}
          <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-center">
            
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h2 className="font-sora text-lg sm:text-xl font-extrabold text-ink tracking-tight">
                  Register Your Shop
                </h2>
                <p className="text-[11px] text-ink-soft">Takes less than 2 minutes</p>
              </div>
              <span className="text-[10px] font-bold text-success bg-success-tint px-2.5 py-0.5 rounded-pill">
                Instant Kiosk
              </span>
            </div>

            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-14 bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-[11px]">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3">
              
              {/* Row 1: Shop Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink">
                    Shop / Store Name <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-ink-soft/60 absolute left-3 top-3" />
                    <input
                      type="text"
                      name="vendorName"
                      required
                      value={formData.vendorName}
                      onChange={handleVendorNameChange}
                      placeholder="e.g. Apex Xerox"
                      className="w-full bg-paper border border-hairline rounded-14 pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor={slugInputId} className="text-[11px] font-bold text-ink flex items-center justify-between">
                    <span>QR Slug <span className="text-danger">*</span></span>
                    <span className="text-[9px] text-saffron font-mono font-bold">print2me.in/v/{formData.vendorSlug || 'slug'}</span>
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 text-ink-soft/60 absolute left-3 top-3" />
                    <input
                      id={slugInputId}
                      type="text"
                      name="vendorSlug"
                      required
                      value={formData.vendorSlug}
                      onChange={handleSlugChange}
                      placeholder="apex-prints"
                      maxLength={20}
                      className="w-full bg-paper border border-hairline rounded-14 pl-9 pr-3 py-2 text-xs font-mono text-saffron font-bold placeholder:text-ink-soft/40 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Owner Name & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink">
                    Owner Full Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Rahul Sharma"
                    className="w-full bg-paper border border-hairline rounded-14 px-3 py-2 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink">
                    WhatsApp Phone <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-ink-soft/60 absolute left-3 top-3" />
                    <input
                      type="tel"
                      name="contactPhone"
                      required
                      value={formData.contactPhone}
                      onChange={handleChange}
                      placeholder="10-digit mobile"
                      className="w-full bg-paper border border-hairline rounded-14 pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Email & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink">
                    Email Address <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-ink-soft/60 absolute left-3 top-3" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="shop@example.com"
                      className="w-full bg-paper border border-hairline rounded-14 pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-ink">
                    Password <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-ink-soft/60 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      className="w-full bg-paper border border-hairline rounded-14 pl-9 pr-8 py-2 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-ink-soft hover:text-ink"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-ink-soft/60" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-ink">
                  Shop Address & Landmark <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-ink-soft/60 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Shop number, market, university gate or landmark"
                    className="w-full bg-paper border border-hairline rounded-14 pl-9 pr-3 py-2 text-xs text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-saffron focus:ring-2 focus:ring-saffron/10 font-medium"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading}
                className="w-full h-11 text-xs font-bold shadow-ink-soft mt-1"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    <span>Setting up your store...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Complete Store Registration</span>
                    <ArrowRight className="w-4 h-4 text-saffron" />
                  </div>
                )}
              </Button>
            </form>

            {/* Bottom Sign In Link */}
            <div className="text-center text-[11px] text-ink-soft pt-2.5 mt-2 border-t border-hairline">
              Already registered?{' '}
              <Link href="/login" className="text-saffron font-bold hover:underline">
                Sign In
              </Link>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
