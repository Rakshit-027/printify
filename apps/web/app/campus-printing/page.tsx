// hallmark:v1 theme=sticker shape=workbench density=balanced
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap,
  Printer,
  Clock,
  ShieldCheck,
  Smartphone,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/primitives';
import { JsonLd } from '@/components/JsonLd';

export const metadata: Metadata = {
  title: 'Campus & College Printing Services – Student Document Printing | Print2Me',
  description:
    'Fast, affordable campus printing for college students. Print assignments, lab records, notes, and project reports in seconds. Zero pen-drive viruses or long lines.',
  alternates: {
    canonical: '/campus-printing',
  },
  openGraph: {
    title: 'Campus & College Printing Services – Student Document Printing | Print2Me',
    description:
      'Beat 9 AM submission deadlines. Scan counter QR codes at your college xerox shop and collect your prints instantly with Print2Me.',
    url: 'https://print2me.in/campus-printing',
    type: 'website',
  },
};

export default function CampusPrintingPage() {
  const breadcrumbsSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://print2me.in',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Campus Printing',
        item: 'https://print2me.in/campus-printing',
      },
    ],
  };

  const studentFeatures = [
    {
      icon: <Clock className="w-5 h-5 text-saffron" />,
      title: 'Beat 9:00 AM deadlines',
      desc: 'No more waiting in 20-minute xerox queues while slow counter computers freeze. Upload ahead or scan right at the desk.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-success" />,
      title: 'Zero USB drive viruses',
      desc: 'Stop infecting personal laptops with shortcut trojans from campus PCs. Print directly from your own phone browser.',
    },
    {
      icon: <GraduationCap className="w-5 h-5 text-saffron" />,
      title: 'Student friendly pricing',
      desc: 'Transparent rates with duplex long-edge options that halve paper consumption. Pay exact totals online via UPI.',
    },
    {
      icon: <Smartphone className="w-5 h-5 text-ink" />,
      title: 'No app download needed',
      desc: 'Save phone storage. Open your camera, scan the desk QR standee, select your PDF file, and collect your sheets.',
    },
  ];

  const academicItems = [
    {
      title: 'Lab manuals & practical records',
      desc: 'Print code outputs, circuit diagrams, and observation tables in crisp monochrome or high-contrast color.',
    },
    {
      title: 'Final year project reports & theses',
      desc: 'Complete multi-chapter project binders, executive summaries, certificates, and acknowledgments in order.',
    },
    {
      title: 'Lecture notes & study guides',
      desc: 'Print semester lecture slides, handwritten PDF scans, formula sheets, and question banks before exams.',
    },
    {
      title: 'Admit cards & exam hall tickets',
      desc: 'Single-sheet urgent prints for university semester hall tickets, entrance exam permits, and verification IDs.',
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24 text-ink">
      <JsonLd data={[breadcrumbsSchema]} />

      {/* Hero */}
      <section className="px-6 pt-16 pb-12 md:pt-20 md:pb-16 max-w-4xl mx-auto text-center">
        <h1 className="font-sora text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          Campus printing without the queues
        </h1>
        <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8">
          Upload documents from your phone and collect sheets at your college kiosk.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/v/speedy-express"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="primary" className="w-full sm:w-auto h-12 px-8 text-sm">
              Try kiosk demo
            </Button>
          </Link>
          <Link
            href="/locations"
            className="w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
          >
            <Button variant="outline" className="w-full sm:w-auto h-12 px-8 text-sm">
              Find campus kiosks
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 max-w-5xl mx-auto mb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {studentFeatures.map((feat, i) => (
            <div
              key={i}
              className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft space-y-3"
            >
              <div className="w-10 h-10 rounded-16 bg-paper border border-hairline flex items-center justify-center">
                {feat.icon}
              </div>
              <h2 className="font-sora text-base font-bold text-ink">
                {feat.title}
              </h2>
              <p className="text-ink-soft text-sm leading-relaxed">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Academic Documents Section */}
      <section className="px-6 max-w-4xl mx-auto mb-20">
        <div className="mb-8">
          <h2 className="font-sora text-2xl font-extrabold text-ink mb-2">
            Everyday academic documents
          </h2>
          <p className="text-ink-soft text-sm max-w-xl">
            From last-minute classroom submission runs to bound project submissions.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {academicItems.map((item, i) => (
            <div
              key={i}
              className="bg-surface p-6 rounded-24 border border-hairline shadow-ink-soft flex items-start gap-3.5"
            >
              <div className="w-7 h-7 rounded-full bg-saffron-tint text-saffron flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-sora text-base font-bold text-ink mb-1">
                  {item.title}
                </h3>
                <p className="text-ink-soft text-sm leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Student Representative / Campus Partner Card */}
      <section className="px-6 max-w-4xl mx-auto">
        <div className="bg-ink rounded-24 p-8 text-white space-y-5">
          <div className="w-12 h-12 rounded-16 bg-white/10 text-saffron flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="font-sora text-2xl font-bold text-white">
            Bring Print2Me to your college xerox shop
          </h2>
          <p className="text-white/80 max-w-xl text-sm leading-relaxed">
            Tell your campus print vendor or recommend their counter to us. We provide them with free desk standees and automated spooler setup in minutes.
          </p>
          <div className="pt-1">
            <Link
              href="/register-vendor"
              className="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 rounded-pill active:scale-[0.99] transition-transform motion-reduce:transform-none"
            >
              <Button variant="saffron" className="h-11 px-6 text-sm">
                Recommend or register a shop
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
