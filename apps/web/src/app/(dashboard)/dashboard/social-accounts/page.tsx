'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Share2, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AccountCard } from '@/components/social/account-card';
import { ConnectDialog } from '@/components/social/connect-dialog';
import type { SocialAccount } from '@/components/social/account-card';
import type { Platform } from '@/components/social/platform-icon';

// ---------------------------------------------------------------------------
// Mock data with metrics
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
    metrics: {
      followers: 45200,
      followersChange: 1280,
      posts: 342,
      likes: 18400,
      comments: 3200,
      impressions: 892000,
      engagementRate: 4.8,
      weeklyData: [120, 145, 132, 178, 156, 190, 210],
    },
    recentPosts: [
      { id: 'p1', title: 'New product launch announcement 🚀', status: 'published', date: '2026-03-20', likes: 234, comments: 45 },
      { id: 'p2', title: 'Behind the scenes at our office', status: 'published', date: '2026-03-18', likes: 189, comments: 32 },
      { id: 'p3', title: 'Weekly tips: Social media strategy', status: 'scheduled', date: '2026-03-22', likes: 0, comments: 0 },
    ],
  },
  {
    id: 'sa2',
    platform: 'instagram',
    username: 'acmecorp.official',
    displayName: 'Acme Corp Official',
    status: 'active',
    connectedAt: '2024-01-20',
    assignedClient: 'Acme Corporation',
    metrics: {
      followers: 128500,
      followersChange: 3450,
      posts: 567,
      likes: 45600,
      comments: 8900,
      impressions: 2340000,
      engagementRate: 6.2,
      weeklyData: [340, 380, 356, 412, 445, 398, 478],
    },
    recentPosts: [
      { id: 'p4', title: 'Summer collection preview', status: 'published', date: '2026-03-19', likes: 1245, comments: 89 },
      { id: 'p5', title: 'Customer spotlight: Maria J.', status: 'published', date: '2026-03-17', likes: 876, comments: 67 },
    ],
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
    metrics: {
      followers: 23400,
      followersChange: -120,
      posts: 189,
      likes: 5600,
      comments: 1200,
      impressions: 456000,
      engagementRate: 2.9,
      weeklyData: [89, 76, 82, 71, 68, 74, 65],
    },
    recentPosts: [
      { id: 'p6', title: 'Design thinking workshop recap', status: 'published', date: '2026-03-16', likes: 78, comments: 12 },
    ],
  },
  {
    id: 'sa4',
    platform: 'linkedin',
    username: 'cloudsyncsystems',
    displayName: 'CloudSync Systems',
    status: 'active',
    connectedAt: '2024-02-22',
    assignedClient: 'CloudSync Systems',
    metrics: {
      followers: 12800,
      followersChange: 890,
      posts: 98,
      likes: 3400,
      comments: 670,
      impressions: 234000,
      engagementRate: 5.1,
      weeklyData: [45, 52, 48, 67, 72, 58, 81],
    },
    recentPosts: [
      { id: 'p7', title: 'We\'re hiring! Senior engineers wanted', status: 'published', date: '2026-03-20', likes: 345, comments: 56 },
      { id: 'p8', title: 'Cloud migration best practices', status: 'published', date: '2026-03-15', likes: 234, comments: 34 },
    ],
  },
  {
    id: 'sa5',
    platform: 'tiktok',
    username: 'deltahealth',
    displayName: 'Delta Health Partners',
    status: 'disconnected',
    connectedAt: '2024-03-08',
    assignedClient: 'Delta Health Partners',
    metrics: {
      followers: 67800,
      followersChange: 0,
      posts: 234,
      likes: 89000,
      comments: 12300,
      impressions: 4560000,
      engagementRate: 8.4,
      weeklyData: [0, 0, 0, 0, 0, 0, 0],
    },
  },
  {
    id: 'sa6',
    platform: 'youtube',
    username: 'EchoCommerceOfficial',
    displayName: 'Echo Commerce',
    status: 'active',
    connectedAt: '2024-03-25',
    assignedClient: 'Echo Commerce',
    metrics: {
      followers: 8900,
      followersChange: 420,
      posts: 67,
      likes: 12300,
      comments: 2100,
      impressions: 890000,
      engagementRate: 7.2,
      weeklyData: [234, 256, 278, 312, 298, 345, 367],
    },
    recentPosts: [
      { id: 'p9', title: 'E-commerce trends 2026', status: 'published', date: '2026-03-18', likes: 456, comments: 78 },
      { id: 'p10', title: 'How to increase conversions', status: 'scheduled', date: '2026-03-23', likes: 0, comments: 0 },
    ],
  },
  {
    id: 'sa7',
    platform: 'twitter',
    username: 'founderslaunchpad',
    displayName: 'Founders Launchpad',
    status: 'active',
    connectedAt: '2024-04-14',
    assignedClient: 'Founders Launchpad',
    metrics: {
      followers: 19600,
      followersChange: 560,
      posts: 456,
      likes: 8900,
      comments: 1890,
      impressions: 567000,
      engagementRate: 3.7,
      weeklyData: [67, 78, 89, 92, 85, 98, 112],
    },
  },
  {
    id: 'sa8',
    platform: 'instagram',
    username: 'greenleaf_organics',
    displayName: 'Greenleaf Organics',
    status: 'expiring',
    connectedAt: '2024-04-28',
    expiresAt: '2026-03-30',
    metrics: {
      followers: 34500,
      followersChange: 780,
      posts: 234,
      likes: 23400,
      comments: 4500,
      impressions: 1230000,
      engagementRate: 5.8,
      weeklyData: [189, 201, 178, 223, 245, 212, 256],
    },
    recentPosts: [
      { id: 'p11', title: 'Farm to table: Spring harvest', status: 'published', date: '2026-03-19', likes: 678, comments: 89 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Filter / Summary helpers
// ---------------------------------------------------------------------------

type FilterValue = 'all' | Platform;

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ---------------------------------------------------------------------------
// Overview cards
// ---------------------------------------------------------------------------

function OverviewCards({ accounts }: { accounts: SocialAccount[] }): React.JSX.Element {
  const totalFollowers = accounts.reduce((s, a) => s + (a.metrics?.followers ?? 0), 0);
  const totalImpressions = accounts.reduce((s, a) => s + (a.metrics?.impressions ?? 0), 0);
  const totalEngagement = accounts.reduce((s, a) => s + (a.metrics?.likes ?? 0) + (a.metrics?.comments ?? 0), 0);
  const avgEngRate = accounts.length > 0
    ? accounts.reduce((s, a) => s + (a.metrics?.engagementRate ?? 0), 0) / accounts.filter(a => a.metrics).length
    : 0;

  const cards = [
    { label: 'Total Followers', value: formatBigNumber(totalFollowers), icon: Share2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Monthly Impressions', value: formatBigNumber(totalImpressions), icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Total Engagement', value: formatBigNumber(totalEngagement), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg. Engagement Rate', value: `${avgEngRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', c.bg)}>
                <Icon className={cn('h-5 w-5', c.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-900 leading-none">{c.value}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status summary
// ---------------------------------------------------------------------------

function StatusSummary({ accounts }: { accounts: SocialAccount[] }): React.JSX.Element {
  const stats = [
    { label: 'Total', value: accounts.length, dot: 'bg-slate-400' },
    { label: 'Active', value: accounts.filter((a) => a.status === 'active').length, dot: 'bg-emerald-500' },
    { label: 'Expiring', value: accounts.filter((a) => a.status === 'expiring').length, dot: 'bg-amber-400' },
    { label: 'Disconnected', value: accounts.filter((a) => a.status === 'disconnected').length, dot: 'bg-red-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', s.dot)} />
          <div>
            <p className="text-xl font-bold text-slate-900 leading-none">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ filtered, onConnect }: { filtered: boolean; onConnect: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Share2 className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">
        {filtered ? 'No accounts match that filter' : 'No accounts connected'}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        {filtered
          ? 'Try selecting a different platform.'
          : 'Connect your first social media account to start managing content.'}
      </p>
      {!filtered && (
        <Button className="mt-6 gap-1.5" onClick={onConnect}>
          <Plus className="h-4 w-4" /> Connect Account
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SocialAccountsPage(): React.JSX.Element {
  const router = useRouter();
  const [accounts, setAccounts] = React.useState<SocialAccount[]>(MOCK_ACCOUNTS);
  const [activeFilter, setActiveFilter] = React.useState<FilterValue>('all');
  const [connectOpen, setConnectOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    if (activeFilter === 'all') return accounts;
    return accounts.filter((a) => a.platform === activeFilter);
  }, [accounts, activeFilter]);

  function handleRefresh(id: string): void {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'active' as const } : a)));
  }

  function handleDisconnect(id: string): void {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Social Accounts</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected across {new Set(accounts.map((a) => a.platform)).size} platforms
            </p>
          </div>
          <Button className="gap-1.5" onClick={() => setConnectOpen(true)}>
            <Plus className="h-4 w-4" /> Connect Account
          </Button>
        </div>

        {/* Overview metrics */}
        <OverviewCards accounts={accounts} />

        {/* Status summary */}
        <StatusSummary accounts={accounts} />

        {/* Platform filter tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist">
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.value;
            const count = tab.value === 'all'
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
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-800'
                )}
              >
                {tab.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none', isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Accounts grid */}
        {filtered.length === 0 ? (
          <EmptyState filtered={activeFilter !== 'all'} onConnect={() => setConnectOpen(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onRefresh={handleRefresh}
                onDisconnect={handleDisconnect}
                onSelect={(id) => router.push(`/dashboard/social-accounts/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <ConnectDialog open={connectOpen} onClose={() => setConnectOpen(false)} />
    </>
  );
}
