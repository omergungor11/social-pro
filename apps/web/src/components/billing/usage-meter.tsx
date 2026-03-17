'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsageMeterProps {
  /** Display label for this meter */
  label: string;
  /** Current value consumed */
  current: number;
  /** Maximum allowed value */
  max: number;
  /** Optional unit suffix (e.g. "GB"). When omitted plain numbers are shown. */
  unit?: string;
  /** Number of decimal places for current value display. Default 0. */
  decimals?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getColorClasses(pct: number): {
  bar: string;
  text: string;
} {
  if (pct > 80) {
    return { bar: 'bg-red-500', text: 'text-red-600' };
  }
  if (pct > 60) {
    return { bar: 'bg-amber-400', text: 'text-amber-600' };
  }
  return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Reusable usage meter showing a labelled progress bar with color-coded
 * status: green (<= 60 %), yellow (60–80 %), red (> 80 %).
 */
export function UsageMeter({
  label,
  current,
  max,
  unit,
  decimals = 0,
  className,
}: UsageMeterProps): React.JSX.Element {
  const pct = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;
  const { bar, text } = getColorClasses(pct);

  const formatValue = (v: number): string =>
    decimals > 0 ? v.toFixed(decimals) : String(v);

  const currentLabel = unit !== undefined ? `${formatValue(current)} ${unit}` : formatValue(current);
  const maxLabel = unit !== undefined ? `${formatValue(max)} ${unit}` : formatValue(max);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={cn('text-xs font-semibold tabular-nums', text)}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={label}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn('h-full rounded-full transition-all duration-500', bar)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Value row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 tabular-nums">
          {currentLabel} used
        </span>
        <span className="text-xs text-slate-400 tabular-nums">
          of {maxLabel}
        </span>
      </div>
    </div>
  );
}
