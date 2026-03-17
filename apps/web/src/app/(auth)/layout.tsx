import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — Social Pro",
    default: "Social Pro",
  },
};

/**
 * Auth layout — centers content vertically and horizontally on a neutral
 * background. Used by /login, /register, /forgot-password, etc.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
