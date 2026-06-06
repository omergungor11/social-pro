'use client';

import * as React from 'react';
import {
  Loader2,
  RefreshCw,
  Send,
  AlertCircle,
  MessageCircle,
  ArrowLeft,
  Inbox as InboxIcon,
} from 'lucide-react';
import {
  InboxItemType,
  InboxItemStatus,
  SocialPlatform,
  type InboxItem,
} from '@social-pro/shared-types';
import { cn } from '@/lib/utils';
import { apiClient, ApiRequestError } from '@/lib/api-client';
import { useBrandStore } from '@/stores/brand-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlatformIcon,
  getPlatformLabel,
  type Platform,
} from '@/components/social/platform-icon';
import { InboxAvatar } from '@/components/inbox/inbox-avatar';
import { relativeTime, toPlatformIcon } from '@/components/inbox/helpers';

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

interface Channel {
  /** Filter key. `null` = All Messages. */
  platform: SocialPlatform | null;
  label: string;
  /** Whether DM access is actually available on this platform yet. */
  available: boolean;
  /** Note shown when the channel is empty/unavailable. */
  note?: string;
}

const CHANNELS: Channel[] = [
  { platform: null, label: 'All Messages', available: true },
  {
    platform: SocialPlatform.INSTAGRAM,
    label: 'Instagram Direct',
    available: true,
  },
  {
    platform: SocialPlatform.FACEBOOK,
    label: 'Facebook Messenger',
    available: true,
  },
  {
    platform: SocialPlatform.TWITTER,
    label: 'X (Twitter) DM',
    available: false,
    note: 'X direct messages require elevated/paid API access (the DM API is on the paid tier). This channel stays empty until that access is enabled.',
  },
  {
    platform: SocialPlatform.LINKEDIN,
    label: 'LinkedIn',
    available: false,
    note: 'LinkedIn messaging needs Marketing/Community partner approval. This channel stays empty until partner access is granted.',
  },
  {
    platform: SocialPlatform.TIKTOK,
    label: 'TikTok DM',
    available: false,
    note: 'TikTok has no public messaging API for third-party apps. This channel stays empty.',
  },
];

function channelIconPlatform(platform: SocialPlatform | null): Platform {
  return platform ? toPlatformIcon(platform) : 'instagram';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bestTime(item: InboxItem): string | null {
  return item.platformCreatedAt ?? item.createdAt ?? null;
}

function timeValue(item: InboxItem): number {
  const t = bestTime(item);
  const n = t ? new Date(t).getTime() : 0;
  return Number.isNaN(n) ? 0 : n;
}

function conversationKey(item: InboxItem): string {
  return (
    item.parentPlatformId ??
    item.authorUsername ??
    item.authorName ??
    item.id
  );
}

interface Conversation {
  key: string;
  platform: SocialPlatform;
  /** All messages in the conversation, oldest → newest. */
  messages: InboxItem[];
  /** Counterparty (latest inbound author; fallback to any). */
  name: string;
  username: string | null;
  avatarUrl: string | null;
  latest: InboxItem;
  unread: number;
}

function buildConversations(items: InboxItem[]): Conversation[] {
  const groups = new Map<string, InboxItem[]>();
  for (const item of items) {
    const key = conversationKey(item);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const conversations: Conversation[] = [];
  for (const [key, msgs] of groups) {
    const sorted = [...msgs].sort((a, b) => timeValue(a) - timeValue(b));
    const latest = sorted[sorted.length - 1]!;
    const counterparty =
      [...sorted].reverse().find((m) => !m.isOutbound) ?? latest;
    const unread = sorted.filter(
      (m) => !m.isOutbound && m.status === InboxItemStatus.UNREAD
    ).length;
    conversations.push({
      key,
      platform: latest.platform,
      messages: sorted,
      name:
        counterparty.authorName ??
        counterparty.authorUsername ??
        'Unknown',
      username: counterparty.authorUsername,
      avatarUrl: counterparty.authorAvatarUrl,
      latest,
      unread,
    });
  }

  return conversations.sort(
    (a, b) => timeValue(b.latest) - timeValue(a.latest)
  );
}

// ---------------------------------------------------------------------------
// Channel rail
// ---------------------------------------------------------------------------

function ChannelRail({
  active,
  counts,
  onSelect,
  className,
}: {
  active: SocialPlatform | null;
  counts: Record<string, { total: number; unread: number }>;
  onSelect: (platform: SocialPlatform | null) => void;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex flex-col', className)}>
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Channels
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {CHANNELS.map((ch) => {
          const isActive = ch.platform === active;
          const stat = counts[ch.platform ?? 'ALL'] ?? { total: 0, unread: 0 };
          return (
            <button
              key={ch.label}
              type="button"
              onClick={() => onSelect(ch.platform)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
              )}
              aria-current={isActive}
            >
              <PlatformIcon
                platform={channelIconPlatform(ch.platform)}
                size="sm"
                className={cn(
                  'h-7 w-7 rounded-lg',
                  ch.platform === null && 'opacity-90'
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    isActive ? 'text-blue-700' : 'text-slate-700'
                  )}
                >
                  {ch.label}
                </p>
                {!ch.available && (
                  <p className="truncate text-[10px] text-slate-400">
                    Access not enabled
                  </p>
                )}
              </div>
              {stat.unread > 0 ? (
                <Badge variant="blue" className="px-1.5 py-0 text-[10px]">
                  {stat.unread}
                </Badge>
              ) : stat.total > 0 ? (
                <span className="text-[11px] text-slate-400">{stat.total}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation list row
// ---------------------------------------------------------------------------

function ConversationRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  const unread = conversation.unread > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors',
        active ? 'bg-blue-50/70' : 'hover:bg-slate-50'
      )}
      aria-current={active}
    >
      <div className="relative shrink-0">
        <InboxAvatar
          name={conversation.name}
          username={conversation.username}
          avatarUrl={conversation.avatarUrl}
        />
        <span className="absolute -bottom-1 -right-1">
          <PlatformIcon
            platform={toPlatformIcon(conversation.platform)}
            size="sm"
            className="h-4 w-4 rounded-md"
          />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">
            {conversation.name}
          </p>
          <span className="ml-auto shrink-0 text-[11px] text-slate-400">
            {relativeTime(bestTime(conversation.latest))}
          </span>
          {unread && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-blue-600"
              aria-label="Unread"
            />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {conversation.latest.isOutbound && (
            <span className="text-slate-400">You: </span>
          )}
          {conversation.latest.text ?? (
            <span className="italic text-slate-300">No text</span>
          )}
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Chat bubble
// ---------------------------------------------------------------------------

function MessageBubble({ item }: { item: InboxItem }): React.JSX.Element {
  const outbound = item.isOutbound;
  return (
    <div className={cn('flex gap-3', outbound && 'flex-row-reverse')}>
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
          <span className="text-[11px] text-slate-400">
            {relativeTime(bestTime(item))}
          </span>
        </div>
        <div
          className={cn(
            'mt-1 inline-block whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
            outbound ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
          )}
        >
          {item.text ?? <span className="italic opacity-70">No text</span>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread pane
// ---------------------------------------------------------------------------

function ThreadPane({
  conversation,
  onBack,
  onReplied,
}: {
  conversation: Conversation | null;
  onBack: () => void;
  onReplied: (reply: InboxItem) => void;
}): React.JSX.Element {
  const [text, setText] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [replyError, setReplyError] = React.useState<string | null>(null);
  const key = conversation?.key ?? null;

  React.useEffect(() => {
    setText('');
    setReplyError(null);
  }, [key]);

  if (!conversation) {
    return (
      <div className="hidden flex-1 flex-col items-center justify-center p-10 text-center md:flex">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <MessageCircle className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">Select a conversation</p>
        <p className="mt-1 text-xs text-slate-400">
          Pick a conversation to read the messages and reply.
        </p>
      </div>
    );
  }

  // Reply targets the latest INBOUND message. If there is none (e.g. only
  // outbound messages), or LinkedIn (no partner API), replying is unavailable.
  const latestInbound = [...conversation.messages]
    .reverse()
    .find((m) => !m.isOutbound);
  const replyUnsupported =
    conversation.platform === SocialPlatform.LINKEDIN ||
    latestInbound === undefined;
  const replyDisabled = replyUnsupported || replyError !== null;

  async function handleSend(): Promise<void> {
    if (!latestInbound || !text.trim()) return;
    setSending(true);
    setReplyError(null);
    try {
      const reply = await apiClient.post<InboxItem>(
        `/inbox/${latestInbound.id}/reply`,
        { text: text.trim() }
      );
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative shrink-0">
          <InboxAvatar
            name={conversation.name}
            username={conversation.username}
            avatarUrl={conversation.avatarUrl}
          />
          <span className="absolute -bottom-1 -right-1">
            <PlatformIcon
              platform={toPlatformIcon(conversation.platform)}
              size="sm"
              className="h-4 w-4 rounded-md"
            />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {conversation.name}
          </p>
          <p className="truncate text-xs text-slate-400">
            {getPlatformLabel(toPlatformIcon(conversation.platform))} · Direct message
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {conversation.messages.map((m) => (
          <MessageBubble key={m.id} item={m} />
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
            {conversation.platform === SocialPlatform.LINKEDIN
              ? 'Replying on LinkedIn requires Community Management partner access.'
              : 'No incoming message to reply to yet.'}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={replyDisabled || sending}
            placeholder={replyDisabled ? 'Reply unavailable' : 'Write a message...'}
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
// Empty state for the conversation list
// ---------------------------------------------------------------------------

function ListEmptyState({
  channel,
  syncing,
  onSync,
}: {
  channel: Channel;
  syncing: boolean;
  onSync: () => void;
}): React.JSX.Element {
  if (!channel.available) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
          <PlatformIcon
            platform={channelIconPlatform(channel.platform)}
            size="sm"
            className="h-7 w-7 rounded-lg"
          />
        </div>
        <p className="text-sm font-medium text-slate-600">
          {channel.label} not available
        </p>
        <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-slate-400">
          {channel.note}
        </p>
      </div>
    );
  }

  const supportsSyncHint =
    channel.platform === SocialPlatform.INSTAGRAM ||
    channel.platform === SocialPlatform.FACEBOOK;

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <InboxIcon className="h-7 w-7 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600">No direct messages yet</p>
      <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-slate-400">
        {supportsSyncHint
          ? 'If you just connected, press Sync — and make sure the account was reconnected with messaging permission.'
          : 'Once messages arrive on this channel they will show up here.'}
      </p>
      <Button
        size="sm"
        variant="outline"
        className="mt-4 gap-1.5"
        disabled={syncing}
        onClick={onSync}
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Sync
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MessagesPage(): React.JSX.Element {
  const [items, setItems] = React.useState<InboxItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [activeChannel, setActiveChannel] = React.useState<SocialPlatform | null>(
    null
  );
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);

  const [syncing, setSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  const selectedBrandId = useBrandStore((s) => s.selectedBrandId);

  // ── Fetch DMs ──────────────────────────────────────────────────────────────
  const fetchItems = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('type', InboxItemType.DIRECT_MESSAGE);
      params.set('limit', '100');
      if (activeChannel) params.set('platform', activeChannel);
      if (selectedBrandId) params.set('clientId', selectedBrandId);

      const res = await apiClient.getWithMeta<InboxItem[]>(
        `/inbox?${params.toString()}`
      );
      setItems(res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeChannel, selectedBrandId]);

  React.useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // Reset the open conversation when the channel/brand changes.
  React.useEffect(() => {
    setSelectedKey(null);
  }, [activeChannel, selectedBrandId]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const conversations = React.useMemo(
    () => buildConversations(items),
    [items]
  );

  const counts = React.useMemo(() => {
    const map: Record<string, { total: number; unread: number }> = {};
    const all = { total: 0, unread: 0 };
    for (const conv of conversations) {
      const k = conv.platform;
      const cur = map[k] ?? { total: 0, unread: 0 };
      cur.total += 1;
      cur.unread += conv.unread > 0 ? 1 : 0;
      map[k] = cur;
      all.total += 1;
      all.unread += conv.unread > 0 ? 1 : 0;
    }
    // Only meaningful when viewing All; per-channel views fetch filtered data.
    map['ALL'] = all;
    return map;
  }, [conversations]);

  const selected = React.useMemo(
    () => conversations.find((c) => c.key === selectedKey) ?? null,
    [conversations, selectedKey]
  );

  const channel = React.useMemo(
    () => CHANNELS.find((c) => c.platform === activeChannel) ?? CHANNELS[0]!,
    [activeChannel]
  );

  // ── Open conversation → auto-mark unread inbound READ ──────────────────────
  const selectConversation = React.useCallback(
    (conv: Conversation) => {
      setSelectedKey(conv.key);
      const unreadInbound = conv.messages.filter(
        (m) => !m.isOutbound && m.status === InboxItemStatus.UNREAD
      );
      if (unreadInbound.length === 0) return;
      const ids = new Set(unreadInbound.map((m) => m.id));
      setItems((prev) =>
        prev.map((it) =>
          ids.has(it.id) ? { ...it, status: InboxItemStatus.READ } : it
        )
      );
      for (const m of unreadInbound) {
        void apiClient
          .patch<InboxItem>(`/inbox/${m.id}/status`, {
            status: InboxItemStatus.READ,
          })
          .catch(() => {});
      }
    },
    []
  );

  // ── Sync ───────────────────────────────────────────────────────────────────
  async function handleSync(): Promise<void> {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await apiClient.post<{ synced: number; message: string }>(
        '/inbox/sync',
        {}
      );
      setSyncMessage(res.message);
      await fetchItems();
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

  // ── Reply appended ─────────────────────────────────────────────────────────
  function handleReplied(reply: InboxItem): void {
    setItems((prev) => [...prev, reply]);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading
              ? 'Loading messages...'
              : `${conversations.length} conversation${
                  conversations.length !== 1 ? 's' : ''
                }`}
            {!loading && counts['ALL'] && counts['ALL'].unread > 0 && (
              <>
                {' · '}
                <span className="font-medium text-blue-600">
                  {counts['ALL'].unread} unread
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

      {/* Three-pane messenger */}
      <div className="flex h-[calc(100vh-15rem)] min-h-[460px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* LEFT: channel rail */}
        <ChannelRail
          active={activeChannel}
          counts={counts}
          onSelect={setActiveChannel}
          className={cn(
            'w-full border-r border-slate-100 md:w-60 md:shrink-0',
            selectedKey !== null && 'hidden md:flex'
          )}
        />

        {/* MIDDLE: conversation list */}
        <div
          className={cn(
            'flex w-full flex-col border-r border-slate-100 md:w-80 md:shrink-0 lg:w-96',
            selectedKey !== null && 'hidden md:flex'
          )}
        >
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <PlatformIcon
              platform={channelIconPlatform(channel.platform)}
              size="sm"
              className="h-5 w-5 rounded-md"
            />
            <p className="truncate text-sm font-semibold text-slate-800">
              {channel.label}
            </p>
          </div>
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-300" />
            </div>
          ) : conversations.length > 0 ? (
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <ConversationRow
                  key={conv.key}
                  conversation={conv}
                  active={conv.key === selectedKey}
                  onSelect={() => selectConversation(conv)}
                />
              ))}
            </div>
          ) : (
            <ListEmptyState
              channel={channel}
              syncing={syncing}
              onSync={() => void handleSync()}
            />
          )}
        </div>

        {/* RIGHT: thread */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            selectedKey === null && 'hidden md:flex'
          )}
        >
          <ThreadPane
            conversation={selected}
            onBack={() => setSelectedKey(null)}
            onReplied={handleReplied}
          />
        </div>
      </div>
    </div>
  );
}
