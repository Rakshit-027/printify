import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap,
  Printer,
  Zap,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Smartphone,
  BookOpen,
  Award,
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
      icon: <Clock className="w-6 h-6 text-saffron" />,
      title: 'Beat 9:00 AM Deadlines',
      desc: 'No more waiting 20 minutes while the xerox shopkeeper opens pen drives and deals with slow Windows computers. Upload ahead or scan right at the counter.',
    },
    {
      icon: <ShieldAlert className="w-6 h-6 text-emerald-600" />,
      title: 'Zero USB Drive Viruses',
      desc: 'Stop ruining your laptops and flash drives with shortcut trojans and campus PC malware. Print straight from your personal phone or laptop browser.',
    },
    {
      icon: <GraduationCap className="w-6 h-6 text-purple-600" />,
      title: 'Tailored for Student Budgets',
      desc: 'Transparent pricing with duplex (both sides) options that save paper and halve your print costs. Pay exact change online via UPI or pay cash on desk.',
    },
    {
      icon: <Zap className="w-6 h-6 text-blue-600" />,
      title: 'Works on Any Phone',
      desc: 'No apps to install on your limited storage. Just open your camera, point at the standee, choose your file, and grab your papers.',
    },
  ];

  const academicItems = [
    {
      title: 'Lab Manuals & Practical Records',
      desc: 'Print code outputs, circuit diagrams, and observation tables in crisp monochrome or high-contrast color.',
    },
    {
      title: 'Final Year Project Reports & Theses',
      desc: 'Complete multi-chapter project binders, executive summaries, certificates, and acknowledgments with proper page sequencing.',
    },
    {
      title: 'Lecture Notes & Study Guides',
      desc: 'Print semester lecture slides, handwritten PDF scans, formula sheets, and question banks before midterms.',
    },
    {
      title: 'Admit Cards & Exam Hall Tickets',
      desc: 'One-click emergency printouts for university entrance exams, semester hall tickets, and identity cards.',
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-24">
      <JsonLd data={[breadcrumbsSchema]} />

      {/* Hero */}
      <section className="px-6 pt-16 pb-14 md:pt-24 md:pb-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-saffron-tint text-saffron text-xs font-bold uppercase tracking-wider mb-6">
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Built for College Campuses</span>
        </div>
        <h1 className="font-sora text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight mb-6">
          The Smart Way to Print on Campus
        </h1>
        <p className="text-ink-soft text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
          Skip crowded xerox shop lines, avoid virus-infected USB drives, and submit your college assignments on time with Print2Me.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/v/speedy-express">
            <Button variant="primary" className="h-13 px-8 text-base">
              Try Kiosk Demo
            </Button>
          </Link>
          <Link href="/locations">
            <Button variant="outline" className="h-13 px-8 text-base">
              Find Campus Kiosks
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 max-w-6xl mx-auto mb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {studentFeatures.map((feat, i) => (
            <div
              key={i}
              className="bg-surface p-7 rounded-[24px] border border-hairline shadow-ink-soft space-y-3"
            >
              <div className="w-12 h-12 rounded-16 bg-paper border border-hairline flex items-center justify-center">
                {feat.icon}
              </div>
              <h2 className="font-sora text-lg font-bold text-ink">
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
      <section className="px-6 max-w-5xl mx-auto mb-24">
        <div className="text-center mb-12">
          <h2 className="font-sora text-3xl font-extrabold text-ink mb-3">
            What Students Print Every Day
          </h2>
          <p className="text-ink-soft text-base max-w-xl mx-auto">
            From emergency 5-minute printouts before class to semester-end thesis volumes.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {academicItems.map((item, i) => (
            <div
              key={i}
              className="bg-surface p-7 rounded-[24px] border border-hairline shadow-ink-soft flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-saffron-tint text-saffron flex items-center justify-center shrink-0 mt-1 font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-sora text-lg font-bold text-ink mb-1">
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
      <section className="px-6 max-w-4xl mx-auto mb-24">
        <div className="bg-ink rounded-[32px] p-8 md:p-12 text-white text-center space-y-6">
          <div className="w-14 h-14 rounded-24 bg-white/10 text-saffron flex items-center justify-center mx-auto">
            <Award className="w-7 h-7" />
          </div>
          <h2 className="font-sora text-2xl sm:text-3xl font-extrabold text-white">
            Want Print2Me at your college xerox shop?
          </h2>
          <p className="text-white/80 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            Let your campus print vendor know, or recommend your college xerox store to us. We set them up with free standees and our Windows spooler agent in 10 minutes.
          </p>
          <div className="pt-2">
            <Link href="/register-vendor">
              <Button variant="saffron" className="h-13 px-8 text-base">
                Recommend or Partner a Campus Shop
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
