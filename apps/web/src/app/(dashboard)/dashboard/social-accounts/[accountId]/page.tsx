'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Grid3X3, List, Heart, MessageCircle, Eye, Share2,
  Users, FileText, TrendingUp, TrendingDown, Calendar, ExternalLink,
  BarChart3, Bookmark, Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlatformIcon, getPlatformLabel } from '@/components/social/platform-icon';
import type { Platform } from '@/components/social/platform-icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountProfile {
  id: string;
  platform: Platform;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverUrl?: string;
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
  thumbnail: string;
  type: 'image' | 'video' | 'carousel';
  caption: string;
  publishedAt: string;
  likes: number;
  comments: number;
  impressions: number;
  saves: number;
  shares: number;
  status: 'published' | 'scheduled' | 'failed';
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_PROFILES: Record<string, AccountProfile> = {
  sa1: {
    id: 'sa1', platform: 'twitter', username: 'acmecorp', displayName: 'Acme Corporation',
    bio: 'Building the future, one innovation at a time. 🚀 | Official account of Acme Corp | B2B SaaS',
    avatarUrl: '', coverUrl: '', website: 'https://acmecorp.com', isVerified: true,
    status: 'active', connectedAt: '2024-01-20',
    stats: { followers: 45200, following: 1240, posts: 342, engagementRate: 4.8 },
    monthlyMetrics: [
      { month: 'Oct', followers: 38900, impressions: 720000, likes: 14200, comments: 2400, reach: 456000 },
      { month: 'Nov', followers: 40100, impressions: 780000, likes: 15100, comments: 2600, reach: 489000 },
      { month: 'Dec', followers: 41800, impressions: 810000, likes: 16200, comments: 2800, reach: 512000 },
      { month: 'Jan', followers: 42500, impressions: 835000, likes: 16800, comments: 2900, reach: 534000 },
      { month: 'Feb', followers: 43900, impressions: 860000, likes: 17600, comments: 3050, reach: 558000 },
      { month: 'Mar', followers: 45200, impressions: 892000, likes: 18400, comments: 3200, reach: 578000 },
    ],
  },
  sa2: {
    id: 'sa2', platform: 'instagram', username: 'acmecorp.official', displayName: 'Acme Corp Official',
    bio: '✨ Premium lifestyle & innovation\n📍 San Francisco, CA\n🔗 linktr.ee/acmecorp\n#AcmeLife #Innovation',
    avatarUrl: '', coverUrl: '', website: 'https://linktr.ee/acmecorp', isVerified: true,
    status: 'active', connectedAt: '2024-01-20',
    stats: { followers: 128500, following: 890, posts: 567, engagementRate: 6.2 },
    monthlyMetrics: [
      { month: 'Oct', followers: 112000, impressions: 1890000, likes: 38200, comments: 6800, reach: 1230000 },
      { month: 'Nov', followers: 116400, impressions: 1980000, likes: 39800, comments: 7200, reach: 1290000 },
      { month: 'Dec', followers: 119800, impressions: 2100000, likes: 41200, comments: 7800, reach: 1380000 },
      { month: 'Jan', followers: 122400, impressions: 2180000, likes: 42800, comments: 8100, reach: 1420000 },
      { month: 'Feb', followers: 125200, impressions: 2260000, likes: 44100, comments: 8500, reach: 1480000 },
      { month: 'Mar', followers: 128500, impressions: 2340000, likes: 45600, comments: 8900, reach: 1540000 },
    ],
  },
  sa3: {
    id: 'sa3', platform: 'facebook', username: 'BrightIdeasStudio', displayName: 'Bright Ideas Studio',
    bio: 'Design studio crafting beautiful digital experiences. Branding • UI/UX • Web Development',
    avatarUrl: '', website: 'https://brightideas.studio', isVerified: false,
    status: 'expiring', connectedAt: '2024-02-10',
    stats: { followers: 23400, following: 456, posts: 189, engagementRate: 2.9 },
    monthlyMetrics: [
      { month: 'Oct', followers: 24100, impressions: 520000, likes: 6200, comments: 1400, reach: 340000 },
      { month: 'Nov', followers: 24000, impressions: 498000, likes: 5900, comments: 1350, reach: 325000 },
      { month: 'Dec', followers: 23800, impressions: 480000, likes: 5700, comments: 1300, reach: 310000 },
      { month: 'Jan', followers: 23700, impressions: 470000, likes: 5800, comments: 1250, reach: 305000 },
      { month: 'Feb', followers: 23550, impressions: 462000, likes: 5650, comments: 1220, reach: 298000 },
      { month: 'Mar', followers: 23400, impressions: 456000, likes: 5600, comments: 1200, reach: 290000 },
    ],
  },
};

// Generate mock posts
function generatePosts(platform: Platform): PostItem[] {
  const captions = [
    'New product launch! Excited to share what we\'ve been working on 🚀',
    'Behind the scenes at our latest photoshoot 📸',
    'Meet the team that makes it all happen 💪',
    'Customer spotlight: How @client achieved 3x growth',
    'Tips for maximizing your social media reach',
    'Weekend vibes at the office ☕',
    'Announcing our partnership with @brand',
    'Your Monday motivation starts here ✨',
    'Throwback to our best campaign of the year',
    'Breaking: Industry trends you need to know',
    'New blog post: 5 strategies for 2026',
    'Thank you for 100K followers! 🎉',
  ];
  const colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#ef4444', '#a855f7', '#0ea5e9', '#84cc16'];

  return captions.map((caption, i) => ({
    id: `post-${i + 1}`,
    thumbnail: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${colors[i]}"/><text x="200" y="200" text-anchor="middle" dy=".35em" fill="white" font-size="48" font-family="sans-serif">${i + 1}</text></svg>`)}`,
    type: i % 5 === 0 ? 'video' : i % 7 === 0 ? 'carousel' : 'image' as PostItem['type'],
    caption,
    publishedAt: new Date(2026, 2, 20 - i).toISOString(),
    likes: Math.floor(Math.random() * 2000) + 100,
    comments: Math.floor(Math.random() * 300) + 10,
    impressions: Math.floor(Math.random() * 50000) + 5000,
    saves: Math.floor(Math.random() * 500) + 20,
    shares: Math.floor(Math.random() * 200) + 5,
    status: i < 10 ? 'published' : i === 10 ? 'scheduled' : 'failed',
  }));
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
            <div className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-4 border-white bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl sm:text-4xl font-bold shadow-lg">
              {initial}
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
        <p className="mt-3 text-sm text-slate-600 whitespace-pre-line max-w-lg">{profile.bio}</p>

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

function PostGrid({ posts, accountId }: { posts: PostItem[]; accountId: string }): React.JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/dashboard/social-accounts/${accountId}/posts/${post.id}`}
          className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100"
        >
          {/* Thumbnail */}
          <img src={post.thumbnail} alt="" className="h-full w-full object-cover" />

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
      ))}
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

  const profile = MOCK_PROFILES[accountId];
  const allPosts = useMemo(() => generatePosts(profile?.platform ?? 'instagram'), [profile?.platform]);

  const filteredPosts = useMemo(() => {
    if (postFilter === 'all') return allPosts;
    return allPosts.filter((p) => p.status === postFilter);
  }, [allPosts, postFilter]);

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">Account not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/social-accounts')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to accounts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/dashboard/social-accounts')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to accounts
      </button>

      {/* Profile header */}
      <ProfileHeader profile={profile} />

      {/* Monthly analytics */}
      <MonthlyAnalytics metrics={profile.monthlyMetrics} />

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
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/dashboard/social-accounts/${accountId}/posts/${post.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <img src={post.thumbnail} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{post.caption}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                    <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-red-400" /> {fmt(post.likes)}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3 text-amber-500" /> {fmt(post.comments)}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3 text-blue-500" /> {fmt(post.impressions)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
