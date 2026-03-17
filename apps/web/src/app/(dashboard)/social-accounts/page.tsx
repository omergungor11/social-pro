'use client';

import * as React from 'react';
import { Plus, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AccountCard } from '@/components/social/account-card';
import { ConnectDialog } from '@/components/social/connect-dialog';
import type { SocialAccount } from '@/components/social/account-card';
import type { Platform } from '@/components/social/platform-icon';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_ACCOUNTS: SocialAccount[] = [
  {
    id: 'sa1',
    platform: 'twitter',
    username: 'acmecorp',
    displayName: 'Acme Corporation',
    status: 'active',
    connectedAt: '2024-01-20',
    assignedClient: 'Acme Corporation',
  },
  {
    id: 'sa2',
    platform: 'instagram',
    username: 'acmecorp.official',
    displayName: 'Acme Corp Official',
    status: 'active',
    connectedAt: '2024-01-20',
    assignedClient: 'Acme Corporation',
  },
  {
    id: 'sa3',
    platform: 'facebook',
    username: 'BrightIdeasStudio',
    displayName: 'Bright Ideas Studio',
    status: 'expiring',
    connectedAt: '2024-02-10',
    expiresAt: '2026-03-25',
    assignedClient: 'Bright Ideas Studio',
  },
  {
    id: 'sa4',
    platform: 'linkedin',
    username: 'cloudsyncsystems',
    displayName: 'CloudSync Systems',
    status: 'active',
    connectedAt: '2024-02-22',
    assignedClient: 'CloudSync Systems',
  },
  {
    id: 'sa5',
    platform: 'tiktok',
    username: 'deltahealth',
    displayName: 'Delta Health Partners',
    status: 'disconnected',
    connectedAt: '2024-03-08',
    assignedClient: 'Delta Health Partners',
  },
  {
    id: 'sa6',
    platform: 'youtube',
    username: 'EchoCommerceOfficial',
    displayName: 'Echo Commerce',
    status: 'active',
    connectedAt: '2024-03-25',
    assignedClient: 'Echo Commerce',
  },
  {
    id: 'sa7',
    platform: 'twitter',
    username: 'founderslaunchpad',
    displayName: 'Founders Launchpad',
    status: 'active',
    connectedAt: '2024-04-14',
    assignedClient: 'Founders Launchpad',
  },
  {
    id: 'sa8',
    platform: 'instagram',
    username: 'greenleaf_organics',
    displayName: 'Greenleaf Organics',
    status: 'expiring',
    connectedAt: '2024-04-28',
    expiresAt: '2026-03-30',
  },
];

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

type FilterValue = 'all' | Platform;

interface FilterTab {
  value: FilterValue;
  label: string;
}

const FILTER_TABS: FilterTab[] = [
  { value: 'all', label: 'All' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

// ---------------------------------------------------------------------------
// Summary stat helpers
// ---------------------------------------------------------------------------

function getSummaryStats(accounts: SocialAccount[]): {
  total: number;
  active: number;
  expiring: number;
  disconnected: number;
} {
  return {
    total: accounts.length,
    active: accounts.filter((a) => a.status === 'active').length,
    expiring: accounts.filter((a) => a.status === 'expiring').length,
    disconnected: accounts.filter((a) => a.status === 'disconnected').length,
  };
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  filtered,
  onConnect,
}: {
  filtered: boolean;
  onConnect: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Share2 className="h-7 w-7 text-slate-400" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">
        {filtered ? 'No accounts match that filter' : 'No accounts connected'}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        {filtered
          ? 'Try selecting a different platform from the tabs above.'
          : 'Connect your first social media account to start scheduling and managing content.'}
      </p>
      {!filtered && (
        <Button className="mt-6 gap-1.5" onClick={onConnect}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Connect Account
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  value: number;
  dotClass: string;
}

function SummaryCard({ label, value, dotClass }: SummaryCardProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span
        className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dotClass)}
        aria-hidden="true"
      />
      <div>
        <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="mt-0.5 text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SocialAccountsPage(): React.JSX.Element {
  const [accounts, setAccounts] = React.useState<SocialAccount[]>(MOCK_ACCOUNTS);
  const [activeFilter, setActiveFilter] = React.useState<FilterValue>('all');
  const [connectOpen, setConnectOpen] = React.useState(false);

  // Derived filtered list
  const filtered = React.useMemo(() => {
    if (activeFilter === 'all') return accounts;
    return accounts.filter((a) => a.platform === activeFilter);
  }, [accounts, activeFilter]);

  const stats = React.useMemo(() => getSummaryStats(accounts), [accounts]);

  function handleRefresh(id: string): void {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: 'active' as const } : a
      )
    );
  }

  function handleDisconnect(id: string): void {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <>
      <div className="space-y-6">
        {/* ----------------------------------------------------------------- */}
        {/* Page header                                                        */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Social Accounts
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
            </p>
          </div>

          <Button
            className="gap-1.5"
            onClick={() => setConnectOpen(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Connect Account
          </Button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Summary stats                                                      */}
        {/* ----------------------------------------------------------------- */}
        <section
          aria-label="Account summary"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <SummaryCard
            label="Total"
            value={stats.total}
            dotClass="bg-slate-400"
          />
          <SummaryCard
            label="Active"
            value={stats.active}
            dotClass="bg-emerald-500"
          />
          <SummaryCard
            label="Expiring Soon"
            value={stats.expiring}
            dotClass="bg-amber-400"
          />
          <SummaryCard
            label="Disconnected"
            value={stats.disconnected}
            dotClass="bg-red-500"
          />
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Platform filter tabs                                               */}
        {/* ----------------------------------------------------------------- */}
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="tablist"
          aria-label="Filter by platform"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.value;
            // Count per platform
            const count =
              tab.value === 'all'
                ? accounts.length
                : accounts.filter((a) => a.platform === tab.value).length;

            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(tab.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-800'
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Accounts grid                                                      */}
        {/* ----------------------------------------------------------------- */}
        {filtered.length === 0 ? (
          <EmptyState
            filtered={activeFilter !== 'all'}
            onConnect={() => setConnectOpen(true)}
          />
        ) : (
          <section
            aria-label={`${activeFilter === 'all' ? 'All' : FILTER_TABS.find((t) => t.value === activeFilter)?.label ?? ''} accounts`}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onRefresh={handleRefresh}
                  onDisconnect={handleDisconnect}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Connect Account dialog */}
      <ConnectDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
      />
    </>
  );
}
