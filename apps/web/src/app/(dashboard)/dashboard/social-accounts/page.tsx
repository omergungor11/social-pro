'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Share2, BarChart3, TrendingUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AccountCard } from '@/components/social/account-card';
import { ConnectDialog } from '@/components/social/connect-dialog';
import { FacebookPageSelectDialog, type FacebookPage } from '@/components/social/facebook-page-select-dialog';
import { InstagramAccountSelectDialog, type InstagramAccount } from '@/components/social/instagram-account-select-dialog';
import type { SocialAccount } from '@/components/social/account-card';
import type { Platform } from '@/components/social/platform-icon';
import { apiClient } from '@/lib/api-client';
import { buildAccountSlug } from '@/lib/account-slug';
import { useBrandStore } from '@/stores/brand-store';

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

// ---------------------------------------------------------------------------
// Map API response to frontend SocialAccount shape
// ---------------------------------------------------------------------------

interface ApiAccountMetrics {
  followers: number;
  following: number;
  posts: number;
  likes: number;
  comments: number;
  impressions: number;
  engagementRate: number;
}

interface ApiSocialAccount {
  id: string;
  platform: string;
  platformUsername: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  connectedAt: string;
  tokenExpiresAt: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  metrics?: ApiAccountMetrics;
  clientId: string | null;
}

function mapApiAccount(a: ApiSocialAccount): SocialAccount {
  const now = Date.now();
  const expiresAt = a.tokenExpiresAt ? new Date(a.tokenExpiresAt).getTime() : null;
  const isExpiring = expiresAt !== null && expiresAt - now < 7 * 24 * 60 * 60 * 1000; // 7 days

  let status: 'active' | 'expiring' | 'disconnected' = 'active';
  if (!a.isActive) status = 'disconnected';
  else if (isExpiring) status = 'expiring';

  const m = a.metrics;

  return {
    id: a.id,
    platform: a.platform.toLowerCase() as Platform,
    username: a.platformUsername ?? a.displayName ?? 'Unknown',
    displayName: a.displayName ?? a.platformUsername ?? 'Unknown',
    avatarUrl: a.avatarUrl ?? undefined,
    status,
    connectedAt: a.connectedAt,
    expiresAt: a.tokenExpiresAt ?? undefined,
    metrics: m
      ? {
          followers: m.followers,
          followersChange: 0,
          posts: m.posts,
          likes: m.likes,
          comments: m.comments,
          impressions: m.impressions ?? 0,
          engagementRate: m.engagementRate,
          weeklyData: [],
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }): React.JSX.Element {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={cn(
      'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all',
      type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
    )}>
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function SocialAccountsContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = React.useState<SocialAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeFilter, setActiveFilter] = React.useState<FilterValue>('all');
  const [connectOpen, setConnectOpen] = React.useState(false);
  const [facebookPages, setFacebookPages] = React.useState<FacebookPage[]>([]);
  const [facebookSelectOpen, setFacebookSelectOpen] = React.useState(false);
  const [instagramAccounts, setInstagramAccounts] = React.useState<InstagramAccount[]>([]);
  const [instagramSelectOpen, setInstagramSelectOpen] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const selectedBrandId = useBrandStore((s) => s.selectedBrandId);

  // Fetch accounts from API
  const fetchAccounts = React.useCallback(async () => {
    try {
      const path = selectedBrandId
        ? `/social-accounts?clientId=${selectedBrandId}`
        : '/social-accounts';
      const data = await apiClient.get<ApiSocialAccount[]>(path);
      setAccounts(data.map(mapApiAccount));
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  React.useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  // Handle OAuth callback query params
  React.useEffect(() => {
    const connected = searchParams.get('connected');
    const platform = searchParams.get('platform');
    const error = searchParams.get('error');
    const selectPages = searchParams.get('selectPages');
    const pagesData = searchParams.get('pages');
    const selectInstagram = searchParams.get('selectInstagram');
    const accountsData = searchParams.get('accounts');

    const base64UrlDecode = (s: string): string => {
      try {
        return typeof atob === 'function'
          ? atob(s.replace(/-/g, '+').replace(/_/g, '/'))
          : Buffer.from(s, 'base64url').toString('utf8');
      } catch {
        return '';
      }
    };

    if (selectPages === 'true' && pagesData) {
      try {
        const decoded = JSON.parse(base64UrlDecode(pagesData)) as FacebookPage[];
        setFacebookPages(decoded);
        setFacebookSelectOpen(true);
      } catch {
        setToast({ message: 'Failed to parse Facebook pages data', type: 'error' });
      }
      router.replace('/dashboard/social-accounts', { scroll: false });
    } else if (selectInstagram === 'true' && accountsData) {
      try {
        const decoded = JSON.parse(base64UrlDecode(accountsData)) as InstagramAccount[];
        setInstagramAccounts(decoded);
        setInstagramSelectOpen(true);
      } catch {
        setToast({ message: 'Failed to parse Instagram accounts data', type: 'error' });
      }
      router.replace('/dashboard/social-accounts', { scroll: false });
    } else if (connected && platform) {
      setToast({ message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account connected successfully!`, type: 'success' });
      router.replace('/dashboard/social-accounts', { scroll: false });
      void fetchAccounts();
    } else if (error) {
      setToast({ message: `Connection failed: ${error}`, type: 'error' });
      router.replace('/dashboard/social-accounts', { scroll: false });
    }
  }, [searchParams, router, fetchAccounts]);

  const filtered = React.useMemo(() => {
    if (activeFilter === 'all') return accounts;
    return accounts.filter((a) => a.platform === activeFilter);
  }, [accounts, activeFilter]);

  function handleRefresh(id: string): void {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'active' as const } : a)));
    setToast({ message: 'Token refreshed successfully', type: 'success' });
  }

  function handleDisconnect(id: string): void {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setToast({ message: 'Account disconnected', type: 'success' });
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Social Accounts</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {loading ? 'Loading accounts...' : `${accounts.length} account${accounts.length !== 1 ? 's' : ''} connected across ${new Set(accounts.map((a) => a.platform)).size} platforms`}
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filtered={activeFilter !== 'all'} onConnect={() => setConnectOpen(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onRefresh={handleRefresh}
                onDisconnect={handleDisconnect}
                onSelect={() => router.push(`/dashboard/social-accounts/${buildAccountSlug({ id: account.id, platform: account.platform, platformUsername: account.username, displayName: account.displayName })}`)}
              />
            ))}
          </div>
        )}
      </div>

      <ConnectDialog open={connectOpen} onClose={() => setConnectOpen(false)} />

      <FacebookPageSelectDialog
        open={facebookSelectOpen}
        pages={facebookPages}
        onClose={() => {
          setFacebookSelectOpen(false);
          setFacebookPages([]);
        }}
        onConnected={() => {
          setFacebookSelectOpen(false);
          setFacebookPages([]);
          setToast({ message: 'Facebook pages connected successfully!', type: 'success' });
          void fetchAccounts();
        }}
      />

      <InstagramAccountSelectDialog
        open={instagramSelectOpen}
        accounts={instagramAccounts}
        onClose={() => {
          setInstagramSelectOpen(false);
          setInstagramAccounts([]);
        }}
        onConnected={() => {
          setInstagramSelectOpen(false);
          setInstagramAccounts([]);
          setToast({ message: 'Instagram accounts connected successfully!', type: 'success' });
          void fetchAccounts();
        }}
      />
    </>
  );
}

export default function SocialAccountsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" /></div>}>
      <SocialAccountsContent />
    </Suspense>
  );
}
