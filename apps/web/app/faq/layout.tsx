import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions – Help & Support',
  description:
    'Find answers to common questions about Print2Me online document printing, file privacy, accepted file types, UPI payments, refunds, and print shop partnerships.',
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    title: 'Frequently Asked Questions – Help & Support | Print2Me',
    description:
      'Everything you need to know about printing documents easily, securely, and without apps using Print2Me.',
    url: 'https://print2me.in/faq',
    type: 'website',
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
