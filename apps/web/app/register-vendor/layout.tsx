import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Your Print Shop – Join Print2Me',
  description: 'Register your print shop with Print2Me. Receive walk-in print orders via QR codes directly on your Windows spooler with zero upfront monthly fees.',
  alternates: {
    canonical: '/register-vendor',
  },
  openGraph: {
    title: 'Partner Your Print Shop – Join Print2Me',
    description: 'Automate queue management, print walk-in orders with QR standees, and collect digital payments at your print shop with Print2Me.',
    url: 'https://print2me.in/register-vendor',
  },
};

export default function RegisterVendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
