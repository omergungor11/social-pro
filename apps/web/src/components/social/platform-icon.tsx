import * as React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Platform =
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'youtube';

export type IconSize = 'sm' | 'md' | 'lg';

export interface PlatformIconProps {
  platform: Platform;
  size?: IconSize;
  /** Render as a plain icon without the colored wrapper circle */
  bare?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Size maps
// ---------------------------------------------------------------------------

const wrapperSize: Record<IconSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

const svgSize: Record<IconSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-7 w-7',
};

// ---------------------------------------------------------------------------
// Per-platform config
// ---------------------------------------------------------------------------

interface PlatformConfig {
  label: string;
  wrapperClass: string;
  icon: (svgClass: string) => React.JSX.Element;
}

const PLATFORM_CONFIG: Record<Platform, PlatformConfig> = {
  twitter: {
    label: 'Twitter / X',
    wrapperClass: 'bg-[#1D9BF0]',
    icon: (svgClass) => (
      // X / Twitter bird — simplified X mark used since rebrand
      <svg
        viewBox="0 0 24 24"
        fill="white"
        aria-hidden="true"
        className={svgClass}
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L2.25 2.25h6.865l4.265 5.638L18.244 2.25ZM17.086 19.77h1.834L7.005 4.126H5.032L17.086 19.77Z" />
      </svg>
    ),
  },
  facebook: {
    label: 'Facebook',
    wrapperClass: 'bg-[#1877F2]',
    icon: (svgClass) => (
      <svg
        viewBox="0 0 24 24"
        fill="white"
        aria-hidden="true"
        className={svgClass}
      >
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.276h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    // Gradient via inline style since Tailwind can't do arbitrary gradients in bg
    wrapperClass: 'instagram-gradient',
    icon: (svgClass) => (
      <svg
        viewBox="0 0 24 24"
        fill="white"
        aria-hidden="true"
        className={svgClass}
      >
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
      </svg>
    ),
  },
  linkedin: {
    label: 'LinkedIn',
    wrapperClass: 'bg-[#0A66C2]',
    icon: (svgClass) => (
      <svg
        viewBox="0 0 24 24"
        fill="white"
        aria-hidden="true"
        className={svgClass}
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    wrapperClass: 'bg-[#010101]',
    icon: (svgClass) => (
      <svg
        viewBox="0 0 24 24"
        fill="white"
        aria-hidden="true"
        className={svgClass}
      >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.81a8.18 8.18 0 0 0 4.78 1.52V6.88a4.86 4.86 0 0 1-1.01-.19Z" />
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    wrapperClass: 'bg-[#FF0000]',
    icon: (svgClass) => (
      <svg
        viewBox="0 0 24 24"
        fill="white"
        aria-hidden="true"
        className={svgClass}
      >
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814ZM9.545 15.568V8.432L15.818 12l-6.273 3.568Z" />
      </svg>
    ),
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlatformIcon({
  platform,
  size = 'md',
  bare = false,
  className,
}: PlatformIconProps): React.JSX.Element {
  const config = PLATFORM_CONFIG[platform];
  const iconEl = config.icon(cn(svgSize[size]));

  if (bare) {
    return (
      <span className={cn('inline-flex', className)} aria-label={config.label}>
        {iconEl}
      </span>
    );
  }

  const isInstagram = platform === 'instagram';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        wrapperSize[size],
        !isInstagram && config.wrapperClass,
        className
      )}
      style={
        isInstagram
          ? {
              background:
                'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
            }
          : undefined
      }
      aria-label={config.label}
    >
      {iconEl}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Utility: platform display name
// ---------------------------------------------------------------------------

export function getPlatformLabel(platform: Platform): string {
  return PLATFORM_CONFIG[platform].label;
}

// ---------------------------------------------------------------------------
// Utility: platform accent color (for border, ring, etc.)
// ---------------------------------------------------------------------------

export const PLATFORM_ACCENT: Record<Platform, string> = {
  twitter: 'border-[#1D9BF0]',
  facebook: 'border-[#1877F2]',
  instagram: 'border-[#d6249f]',
  linkedin: 'border-[#0A66C2]',
  tiktok: 'border-[#010101]',
  youtube: 'border-[#FF0000]',
};

export const PLATFORM_ACCENT_BG: Record<Platform, string> = {
  twitter: 'bg-[#1D9BF0]/8',
  facebook: 'bg-[#1877F2]/8',
  instagram: 'bg-pink-50',
  linkedin: 'bg-[#0A66C2]/8',
  tiktok: 'bg-slate-100',
  youtube: 'bg-red-50',
};
