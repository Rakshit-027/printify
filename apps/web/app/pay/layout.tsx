import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Secure Payment',
  description: 'Complete your online payment for your Print2Me print order.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
