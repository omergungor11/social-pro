import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 text-slate-700 border border-slate-200",
        purple:
          "bg-purple-100 text-purple-700 border border-purple-200",
        blue:
          "bg-blue-100 text-blue-700 border border-blue-200",
        green:
          "bg-emerald-100 text-emerald-700 border border-emerald-200",
        gray:
          "bg-slate-100 text-slate-500 border border-slate-200",
        red:
          "bg-red-100 text-red-700 border border-red-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
