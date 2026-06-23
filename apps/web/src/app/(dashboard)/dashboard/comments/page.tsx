'use client';

import * as React from 'react';
import {
  Loader2,
  RefreshCw,
  Send,
  AlertCircle,
  Inbox as InboxIcon,
  ExternalLink,
  Trash2,
  Archive,
  Reply as ReplyIcon,
  CornerDownRight,
  Image as ImageIcon,
  MessageCircle,
} from 'lucide-react';
import {
  InboxItemType,
  InboxItemStatus,
  SocialPlatform,
  type InboxItem,
  type InboxStats,
  type InboxDeleteResult,
} from '@social-pro/shared-types';
import { cn } from '@/lib/utils';
import { apiClient, ApiRequestError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  PlatformIcon,
  getPlatformLabel,
} from '@/components/social/platform-icon';
import { InboxAvatar } from '@/components/inbox/inbox-avatar';
import { relativeTime, toPlatformIcon } from '@/components/inbox/helpers';

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: InboxItemStatus.UNREAD, label: 'Unread' },
  { value: InboxItemStatus.REPLIED, label: 'Replied' },
  { value: InboxItemStatus.ARCHIVED, label: 'Archived' },
];

// Direct messages have their own Messages page — the Comments page lists only
// comments and mentions.
const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: InboxItemType.COMMENT, label: 'Comment' },
  { value: InboxItemType.MENTION, label: 'Mention' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bestTime(item: InboxItem): string | null {
  return item.platformCreatedAt ?? item.createdAt ?? null;
}

function accountLabel(item: InboxItem): string {
  const a = item.account;
  if (!a) return getPlatformLabel(toPlatformIcon(item.platform));
  return (
    a.displayName ??
    (a.username ? `@${a.username}` : getPlatformLabel(toPlatformIcon(item.platform)))
  );
}

const UNGROUPED_KEY = '__ungrouped__';

interface PostGroup {
  key: string;
  postPreviewText: string | null;
  postPreviewImageUrl: string | null;
  postPermalink: string | null;
  platformPostId: string | null;
  platform: SocialPlatform;
  account: InboxItem['account'];
  items: InboxItem[];
}

/** Buckets inbox items into one group per parent post (Instagram/Facebook feed
 * style). Comments that carry no post context land in a single "Other" group. */
function groupByPost(items: InboxItem[]): PostGroup[] {
  const order: string[] = [];
  const map = new Map<string, PostGroup>();

  for (const item of items) {
    const key = item.platformPostId ?? UNGROUPED_KEY;
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        postPreviewText: item.postPreviewText,
        postPreviewImageUrl: item.postPreviewImageUrl,
        postPermalink: item.postPermalink,
        platformPostId: item.platformPostId,
        platform: item.platform,
        account: item.account,
        items: [],
      };
      map.set(key, group);
      order.push(key);
    } else {
      group.postPreviewText ??= item.postPreviewText;
      group.postPreviewImageUrl ??= item.postPreviewImageUrl;
      group.postPermalink ??= item.postPermalink;
      group.account ??= item.account;
    }
    group.items.push(item);
  }

  // Posts first, ungrouped comments last.
  return order
    .map((k) => map.get(k)!)
    .sort((a, b) => {
      if (a.key === UNGROUPED_KEY) return 1;
      if (b.key === UNGROUPED_KEY) return 1;
      return 0;
    });
}

/** Splits a group's items into top-level comments and a map of replies keyed by
 * the parent comment's platform id (our outbound replies thread under these). */
function threadItems(group: PostGroup): {
  topLevel: InboxItem[];
  repliesByParent: Map<string, InboxItem[]>;
} {
  const idSet = new Set(group.items.map((i) => i.platformItemId));
  const repliesByParent = new Map<string, InboxItem[]>();
  const topLevel: InboxItem[] = [];

  for (const item of group.items) {
    const parent = item.parentPlatformId;
    // A reply nests only when its parent is another comment in this group.
    if (parent && idSet.has(parent)) {
      const arr = repliesByParent.get(parent) ?? [];
      arr.push(item);
      repliesByParent.set(parent, arr);
    } else {
      topLevel.push(item);
    }
  }

  const byTime = (a: InboxItem, b: InboxItem): number =>
    (bestTime(a) ?? '').localeCompare(bestTime(b) ?? '');
  topLevel.sort(byTime);
  for (const arr of repliesByParent.values()) arr.sort(byTime);

  return { topLevel, repliesByParent };
}

// ---------------------------------------------------------------------------
// A single comment (with its nested replies + inline reply box)
// ---------------------------------------------------------------------------

function CommentRow({
  comment,
  replies,
  deletingId,
  onReply,
  onDelete,
  onArchive,
  onMarkRead,
}: {
  comment: InboxItem;
  replies: InboxItem[];
  deletingId: string | null;
  onReply: (parent: InboxItem, text: string) => Promise<void>;
  onDelete: (item: InboxItem) => void;
  onArchive: (item: InboxItem) => void;
  onMarkRead: (item: InboxItem) => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const unread = comment.status === InboxItemStatus.UNREAD;
  const replyUnsupported = comment.platform === SocialPlatform.LINKEDIN;

  function toggleReply(): void {
    const next = !open;
    setOpen(next);
    setError(null);
    if (next && unread) onMarkRead(comment);
  }

  async function send(): Promise<void> {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onReply(comment, text.trim());
      setText('');
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Yanıt gönderilemedi.'
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex gap-2.5 px-4 py-3">
      <InboxAvatar
        name={comment.authorName}
        username={comment.authorUsername}
        avatarUrl={comment.authorAvatarUrl}
        className="h-8 w-8 shrink-0"
      />
      <div className="min-w-0 flex-1">
        {/* Comment bubble */}
        <div className="inline-block max-w-full rounded-2xl bg-slate-100 px-3.5 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">
              {comment.authorName ?? comment.authorUsername ?? 'Unknown'}
            </span>
            {unread && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600"
                aria-label="Unread"
              />
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {comment.text ?? <span className="italic text-slate-400">No text</span>}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-1 flex items-center gap-3 pl-1 text-[11px] text-slate-400">
          <span>{relativeTime(bestTime(comment))}</span>
          {!replyUnsupported && (
            <button
              type="button"
              onClick={toggleReply}
              className="flex items-center gap-1 font-medium hover:text-slate-600"
            >
              <ReplyIcon className="h-3 w-3" />
              Reply
            </button>
          )}
          <button
            type="button"
            onClick={() => onArchive(comment)}
            className="flex items-center gap-1 hover:text-slate-600"
          >
            <Archive className="h-3 w-3" />
            Archive
          </button>
          <button
            type="button"
            onClick={() => onDelete(comment)}
            disabled={deletingId === comment.id}
            className="flex items-center gap-1 hover:text-red-500 disabled:opacity-50"
          >
            {deletingId === comment.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
            Delete
          </button>
          {comment.permalink && (
            <a
              href={comment.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-600"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Nested replies */}
        {replies.map((reply) => (
          <div key={reply.id} className="mt-2 flex items-start gap-2 pl-3">
            <CornerDownRight className="mt-2 h-3.5 w-3.5 shrink-0 text-slate-300" />
            <InboxAvatar
              name={reply.authorName}
              username={reply.authorUsername}
              avatarUrl={reply.authorAvatarUrl}
              className="h-6 w-6 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'inline-block max-w-full rounded-2xl px-3 py-1.5',
                  reply.isOutbound ? 'bg-blue-600 text-white' : 'bg-slate-100'
                )}
              >
                <span
                  className={cn(
                    'text-[11px] font-semibold',
                    reply.isOutbound ? 'text-blue-50' : 'text-slate-700'
                  )}
                >
                  {reply.isOutbound
                    ? 'You'
                    : reply.authorName ?? reply.authorUsername ?? 'Unknown'}
                </span>
                <p
                  className={cn(
                    'whitespace-pre-wrap text-sm leading-relaxed',
                    reply.isOutbound ? 'text-white' : 'text-slate-800'
                  )}
                >
                  {reply.text}
                </p>
              </div>
              <div className="mt-0.5 flex items-center gap-3 pl-1 text-[11px] text-slate-400">
                <span>{relativeTime(bestTime(reply))}</span>
                {!reply.isOutbound && (
                  <button
                    type="button"
                    onClick={() => onDelete(reply)}
                    disabled={deletingId === reply.id}
                    className="flex items-center gap-1 hover:text-red-500 disabled:opacity-50"
                  >
                    {deletingId === reply.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Inline reply box */}
        {open && (
          <div className="mt-2 pl-1">
            {error !== null && (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={sending}
                placeholder="Write a reply..."
                rows={1}
                autoFocus
                className={cn(
                  'flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
              <Button
                size="sm"
                className="gap-1.5"
                disabled={sending || !text.trim()}
                onClick={() => void send()}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A post card (post header + media + caption + its comments)
// ---------------------------------------------------------------------------

function PostCard({
  group,
  deletingId,
  onReply,
  onDelete,
  onArchive,
  onMarkRead,
}: {
  group: PostGroup;
  deletingId: string | null;
  onReply: (parent: InboxItem, text: string) => Promise<void>;
  onDelete: (item: InboxItem) => void;
  onArchive: (item: InboxItem) => void;
  onMarkRead: (item: InboxItem) => void;
}): React.JSX.Element {
  const isUngrouped = group.key === UNGROUPED_KEY;
  const { topLevel, repliesByParent } = React.useMemo(
    () => threadItems(group),
    [group]
  );
  const commentCount = topLevel.length;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Post header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="relative shrink-0">
          <InboxAvatar
            name={group.account?.displayName ?? null}
            username={group.account?.username ?? null}
            avatarUrl={group.account?.avatarUrl ?? null}
            className="h-9 w-9"
          />
          <span className="absolute -bottom-1 -right-1">
            <PlatformIcon
              platform={toPlatformIcon(group.platform)}
              size="sm"
              className="h-4 w-4 rounded-md"
            />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {isUngrouped
              ? 'Other comments'
              : group.account?.displayName ??
                getPlatformLabel(toPlatformIcon(group.platform))}
          </p>
          <p className="truncate text-xs text-slate-400">
            {isUngrouped
              ? 'Comments without a linked post'
              : group.account?.username
                ? `@${group.account.username}`
                : getPlatformLabel(toPlatformIcon(group.platform))}
          </p>
        </div>
        {group.postPermalink && (
          <a
            href={group.postPermalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View post
          </a>
        )}
      </div>

      {/* Post preview: medium image + short caption side by side */}
      {!isUngrouped && (group.postPreviewImageUrl || group.postPreviewText) && (
        <div className="flex items-start gap-4 px-4 pb-3">
          {group.postPreviewImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.postPreviewImageUrl}
              alt=""
              className="h-40 w-40 shrink-0 rounded-lg border border-slate-200 object-cover"
            />
          )}
          {group.postPreviewText && (
            <p className="line-clamp-6 min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {group.postPreviewText}
            </p>
          )}
        </div>
      )}

      {/* Comment count divider */}
      <div className="flex items-center gap-1.5 border-y border-slate-100 bg-slate-50/60 px-4 py-1.5 text-xs font-medium text-slate-500">
        <MessageCircle className="h-3.5 w-3.5" />
        {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
      </div>

      {/* Comments */}
      <div className="divide-y divide-slate-50">
        {topLevel.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            replies={repliesByParent.get(comment.platformItemId) ?? []}
            deletingId={deletingId}
            onReply={onReply}
            onDelete={onDelete}
            onArchive={onArchive}
            onMarkRead={onMarkRead}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CommentsPage(): React.JSX.Element {
  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<InboxStats | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('');
  const [platformFilter, setPlatformFilter] = React.useState('');

  // Sync
  const [syncing, setSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  // Mutations
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const groups = React.useMemo(() => groupByPost(items), [items]);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchItems = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '100');
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (platformFilter) params.set('platform', platformFilter);

      const res = await apiClient.getWithMeta<InboxItem[]>(
        `/inbox?${params.toString()}`
      );
      // Comments page lists comments/mentions (+ our replies) — DMs live on the
      // Messages page. Keep REPLY items so they can thread under their parent.
      const comments = (res.data ?? []).filter(
        (it) => it.type !== InboxItemType.DIRECT_MESSAGE
      );
      setItems(comments);
      setTotal(comments.filter((it) => it.type !== InboxItemType.REPLY).length);
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
      setError('Failed to load inbox. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, platformFilter]);

  const fetchStats = React.useCallback(async () => {
    try {
      const data = await apiClient.get<InboxStats>('/inbox/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch inbox stats:', err);
    }
  }, []);

  React.useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  React.useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // ── Platform filter options derived from stats ──────────────────────────────
  const platformOptions = React.useMemo(() => {
    const base = [{ value: '', label: 'All platforms' }];
    const platforms = stats?.byPlatform.map((p) => p.platform) ?? [];
    const unique = Array.from(new Set(platforms));
    return [
      ...base,
      ...unique.map((p) => ({
        value: p,
        label: getPlatformLabel(toPlatformIcon(p)),
      })),
    ];
  }, [stats]);

  // ── Sync ────────────────────────────────────────────────────────────────────
  async function handleSync(): Promise<void> {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await apiClient.post<{ synced: number; message: string }>(
        '/inbox/sync',
        {}
      );
      setSyncMessage(res.message);
      await Promise.all([fetchItems(), fetchStats()]);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setSyncMessage(err.message);
      } else {
        setSyncMessage('Sync failed. Please try again.');
      }
    } finally {
      setSyncing(false);
    }
  }

  // ── Reply (throws so the comment row can show an inline error) ───────────────
  const handleReply = React.useCallback(
    async (parent: InboxItem, text: string): Promise<void> => {
      const reply = await apiClient.post<InboxItem>(
        `/inbox/${parent.id}/reply`,
        { text }
      );
      setItems((prev) => [
        ...prev.map((it) =>
          it.id === parent.id
            ? { ...it, status: InboxItemStatus.REPLIED }
            : it
        ),
        reply,
      ]);
      void fetchStats();
    },
    [fetchStats]
  );

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = React.useCallback(
    async (item: InboxItem): Promise<void> => {
      if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
      setDeletingId(item.id);
      setNotice(null);
      try {
        const result = await apiClient.delete<InboxDeleteResult>(
          `/inbox/${item.id}`
        );
        // Drop the item and any replies that threaded under it.
        setItems((prev) =>
          prev.filter(
            (it) =>
              it.id !== item.id &&
              it.parentPlatformId !== item.platformItemId
          )
        );
        if (!result.platform.supported || !result.platform.success) {
          const reason =
            result.platform.message ?? 'platform bu işlemi desteklemiyor';
          setNotice(`Panelden silindi, ancak platformdan silinemedi: ${reason}`);
        }
      } catch (err) {
        setNotice(
          err instanceof ApiRequestError
            ? err.message
            : 'Silme işlemi başarısız oldu. Lütfen tekrar deneyin.'
        );
      } finally {
        setDeletingId(null);
        void fetchStats();
      }
    },
    [fetchStats]
  );

  // ── Archive ───────────────────────────────────────────────────────────────
  const handleArchive = React.useCallback(
    async (item: InboxItem): Promise<void> => {
      try {
        await apiClient.patch<InboxItem>(`/inbox/${item.id}/status`, {
          status: InboxItemStatus.ARCHIVED,
        });
        // If we're not explicitly viewing archived items, remove it from view.
        setItems((prev) =>
          statusFilter === InboxItemStatus.ARCHIVED
            ? prev.map((it) =>
                it.id === item.id
                  ? { ...it, status: InboxItemStatus.ARCHIVED }
                  : it
              )
            : prev.filter((it) => it.id !== item.id)
        );
        void fetchStats();
      } catch (err) {
        console.error('Failed to archive:', err);
      }
    },
    [statusFilter, fetchStats]
  );

  // ── Mark read ───────────────────────────────────────────────────────────────
  const handleMarkRead = React.useCallback(
    (item: InboxItem): void => {
      void apiClient
        .patch<InboxItem>(`/inbox/${item.id}/status`, {
          status: InboxItemStatus.READ,
        })
        .then(() => {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: InboxItemStatus.READ } : it
            )
          );
          void fetchStats();
        })
        .catch(() => {});
    },
    [fetchStats]
  );

  const hasItems = groups.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comments</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading
              ? 'Loading comments...'
              : `${total} comment${total !== 1 ? 's' : ''}`}
            {stats && stats.unread > 0 && (
              <>
                {' · '}
                <span className="font-medium text-blue-600">
                  {stats.unread} unread
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncMessage !== null && (
            <span className="hidden text-xs text-slate-500 sm:inline">
              {syncMessage}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={syncing}
            onClick={() => void handleSync()}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-36 shrink-0">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
            aria-label="Filter by status"
          />
        </div>
        <div className="w-44 shrink-0">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={TYPE_OPTIONS}
            aria-label="Filter by type"
          />
        </div>
        <div className="w-44 shrink-0">
          <Select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            options={platformOptions}
            aria-label="Filter by platform"
          />
        </div>
      </div>

      {/* Notices */}
      {notice !== null && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto shrink-0 text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
      {error !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchItems()}
            className="ml-auto shrink-0 text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20">
          <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
        </div>
      ) : hasItems ? (
        <div className="mx-auto max-w-2xl space-y-5">
          {groups.map((group) => (
            <PostCard
              key={group.key}
              group={group}
              deletingId={deletingId}
              onReply={handleReply}
              onDelete={(it) => void handleDelete(it)}
              onArchive={(it) => void handleArchive(it)}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <InboxIcon className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No comments yet</p>
          <p className="mt-1 max-w-[280px] text-xs text-slate-400">
            Connect a social account, then press Sync to pull in comments and
            mentions on your posts.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 gap-1.5"
            disabled={syncing}
            onClick={() => void handleSync()}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync now
          </Button>
        </div>
      )}

      {/* Platform stat badges */}
      {stats && stats.byPlatform.length > 0 && (
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2">
          {stats.byPlatform.map((p) => (
            <button
              key={p.platform}
              type="button"
              onClick={() =>
                setPlatformFilter((cur) => (cur === p.platform ? '' : p.platform))
              }
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                platformFilter === p.platform
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              )}
            >
              <PlatformIcon
                platform={toPlatformIcon(p.platform)}
                size="sm"
                className="h-4 w-4 rounded-md"
              />
              <span className="font-medium text-slate-700">{p.total}</span>
              {p.unread > 0 && (
                <Badge variant="blue" className="px-1.5 py-0 text-[10px]">
                  {p.unread}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
