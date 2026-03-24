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
  Loader2,
  AlertCircle,
  CheckCircle2,
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
import { CalendarView, type Post, type PostStatus } from '@/components/posts/calendar-view';
import { apiClient } from '@/lib/api-client';

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

interface ApiPost {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
  clientId: string | null;
  client?: { id: string; name: string } | null;
  createdAt: string;
  metrics?: {
    likes?: number;
    comments?: number;
    impressions?: number;
    engagementRate?: number;
  } | null;
}

// ---------------------------------------------------------------------------
// Map API post to frontend Post shape
// ---------------------------------------------------------------------------

function mapApiPost(a: ApiPost): Post {
  return {
    id: a.id,
    title: a.title || 'Untitled Post',
    content: typeof a.content === 'object' && a.content !== null ? (a.content as Record<string, unknown>).text as string ?? JSON.stringify(a.content) : (a.content ?? ''),
    platforms: (a.platforms ?? []).map((p) => p.toLowerCase()) as Platform[],
    status: (a.status.toLowerCase()) as PostStatus,
    scheduledAt: a.scheduledAt,
    clientId: a.clientId ?? '',
    clientName: a.client?.name ?? '',
    createdAt: a.createdAt,
    metrics: a.metrics
      ? {
          likes: a.metrics.likes ?? 0,
          comments: a.metrics.comments ?? 0,
          impressions: a.metrics.impressions ?? 0,
          engagementRate: a.metrics.engagementRate ?? 0,
        }
      : undefined,
  };
}

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
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [view, setView] = React.useState<'list' | 'calendar'>('list');

  // Filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [platformFilter, setPlatformFilter] = React.useState('');
  const [clientFilter, setClientFilter] = React.useState('');

  // Dialogs
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // ── Fetch posts ───────────────────────────────────────────────────────────
  const fetchPosts = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (statusFilter) params.set('status', statusFilter);
      if (platformFilter) params.set('platform', platformFilter);
      if (clientFilter) params.set('clientId', clientFilter);
      const data = await apiClient.get<ApiPost[]>(`/posts?${params.toString()}`);
      setPosts(data.map(mapApiPost));
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, platformFilter, clientFilter]);

  React.useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  // ── Derived filtered list (client-side search only) ───────────────────────
  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return posts;
    return posts.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q)
    );
  }, [posts, search]);

  // ── Client filter options derived from loaded posts ───────────────────────
  const clientOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    posts.forEach((p) => {
      if (p.clientId && p.clientName && !seen.has(p.clientId)) {
        seen.set(p.clientId, p.clientName);
      }
    });
    return [
      { value: '', label: 'All Clients' },
      ...Array.from(seen.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [posts]);

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string): Promise<void> {
    setDeleting(true);
    try {
      await apiClient.delete(`/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setDeleteTargetId(null);
      setToast({ message: 'Post deleted', type: 'success' });
    } catch (err) {
      console.error('Failed to delete post:', err);
      setToast({ message: 'Failed to delete post. Please try again.', type: 'error' });
      setDeleteTargetId(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Duplicate (optimistic local copy, then create via API) ────────────────
  async function handleDuplicate(id: string): Promise<void> {
    const original = posts.find((p) => p.id === id);
    if (!original) return;
    try {
      const created = await apiClient.post<ApiPost>('/posts', {
        title: `${original.title} (Copy)`,
        content: original.content,
        platforms: original.platforms,
        clientId: original.clientId || undefined,
      });
      setPosts((prev) => [mapApiPost(created), ...prev]);
      setToast({ message: 'Post duplicated', type: 'success' });
    } catch (err) {
      console.error('Failed to duplicate post:', err);
      setToast({ message: 'Failed to duplicate post. Please try again.', type: 'error' });
    }
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Posts</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {loading
                ? 'Loading posts...'
                : `${filtered.length} of ${posts.length} post${posts.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link href="/dashboard/posts/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </Link>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button
              type="button"
              onClick={() => void fetchPosts()}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

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
              options={clientOptions}
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

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
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
                      const statusCfg = STATUS_BADGE[post.status] ?? STATUS_BADGE['draft'];
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
                            {post.clientName || <span className="text-slate-300">—</span>}
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <RowActions
                              postId={post.id}
                              onDelete={(id) => setDeleteTargetId(id)}
                              onDuplicate={(id) => void handleDuplicate(id)}
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
          </>
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
            disabled={deleting}
            onClick={() => {
              if (deleteTargetId !== null) void handleDelete(deleteTargetId);
            }}
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Post'
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
