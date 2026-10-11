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
  QrCode,
  Printer,
  IndianRupee,
  Eye,
  EyeOff,
  Zap,
  Clock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

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

  // Auto-slug generator from business name if user hasn't explicitly customized slug
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
      setErrorMessage('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    if (formData.contactPhone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid 10-digit contact phone number');
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
        throw new Error(data.error || 'Failed to complete vendor registration');
      }

      // Automatically authenticated by backend session cookie -> Enter vendor dashboard
      router.push('/vendor');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-indigo-500 selection:text-white py-10 md:py-16 px-4 sm:px-6 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Top Navbar / Brand Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-none">PrintFlow</span>
              <span className="text-[10px] text-slate-400 font-medium">Vendor Partner Portal</span>
            </div>
          </Link>
          <div className="text-xs text-slate-400">
            Already have a store?{' '}
            <Link
              href="/login"
              className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors underline-offset-4 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* 2-Column Layout: Left Value Props / Right Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Hero & Benefits Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Instant Self-Service Onboarding</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Turn your print shop into a{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
                  Smart Digital Kiosk
                </span>
              </h1>
              <p className="text-sm text-slate-300/90 leading-relaxed">
                Eliminate counter queues and manual WhatsApp file sharing. Customers scan your counter QR, upload files, pay instantly, and send print jobs straight to your local printers.
              </p>
            </div>

            {/* Live Interactive Preview of QR Slug */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  Your Customer-Facing URL
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Auto-Generated
                </span>
              </div>
              <div className="bg-slate-950/80 rounded-xl px-3.5 py-2.5 border border-slate-800 font-mono text-xs flex items-center justify-between overflow-hidden">
                <span className="text-slate-500 truncate">
                  printflow.app/v/
                  <span className="text-emerald-400 font-semibold">
                    {formData.vendorSlug || 'your-shop-slug'}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded ml-2 flex-shrink-0">
                  Counter QR
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Customers scan this QR code on your desk to upload PDFs and docs without sharing WhatsApp numbers.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                  <IndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Instant UPI & Online Payments</h2>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Integrated Razorpay & UPI payment verification before pages print, plus Cash on Desk support.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Windows Desktop Print Agent</h2>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Silent spooler agent for Windows PCs automatically spools incoming orders straight to your printer queue.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-semibold text-white">Zero Setup Fee & 14-Day Free Access</h2>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Start right now without credit cards. Download high-res Printable Counter Standees immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust badge */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>TLS 256-bit encrypted • Isolated tenant storage • Azure cloud backed</span>
            </div>
          </div>

          {/* Right Form Card Column (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative">
              
              <div className="space-y-1 mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Create Vendor Account
                  </h2>
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Step 1 of 1 • 2 Mins
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Fill in your shop details below to launch your digital counter.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold block text-rose-200">Registration Failed</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-5">
                
                {/* SECTION 1: SHOP INFORMATION */}
                <div className="space-y-3">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400 block">
                    1. Print Shop Information
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Business Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Shop / Business Name <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <input
                          type="text"
                          name="vendorName"
                          required
                          value={formData.vendorName}
                          onChange={handleVendorNameChange}
                          placeholder="e.g. Apex Xerox & Prints"
                          className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* QR Slug / URL Handle */}
                    <div className="space-y-1.5">
                      <label htmlFor={slugInputId} className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>QR URL Slug <span className="text-rose-400">*</span></span>
                        <span className="text-[10px] text-slate-500 font-normal">letters & numbers</span>
                      </label>
                      <div className="relative">
                        <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <input
                          id={slugInputId}
                          type="text"
                          name="vendorSlug"
                          required
                          value={formData.vendorSlug}
                          onChange={handleSlugChange}
                          placeholder="apex-prints"
                          maxLength={20}
                          className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Physical Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Physical Shop Address & Landmark <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <textarea
                        name="address"
                        required
                        rows={2}
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Shop #4, Metro Station Gate 2, University Market Road"
                        className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-2" />

                {/* SECTION 2: OWNER & CREDENTIALS */}
                <div className="space-y-3">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-400 block">
                    2. Owner Credentials & Contact
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Owner Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Owner Full Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="e.g. Ramesh Patel"
                        className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                    </div>

                    {/* Contact Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Contact / WhatsApp Phone <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <input
                          type="tel"
                          name="contactPhone"
                          required
                          value={formData.contactPhone}
                          onChange={handleChange}
                          placeholder="+91 98765 43210"
                          className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Business Email <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="owner@printshop.com"
                          className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Account Password <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          required
                          minLength={8}
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="Min 8 characters"
                          className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WHAT'S INCLUDED BOX */}
                <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Included in your onboarding:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Ready-to-print Counter Standee</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Default A4 B&W / Color rates</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Windows Auto-Spooler App</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Live Order Queue Dashboard</span>
                    </div>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-indigo-600/25 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Setting up your store & database...</span>
                    </div>
                  ) : (
                    <>
                      <span>Complete Registration & Open Dashboard</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-slate-500">
                  By registering, you agree to PrintFlow terms of service. No credit card required.
                </p>
              </form>

              {/* Bottom Sign In Link */}
              <div className="text-center text-xs text-slate-400 mt-6 pt-5 border-t border-slate-800">
                Already registered your shop?{' '}
                <Link
                  href="/login"
                  className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors underline-offset-4 hover:underline"
                >
                  Sign In to Vendor Portal
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
