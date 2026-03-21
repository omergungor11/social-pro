'use client';

import * as React from 'react';
import { RefreshCw, Unlink, User, TrendingUp, TrendingDown, Eye, Heart, MessageCircle, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import {
  PlatformIcon,
  getPlatformLabel,
  PLATFORM_ACCENT,
  type Platform,
} from '@/components/social/platform-icon';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountStatus = 'active' | 'expiring' | 'disconnected';

export interface AccountMetrics {
  followers: number;
  followersChange: number;
  posts: number;
  likes: number;
  comments: number;
  impressions: number;
  engagementRate: number;
  /** Last 7 days engagement data for sparkline */
  weeklyData: number[];
}

export interface RecentPost {
  id: string;
  title: string;
  status: 'published' | 'scheduled' | 'failed';
  date: string;
  likes: number;
  comments: number;
}

export interface SocialAccount {
  id: string;
  platform: Platform;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: AccountStatus;
  connectedAt: string;
  expiresAt?: string;
  assignedClient?: string;
  metrics?: AccountMetrics;
  recentPosts?: RecentPost[];
}

interface AccountCardProps {
  account: SocialAccount;
  onRefresh: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSelect?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<AccountStatus, string> = {
  active: 'bg-emerald-500',
  expiring: 'bg-amber-400',
  disconnected: 'bg-red-500',
};

const STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Active',
  expiring: 'Expiring Soon',
  disconnected: 'Disconnected',
};

const STATUS_BADGE_VARIANT: Record<AccountStatus, 'green' | 'default' | 'red'> = {
  active: 'green',
  expiring: 'default',
  disconnected: 'red',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Mini Sparkline
// ---------------------------------------------------------------------------

function Sparkline({ data, className }: { data: number[]; className?: string }): React.JSX.Element {
  if (data.length === 0) return <></>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  const trend = data[data.length - 1] >= data[0];

  return (
    <svg width={w} height={h} className={cn('overflow-visible', className)} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={trend ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Metric pill
// ---------------------------------------------------------------------------

function MetricPill({
  icon: Icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconClass?: string;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 min-w-0" title={label}>
      <Icon className={cn('h-3 w-3 shrink-0 text-slate-400', iconClass)} aria-hidden="true" />
      <span className="text-xs font-semibold text-slate-700 truncate">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AccountCard
// ---------------------------------------------------------------------------

export function AccountCard({
  account,
  onRefresh,
  onDisconnect,
  onSelect,
}: AccountCardProps): React.JSX.Element {
  const [refreshing, setRefreshing] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const m = account.metrics;

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    try {
      await apiClient.post(`/api/v1/social-accounts/${account.id}/refresh`);
      onRefresh(account.id);
    } catch (err) {
      console.error('Token refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDisconnectConfirm(): Promise<void> {
    setConfirmOpen(false);
    try {
      await apiClient.delete(`/api/v1/social-accounts/${account.id}`);
      onDisconnect(account.id);
    } catch (err) {
      console.error('Disconnect failed:', err);
    }
  }

  const accentBorder = PLATFORM_ACCENT[account.platform];

  return (
    <>
      <article
        className={cn(
          'relative flex flex-col rounded-xl border bg-white shadow-sm',
          'border-l-4 transition-shadow hover:shadow-md',
          accentBorder,
          onSelect && 'cursor-pointer'
        )}
        onClick={onSelect ? () => onSelect(account.id) : undefined}
        aria-label={`${getPlatformLabel(account.platform)} account: ${account.displayName}`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <PlatformIcon platform={account.platform} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate leading-tight">
              {account.displayName}
            </p>
            <p className="text-sm text-slate-500 truncate">@{account.username}</p>
          </div>
          <span
            className={cn(
              'mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white',
              STATUS_DOT[account.status]
            )}
            title={STATUS_LABEL[account.status]}
          />
        </div>

        {/* Metrics grid */}
        {m && (
          <div className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <MetricPill icon={Users} label="Followers" value={formatNumber(m.followers)} iconClass="text-blue-500" />
              <MetricPill icon={FileText} label="Posts" value={formatNumber(m.posts)} iconClass="text-violet-500" />
              <MetricPill icon={Heart} label="Likes" value={formatNumber(m.likes)} iconClass="text-red-400" />
              <MetricPill icon={MessageCircle} label="Comments" value={formatNumber(m.comments)} iconClass="text-amber-500" />
              <MetricPill icon={Eye} label="Impressions" value={formatNumber(m.impressions)} iconClass="text-emerald-500" />
              <div className="flex items-center gap-1.5" title="Engagement Rate">
                <TrendingUp className="h-3 w-3 shrink-0 text-blue-500" aria-hidden="true" />
                <span className="text-xs font-semibold text-slate-700">{m.engagementRate.toFixed(1)}%</span>
              </div>
            </div>

            {/* Follower change + sparkline */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {m.followersChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    m.followersChange >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {m.followersChange >= 0 ? '+' : ''}
                  {formatNumber(m.followersChange)} this month
                </span>
              </div>
              {m.weeklyData.length > 0 && <Sparkline data={m.weeklyData} />}
            </div>
          </div>
        )}

        {/* Recent posts */}
        {account.recentPosts && account.recentPosts.length > 0 && (
          <div className="border-t border-slate-100 px-4 py-2.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Recent Posts
            </p>
            <div className="space-y-1.5">
              {account.recentPosts.slice(0, 3).map((post) => (
                <div key={post.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      post.status === 'published'
                        ? 'bg-emerald-500'
                        : post.status === 'scheduled'
                        ? 'bg-blue-500'
                        : 'bg-red-500'
                    )}
                  />
                  <span className="truncate flex-1 text-slate-600">{post.title}</span>
                  <span className="shrink-0 text-slate-400 flex items-center gap-1.5">
                    <Heart className="h-2.5 w-2.5" /> {post.likes}
                    <MessageCircle className="h-2.5 w-2.5 ml-1" /> {post.comments}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta info */}
        <div className="border-t border-slate-100 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <Badge variant={STATUS_BADGE_VARIANT[account.status]} className="text-[10px]">
              {STATUS_LABEL[account.status]}
            </Badge>
            {account.assignedClient && (
              <span className="flex items-center gap-1 text-slate-500">
                <User className="h-3 w-3" /> {account.assignedClient}
              </span>
            )}
            <span className="ml-auto text-slate-400">
              {formatDate(account.connectedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 flex items-center gap-2 px-4 py-2.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={(e) => { e.stopPropagation(); void handleRefresh(); }}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
          >
            <Unlink className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
      </article>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Disconnect Account"
        description={`Remove @${account.username} (${getPlatformLabel(account.platform)}) from Social Pro? Scheduled posts for this account will be paused.`}
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDisconnectConfirm}>Disconnect</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
