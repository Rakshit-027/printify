'use client';

import React from 'react';

export function Button({ variant = 'primary', className = '', ...props }: any) {
  const base = "flex items-center justify-center gap-2 rounded-pill font-inter font-semibold transition-transform active:scale-95 text-sm min-h-[48px] px-6";
  const variants = {
    primary: "bg-ink text-white shadow-ink-soft hover:bg-ink/90",
    saffron: "bg-saffron text-white shadow-ink-soft hover:bg-saffron/90",
    outline: "border border-hairline bg-surface text-ink hover:bg-paper",
  };
  return <button className={`${base} ${variants[variant as keyof typeof variants]} ${className}`} {...props} />;
}

export function Chip({ active, children, onClick, disabled }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[44px] px-4 rounded-14 font-medium text-sm transition-colors flex items-center justify-center whitespace-nowrap ${
        active
          ? 'bg-ink text-white'
          : disabled
          ? 'bg-paper text-ink-soft opacity-50 cursor-not-allowed'
          : 'bg-surface border border-hairline text-ink hover:bg-paper'
      }`}
    >
      {children}
    </button>
  );
}

export function SegmentedControl({ options, value, onChange }: any) {
  return (
    <div className="flex p-1 bg-paper border border-hairline rounded-14">
      {options.map((opt: any) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[10px] text-sm font-medium transition-all ${
            value === opt.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, max = 50 }: any) {
  return (
    <div className="flex items-center justify-between bg-surface border border-hairline rounded-14 p-1 min-h-[48px]">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-10 h-10 flex items-center justify-center rounded-[10px] text-ink hover:bg-paper disabled:opacity-50"
      >
        -
      </button>
      <span className="font-sora text-xl font-bold tabular-nums text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-10 h-10 flex items-center justify-center rounded-[10px] text-ink hover:bg-paper disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-hairline rounded-14 ${className}`} />
  );
}

export function Accordion({ items }: any) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  return (
    <div className="space-y-3">
      {items.map((item: any, index: number) => (
        <div key={index} className="bg-surface border border-hairline rounded-[24px] overflow-hidden shadow-ink-soft">
          <button
            className="w-full px-6 py-5 flex items-center justify-between font-sora font-bold text-ink text-left"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            {item.question}
            <svg
              className={`w-5 h-5 text-ink-soft transition-transform ${openIndex === index ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIndex === index && (
            <div className="px-6 pb-5 text-ink-soft text-sm leading-relaxed border-t border-hairline pt-4 bg-paper/50">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
