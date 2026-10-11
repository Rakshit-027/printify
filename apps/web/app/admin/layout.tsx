import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Command Hub',
  description: 'Print2Me administrative portal and platform management.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
