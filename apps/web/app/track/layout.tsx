import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Track Print Order',
  description: 'Track real-time order status and collection tokens on Print2Me.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function TrackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
