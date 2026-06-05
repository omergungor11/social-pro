'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  BarChart3,
  Eye,
  FileText,
  TrendingUp,
  TrendingDown,
  Share2,
  Inbox as InboxIcon,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Link2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PlatformIcon, type Platform } from '@/components/social/platform-icon';
import { apiClient } from '@/lib/api-client';
import {
  TYPE_LABEL,
  TYPE_BADGE,
  toPlatformIcon,
  relativeTime,
} from '@/components/inbox/helpers';
import type { InboxItem } from '@social-pro/shared-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'overview' | 'posts' | 'analytics' | 'inbox' | 'accounts';

interface BrandHeader {
  id: string;
  name: string;
  company: string;
  avatarInitials: string;
  avatarColor: string;
}

interface BrandAccount {
  id: string;
  platform: Platform;
  handle: string;
  displayName: string;
  followers: number;
  connected: boolean;
  clientId: string | null;
}

type PostStatusKey =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

interface BrandPost {
  id: string;
  content: string;
  status: PostStatusKey;
  platforms: Platform[];
}

interface OverviewMetric {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

interface PlatformStat {
  platform: Platform;
  followers: number;
  followerChange: number;
  engagementRate: number;
}

interface TopPost {
  id: string;
  platform: Platform;
  content: string;
  publishedAt: string;
  engagementRate: number;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

interface ApiClient {
  id: string;
  name: string;
  company: string | null;
}

interface ApiAccountMetrics {
  followers?: number;
}

interface ApiSocialAccount {
  id: string;
  platform: string;
  platformUsername: string | null;
  displayName: string | null;
  isActive: boolean;
  clientId: string | null;
  metrics?: ApiAccountMetrics;
}

interface ApiPostRaw {
  id: string;
  title?: string | null;
  content?: unknown;
  status?: string | null;
  targets?: Array<{ platform?: string; socialAccount?: { platform?: string } }>;
  platforms?: string[];
}

interface ApiOverviewResponse {
  totalFollowers?: number;
  followerChange?: number;
  engagementRate?: number;
  engagementRateChange?: number;
  totalImpressions?: number;
  impressionChange?: number;
  postsPublished?: number;
  postsChange?: number;
  platformBreakdown?: Array<{
    platform: string;
    followers?: number;
    followerChange?: number;
    engagementRate?: number;
  }>;
  topPosts?: Array<{
    id: string;
    platform: string;
    content?: string;
    publishedAt?: string;
    engagementRate?: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-lime-500 to-green-600',
  'from-fuchsia-500 to-pink-600',
];

function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const KNOWN_PLATFORMS = new Set<Platform>([
  'twitter',
  'facebook',
  'instagram',
  'linkedin',
  'tiktok',
  'youtube',
]);

function toPlatform(raw: string | undefined | null): Platform | null {
  if (!raw) return null;
  const p = raw.toLowerCase() as Platform;
  return KNOWN_PLATFORMS.has(p) ? p : null;
}

function extractContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const obj = content as Record<string, unknown>;
    if (typeof obj['text'] === 'string') return obj['text'];
    if (typeof obj['body'] === 'string') return obj['body'];
  }
  return '';
}

const STATUS_BADGE: Record<
  PostStatusKey,
  { variant: 'default' | 'purple' | 'blue' | 'green' | 'gray' | 'red'; label: string }
> = {
  draft: { variant: 'gray', label: 'Draft' },
  scheduled: { variant: 'blue', label: 'Scheduled' },
  publishing: { variant: 'purple', label: 'Publishing' },
  published: { variant: 'green', label: 'Published' },
  failed: { variant: 'red', label: 'Failed' },
  cancelled: { variant: 'default', label: 'Cancelled' },
};

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}): React.JSX.Element {
  React.useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg',
        type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      )}
    >
      {type === 'success' ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric card (mirrors analytics page)
// ---------------------------------------------------------------------------

function MetricCard({ metric }: { metric: OverviewMetric }): React.JSX.Element {
  const Icon = metric.icon;
  const isPositive = metric.change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate">{metric.label}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{metric.value}</p>
            <div className="flex items-center gap-1">
              <TrendIcon
                className={cn('h-3.5 w-3.5 shrink-0', isPositive ? 'text-emerald-500' : 'text-red-500')}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  isPositive ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {isPositive ? '+' : ''}
                {metric.change}% vs prev period
              </span>
            </div>
          </div>
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', metric.iconBg)}>
            <Icon className={cn('h-5 w-5', metric.iconColor)} aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildMetrics(data: ApiOverviewResponse): OverviewMetric[] {
  return [
    {
      label: 'Total Followers',
      value: formatBigNumber(data.totalFollowers ?? 0),
      change: Math.round((data.followerChange ?? 0) * 10) / 10,
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Engagement Rate',
      value: `${(data.engagementRate ?? 0).toFixed(2)}%`,
      change: Math.round((data.engagementRateChange ?? 0) * 10) / 10,
      icon: BarChart3,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Total Impressions',
      value: formatBigNumber(data.totalImpressions ?? 0),
      change: Math.round((data.impressionChange ?? 0) * 10) / 10,
      icon: Eye,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Posts Published',
      value: (data.postsPublished ?? 0).toLocaleString(),
      change: Math.round((data.postsChange ?? 0) * 10) / 10,
      icon: FileText,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
  ];
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'posts', label: 'Posts', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'inbox', label: 'Inbox', icon: InboxIcon },
  { id: 'accounts', label: 'Accounts', icon: Share2 },
];

function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}): React.JSX.Element {
  return (
    <div
      className="flex items-center gap-1 border-b border-slate-200"
      role="tablist"
      aria-label="Brand sections"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected accounts list row (shared by Overview + Accounts)
// ---------------------------------------------------------------------------

function AccountRow({
  account,
  action,
}: {
  account: BrandAccount;
  action?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <PlatformIcon platform={account.platform} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{account.displayName}</p>
        <p className="text-xs text-slate-500 truncate">@{account.handle}</p>
      </div>
      {account.followers > 0 && (
        <span className="hidden sm:inline text-xs text-slate-500 tabular-nums">
          {formatBigNumber(account.followers)} followers
        </span>
      )}
      <span
        className={cn(
          'shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border',
          account.connected
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        )}
      >
        <span
          className={cn('h-1.5 w-1.5 rounded-full', account.connected ? 'bg-emerald-500' : 'bg-slate-400')}
        />
        {account.connected ? 'Connected' : 'Disconnected'}
      </span>
      {action}
    </div>
  );
}

function mapAccounts(raw: ApiSocialAccount[]): BrandAccount[] {
  return raw
    .map((a) => {
      const platform = toPlatform(a.platform);
      if (!platform) return null;
      return {
        id: a.id,
        platform,
        handle: a.platformUsername ?? a.displayName ?? 'unknown',
        displayName: a.displayName ?? a.platformUsername ?? 'Unknown',
        followers: a.metrics?.followers ?? 0,
        connected: a.isActive,
        clientId: a.clientId,
      };
    })
    .filter((a): a is BrandAccount => a !== null);
}

// ---------------------------------------------------------------------------
// Shared loading / error helpers
// ---------------------------------------------------------------------------

function PanelLoading(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  );
}

function PanelError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
      <span>{message}</span>
      <Button
        variant="ghost"
        size="sm"
        className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-100"
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ brandId }: { brandId: string }): React.JSX.Element {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metrics, setMetrics] = React.useState<OverviewMetric[]>([]);
  const [accounts, setAccounts] = React.useState<BrandAccount[]>([]);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [overview, accountsRaw] = await Promise.all([
        apiClient.get<ApiOverviewResponse>(`/analytics/overview?clientId=${brandId}`),
        apiClient.get<ApiSocialAccount[]>(`/social-accounts?clientId=${brandId}`),
      ]);
      setMetrics(buildMetrics(overview));
      setAccounts(mapAccounts(accountsRaw));
    } catch (err) {
      console.error('Failed to load overview:', err);
      setError('Failed to load overview. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} onRetry={() => void fetchData()} />;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      <section aria-label="Connected accounts">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Connected Accounts</h2>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <Share2 className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No accounts connected to this brand yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((a) => (
              <AccountRow key={a.id} account={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Posts tab
// ---------------------------------------------------------------------------

function mapPost(raw: ApiPostRaw): BrandPost {
  const platformSet = new Set<Platform>();
  for (const t of raw.targets ?? []) {
    const p = toPlatform(t.platform ?? t.socialAccount?.platform);
    if (p) platformSet.add(p);
  }
  for (const p of raw.platforms ?? []) {
    const mapped = toPlatform(p);
    if (mapped) platformSet.add(mapped);
  }
  const status = ((raw.status ?? 'DRAFT').toLowerCase()) as PostStatusKey;
  const content = extractContent(raw.content) || (raw.title ?? '');
  return {
    id: raw.id,
    content,
    status: STATUS_BADGE[status] ? status : 'draft',
    platforms: Array.from(platformSet),
  };
}

function PostsTab({ brandId }: { brandId: string }): React.JSX.Element {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [posts, setPosts] = React.useState<BrandPost[]>([]);

  const fetchPosts = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.getWithMeta<ApiPostRaw[]>(
        `/posts?clientId=${brandId}&limit=50`
      );
      setPosts((data ?? []).map(mapPost));
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  React.useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} onRetry={() => void fetchPosts()} />;

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
        <FileText className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">No posts for this brand yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => {
        const statusCfg = STATUS_BADGE[post.status];
        return (
          <div
            key={post.id}
            className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 transition-colors"
          >
            <div className="flex shrink-0 items-center gap-1">
              {post.platforms.length === 0 ? (
                <span className="text-xs text-slate-300">—</span>
              ) : (
                post.platforms.map((p) => <PlatformIcon key={p} platform={p} size="sm" />)
              )}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm text-slate-700">
              {post.content || <span className="text-slate-400">Untitled post</span>}
            </p>
            <Badge variant={statusCfg.variant} className="shrink-0">
              {statusCfg.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics tab
// ---------------------------------------------------------------------------

function AnalyticsTab({ brandId }: { brandId: string }): React.JSX.Element {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metrics, setMetrics] = React.useState<OverviewMetric[]>([]);
  const [platforms, setPlatforms] = React.useState<PlatformStat[]>([]);
  const [topPosts, setTopPosts] = React.useState<TopPost[]>([]);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<ApiOverviewResponse>(
        `/analytics/overview?clientId=${brandId}`
      );
      setMetrics(buildMetrics(data));
      setPlatforms(
        (data.platformBreakdown ?? [])
          .map((p): PlatformStat | null => {
            const platform = toPlatform(p.platform);
            if (!platform) return null;
            return {
              platform,
              followers: p.followers ?? 0,
              followerChange: Math.round((p.followerChange ?? 0) * 10) / 10,
              engagementRate: Math.round((p.engagementRate ?? 0) * 10) / 10,
            };
          })
          .filter((p): p is PlatformStat => p !== null)
      );
      setTopPosts(
        (data.topPosts ?? [])
          .map((p): TopPost | null => {
            const platform = toPlatform(p.platform);
            if (!platform) return null;
            return {
              id: p.id,
              platform,
              content: p.content ?? '',
              publishedAt: p.publishedAt
                ? new Date(p.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—',
              engagementRate: Math.round((p.engagementRate ?? 0) * 10) / 10,
            };
          })
          .filter((p): p is TopPost => p !== null)
      );
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} onRetry={() => void fetchData()} />;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} metric={m} />
        ))}
      </div>

      {platforms.length > 0 && (
        <section aria-labelledby="brand-platform-breakdown">
          <h2 id="brand-platform-breakdown" className="text-sm font-semibold text-slate-700 mb-4">
            Platform Breakdown
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {platforms.map((stat) => {
              const isPositive = stat.followerChange >= 0;
              return (
                <Card key={stat.platform} className="hover:border-blue-200 transition-colors duration-150">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <PlatformIcon platform={stat.platform} size="sm" />
                      <p className="text-sm font-semibold text-slate-800 capitalize">{stat.platform}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Followers</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {stat.followers > 0 ? stat.followers.toLocaleString() : '—'}
                        </p>
                        {stat.followers > 0 && (
                          <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-red-600')}>
                            {isPositive ? '+' : ''}
                            {stat.followerChange}%
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">Engagement</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">
                          {stat.engagementRate > 0 ? `${stat.engagementRate}%` : '—'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {topPosts.length > 0 && (
        <section aria-labelledby="brand-top-posts">
          <div className="flex items-center justify-between mb-4">
            <h2 id="brand-top-posts" className="text-sm font-semibold text-slate-700">
              Top Performing Posts
            </h2>
            <Badge variant="default">Top {topPosts.length} by engagement</Badge>
          </div>
          <div className="space-y-2">
            {topPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3"
              >
                <PlatformIcon platform={post.platform} size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{post.content}</p>
                <span className="hidden sm:inline text-xs text-slate-400 whitespace-nowrap">
                  {post.publishedAt}
                </span>
                <span className="font-semibold text-emerald-600 tabular-nums text-sm">
                  {post.engagementRate}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {platforms.length === 0 && topPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
          <BarChart3 className="h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No detailed analytics for this brand yet.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inbox tab
// ---------------------------------------------------------------------------

function InboxTab({ brandId }: { brandId: string }): React.JSX.Element {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<InboxItem[]>([]);

  const fetchInbox = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.getWithMeta<InboxItem[]>(
        `/inbox?clientId=${brandId}&limit=25`
      );
      setItems(data ?? []);
    } catch (err) {
      console.error('Failed to load inbox:', err);
      setError('Failed to load inbox. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  React.useEffect(() => {
    void fetchInbox();
  }, [fetchInbox]);

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} onRetry={() => void fetchInbox()} />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
        <InboxIcon className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">No interactions for this brand yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href="/dashboard/comments"
            className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 transition-colors"
          >
            <PlatformIcon
              platform={toPlatformIcon(item.platform)}
              size="sm"
              className="mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-700">
                  {item.authorName ?? item.authorUsername ?? 'Unknown'}
                </span>
                <Badge variant={TYPE_BADGE[item.type]} className="px-1.5 py-0 text-[10px]">
                  {TYPE_LABEL[item.type]}
                </Badge>
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  {relativeTime(item.platformCreatedAt ?? item.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {item.text ?? <span className="text-slate-300">No content</span>}
              </p>
            </div>
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <div className="flex justify-end">
        <Link href="/dashboard/comments">
          <Button variant="outline" size="sm" className="gap-1.5">
            Open full inbox
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accounts tab
// ---------------------------------------------------------------------------

function AccountsTab({
  brandId,
  onNotify,
}: {
  brandId: string;
  onNotify: (message: string, type: 'success' | 'error') => void;
}): React.JSX.Element {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [assigned, setAssigned] = React.useState<BrandAccount[]>([]);
  const [available, setAvailable] = React.useState<BrandAccount[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [forBrand, all] = await Promise.all([
        apiClient.get<ApiSocialAccount[]>(`/social-accounts?clientId=${brandId}`),
        apiClient.get<ApiSocialAccount[]>('/social-accounts'),
      ]);
      setAssigned(mapAccounts(forBrand));
      setAvailable(
        mapAccounts(all).filter((a) => a.clientId === null || a.clientId !== brandId)
      );
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function assign(accountId: string): Promise<void> {
    setBusyId(accountId);
    try {
      await apiClient.patch(`/social-accounts/${accountId}`, { clientId: brandId });
      onNotify('Account assigned to brand', 'success');
      await fetchData();
    } catch (err) {
      console.error('Failed to assign account:', err);
      onNotify('Failed to assign account. Please try again.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function unassign(accountId: string): Promise<void> {
    setBusyId(accountId);
    try {
      await apiClient.patch(`/social-accounts/${accountId}`, { clientId: null });
      onNotify('Account unassigned from brand', 'success');
      await fetchData();
    } catch (err) {
      console.error('Failed to unassign account:', err);
      onNotify('Failed to unassign account. Please try again.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <PanelLoading />;
  if (error) return <PanelError message={error} onRetry={() => void fetchData()} />;

  return (
    <div className="space-y-8">
      <section aria-label="Assigned accounts">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">This Brand&apos;s Accounts</h2>
        {assigned.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <Share2 className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No accounts assigned to this brand yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {assigned.map((a) => (
              <AccountRow
                key={a.id}
                account={a}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={busyId === a.id}
                    onClick={() => void unassign(a.id)}
                  >
                    {busyId === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      'Unassign'
                    )}
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Assign accounts">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-700">Assign accounts</h2>
        </div>
        {available.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No other accounts available to assign.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {available.map((a) => (
              <AccountRow
                key={a.id}
                account={a}
                action={
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={busyId === a.id}
                    onClick={() => void assign(a.id)}
                  >
                    {busyId === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        Assign
                      </>
                    )}
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BrandCockpitPage(): React.JSX.Element {
  const params = useParams();
  const brandId = typeof params['brandId'] === 'string' ? params['brandId'] : '';

  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [brand, setBrand] = React.useState<BrandHeader | null>(null);
  const [brandLoading, setBrandLoading] = React.useState(true);
  const [brandError, setBrandError] = React.useState<string | null>(null);

  const fetchBrand = React.useCallback(async () => {
    if (!brandId) return;
    try {
      setBrandLoading(true);
      setBrandError(null);
      const data = await apiClient.get<ApiClient>(`/clients/${brandId}`);
      setBrand({
        id: data.id,
        name: data.name,
        company: data.company ?? '',
        avatarInitials: getInitials(data.name),
        avatarColor: getAvatarColor(data.id),
      });
    } catch (err) {
      console.error('Failed to fetch brand:', err);
      setBrandError('Failed to load brand. Please try again.');
    } finally {
      setBrandLoading(false);
    }
  }, [brandId]);

  React.useEffect(() => {
    void fetchBrand();
  }, [fetchBrand]);

  if (brandLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (brandError || !brand) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600">{brandError ?? 'Brand not found.'}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void fetchBrand()}>
            Retry
          </Button>
          <Link href="/dashboard/brands">
            <Button variant="outline">Back to Brands</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/brands">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Back to brands">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div
            className={cn(
              'h-12 w-12 shrink-0 rounded-full bg-gradient-to-br flex items-center justify-center text-base font-bold text-white shadow-sm',
              brand.avatarColor
            )}
            aria-hidden="true"
          >
            {brand.avatarInitials}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{brand.name}</h1>
            {brand.company && <p className="text-sm text-slate-500 truncate">{brand.company}</p>}
          </div>
        </div>

        {/* Tabs */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Tab panels */}
        {activeTab === 'overview' && <OverviewTab brandId={brandId} />}
        {activeTab === 'posts' && <PostsTab brandId={brandId} />}
        {activeTab === 'analytics' && <AnalyticsTab brandId={brandId} />}
        {activeTab === 'inbox' && <InboxTab brandId={brandId} />}
        {activeTab === 'accounts' && (
          <AccountsTab
            brandId={brandId}
            onNotify={(message, type) => setToast({ message, type })}
          />
        )}
      </div>
    </>
  );
}
