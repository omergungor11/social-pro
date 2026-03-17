import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/shell";

export const metadata: Metadata = {
  title: {
    template: "%s — Social Pro",
    default: "Dashboard — Social Pro",
  },
};

/**
 * Dashboard layout — full sidebar + topbar shell.
 * Interactive elements live in the DashboardShell client component.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <DashboardShell>{children}</DashboardShell>;
}
