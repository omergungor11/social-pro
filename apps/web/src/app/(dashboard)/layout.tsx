import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — Social Pro",
    default: "Dashboard — Social Pro",
  },
};

/**
 * Dashboard layout — placeholder shell.
 * Full sidebar, topbar, and navigation will be built in TASK-015.
 * Wraps all /dashboard/* routes.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      {/* TODO (TASK-015): Replace with full sidebar + topbar shell */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <span className="font-semibold text-sm">Social Pro</span>
          <nav className="ml-auto flex items-center gap-4">
            {/* Navigation items will be added in TASK-015 */}
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
