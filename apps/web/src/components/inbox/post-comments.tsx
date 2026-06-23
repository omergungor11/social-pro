'use client';

import * as React from 'react';
import {
  Loader2,
  Send,
  AlertCircle,
  MessageCircle,
  Trash2,
  Archive,
  Reply as ReplyIcon,
  CornerDownRight,
  ExternalLink,
} from 'lucide-react';
import {
  InboxItemStatus,
  SocialPlatform,
  type InboxItem,
  type InboxDeleteResult,
} from '@social-pro/shared-types';
import { cn } from '@/lib/utils';
import { apiClient, ApiRequestError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { InboxAvatar } from '@/components/inbox/inbox-avatar';
import { relativeTime } from '@/components/inbox/helpers';

function bestTime(item: InboxItem): string | null {
  return item.platformCreatedAt ?? item.createdAt ?? null;
}

/** Splits items into top-level comments and replies keyed by parent. */
function thread(items: InboxItem[]): {
  topLevel: InboxItem[];
  repliesByParent: Map<string, InboxItem[]>;
} {
  const idSet = new Set(items.map((i) => i.platformItemId));
  const repliesByParent = new Map<string, InboxItem[]>();
  const topLevel: InboxItem[] = [];
  for (const item of items) {
    const parent = item.parentPlatformId;
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
// A single comment row with inline reply box + nested replies
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
    <div className="flex gap-2.5 py-3">
      <InboxAvatar
        name={comment.authorName}
        username={comment.authorUsername}
        avatarUrl={comment.authorAvatarUrl}
        className="h-8 w-8 shrink-0"
      />
      <div className="min-w-0 flex-1">
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
            </div>
          </div>
        ))}

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
// PostComments — fetches and renders the comments on a published post.
// ---------------------------------------------------------------------------

export function PostComments({
  platformPostIds,
}: {
  platformPostIds: string[];
}): React.JSX.Element | null {
  const ids = React.useMemo(
    () => Array.from(new Set(platformPostIds.filter(Boolean))),
    [platformPostIds]
  );

  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const fetchComments = React.useCallback(async () => {
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const results = await Promise.all(
        ids.map((id) =>
          apiClient.getWithMeta<InboxItem[]>(
            `/inbox?platformPostId=${encodeURIComponent(id)}&limit=100`
          )
        )
      );
      const merged = new Map<string, InboxItem>();
      for (const res of results) {
        for (const it of res.data ?? []) merged.set(it.id, it);
      }
      setItems(Array.from(merged.values()));
    } catch (err) {
      console.error('Failed to load post comments:', err);
      setError('Yorumlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [ids]);

  React.useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const { topLevel, repliesByParent } = React.useMemo(
    () => thread(items),
    [items]
  );

  const handleReply = React.useCallback(
    async (parent: InboxItem, text: string): Promise<void> => {
      const reply = await apiClient.post<InboxItem>(
        `/inbox/${parent.id}/reply`,
        { text }
      );
      setItems((prev) => [
        ...prev.map((it) =>
          it.id === parent.id ? { ...it, status: InboxItemStatus.REPLIED } : it
        ),
        reply,
      ]);
    },
    []
  );

  const handleDelete = React.useCallback(async (item: InboxItem): Promise<void> => {
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    setDeletingId(item.id);
    setNotice(null);
    try {
      const result = await apiClient.delete<InboxDeleteResult>(
        `/inbox/${item.id}`
      );
      setItems((prev) =>
        prev.filter(
          (it) =>
            it.id !== item.id && it.parentPlatformId !== item.platformItemId
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
          : 'Silme işlemi başarısız oldu.'
      );
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleArchive = React.useCallback(async (item: InboxItem): Promise<void> => {
    try {
      await apiClient.patch<InboxItem>(`/inbox/${item.id}/status`, {
        status: InboxItemStatus.ARCHIVED,
      });
      setItems((prev) => prev.filter((it) => it.id !== item.id));
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  }, []);

  const handleMarkRead = React.useCallback((item: InboxItem): void => {
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
      })
      .catch(() => {});
  }, []);

  // Nothing published yet → no comments to show.
  if (ids.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <MessageCircle className="h-4 w-4 text-slate-400" />
        Comments
        {!loading && (
          <span className="text-xs font-normal text-slate-400">
            ({topLevel.length})
          </span>
        )}
      </div>

      {notice !== null && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
        </div>
      ) : error !== null ? (
        <div className="flex items-center gap-2 py-4 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchComments()}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : topLevel.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Henüz yorum yok. Yeni yorumları çekmek için Comments sayfasından Sync
          edebilirsiniz.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {topLevel.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              replies={repliesByParent.get(comment.platformItemId) ?? []}
              deletingId={deletingId}
              onReply={handleReply}
              onDelete={(it) => void handleDelete(it)}
              onArchive={(it) => void handleArchive(it)}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
