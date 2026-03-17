'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /** Indeterminate state — displayed as a dash inside the box. */
  indeterminate?: boolean;
  /** Label text rendered beside the checkbox. */
  label?: string;
  onChange?: (checked: boolean) => void;
}

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------

/**
 * Accessible, styled checkbox supporting checked, unchecked, and indeterminate
 * states. Passes all standard input attributes through to the underlying
 * <input type="checkbox"> element.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      indeterminate = false,
      label,
      id,
      checked,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const innerRef = React.useRef<HTMLInputElement>(null);
    const resolvedRef = (ref ?? innerRef) as React.RefObject<HTMLInputElement>;
    const checkboxId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    // Keep the DOM `indeterminate` property in sync — it can only be set via JS.
    React.useEffect(() => {
      if (resolvedRef.current) {
        resolvedRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate, resolvedRef]);

    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="relative flex items-center">
          <input
            ref={resolvedRef}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.checked)}
            className="sr-only peer"
            aria-checked={indeterminate ? 'mixed' : checked}
            {...props}
          />
          {/* Visual box */}
          <div
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 rounded border transition-colors duration-150 cursor-pointer',
              'border-slate-300 bg-white',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1',
              checked || indeterminate
                ? 'border-blue-600 bg-blue-600'
                : 'hover:border-slate-400',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Checkmark */}
            {checked && !indeterminate && (
              <svg
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full p-0.5"
                aria-hidden="true"
              >
                <path
                  d="M2 6l3 3 5-5"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {/* Indeterminate dash */}
            {indeterminate && (
              <svg
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full p-0.5"
                aria-hidden="true"
              >
                <path
                  d="M2.5 6h7"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </div>
        </div>

        {label !== undefined && (
          <label
            htmlFor={checkboxId}
            className={cn(
              'text-sm font-medium text-slate-700 cursor-pointer select-none',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
