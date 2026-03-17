'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaginationProps {
  /** Total number of items across all pages. */
  total: number;
  /** Current page index (1-based). */
  page: number;
  /** Number of items shown per page. */
  pageSize: number;
  /** Available page size options. Defaults to [10, 20, 50]. */
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/**
 * Responsive pagination bar showing "Showing X–Y of Z", previous/next buttons,
 * and an optional items-per-page selector.
 */
export function Pagination({
  total,
  page,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps): React.JSX.Element {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 px-1 py-3',
        className
      )}
    >
      {/* Info text */}
      <p className="text-sm text-slate-500 shrink-0">
        {total === 0 ? (
          'No results'
        ) : (
          <>
            Showing{' '}
            <span className="font-medium text-slate-700">{from}</span>–
            <span className="font-medium text-slate-700">{to}</span> of{' '}
            <span className="font-medium text-slate-700">{total}</span>
          </>
        )}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Items per page selector */}
        {onPageSizeChange !== undefined && (
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 sm:block whitespace-nowrap">
              Rows per page
            </span>
            <Select
              value={String(pageSize)}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              options={pageSizeOptions.map((n) => ({
                value: String(n),
                label: String(n),
              }))}
              className="h-8 w-20 text-xs"
              aria-label="Items per page"
            />
          </div>
        )}

        {/* Prev / Next */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page indicator (visible on sm+) */}
          <span className="hidden min-w-[5rem] text-center text-xs text-slate-500 sm:block">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
