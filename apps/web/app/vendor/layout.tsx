import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vendor Station Portal',
  description: 'Print2Me partner printing shop station portal, queue management, and live spooler controls.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
