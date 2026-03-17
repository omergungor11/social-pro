import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Dialog title rendered in the header bar. */
  title: string;
  /** Optional description rendered below the title. */
  description?: string;
  children: React.ReactNode;
  /** Max width class — defaults to "max-w-md". */
  maxWidth?: string;
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

/**
 * Accessible modal dialog with overlay backdrop, header, and close button.
 * Controlled entirely via `open` / `onClose` props.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-md",
}: DialogProps): React.JSX.Element | null {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll while open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description !== undefined ? "dialog-description" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content card */}
      <div
        className={cn(
          "relative z-10 w-full rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20",
          maxWidth
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="space-y-1 pr-8">
            <h2
              id="dialog-title"
              className="text-base font-semibold leading-none text-slate-900"
            >
              {title}
            </h2>
            {description !== undefined && (
              <p
                id="dialog-description"
                className="text-sm text-slate-500"
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DialogFooter — optional layout helper for action buttons
// ---------------------------------------------------------------------------

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}
