'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  List,
  CalendarDays,
  X,
  Search,
  Heart,
  MessageCircle,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  PlatformIcon,
  type Platform,
} from '@/components/social/platform-icon';
import { CalendarView, type Post, type PostStatus, type PostMetrics } from '@/components/posts/calendar-view';

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

function mockMetrics(status: string) {
  if (status !== 'published') return undefined;
  return {
    likes: Math.floor(Math.random() * 3000) + 200,
    comments: Math.floor(Math.random() * 400) + 20,
    impressions: Math.floor(Math.random() * 80000) + 5000,
    engagementRate: parseFloat((Math.random() * 8 + 1.5).toFixed(1)),
  };
}

const MOCK_POSTS: Post[] = [
  { id: 'p1', title: 'Q1 Product Launch Announcement', content: 'Exciting news! We\'re thrilled to announce the launch of our new product line this spring. Stay tuned for more details!', platforms: ['twitter', 'linkedin', 'facebook'], status: 'published', scheduledAt: '2026-03-01T10:00:00Z', clientId: 'c1', clientName: 'Acme Corporation', createdAt: '2026-02-25T08:00:00Z', metrics: { likes: 1842, comments: 234, impressions: 67400, engagementRate: 5.2 } },
  { id: 'p2', title: 'Spring Sale — 30% Off Everything', content: 'Our biggest sale of the year starts NOW. Shop all categories and save 30% sitewide. Limited time only!', platforms: ['instagram', 'facebook'], status: 'scheduled', scheduledAt: '2026-03-20T09:00:00Z', clientId: 'c5', clientName: 'Echo Commerce', createdAt: '2026-03-10T14:30:00Z' },
  { id: 'p3', title: 'Behind the Scenes: Our Design Process', content: 'Ever wonder how we create award-winning designs? Take a peek inside our creative studio and meet the team.', platforms: ['instagram', 'tiktok'], status: 'scheduled', scheduledAt: '2026-03-22T14:00:00Z', clientId: 'c2', clientName: 'Bright Ideas Studio', createdAt: '2026-03-12T09:15:00Z' },
  { id: 'p4', title: 'Thought Leadership: The Future of SaaS', content: 'As we look ahead to 2027, the SaaS landscape is evolving faster than ever. Here are 5 trends you need to know about.', platforms: ['linkedin'], status: 'draft', scheduledAt: null, clientId: 'c3', clientName: 'CloudSync Systems', createdAt: '2026-03-14T11:00:00Z' },
  { id: 'p5', title: 'Patient Wellness Tips — March Edition', content: 'March is National Nutrition Month! Here are our top 5 tips for maintaining a balanced diet and healthy lifestyle.', platforms: ['facebook', 'instagram'], status: 'published', scheduledAt: '2026-03-05T08:00:00Z', clientId: 'c4', clientName: 'Delta Health Partners', createdAt: '2026-03-01T10:00:00Z', metrics: { likes: 956, comments: 178, impressions: 34200, engagementRate: 4.1 } },
  { id: 'p6', title: 'New Feature: Real-time Analytics Dashboard', content: 'We just shipped the most requested feature of 2026 — a fully real-time analytics dashboard. Check it out now!', platforms: ['twitter', 'linkedin'], status: 'scheduled', scheduledAt: '2026-03-25T16:00:00Z', clientId: 'c8', clientName: 'Harbor Analytics', createdAt: '2026-03-15T13:45:00Z' },
  { id: 'p7', title: 'Spring Fitness Challenge — Week 1', content: 'Ready to crush your fitness goals? Join our 8-week Spring Challenge starting Monday. Tag a friend to join you!', platforms: ['instagram', 'tiktok', 'youtube'], status: 'scheduled', scheduledAt: '2026-03-18T07:00:00Z', clientId: 'c15', clientName: 'Olympus Fitness', createdAt: '2026-03-10T16:00:00Z' },
  { id: 'p8', title: 'Legal Tip Tuesday: Know Your Rights', content: 'This week we\'re covering tenant rights in commercial leases. What you need to know before signing anything.', platforms: ['linkedin', 'facebook'], status: 'failed', scheduledAt: '2026-03-11T12:00:00Z', clientId: 'c9', clientName: 'Ironclad Legal', createdAt: '2026-03-09T10:00:00Z' },
  { id: 'p9', title: 'New Collection Drop — Spring Botanicals', content: 'Introducing our Spring Botanicals collection! Infused with rose, chamomile, and lavender. Shop the drop now.', platforms: ['instagram', 'tiktok'], status: 'draft', scheduledAt: null, clientId: 'c10', clientName: 'Jasmine Beauty Co.', createdAt: '2026-03-13T15:30:00Z' },
  { id: 'p10', title: 'Property of the Week: Downtown Penthouse', content: 'Stunning 3-bedroom penthouse in the heart of downtown. Floor-to-ceiling windows, private rooftop terrace. DM for tour.', platforms: ['instagram', 'facebook'], status: 'published', scheduledAt: '2026-03-08T10:00:00Z', clientId: 'c11', clientName: 'Keystone Realty', createdAt: '2026-03-06T09:00:00Z', metrics: { likes: 2340, comments: 312, impressions: 89200, engagementRate: 6.8 } },
  { id: 'p11', title: 'Fintech Insight: Open Banking in 2026', content: 'Open banking is no longer the future — it\'s the present. Learn how our platform leverages open APIs to deliver superior UX.', platforms: ['linkedin', 'twitter'], status: 'scheduled', scheduledAt: '2026-03-26T11:00:00Z', clientId: 'c12', clientName: 'Luminary Fintech', createdAt: '2026-03-16T14:00:00Z' },
  { id: 'p12', title: 'Earth Day Event Recap', content: 'What an incredible Earth Day celebration! Over 500 attendees, 12 local vendors, and so much good energy. See you next year!', platforms: ['facebook', 'instagram', 'twitter'], status: 'published', scheduledAt: '2026-03-03T18:00:00Z', clientId: 'c13', clientName: 'Metro Event Group', createdAt: '2026-03-03T20:00:00Z', metrics: { likes: 1567, comments: 245, impressions: 52100, engagementRate: 5.5 } },
  { id: 'p13', title: 'Dev Tip: TypeScript 5.x Best Practices', content: 'TypeScript 5 brought huge DX improvements. Here are our top picks from the new features that every dev should be using.', platforms: ['twitter', 'linkedin'], status: 'cancelled', scheduledAt: '2026-03-07T09:00:00Z', clientId: 'c14', clientName: 'NorthWave Software', createdAt: '2026-03-04T11:00:00Z' },
  { id: 'p14', title: 'Investor Update Q1 2026', content: 'We are proud to share our Q1 2026 results with the community. Growth is strong across all verticals. Full report linked.', platforms: ['linkedin'], status: 'draft', scheduledAt: null, clientId: 'c6', clientName: 'Founders Launchpad', createdAt: '2026-03-17T10:00:00Z' },
  { id: 'p15', title: 'Recipe of the Week: Spring Grain Bowl', content: 'Fuel your week with our signature spring grain bowl featuring quinoa, roasted beets, edamame, and tahini dressing.', platforms: ['instagram', 'facebook', 'tiktok'], status: 'scheduled', scheduledAt: '2026-03-24T12:00:00Z', clientId: 'c7', clientName: 'Greenleaf Organics', createdAt: '2026-03-16T08:00:00Z' },
  { id: 'p16', title: 'Webinar Reminder: AI for Marketers', content: 'Don\'t forget — our free webinar on using AI in your marketing workflow is tomorrow at 2 PM EST. Register now!', platforms: ['twitter', 'linkedin', 'facebook'], status: 'scheduled', scheduledAt: '2026-03-19T14:00:00Z', clientId: 'c1', clientName: 'Acme Corporation', createdAt: '2026-03-17T09:00:00Z' },
  { id: 'p17', title: 'User Spotlight: Success Story', content: 'Meet @sarahj, who grew her online store 3× in just 6 months using our platform. Read her full story on our blog.', platforms: ['twitter', 'instagram'], status: 'published', scheduledAt: '2026-03-10T11:00:00Z', clientId: 'c3', clientName: 'CloudSync Systems', createdAt: '2026-03-08T16:00:00Z', metrics: { likes: 789, comments: 134, impressions: 28500, engagementRate: 3.9 } },
  { id: 'p18', title: 'TikTok Trend Alert: The #CleanBeauty Challenge', content: 'We\'re joining the #CleanBeauty challenge! Share your clean beauty routine and tag us for a chance to be featured.', platforms: ['tiktok', 'instagram'], status: 'draft', scheduledAt: null, clientId: 'c10', clientName: 'Jasmine Beauty Co.', createdAt: '2026-03-18T10:00:00Z' },
];

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PLATFORM_OPTIONS = [
  { value: '', label: 'All Platforms' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

const CLIENT_OPTIONS = [
  { value: '', label: 'All Clients' },
  ...Array.from(new Set(MOCK_POSTS.map((p) => p.clientId))).map((id) => {
    const post = MOCK_POSTS.find((p) => p.clientId === id);
    return { value: id, label: post?.clientName ?? id };
  }),
];

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<PostStatus, {
  variant: 'default' | 'purple' | 'blue' | 'green' | 'gray' | 'red';
  label: string;
}> = {
  draft: { variant: 'gray', label: 'Draft' },
  scheduled: { variant: 'blue', label: 'Scheduled' },
  published: { variant: 'green', label: 'Published' },
  failed: { variant: 'red', label: 'Failed' },
  cancelled: { variant: 'default', label: 'Cancelled' },
};

// ---------------------------------------------------------------------------
// Row actions menu
// ---------------------------------------------------------------------------

interface RowActionsProps {
  postId: string;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

function RowActions({ postId, onDelete, onDuplicate }: RowActionsProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        aria-label="Post actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-900/10">
          <Link
            href={`/dashboard/posts/${postId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            onClick={() => setOpen(false)}
          >
            <Pencil className="h-3.5 w-3.5 text-slate-400" />
            Edit
          </Link>
          <button
            type="button"
            onClick={() => { onDuplicate(postId); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Copy className="h-3.5 w-3.5 text-slate-400" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => { onDelete(postId); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function PostsPage(): React.JSX.Element {
  const [posts, setPosts] = React.useState<Post[]>(MOCK_POSTS);
  const [view, setView] = React.useState<'list' | 'calendar'>('list');

  // Filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [platformFilter, setPlatformFilter] = React.useState('');
  const [clientFilter, setClientFilter] = React.useState('');

  // Dialogs
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  // Derived filtered list
  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    return posts.filter((p) => {
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q);

      const matchStatus = !statusFilter || p.status === statusFilter;
      const matchPlatform =
        !platformFilter || p.platforms.includes(platformFilter as Platform);
      const matchClient = !clientFilter || p.clientId === clientFilter;

      return matchSearch && matchStatus && matchPlatform && matchClient;
    });
  }, [posts, search, statusFilter, platformFilter, clientFilter]);

  function handleDelete(id: string): void {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setDeleteTargetId(null);
  }

  function handleDuplicate(id: string): void {
    const original = posts.find((p) => p.id === id);
    if (!original) return;
    const copy: Post = {
      ...original,
      id: `${id}-copy-${Date.now()}`,
      title: `${original.title} (Copy)`,
      status: 'draft',
      scheduledAt: null,
      createdAt: new Date().toISOString(),
    };
    setPosts((prev) => [copy, ...prev]);
  }

  const hasFilters = search || statusFilter || platformFilter || clientFilter;

  function clearFilters(): void {
    setSearch('');
    setStatusFilter('');
    setPlatformFilter('');
    setClientFilter('');
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Posts</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {filtered.length} of {posts.length} post{posts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/dashboard/posts/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </Link>
        </div>

        {/* View toggle + filters */}
        <div className="flex flex-wrap items-end gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 gap-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'list'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <List className="h-4 w-4" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'calendar'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </button>
          </div>

          {/* Search */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search posts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
              aria-label="Filter by status"
            />
          </div>

          {/* Platform filter */}
          <div className="w-44">
            <Select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              options={PLATFORM_OPTIONS}
              aria-label="Filter by platform"
            />
          </div>

          {/* Client filter */}
          <div className="w-48">
            <Select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              options={CLIENT_OPTIONS}
              aria-label="Filter by client"
            />
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* ── LIST VIEW ─────────────────────────────────────────────────── */}
        {view === 'list' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead className="hidden sm:table-cell">Platforms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Performance</TableHead>
                <TableHead className="hidden lg:table-cell">Scheduled</TableHead>
                <TableHead className="hidden xl:table-cell">Client</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center text-slate-400">
                    {hasFilters
                      ? 'No posts match your filters.'
                      : 'No posts yet. Create your first post to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((post) => {
                  const statusCfg = STATUS_BADGE[post.status];
                  const m = post.metrics;
                  return (
                    <TableRow key={post.id}>
                      {/* Post — title + content preview */}
                      <TableCell>
                        <Link
                          href={`/dashboard/posts/${post.id}`}
                          className="block max-w-[320px] group"
                        >
                          <p className="truncate text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                            {post.title}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-400 line-clamp-1">
                            {post.content}
                          </p>
                        </Link>
                      </TableCell>

                      {/* Platforms */}
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          {post.platforms.slice(0, 4).map((p) => (
                            <PlatformIcon key={p} platform={p} size="sm" />
                          ))}
                          {post.platforms.length > 4 && (
                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                              +{post.platforms.length - 4}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={statusCfg.variant}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>

                      {/* Performance metrics */}
                      <TableCell className="hidden md:table-cell">
                        {m ? (
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1" title="Likes">
                              <Heart className="h-3 w-3 text-red-400" /> {fmtNum(m.likes)}
                            </span>
                            <span className="flex items-center gap-1" title="Comments">
                              <MessageCircle className="h-3 w-3 text-amber-500" /> {fmtNum(m.comments)}
                            </span>
                            <span className="flex items-center gap-1" title="Impressions">
                              <Eye className="h-3 w-3 text-blue-500" /> {fmtNum(m.impressions)}
                            </span>
                            <span className="flex items-center gap-1 text-emerald-600 font-medium" title="Engagement Rate">
                              <TrendingUp className="h-3 w-3" /> {m.engagementRate}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Scheduled date */}
                      <TableCell className="hidden lg:table-cell text-slate-500 text-xs">
                        {post.scheduledAt !== null
                          ? new Date(post.scheduledAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : <span className="text-slate-300">—</span>}
                      </TableCell>

                      {/* Client */}
                      <TableCell className="hidden xl:table-cell text-slate-600 text-xs">
                        {post.clientName}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <RowActions
                          postId={post.id}
                          onDelete={(id) => setDeleteTargetId(id)}
                          onDuplicate={handleDuplicate}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}

        {/* ── CALENDAR VIEW ─────────────────────────────────────────────── */}
        {view === 'calendar' && (
          <CalendarView
            posts={filtered}
            onPostClick={(post) => {
              window.location.href = `/dashboard/posts/${post.id}`;
            }}
          />
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Delete Post"
        description="This will permanently remove the post. This action cannot be undone."
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (deleteTargetId !== null) handleDelete(deleteTargetId);
            }}
          >
            Delete Post
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
