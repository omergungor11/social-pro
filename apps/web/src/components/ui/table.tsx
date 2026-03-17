import * as React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Table (root wrapper with horizontal scroll container)
// ---------------------------------------------------------------------------

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto rounded-lg border border-slate-200">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

// ---------------------------------------------------------------------------
// TableHeader
// ---------------------------------------------------------------------------

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('border-b border-slate-200 bg-slate-50/70', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

// ---------------------------------------------------------------------------
// TableBody
// ---------------------------------------------------------------------------

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('divide-y divide-slate-100 bg-white', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

// ---------------------------------------------------------------------------
// TableFooter
// ---------------------------------------------------------------------------

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t border-slate-200 bg-slate-50 font-medium', className)}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

// ---------------------------------------------------------------------------
// TableRow
// ---------------------------------------------------------------------------

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** When true the row gets a subtle blue tint to indicate selection. */
  selected?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected, ...props }, ref) => (
    <tr
      ref={ref}
      data-selected={selected ? 'true' : undefined}
      className={cn(
        'transition-colors duration-100',
        'hover:bg-slate-50/80',
        selected && 'bg-blue-50/60 hover:bg-blue-50/80',
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

// ---------------------------------------------------------------------------
// TableHead (th inside thead)
// ---------------------------------------------------------------------------

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-slate-500',
      'whitespace-nowrap',
      '[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

// ---------------------------------------------------------------------------
// TableCell (td inside tbody)
// ---------------------------------------------------------------------------

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-4 py-3 align-middle text-sm text-slate-700',
      '[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

// ---------------------------------------------------------------------------
// TableCaption
// ---------------------------------------------------------------------------

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-slate-500', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
