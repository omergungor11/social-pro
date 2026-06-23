'use client';

import * as React from 'react';
import {
  Loader2,
  RefreshCw,
  Send,
  AlertCircle,
  Inbox as InboxIcon,
  ExternalLink,
  ArrowLeft,
  Archive,
  Trash2,
  ChevronDown,
  ChevronRight,
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
import {
  relativeTime,
  toPlatformIcon,
  TYPE_LABEL,
  TYPE_BADGE,
} from '@/components/inbox/helpers';

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: InboxItemStatus.UNREAD, label: 'Unread' },
  { value: InboxItemStatus.REPLIED, label: 'Replied' },
  { value: InboxItemStatus.ARCHIVED, label: 'Archived' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: InboxItemType.COMMENT, label: 'Comment' },
  { value: InboxItemType.MENTION, label: 'Mention' },
  { value: InboxItemType.DIRECT_MESSAGE, label: 'Direct message' },
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
  return a.displayName ?? (a.username ? `@${a.username}` : getPlatformLabel(toPlatformIcon(item.platform)));
}

function hasPostContext(item: InboxItem): boolean {
  return Boolean(
    item.postPreviewText ||
      item.postPreviewImageUrl ||
      item.postPermalink ||
      item.platformPostId
  );
}

const UNGROUPED_KEY = '__direct__';

interface InboxGroup {
  key: string;
  postPreviewText: string | null;
  postPreviewImageUrl: string | null;
  postPermalink: string | null;
  platformPostId: string | null;
  items: InboxItem[];
}

function groupByPost(items: InboxItem[]): InboxGroup[] {
  const order: string[] = [];
  const map = new Map<string, InboxGroup>();

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
        items: [],
      };
      map.set(key, group);
      order.push(key);
    } else {
      group.postPreviewText ??= item.postPreviewText;
      group.postPreviewImageUrl ??= item.postPreviewImageUrl;
      group.postPermalink ??= item.postPermalink;
    }
    group.items.push(item);
  }

  // Direct messages / ungrouped go to the top.
  return order
    .map((k) => map.get(k)!)
    .sort((a, b) => {
      if (a.key === UNGROUPED_KEY) return -1;
      if (b.key === UNGROUPED_KEY) return 1;
      return 0;
    });
}

function groupCaption(group: InboxGroup): string {
  if (group.postPreviewText) return group.postPreviewText;
  if (group.platformPostId) return `Post ${group.platformPostId.slice(0, 8)}`;
  return 'Post';
}

// ---------------------------------------------------------------------------
// List row
// ---------------------------------------------------------------------------

function ListRow({
  item,
  active,
  onSelect,
}: {
  item: InboxItem;
  active: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  const unread = item.status === InboxItemStatus.UNREAD;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors',
        active ? 'bg-blue-50/70' : 'hover:bg-slate-50',
        unread && !active && 'bg-white'
      )}
      aria-current={active}
    >
      <div className="relative shrink-0">
        <InboxAvatar
          name={item.authorName}
          username={item.authorUsername}
          avatarUrl={item.authorAvatarUrl}
        />
        <span className="absolute -bottom-1 -right-1">
          <PlatformIcon platform={toPlatformIcon(item.platform)} size="sm" className="h-4 w-4 rounded-md" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {item.authorName ?? item.authorUsername ?? 'Unknown'}
          </p>
          {item.authorUsername && (
            <span className="truncate text-xs text-slate-400">@{item.authorUsername}</span>
          )}
          <span className="ml-auto shrink-0 text-[11px] text-slate-400">
            {relativeTime(bestTime(item))}
          </span>
          {unread && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 leading-relaxed">
          {item.text ?? <span className="italic text-slate-300">No text</span>}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge variant={TYPE_BADGE[item.type]} className="px-1.5 py-0 text-[10px]">
            {TYPE_LABEL[item.type]}
          </Badge>
          <span className="truncate text-[10px] text-slate-400">{accountLabel(item)}</span>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Post group header (collapsible)
// ---------------------------------------------------------------------------

function PostGroupHeader({
  group,
  expanded,
  unread,
  onToggle,
}: {
  group: InboxGroup;
  expanded: boolean;
  unread: number;
  onToggle: () => void;
}): React.JSX.Element {
  const isDirect = group.key === UNGROUPED_KEY;

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-left transition-colors hover:bg-slate-100"
    >
      {expanded ? (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      )}
      {isDirect ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
          <MessageCircle className="h-4 w-4" />
        </div>
      ) : group.postPreviewImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={group.postPreviewImageUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
          <ImageIcon className="h-4 w-4" />
        </div>
      )}
      <p className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
        {isDirect ? 'Direct messages' : groupCaption(group)}
      </p>
      <span className="shrink-0 text-[11px] text-slate-400">{group.items.length}</span>
      {unread > 0 && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Thread message bubble
// ---------------------------------------------------------------------------

function MessageBubble({
  item,
  onDelete,
  deleting,
}: {
  item: InboxItem;
  onDelete?: (item: InboxItem) => void;
  deleting?: boolean;
}): React.JSX.Element {
  const outbound = item.isOutbound;
  const canDelete = !outbound && onDelete !== undefined;
  return (
    <div className={cn('group flex gap-3', outbound && 'flex-row-reverse')}>
      <InboxAvatar
        name={item.authorName}
        username={item.authorUsername}
        avatarUrl={item.authorAvatarUrl}
        className="h-8 w-8"
      />
      <div className={cn('min-w-0 max-w-[80%]', outbound && 'items-end text-right')}>
        <div className={cn('flex items-center gap-2', outbound && 'flex-row-reverse')}>
          <span className="text-xs font-semibold text-slate-700">
            {outbound ? 'You' : item.authorName ?? item.authorUsername ?? 'Unknown'}
          </span>
          <span className="text-[11px] text-slate-400">{relativeTime(bestTime(item))}</span>
        </div>
        <div className={cn('mt-1 flex items-center gap-1.5', outbound && 'flex-row-reverse')}>
          <div
            className={cn(
              'inline-block rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
              outbound
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-800'
            )}
          >
            {item.text ?? <span className="italic opacity-70">No text</span>}
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete?.(item)}
              disabled={deleting}
              className="shrink-0 rounded-md p-1 text-slate-300 opacity-0 transition-colors hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
              title="Delete comment"
              aria-label="Delete comment"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread pane
// ---------------------------------------------------------------------------

function ThreadPane({
  thread,
  loading,
  onBack,
  onReplied,
  onArchive,
  onDeleted,
}: {
  thread: InboxItem | null;
  loading: boolean;
  onBack: () => void;
  onReplied: (reply: InboxItem) => void;
  onArchive: () => void;
  onDeleted: (id: string, isThreadRoot: boolean) => void;
}): React.JSX.Element {
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [replyError, setReplyError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = React.useState<string | null>(null);
  const [localReplies, setLocalReplies] = React.useState<InboxItem[]>([]);
  const threadId = thread?.id ?? null;

  React.useEffect(() => {
    setText('');
    setReplyError(null);
    setDeleteNotice(null);
    setLocalReplies([]);
  }, [threadId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="hidden flex-1 flex-col items-center justify-center p-10 text-center md:flex">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <InboxIcon className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">Select a conversation</p>
        <p className="mt-1 text-xs text-slate-400">
          Pick an item from the list to view the thread and reply.
        </p>
      </div>
    );
  }

  // Replying works for comments/replies (FB/IG) and mentions (Twitter). It is
  // genuinely unavailable for LinkedIn (no partner API) and for direct messages
  // (our adapters don't send DMs yet) — block those up front; otherwise let the
  // backend be the authority and surface any 400 it returns.
  const replyUnsupported =
    thread.platform === SocialPlatform.LINKEDIN ||
    thread.type === InboxItemType.DIRECT_MESSAGE;
  const replyDisabled = replyUnsupported || replyError !== null;

  async function handleSend(): Promise<void> {
    if (!thread || !text.trim()) return;
    setSending(true);
    setReplyError(null);
    try {
      const reply = await apiClient.post<InboxItem>(`/inbox/${thread.id}/reply`, {
        text: text.trim(),
      });
      onReplied(reply);
      setText('');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setReplyError(err.message);
      } else {
        setReplyError('Failed to send reply. Please try again.');
      }
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(item: InboxItem): Promise<void> {
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    setDeletingId(item.id);
    setDeleteNotice(null);
    try {
      const result = await apiClient.delete<InboxDeleteResult>(`/inbox/${item.id}`);
      const isThreadRoot = item.id === threadId;
      if (!isThreadRoot) {
        setLocalReplies((prev) => [...prev, item]);
      }
      if (!result.platform.supported || !result.platform.success) {
        const reason = result.platform.message ?? 'platform bu işlemi desteklemiyor';
        setDeleteNotice(`Panelden silindi, ancak platformdan silinemedi: ${reason}`);
      }
      onDeleted(item.id, isThreadRoot);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setDeleteNotice(err.message);
      } else {
        setDeleteNotice('Silme işlemi başarısız oldu. Lütfen tekrar deneyin.');
      }
    } finally {
      setDeletingId(null);
    }
  }

  const showPostCard = hasPostContext(thread);
  const captionText = thread.postPreviewText;
  const postLink = thread.postPermalink;
  const removedReplyIds = new Set(localReplies.map((r) => r.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors md:hidden"
          aria-label="Back to list"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative shrink-0">
          <InboxAvatar
            name={thread.authorName}
            username={thread.authorUsername}
            avatarUrl={thread.authorAvatarUrl}
          />
          <span className="absolute -bottom-1 -right-1">
            <PlatformIcon platform={toPlatformIcon(thread.platform)} size="sm" className="h-4 w-4 rounded-md" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {thread.authorName ?? thread.authorUsername ?? 'Unknown'}
          </p>
          <p className="truncate text-xs text-slate-400">
            {TYPE_LABEL[thread.type]} · {accountLabel(thread)}
          </p>
        </div>
        {thread.permalink && (
          <a
            href={thread.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title="Open on platform"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <button
          type="button"
          onClick={onArchive}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          title="Archive"
          aria-label="Archive"
        >
          <Archive className="h-4 w-4" />
        </button>
        {!thread.isOutbound && (
          <button
            type="button"
            onClick={() => void handleDelete(thread)}
            disabled={deletingId === thread.id}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            title="Delete comment"
            aria-label="Delete comment"
          >
            {deletingId === thread.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Post context card */}
      {showPostCard && (
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
          {thread.postPreviewImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thread.postPreviewImageUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Post
            </p>
            <p className="line-clamp-2 text-xs text-slate-600 leading-relaxed">
              {captionText ?? (
                <span className="italic text-slate-400">
                  {thread.platformPostId
                    ? `Post ${thread.platformPostId.slice(0, 8)}`
                    : 'Post'}
                </span>
              )}
            </p>
          </div>
          {postLink && (
            <a
              href={postLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View post
            </a>
          )}
        </div>
      )}

      {/* Delete notice */}
      {deleteNotice !== null && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{deleteNotice}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <MessageBubble
          item={thread}
          onDelete={(it) => void handleDelete(it)}
          deleting={deletingId === thread.id}
        />
        {(thread.replies ?? [])
          .filter((reply) => !removedReplyIds.has(reply.id))
          .map((reply) => (
            <MessageBubble
              key={reply.id}
              item={reply}
              onDelete={(it) => void handleDelete(it)}
              deleting={deletingId === reply.id}
            />
          ))}
      </div>

      {/* Reply box */}
      <div className="border-t border-slate-100 p-3">
        {replyError !== null && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{replyError}</span>
          </div>
        )}
        {replyUnsupported && replyError === null && (
          <p className="mb-2 text-[11px] text-slate-400">
            {thread.platform === SocialPlatform.LINKEDIN
              ? 'Replying on LinkedIn requires Community Management partner access.'
              : 'Direct message replies are not supported yet.'}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={replyDisabled || sending}
            placeholder={replyDisabled ? 'Reply unavailable' : 'Write a reply...'}
            rows={2}
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
            disabled={replyDisabled || sending || !text.trim()}
            onClick={() => void handleSend()}
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

  // Selection / thread
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [thread, setThread] = React.useState<InboxItem | null>(null);
  const [threadLoading, setThreadLoading] = React.useState(false);

  // Sync
  const [syncing, setSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  // Collapsed post groups (keys that are collapsed; default = expanded)
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(
    () => new Set()
  );

  const groups = React.useMemo(() => groupByPost(items), [items]);

  const toggleGroup = React.useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchItems = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50');
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (platformFilter) params.set('platform', platformFilter);

      const res = await apiClient.getWithMeta<InboxItem[]>(`/inbox?${params.toString()}`);
      setItems(res.data ?? []);
      setTotal(res.meta?.total ?? res.data?.length ?? 0);
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

  // ── Select an item → load thread, auto-mark READ ────────────────────────────
  const selectItem = React.useCallback(
    async (item: InboxItem) => {
      setSelectedId(item.id);
      setThreadLoading(true);
      setThread(null);
      try {
        const full = await apiClient.get<InboxItem>(`/inbox/${item.id}`);
        setThread(full);
        if (item.status === InboxItemStatus.UNREAD) {
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
        }
      } catch (err) {
        console.error('Failed to load thread:', err);
      } finally {
        setThreadLoading(false);
      }
    },
    [fetchStats]
  );

  // ── Sync ────────────────────────────────────────────────────────────────────
  async function handleSync(): Promise<void> {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await apiClient.post<{ synced: number; message: string }>('/inbox/sync', {});
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

  // ── Reply appended to thread ────────────────────────────────────────────────
  function handleReplied(reply: InboxItem): void {
    setThread((prev) =>
      prev ? { ...prev, replies: [...(prev.replies ?? []), reply] } : prev
    );
    if (selectedId) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === selectedId ? { ...it, status: InboxItemStatus.REPLIED } : it
        )
      );
    }
    void fetchStats();
  }

  // ── Archive current thread ──────────────────────────────────────────────────
  async function handleArchive(): Promise<void> {
    if (!selectedId) return;
    try {
      await apiClient.patch<InboxItem>(`/inbox/${selectedId}/status`, {
        status: InboxItemStatus.ARCHIVED,
      });
      setItems((prev) =>
        prev.map((it) =>
          it.id === selectedId ? { ...it, status: InboxItemStatus.ARCHIVED } : it
        )
      );
      void fetchStats();
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  }

  // ── Delete an inbox item ────────────────────────────────────────────────────
  function handleDeleted(id: string, isThreadRoot: boolean): void {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (isThreadRoot) {
      setSelectedId(null);
      setThread(null);
    }
    void fetchStats();
  }

  const hasItems = items.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comments</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading
              ? 'Loading inbox...'
              : `${total} item${total !== 1 ? 's' : ''}`}
            {stats && stats.unread > 0 && (
              <>
                {' · '}
                <span className="font-medium text-blue-600">{stats.unread} unread</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {syncMessage !== null && (
            <span className="hidden text-xs text-slate-500 sm:inline">{syncMessage}</span>
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

      {/* Error */}
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

      {/* Two-pane inbox */}
      <div className="flex h-[calc(100vh-19rem)] min-h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* LEFT: list */}
        <div
          className={cn(
            'flex w-full flex-col border-r border-slate-100 md:w-80 lg:w-96 md:shrink-0',
            selectedId !== null && 'hidden md:flex'
          )}
        >
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : hasItems ? (
            <div className="flex-1 overflow-y-auto">
              {groups.map((group) => {
                const collapsed = collapsedGroups.has(group.key);
                const unread = group.items.filter(
                  (it) => it.status === InboxItemStatus.UNREAD
                ).length;
                return (
                  <div key={group.key}>
                    <PostGroupHeader
                      group={group}
                      expanded={!collapsed}
                      unread={unread}
                      onToggle={() => toggleGroup(group.key)}
                    />
                    {!collapsed &&
                      group.items.map((item) => (
                        <ListRow
                          key={item.id}
                          item={item}
                          active={item.id === selectedId}
                          onSelect={() => void selectItem(item)}
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <InboxIcon className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Your inbox is empty</p>
              <p className="mt-1 max-w-[260px] text-xs text-slate-400">
                Connect a social account, then press Sync to pull in comments,
                mentions and messages.
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
        </div>

        {/* RIGHT: thread */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            selectedId === null && 'hidden md:flex'
          )}
        >
          <ThreadPane
            thread={thread}
            loading={threadLoading}
            onBack={() => {
              setSelectedId(null);
              setThread(null);
            }}
            onReplied={handleReplied}
            onArchive={() => void handleArchive()}
            onDeleted={handleDeleted}
          />
        </div>
      </div>

      {/* Platform stat badges */}
      {stats && stats.byPlatform.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
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
              <PlatformIcon platform={toPlatformIcon(p.platform)} size="sm" className="h-4 w-4 rounded-md" />
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
