'use client';

import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  variant?: 'horizontal' | 'icon' | 'stacked' | 'app-icon' | 'dark';
  className?: string;
  height?: number;
  width?: number;
  priority?: boolean;
  withLink?: boolean;
  href?: string;
}

export function BrandLogo({
  variant = 'horizontal',
  className = '',
  height,
  width,
  priority = true,
  withLink = false,
  href = '/',
}: BrandLogoProps) {
  let src = '/brand/print2me-logo-horizontal.png';
  let defaultWidth = 180;
  let defaultHeight = 36;
  let alt = 'Print2Me — Smart Online Printing Network';

  switch (variant) {
    case 'icon':
      src = '/brand/print2me-icon.png';
      defaultWidth = 44;
      defaultHeight = 36;
      alt = 'Print2Me Icon';
      break;
    case 'stacked':
      src = '/brand/print2me-logo-stacked.png';
      defaultWidth = 140;
      defaultHeight = 78;
      alt = 'Print2Me Logo';
      break;
    case 'app-icon':
      src = '/brand/print2me-app-icon.png';
      defaultWidth = 48;
      defaultHeight = 48;
      alt = 'Print2Me App Icon';
      break;
    case 'dark':
      src = '/brand/print2me-dark.png';
      defaultWidth = 200;
      defaultHeight = 63;
      alt = 'Print2Me Dark Logo';
      break;
    case 'horizontal':
    default:
      src = '/brand/print2me-logo-horizontal.png';
      defaultWidth = 185;
      defaultHeight = 38;
      alt = 'Print2Me';
      break;
  }

  const finalWidth = width || defaultWidth;
  const finalHeight = height || defaultHeight;

  const imageElement = (
    <div className={`relative inline-flex items-center shrink-0 select-none ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        priority={priority}
        className="w-auto object-contain transition-transform duration-200"
        style={{
          height: height ? `${height}px` : undefined,
          maxHeight: '100%',
        }}
      />
    </div>
  );

  if (withLink) {
    return (
      <Link href={href} className="inline-flex items-center group">
        {imageElement}
      </Link>
    );
  }

  return imageElement;
}
