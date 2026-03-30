'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Grid3X3, List, Heart, MessageCircle, Eye, Share2,
  Users, FileText, TrendingUp, TrendingDown, Calendar, ExternalLink,
  BarChart3, Bookmark, Play, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlatformIcon, getPlatformLabel } from '@/components/social/platform-icon';
import type { Platform } from '@/components/social/platform-icon';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountProfile {
  id: string;
  platform: Platform;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl?: string | null;
  website?: string;
  isVerified: boolean;
  status: 'active' | 'expiring' | 'disconnected';
  connectedAt: string;
  stats: {
    followers: number;
    following: number;
    posts: number;
    engagementRate: number;
  };
  monthlyMetrics: {
    month: string;
    followers: number;
    impressions: number;
    likes: number;
    comments: number;
    reach: number;
  }[];
}

interface PostItem {
  id: string;
  thumbnail: string | null;
  type: 'image' | 'video' | 'carousel' | 'post';
  caption: string;
  publishedAt: string;
  likes: number;
  comments: number;
  impressions: number;
  saves: number;
  shares: number;
  status: string;
}

// ---------------------------------------------------------------------------
// API response shapes (loose — we use ?? everywhere)
// ---------------------------------------------------------------------------

interface ApiAccount {
  id: string;
  platform?: string;
  platformUsername?: string;
  displayName?: string;
  avatarUrl?: string | null;
  isActive?: boolean;
  tokenExpiresAt?: string | null;
  connectedAt?: string;
  metadata?: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Mapper functions
// ---------------------------------------------------------------------------

function mapApiToProfile(a: ApiAccount): AccountProfile {
  const meta = (a.metadata ?? {}) as Record<string, unknown>;

  let status: AccountProfile['status'] = 'active';
  if (!a.isActive) {
    status = 'disconnected';
  } else if (
    a.tokenExpiresAt != null &&
    new Date(a.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
  ) {
    status = 'expiring';
  }

  return {
    id: a.id,
    platform: ((a.platform ?? '').toLowerCase()) as Platform,
    username: (a.platformUsername ?? a.displayName ?? 'Unknown') as string,
    displayName: (a.displayName ?? a.platformUsername ?? 'Unknown') as string,
    bio: ((meta.bio as string | undefined) ?? '') as string,
    avatarUrl: a.avatarUrl ?? null,
    coverUrl: null,
    website: ((meta.website as string | undefined) ?? '') as string,
    isVerified: ((meta.isVerified as boolean | undefined) ?? false) as boolean,
    status,
    connectedAt: a.connectedAt ?? '',
    stats: {
      followers: ((meta.followersCount as number | undefined) ?? 0) as number,
      following: ((meta.followingCount as number | undefined) ?? 0) as number,
      posts: ((meta.postsCount as number | undefined) ?? 0) as number,
      engagementRate: ((meta.engagementRate as number | undefined) ?? 0) as number,
    },
    monthlyMetrics: [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiToPost(p: any): PostItem {
  const content =
    typeof p.content === 'object' && p.content !== null
      ? ((p.content?.text ?? '') as string)
      : ((p.content ?? '') as string);

  const rawStatus = ((p.status ?? 'DRAFT') as string).toLowerCase();
  const status =
    rawStatus === 'published' || rawStatus === 'scheduled' || rawStatus === 'failed'
      ? rawStatus
      : rawStatus;

  // Extract thumbnail from media array or direct fields
  const mediaArr = (p.media ?? p.postMedia ?? []) as Array<{ url?: string; thumbnailUrl?: string; mediaType?: string }>;
  const firstMedia = mediaArr[0];
  const thumbnail = firstMedia?.thumbnailUrl ?? firstMedia?.url ?? null;
  const postType = firstMedia?.mediaType === 'VIDEO' ? 'video' : 'post';

  return {
    id: p.id as string,
    thumbnail,
    type: postType as 'post' | 'video',
    caption: content,
    publishedAt: (p.publishedAt ?? p.createdAt ?? '') as string,
    likes: 0,
    comments: 0,
    impressions: 0,
    saves: 0,
    shares: 0,
    status,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ---------------------------------------------------------------------------
// Mini bar chart
// ---------------------------------------------------------------------------

function MiniBarChart({ data, label }: { data: number[]; label: string }): React.JSX.Element {
  const max = Math.max(...data, 1);
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-1 h-10">
        {data.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-blue-500/80 hover:bg-blue-600 transition-colors"
            style={{ height: `${(v / max) * 100}%`, minHeight: 2 }}
            title={fmt(v)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile header (Instagram-style)
// ---------------------------------------------------------------------------

function ProfileHeader({ profile }: { profile: AccountProfile }): React.JSX.Element {
  const initial = profile.displayName.charAt(0).toUpperCase();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Cover */}
      <div className="h-32 sm:h-44 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 relative">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M20 20h20v20H20zM0 0h20v20H0z\'/%3E%3C/g%3E%3C/svg%3E")',
        }} />
      </div>

      {/* Profile info */}
      <div className="px-4 sm:px-6 pb-6">
        {/* Avatar row */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
          <div className="relative">
            <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl sm:text-4xl font-bold shadow-lg overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2">
              <PlatformIcon platform={profile.platform} size="sm" />
            </div>
          </div>

          <div className="flex-1 min-w-0 sm:pb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {profile.displayName}
              </h1>
              {profile.isVerified && (
                <svg className="h-5 w-5 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              )}
            </div>
            <p className="text-sm text-slate-500">@{profile.username} · {getPlatformLabel(profile.platform)}</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Badge variant={profile.status === 'active' ? 'green' : profile.status === 'expiring' ? 'default' : 'red'}>
              {profile.status === 'active' ? 'Active' : profile.status === 'expiring' ? 'Expiring' : 'Disconnected'}
            </Badge>
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-sm text-slate-600 whitespace-pre-line max-w-lg">{profile.bio}</p>
        )}

        {/* Stats row (Instagram-style) */}
        <div className="mt-5 flex items-center gap-6 sm:gap-10 border-t border-slate-100 pt-4">
          {[
            { label: 'Posts', value: profile.stats.posts },
            { label: 'Followers', value: profile.stats.followers },
            { label: 'Following', value: profile.stats.following },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg sm:text-xl font-bold text-slate-900">{fmt(s.value)}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
          <div className="text-center ml-auto">
            <p className="text-lg sm:text-xl font-bold text-emerald-600">{profile.stats.engagementRate}%</p>
            <p className="text-xs text-slate-500">Eng. Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monthly analytics section
// ---------------------------------------------------------------------------

function MonthlyAnalytics({ metrics }: { metrics: AccountProfile['monthlyMetrics'] }): React.JSX.Element {
  const latest = metrics[metrics.length - 1];
  const prev = metrics[metrics.length - 2];
  if (!latest || !prev) return <></>;

  const changes = [
    { label: 'Followers', value: latest.followers, prev: prev.followers, icon: Users, color: 'text-blue-600' },
    { label: 'Impressions', value: latest.impressions, prev: prev.impressions, icon: Eye, color: 'text-violet-600' },
    { label: 'Likes', value: latest.likes, prev: prev.likes, icon: Heart, color: 'text-red-500' },
    { label: 'Comments', value: latest.comments, prev: prev.comments, icon: MessageCircle, color: 'text-amber-600' },
    { label: 'Reach', value: latest.reach, prev: prev.reach, icon: Share2, color: 'text-emerald-600' },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-400" /> Monthly Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {changes.map((c) => {
            const Icon = c.icon;
            const diff = c.value - c.prev;
            const pct = prev ? ((diff / c.prev) * 100).toFixed(1) : '0';
            const isUp = diff >= 0;
            return (
              <div key={c.label} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Icon className={cn('h-3.5 w-3.5', c.color)} />
                  <span className="text-xs text-slate-500">{c.label}</span>
                </div>
                <p className="text-lg font-bold text-slate-900">{fmt(c.value)}</p>
                <div className="flex items-center gap-1">
                  {isUp ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                  <span className={cn('text-[11px] font-medium', isUp ? 'text-emerald-600' : 'text-red-600')}>
                    {isUp ? '+' : ''}{pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini charts */}
        <div className="mt-5 grid grid-cols-3 gap-4">
          <MiniBarChart data={metrics.map((m) => m.impressions)} label="Impressions" />
          <MiniBarChart data={metrics.map((m) => m.likes)} label="Likes" />
          <MiniBarChart data={metrics.map((m) => m.reach)} label="Reach" />
        </div>
        <div className="flex gap-2 mt-1">
          {metrics.map((m) => (
            <span key={m.month} className="flex-1 text-center text-[9px] text-slate-400">{m.month}</span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Post grid (Instagram-style)
// ---------------------------------------------------------------------------

const PLACEHOLDER_COLORS = [
  '#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#ec4899', '#6366f1', '#14b8a6', '#ef4444', '#a855f7',
  '#0ea5e9', '#84cc16',
];

function getPlaceholderThumbnail(index: number, label: string): string {
  const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length] ?? '#64748b';
  const text = label.charAt(0).toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${color}"/><text x="200" y="200" text-anchor="middle" dy=".35em" fill="white" font-size="96" font-family="sans-serif">${text}</text></svg>`
  )}`;
}

function PostGrid({ posts, accountId }: { posts: PostItem[]; accountId: string }): React.JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {posts.map((post, i) => {
        const thumb = post.thumbnail ?? getPlaceholderThumbnail(i, post.caption || String(i + 1));
        return (
          <Link
            key={post.id}
            href={`/dashboard/social-accounts/${accountId}/posts/${post.id}`}
            className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100"
          >
            {/* Thumbnail */}
            <img src={thumb} alt="" className="h-full w-full object-cover" />

            {/* Type badge */}
            {post.type === 'video' && (
              <div className="absolute top-2 right-2">
                <Play className="h-4 w-4 text-white drop-shadow-lg" fill="white" />
              </div>
            )}
            {post.type === 'carousel' && (
              <div className="absolute top-2 right-2">
                <svg className="h-4 w-4 text-white drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="2" width="15" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect x="7" y="7" width="15" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            )}

            {/* Status indicator for non-published */}
            {post.status !== 'published' && (
              <div className="absolute top-2 left-2">
                <Badge variant={post.status === 'scheduled' ? 'blue' : 'red'} className="text-[9px] px-1.5 py-0.5">
                  {post.status === 'scheduled' ? 'Scheduled' : 'Failed'}
                </Badge>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
              <span className="flex items-center gap-1 text-sm font-semibold">
                <Heart className="h-4 w-4" fill="white" /> {fmt(post.likes)}
              </span>
              <span className="flex items-center gap-1 text-sm font-semibold">
                <MessageCircle className="h-4 w-4" fill="white" /> {fmt(post.comments)}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AccountDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const accountId = params.accountId as string;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [postFilter, setPostFilter] = useState<'all' | 'published' | 'scheduled'>('all');

  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch account profile
  // ---------------------------------------------------------------------------

  const fetchProfile = useCallback(async (): Promise<void> => {
    try {
      const accounts = await apiClient.get<ApiAccount[]>('/social-accounts');
      const account = accounts.find((a) => a.id === accountId);
      if (!account) {
        setNotFound(true);
        return;
      }
      setProfile(mapApiToProfile(account));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load account';
      setError(message);
    }
  }, [accountId]);

  // ---------------------------------------------------------------------------
  // Fetch posts for this account
  // ---------------------------------------------------------------------------

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parsePostResponse(response: any): any[] {
    if (Array.isArray(response)) return response;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (response?.data && Array.isArray((response as any).data)) return (response as any).data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (response?.items && Array.isArray((response as any).items)) return (response as any).items;
    return [];
  }

  const fetchPosts = useCallback(async (): Promise<void> => {
    try {
      // First: fetch posts targeted to this specific social account
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let response = await apiClient.get<any>(`/posts?socialAccountId=${accountId}&limit=50`);
      let rawPosts = parsePostResponse(response);

      // Fallback: if no posts found via socialAccountId filter, fetch recent posts overall
      if (rawPosts.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        response = await apiClient.get<any>('/posts?limit=20');
        rawPosts = parsePostResponse(response);
      }

      setPosts(rawPosts.map(mapApiToPost));
    } catch {
      // Posts are non-fatal — page still usable without them
      setPosts([]);
    }
  }, [accountId]);

  // ---------------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------------

  // Auto-sync: trigger sync on page load (backend skips if recently synced)
  const autoSync = useCallback(async (): Promise<void> => {
    try {
      const result = await apiClient.post<{ synced: number; message: string; skipped?: boolean }>(
        `/social-accounts/${accountId}/sync`,
        {},
      );
      if (result?.synced > 0) {
        setSyncMessage(`${result.synced} new post${result.synced > 1 ? 's' : ''} synced`);
      }
    } catch {
      // Auto-sync is non-fatal
    }
  }, [accountId]);

  const loadAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    await fetchProfile();
    // Auto-sync first (backend handles cooldown), then fetch posts
    await autoSync();
    await fetchPosts();
    setLoading(false);
  }, [fetchProfile, fetchPosts, autoSync]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ---------------------------------------------------------------------------
  // Sync posts from platform
  // ---------------------------------------------------------------------------

  const handleSync = useCallback(async (): Promise<void> => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await apiClient.post<{ synced: number; message: string; skipped?: boolean }>(
        `/social-accounts/${accountId}/sync?force=true`,
        {},
      );
      const synced = result?.synced ?? 0;
      const message = result?.message ?? 'Sync complete';
      setSyncMessage(message);
      if (synced > 0) {
        await fetchPosts();
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncMessage('Sync failed — check console for details');
    } finally {
      setSyncing(false);
    }
  }, [accountId, fetchPosts]);

  // ---------------------------------------------------------------------------
  // Filtered posts
  // ---------------------------------------------------------------------------

  const filteredPosts = useMemo(() => {
    if (postFilter === 'all') return posts;
    return posts.filter((p) => p.status === postFilter);
  }, [posts, postFilter]);

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-slate-500 text-lg">Account not found</p>
        <Link href="/dashboard/social-accounts">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to accounts
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-slate-700 font-medium">Something went wrong</p>
        <p className="text-sm text-slate-500">{error}</p>
        <Button variant="outline" onClick={() => void loadAll()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">No profile data available</p>
        <Link href="/dashboard/social-accounts">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to accounts
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button + sync button row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/social-accounts')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to accounts
        </button>
        <div className="flex items-center gap-3">
          {syncMessage && (
            <span className="text-xs text-slate-500">{syncMessage}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSync()}
            disabled={syncing}
            className="gap-1.5"
          >
            {syncing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <RefreshCw className="h-3.5 w-3.5" />}
            {syncing ? 'Syncing...' : 'Sync Posts'}
          </Button>
        </div>
      </div>

      {/* Profile header */}
      <ProfileHeader profile={profile} />

      {/* Monthly analytics — only rendered when metrics are available */}
      {profile.monthlyMetrics.length >= 2 && (
        <MonthlyAnalytics metrics={profile.monthlyMetrics} />
      )}

      {/* Posts section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-slate-400" /> Posts
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Filter */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                {(['all', 'published', 'scheduled'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPostFilter(f)}
                    className={cn(
                      'px-3 py-1.5 capitalize transition-colors',
                      postFilter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {/* View toggle */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600')}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPosts.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-400">No posts found</p>
          ) : viewMode === 'grid' ? (
            <PostGrid posts={filteredPosts} accountId={accountId} />
          ) : (
            <div className="space-y-2">
              {filteredPosts.map((post, i) => {
                const thumb = post.thumbnail ?? getPlaceholderThumbnail(i, post.caption || String(i + 1));
                return (
                  <Link
                    key={post.id}
                    href={`/dashboard/social-accounts/${accountId}/posts/${post.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <img src={thumb} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {post.caption || <span className="text-slate-400 italic">No caption</span>}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" /> {fmt(post.likes)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-amber-500" /> {fmt(post.comments)}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-blue-500" /> {fmt(post.impressions)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
