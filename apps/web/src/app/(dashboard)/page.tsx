import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Dashboard home — placeholder page.
 * Full widget layout (scheduled posts, analytics overview, quick actions)
 * will be built in TASK-015.
 */
export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to Social Pro. Full dashboard coming in TASK-015.
        </p>
      </div>

      {/* Placeholder metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            { label: "Scheduled Posts", value: "—" },
            { label: "Published Today", value: "—" },
            { label: "Active Clients", value: "—" },
            { label: "Connected Accounts", value: "—" },
          ] as const
        ).map((card) => (
          <div
            key={card.label}
            className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-2"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {card.label}
            </p>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
