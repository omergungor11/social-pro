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
  ArrowUpDown,
  XCircle,
  ImageIcon,
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
import { useBrandStore } from '@/stores/brand-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ---------------------------------------------------------------------------
// Raw API shapes
// The list endpoint returns PaginatedResponseDto: { items, total, page, limit }
// Each item is a Post with _count: { targets, media }
// The findOne endpoint returns PostFull with targets[].socialAccount.platform
// ---------------------------------------------------------------------------

interface ApiPostTarget {
  id?: string;
  platform?: string;
  status?: string;
  platformSpecificContent?: {
    likes?: number;
    comments?: number;
    impressions?: number;
    reach?: number;
  } | null;
  socialAccount?: {
    id?: string;
    platform?: string;
    platformUsername?: string;
    displayName?: string;
  };
}

interface ApiPostMedia {
  id?: string;
  url?: string;
  thumbnailUrl?: string | null;
  mediaType?: string;
}

interface ApiPostClient {
  id?: string;
  name?: string;
}

interface ApiPostRaw {
  id: string;
  title?: string | null;
  content?: unknown;
  status?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  clientId?: string | null;
  client?: ApiPostClient | null;
  createdAt?: string;
  // list items have _count
  _count?: {
    targets?: number;
    media?: number;
    likes?: number;
    comments?: number;
    impressions?: number;
  };
  // detail items have full targets array
  targets?: ApiPostTarget[];
  // list items include the first media item (thumbnail)
  media?: ApiPostMedia[];
  // some endpoints may return platforms directly
  platforms?: string[];
  metrics?: {
    likes?: number;
    comments?: number;
    impressions?: number;
    engagementRate?: number;
  } | null;
}

interface PaginatedApiResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Map raw API post → frontend Post shape
// SAFE: all field accesses use ?? fallbacks
// ---------------------------------------------------------------------------

function mapApiPost(a: ApiPostRaw): Post {
  // Resolve platform list from multiple possible shapes
  let platforms: Platform[] = [];

  if (Array.isArray(a.targets) && a.targets.length > 0) {
    platforms = (a.targets as ApiPostTarget[])
      .map((t) => (t.socialAccount?.platform ?? t.platform ?? '').toLowerCase())
      .filter((p): p is Platform => p.length > 0) as Platform[];
  } else if (Array.isArray(a.platforms) && a.platforms.length > 0) {
    platforms = (a.platforms as string[])
      .map((p) => p.toLowerCase())
      .filter((p): p is Platform => p.length > 0) as Platform[];
  }

  // Resolve content text safely
  let contentText = '';
  if (typeof a.content === 'object' && a.content !== null) {
    const c = a.content as Record<string, unknown>;
    contentText = typeof c['text'] === 'string' ? c['text'] : JSON.stringify(a.content);
  } else if (typeof a.content === 'string') {
    contentText = a.content;
  }

  // Aggregate engagement from each target's platformSpecificContent.
  let likes = 0;
  let comments = 0;
  let impressions = 0;
  if (Array.isArray(a.targets)) {
    for (const t of a.targets) {
      const psc = t.platformSpecificContent;
      if (psc) {
        likes += psc.likes ?? 0;
        comments += psc.comments ?? 0;
        impressions += psc.impressions ?? psc.reach ?? 0;
      }
    }
  }
  // Fall back to a directly-provided metrics object if present.
  if (a.metrics) {
    likes = a.metrics.likes ?? likes;
    comments = a.metrics.comments ?? comments;
    impressions = a.metrics.impressions ?? impressions;
  }
  const engagementRate =
    a.metrics?.engagementRate != null
      ? a.metrics.engagementRate
      : impressions > 0
      ? Number((((likes + comments) / impressions) * 100).toFixed(1))
      : 0;
  const hasEngagement = likes > 0 || comments > 0 || impressions > 0;

  // Resolve a thumbnail from the first media item.
  const firstMedia = Array.isArray(a.media) ? a.media[0] : undefined;
  const thumbnail = firstMedia?.thumbnailUrl ?? firstMedia?.url ?? null;

  return {
    id: a.id,
    title: a.title ?? 'Untitled Post',
    content: contentText,
    platforms,
    status: ((a.status ?? 'DRAFT').toLowerCase()) as PostStatus,
    scheduledAt: a.scheduledAt ?? null,
    publishedAt: a.publishedAt ?? null,
    clientId: a.clientId ?? '',
    clientName: a.client?.name ?? '',
    createdAt: a.createdAt ?? new Date().toISOString(),
    thumbnail,
    metrics: hasEngagement
      ? { likes, comments, impressions, engagementRate }
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
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg',
        type === 'success'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      )}
    >
      {type === 'success' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {message}
      <button
        type="button"
        onClick={onClose}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PLATFORM_OPTIONS = [
  { value: '', label: 'All Platforms' },
  { value: 'TWITTER', label: 'Twitter / X' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'YOUTUBE', label: 'YouTube' },
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
  publishing: { variant: 'purple', label: 'Publishing' },
  published: { variant: 'green', label: 'Published' },
  failed: { variant: 'red', label: 'Failed' },
  cancelled: { variant: 'default', label: 'Cancelled' },
};

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

type SortKey = 'title' | 'status' | 'engagement' | 'scheduled' | 'created';

/** Best available date for a post — the actual "when it went out" timestamp. */
function effectiveTime(p: Post): number {
  const v = p.scheduledAt ?? p.publishedAt ?? p.createdAt ?? null;
  return v ? new Date(v).getTime() : 0;
}

function sortPosts(list: Post[], key: SortKey, dir: 'asc' | 'desc'): Post[] {
  const sign = dir === 'asc' ? 1 : -1;
  const engagementOf = (p: Post): number =>
    p.metrics ? p.metrics.likes + p.metrics.comments : -1;
  const timeOf = (v: string | null): number => (v ? new Date(v).getTime() : 0);

  return [...list].sort((a, b) => {
    switch (key) {
      case 'title':
        return sign * a.title.localeCompare(b.title);
      case 'status':
        return sign * a.status.localeCompare(b.status);
      case 'engagement':
        return sign * (engagementOf(a) - engagementOf(b));
      case 'scheduled':
        return sign * (timeOf(a.scheduledAt) - timeOf(b.scheduledAt));
      case 'created':
      default:
        // Order by the post's effective date (published/scheduled), newest first.
        return sign * (effectiveTime(a) - effectiveTime(b));
    }
  });
}

// ---------------------------------------------------------------------------
// Sortable column header
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  sortKey: key,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  className?: string;
}): React.JSX.Element {
  const active = key === activeKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(key)}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-slate-900',
          active ? 'text-slate-900 font-semibold' : 'text-slate-500'
        )}
      >
        {label}
        <ArrowUpDown
          className={cn('h-3 w-3 transition-opacity', active ? 'opacity-100' : 'opacity-30')}
        />
        {active && <span className="sr-only">{dir === 'asc' ? 'ascending' : 'descending'}</span>}
      </button>
    </TableHead>
  );
}

// ---------------------------------------------------------------------------
// Row actions dropdown
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
          <div className="my-1 border-t border-slate-100" />
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
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
      {hasFilters ? (
        <>
          <p className="text-sm font-medium text-slate-700">No posts match your filters</p>
          <p className="mt-1 text-xs text-slate-400">Try adjusting your search or filter criteria.</p>
          <button
            type="button"
            onClick={onClear}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800 transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-700">No posts yet</p>
          <p className="mt-1 text-xs text-slate-400">Create your first post to get started.</p>
          <Link href="/dashboard/posts/new" className="mt-4">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function PostsPage(): React.JSX.Element {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [view, setView] = React.useState<'list' | 'calendar'>('list');

  // Filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [platformFilter, setPlatformFilter] = React.useState('');
  const selectedBrandId = useBrandStore((s) => s.selectedBrandId);

  // Sorting
  const [sortKey, setSortKey] = React.useState<SortKey>('created');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  // Selection (bulk operations)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  // Anchor row index for shift-click range selection.
  const [anchorIndex, setAnchorIndex] = React.useState<number | null>(null);

  // Dialogs
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [bulkBusy, setBulkBusy] = React.useState(false);

  // ── Fetch posts ────────────────────────────────────────────────────────────
  const fetchPosts = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('limit', '100');
      params.set('page', '1');
      if (statusFilter) params.set('status', statusFilter);
      if (platformFilter) params.set('platform', platformFilter);
      if (selectedBrandId) params.set('clientId', selectedBrandId);

      // The API wraps the paginated response in { data: { items, total, page, limit } }
      // apiClient.get already unwraps the outer { data } envelope
      const response = await apiClient.get<PaginatedApiResponse<ApiPostRaw> | ApiPostRaw[]>(
        `/posts?${params.toString()}`
      );

      // apiClient unwraps the outer {data} wrapper from ResponseInterceptor
      // PaginatedResponseDto returns {data: T[], meta: {page, limit, total}}
      // So response is either: {data: [...], meta: {...}} or a raw array
      let items: ApiPostRaw[];
      if (Array.isArray(response)) {
        items = response as ApiPostRaw[];
        setTotalCount(items.length);
      } else {
        const paginated = response as unknown as Record<string, unknown>;
        const rawItems = ((paginated['data'] ?? paginated['items'] ?? []) as unknown) as ApiPostRaw[];
        items = rawItems;
        const meta = paginated['meta'] as { total?: number } | undefined;
        setTotalCount(meta?.total ?? rawItems.length);
      }
      setPosts(items.map(mapApiPost));
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, platformFilter, selectedBrandId]);

  React.useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  // ── Client-side search filter ──────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.clientName ?? '').toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
    );
  }, [posts, search]);

  // ── Sorted view ────────────────────────────────────────────────────────────
  const sorted = React.useMemo(
    () => sortPosts(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir]
  );

  function handleSort(key: SortKey): void {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'title' ? 'asc' : 'desc');
    }
  }

  // ── Selection helpers ──────────────────────────────────────────────────────
  // Prune selected ids that are no longer visible after filtering.
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(sorted.map((p) => p.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [sorted]);

  const allSelected = sorted.length > 0 && sorted.every((p) => selectedIds.has(p.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleSelect(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Handle a checkbox click; supports shift-click range selection over the
  // currently displayed (sorted) order. Works for mouse and keyboard (Space
  // on a focused checkbox dispatches a click event).
  function handleRowToggle(e: React.MouseEvent, index: number): void {
    const id = sorted[index]?.id;
    if (!id) return;

    if (e.shiftKey && anchorIndex !== null && anchorIndex !== index) {
      const start = Math.min(anchorIndex, index);
      const end = Math.max(anchorIndex, index);
      const rangeIds = sorted.slice(start, end + 1).map((p) => p.id);
      // Select the whole range if the clicked row was unselected; otherwise
      // deselect the whole range — matching common spreadsheet behaviour.
      const shouldSelect = !selectedIds.has(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        rangeIds.forEach((rid) => {
          if (shouldSelect) next.add(rid);
          else next.delete(rid);
        });
        return next;
      });
    } else {
      toggleSelect(id);
    }
    setAnchorIndex(index);
  }

  function toggleSelectAll(): void {
    setSelectedIds((prev) =>
      prev.size === sorted.length ? new Set() : new Set(sorted.map((p) => p.id))
    );
  }

  // ── Bulk: delete ───────────────────────────────────────────────────────────
  async function handleBulkDelete(): Promise<void> {
    const ids = [...selectedIds];
    setBulkBusy(true);
    const results = await Promise.allSettled(
      ids.map((id) => apiClient.delete(`/posts/${id}`))
    );
    const okIds = ids.filter((_, i) => results[i]?.status === 'fulfilled');
    const failed = ids.length - okIds.length;
    setPosts((prev) => prev.filter((p) => !okIds.includes(p.id)));
    setTotalCount((prev) => Math.max(0, prev - okIds.length));
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    setBulkBusy(false);
    setToast({
      message:
        failed > 0
          ? `${okIds.length} deleted, ${failed} failed.`
          : `${okIds.length} post${okIds.length !== 1 ? 's' : ''} deleted.`,
      type: failed > 0 ? 'error' : 'success',
    });
  }

  // ── Bulk: cancel scheduled ─────────────────────────────────────────────────
  async function handleBulkCancel(): Promise<void> {
    const ids = sorted
      .filter((p) => selectedIds.has(p.id) && p.status === 'scheduled')
      .map((p) => p.id);
    if (ids.length === 0) {
      setToast({ message: 'No scheduled posts selected.', type: 'error' });
      return;
    }
    setBulkBusy(true);
    const results = await Promise.allSettled(
      ids.map((id) => apiClient.post(`/posts/${id}/cancel`, {}))
    );
    const okIds = ids.filter((_, i) => results[i]?.status === 'fulfilled');
    setPosts((prev) =>
      prev.map((p) => (okIds.includes(p.id) ? { ...p, status: 'cancelled' as PostStatus } : p))
    );
    setSelectedIds(new Set());
    setBulkBusy(false);
    setToast({
      message: `${okIds.length} post${okIds.length !== 1 ? 's' : ''} cancelled.`,
      type: 'success',
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string): Promise<void> {
    setDeleting(true);
    try {
      await apiClient.delete(`/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setDeleteTargetId(null);
      setToast({ message: 'Post deleted successfully.', type: 'success' });
    } catch (err) {
      console.error('Failed to delete post:', err);
      setToast({ message: 'Failed to delete post. Please try again.', type: 'error' });
      setDeleteTargetId(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Duplicate ──────────────────────────────────────────────────────────────
  async function handleDuplicate(id: string): Promise<void> {
    const original = posts.find((p) => p.id === id);
    if (!original) return;
    setDuplicatingId(id);
    try {
      const created = await apiClient.post<ApiPostRaw>('/posts', {
        title: `${original.title} (Copy)`,
        content: { text: original.content },
        clientId: original.clientId || undefined,
        // No targets — draft starts without social account targets
      });
      setPosts((prev) => [mapApiPost(created), ...prev]);
      setTotalCount((prev) => prev + 1);
      setToast({ message: 'Post duplicated as draft.', type: 'success' });
    } catch (err) {
      console.error('Failed to duplicate post:', err);
      setToast({ message: 'Failed to duplicate post. Please try again.', type: 'error' });
    } finally {
      setDuplicatingId(null);
    }
  }

  const hasFilters = Boolean(search || statusFilter || platformFilter);

  function clearFilters(): void {
    setSearch('');
    setStatusFilter('');
    setPlatformFilter('');
  }

  return (
    <>
      {toast !== null && (
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
                : hasFilters
                ? `${filtered.length} of ${totalCount} post${totalCount !== 1 ? 's' : ''}`
                : `${totalCount} post${totalCount !== 1 ? 's' : ''}`}
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
        {error !== null && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void fetchPosts()}
              className="ml-auto shrink-0 text-xs underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* View toggle + filters */}
        <div className="flex flex-wrap items-end gap-3">
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === 'list'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
              aria-pressed={view === 'list'}
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
              aria-pressed={view === 'calendar'}
            >
              <CalendarDays className="h-4 w-4" />
              Calendar
            </button>
          </div>

          {/* Search */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search posts"
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 py-2',
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
          <div className="w-40 shrink-0">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
              aria-label="Filter by status"
            />
          </div>

          {/* Platform filter */}
          <div className="w-44 shrink-0">
            <Select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              options={PLATFORM_OPTIONS}
              aria-label="Filter by platform"
            />
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Bulk action bar */}
        {view === 'list' && selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.size} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-white"
                disabled={bulkBusy}
                onClick={() => void handleBulkCancel()}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel scheduled
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 bg-white text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                disabled={bulkBusy}
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* LIST VIEW */}
            {view === 'list' && (
              sorted.length === 0 ? (
                <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          onChange={toggleSelectAll}
                          aria-label="Select all posts"
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </TableHead>
                      <SortHeader label="Post" sortKey="title" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <TableHead className="hidden sm:table-cell">Platforms</TableHead>
                      <SortHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                      <SortHeader label="Engagement" sortKey="engagement" activeKey={sortKey} dir={sortDir} onSort={handleSort} className="hidden md:table-cell" />
                      <SortHeader label="Scheduled" sortKey="scheduled" activeKey={sortKey} dir={sortDir} onSort={handleSort} className="hidden lg:table-cell" />
                      <TableHead className="hidden xl:table-cell">Client</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((post, index) => {
                      const statusCfg = STATUS_BADGE[post.status] ?? STATUS_BADGE.draft;
                      const m = post.metrics;
                      const isDuplicating = duplicatingId === post.id;
                      const isSelected = selectedIds.has(post.id);

                      return (
                        <TableRow key={post.id} className={cn(isDuplicating && 'opacity-50', isSelected && 'bg-blue-50/40')}>
                          {/* Selection checkbox — supports shift-click range select */}
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => { /* handled in onClick for shift support */ }}
                              onClick={(e) => handleRowToggle(e, index)}
                              aria-label={`Select ${post.title}`}
                              className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 select-none"
                            />
                          </TableCell>

                          {/* Post — thumbnail + title + content preview + hover tooltip + edit icon */}
                          <TableCell>
                            <div className="flex items-start gap-3 max-w-[420px]">
                              {/* Thumbnail */}
                              <div className="mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-slate-50">
                                {post.thumbnail ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={post.thumbnail} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                                    <ImageIcon className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 relative group/preview">
                                <Link
                                  href={`/dashboard/posts/${post.id}`}
                                  className="block group/link"
                                >
                                  <p className="truncate text-sm font-medium text-slate-900 group-hover/link:text-blue-600 transition-colors">
                                    {post.title}
                                  </p>
                                  {post.content && (
                                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                      {post.content.length > 120 ? post.content.slice(0, 120) + '...' : post.content}
                                    </p>
                                  )}
                                </Link>
                                {/* Hover preview tooltip */}
                                {post.content && post.content.length > 60 && (
                                  <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 group-hover/preview:block">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Preview</p>
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-6">
                                      {post.content}
                                    </p>
                                    {post.platforms.length > 0 && (
                                      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                                        {[...new Set(post.platforms)].map((p) => (
                                          <PlatformIcon key={p} platform={p} size="sm" />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <Link
                                href={`/dashboard/posts/${post.id}`}
                                className="mt-0.5 shrink-0 rounded-md p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Edit post"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </TableCell>

                          {/* Platforms */}
                          <TableCell className="hidden sm:table-cell">
                            {post.platforms.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {[...new Set(post.platforms)].map((p) => (
                                  <div key={p} className="flex items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 border border-slate-100">
                                    <PlatformIcon platform={p} size="sm" />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs italic">No platform</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge variant={statusCfg.variant}>
                              {statusCfg.label}
                            </Badge>
                          </TableCell>

                          {/* Engagement metrics */}
                          <TableCell className="hidden md:table-cell">
                            {m ? (
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1" title="Likes">
                                  <Heart className="h-3 w-3 text-red-400" />
                                  {fmtNum(m.likes)}
                                </span>
                                <span className="flex items-center gap-1" title="Comments">
                                  <MessageCircle className="h-3 w-3 text-amber-500" />
                                  {fmtNum(m.comments)}
                                </span>
                                <span className="flex items-center gap-1" title="Impressions">
                                  <Eye className="h-3 w-3 text-blue-500" />
                                  {fmtNum(m.impressions)}
                                </span>
                                <span className="flex items-center gap-1 text-emerald-600 font-medium" title="Engagement Rate">
                                  <TrendingUp className="h-3 w-3" />
                                  {m.engagementRate}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </TableCell>

                          {/* Scheduled date */}
                          <TableCell className="hidden lg:table-cell text-slate-500 text-xs">
                            {post.scheduledAt !== null ? (
                              new Date(post.scheduledAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </TableCell>

                          {/* Client */}
                          <TableCell className="hidden xl:table-cell text-slate-600 text-xs">
                            {post.clientName || <span className="text-slate-300">—</span>}
                          </TableCell>

                          {/* Row actions */}
                          <TableCell>
                            {isDuplicating ? (
                              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            ) : (
                              <RowActions
                                postId={post.id}
                                onDelete={(id) => setDeleteTargetId(id)}
                                onDuplicate={(id) => void handleDuplicate(id)}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )
            )}

            {/* CALENDAR VIEW */}
            {view === 'calendar' && (
              <CalendarView
                posts={sorted}
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
        description="This will permanently remove the post and any associated schedule. This action cannot be undone."
      >
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteTargetId(null)}
            disabled={deleting}
          >
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

      {/* Bulk delete confirmation dialog */}
      <Dialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        title={`Delete ${selectedIds.size} post${selectedIds.size !== 1 ? 's' : ''}`}
        description="This will permanently remove the selected posts and any associated schedules. This action cannot be undone."
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkBusy}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={bulkBusy} onClick={() => void handleBulkDelete()}>
            {bulkBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete ${selectedIds.size} post${selectedIds.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
