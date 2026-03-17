import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — Social Pro",
    default: "Social Pro",
  },
};

/**
 * Auth layout — centers content with a gradient background and logo header.
 * Used by /login, /register, /forgot-password.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Background pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Logo */}
      <div className="relative mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
              fill="white"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="text-xl font-bold text-white tracking-tight">
          Social Pro
        </span>
        <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">
          Agency Platform
        </span>
      </div>

      {/* Form card */}
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600/20 to-violet-600/20 blur-lg" />
        <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl">
          {children}
        </div>
      </div>

      {/* Footer */}
      <p className="relative mt-8 text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Social Pro. All rights reserved.
      </p>
    </div>
  );
}
