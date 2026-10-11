'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/primitives';

export function HomeContactForm() {
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  if (contactSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-[24px] bg-emerald-50/80 border border-emerald-200 text-center space-y-3 animate-in fade-in">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-sora text-xl font-bold text-emerald-950">Message Sent Successfully!</h3>
        <p className="text-sm text-emerald-800 max-w-md mx-auto">
          Thank you for reaching out. A confirmation has been routed to <strong>support@print2me.in</strong>. Our team will get back to you at <strong>{contactForm.email || 'your email'}</strong> within 2-4 hours.
        </p>
        <button
          type="button"
          onClick={() => {
            setContactSubmitted(false);
            setContactForm({ name: '', email: '', message: '' });
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form 
      className="max-w-2xl mx-auto space-y-5" 
      onSubmit={(e) => {
        e.preventDefault();
        setContactSubmitted(true);
      }}
    >
      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-bold text-ink ml-1">Your Full Name</label>
          <input 
            type="text" 
            required
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            className="w-full bg-paper border border-hairline rounded-[16px] px-4 py-3.5 text-sm font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all placeholder:text-ink-soft/40" 
            placeholder="e.g. Rahul Sharma" 
          />
        </div>
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-bold text-ink ml-1">Email Address</label>
          <input 
            type="email" 
            required
            value={contactForm.email}
            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            className="w-full bg-paper border border-hairline rounded-[16px] px-4 py-3.5 text-sm font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all placeholder:text-ink-soft/40" 
            placeholder="e.g. rahul@example.com" 
          />
        </div>
      </div>
      <div className="space-y-1.5 text-left">
        <label className="text-xs font-bold text-ink ml-1">Message / Partner Inquiry</label>
        <textarea 
          rows={4} 
          required
          value={contactForm.message}
          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
          className="w-full bg-paper border border-hairline rounded-[16px] px-4 py-3.5 text-sm font-medium text-ink focus:outline-none focus:border-saffron focus:ring-4 focus:ring-saffron/10 transition-all resize-none placeholder:text-ink-soft/40" 
          placeholder="Tell us about your print requirements, shop location, or question..."
        />
      </div>
      <Button variant="primary" type="submit" className="w-full h-13 text-sm font-bold shadow-md">
        <span className="flex items-center justify-center gap-2">
          Send to support@print2me.in <Send className="w-4 h-4 text-saffron" />
        </span>
      </Button>
    </form>
  );
}
