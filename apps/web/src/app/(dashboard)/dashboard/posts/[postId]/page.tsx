'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, Clock, Send, Trash2, RefreshCw, Share2,
  CheckCircle2, XCircle, Loader2, AlertCircle, Eye,
  Heart, MessageCircle, BarChart3, Copy, Calendar,
  User, Building2, ImageIcon, History, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { UploadZone, type UploadedFile } from '@/components/media/upload-zone';
import { PostPreview, PLATFORM_CHAR_LIMITS } from '@/components/posts/post-preview';
import {
  PlatformIcon, getPlatformLabel, PLATFORM_ACCENT, type Platform,
} from '@/components/social/platform-icon';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
type TargetStatus = 'pending' | 'published' | 'failed' | 'scheduled';

interface MediaItem {
  id: string;
  url: string;
  type: string;
  filename: string;
}

interface PostTarget {
  id: string;
  platform: Platform;
  status: TargetStatus;
  publishedAt: string | null;
  errorMessage: string | null;
  socialAccountName: string;
  metrics?: {
    likes: number;
    comments: number;
    impressions: number;
    engagementRate: number;
  };
}

interface PostDetail {
  id: string;
  title: string;
  content: string;
  platforms: Platform[];
  targets: PostTarget[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  clientId: string;
  clientName: string;
  createdAt: string;
  media: MediaItem[];
}

interface ActivityEntry {
  id: string;
  label: string;
  timestamp: string;
  type: 'created' | 'scheduled' | 'published' | 'failed' | 'cancelled' | 'updated';
}

// ---------------------------------------------------------------------------
// Safe data mapping
// ---------------------------------------------------------------------------

function mapApiPost(a: Record<string, unknown>): PostDetail {
  const rawTargets = (a.targets ?? a.postTargets ?? []) as Record<string, unknown>[];
  const targets: PostTarget[] = rawTargets.map((t) => {
    const socialAccount = t.socialAccount as Record<string, unknown> | null | undefined;
    const rawMetrics = t.metrics as Record<string, unknown> | null | undefined;
    const platform = (
      ((t.platform ?? socialAccount?.platform) as string | undefined) ?? ''
    ).toLowerCase() as Platform;
    const status = (
      ((t.status ?? 'PENDING') as string)
    ).toLowerCase() as TargetStatus;

    return {
      id: (t.id ?? '') as string,
      platform,
      status,
      publishedAt: (t.publishedAt ?? null) as string | null,
      errorMessage: (t.errorMessage ?? null) as string | null,
      socialAccountName: (
        (socialAccount?.displayName ?? socialAccount?.platformUsername ?? '') as string
      ),
      metrics: rawMetrics
        ? {
            likes: ((rawMetrics.likes ?? 0) as number),
            comments: ((rawMetrics.comments ?? 0) as number),
            impressions: ((rawMetrics.impressions ?? 0) as number),
            engagementRate: ((rawMetrics.engagementRate ?? 0) as number),
          }
        : undefined,
    };
  });

  const platforms: Platform[] =
    targets.length > 0
      ? ([...new Set(targets.map((t) => t.platform))].filter(Boolean) as Platform[])
      : ((a.platforms ?? []) as string[]).map((p) => p.toLowerCase() as Platform);

  const rawMedia = (a.media ?? a.postMedia ?? []) as Record<string, unknown>[];

  const rawContent = a.content;
  const content: string =
    typeof rawContent === 'object' && rawContent !== null
      ? (((rawContent as Record<string, unknown>).text ?? '') as string)
      : ((rawContent ?? '') as string);

  const client = a.client as Record<string, unknown> | null | undefined;

  return {
    id: (a.id ?? '') as string,
    title: ((a.title as string | undefined) || 'Untitled Post'),
    content,
    platforms,
    targets,
    status: ((a.status ?? 'DRAFT') as string).toLowerCase() as PostStatus,
    scheduledAt: (a.scheduledAt ?? null) as string | null,
    publishedAt: (a.publishedAt ?? null) as string | null,
    clientId: (a.clientId ?? '') as string,
    clientName: (client?.name ?? '') as string,
    createdAt: (a.createdAt ?? '') as string,
    media: rawMedia.map((m) => ({
      id: (m.id ?? '') as string,
      url: ((m.url ?? m.storageKey ?? '') as string),
      type: ((m.type ?? m.mediaType ?? 'IMAGE') as string),
      filename: ((m.filename ?? m.originalFilename ?? '') as string),
    })),
  };
}

function buildActivityLog(post: PostDetail): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  if (post.createdAt) {
    entries.push({
      id: 'created',
      label: 'Draft created',
      timestamp: post.createdAt,
      type: 'created',
    });
  }

  if (post.scheduledAt && (post.status === 'scheduled' || post.status === 'published')) {
    entries.push({
      id: 'scheduled',
      label: `Scheduled for ${fmtDate(post.scheduledAt)}`,
      timestamp: post.scheduledAt,
      type: 'scheduled',
    });
  }

  if (post.status === 'cancelled') {
    entries.push({
      id: 'cancelled',
      label: 'Post cancelled',
      timestamp: new Date().toISOString(),
      type: 'cancelled',
    });
  }

  if (post.publishedAt) {
    entries.push({
      id: 'published',
      label: `Published on ${fmtDate(post.publishedAt)}`,
      timestamp: post.publishedAt,
      type: 'published',
    });
  }

  const failedTargets = post.targets.filter((t) => t.status === 'failed');
  if (failedTargets.length > 0) {
    failedTargets.forEach((t, i) => {
      entries.push({
        id: `failed-${i}`,
        label: `Failed on ${getPlatformLabel(t.platform)}${t.errorMessage ? `: ${t.errorMessage}` : ''}`,
        timestamp: new Date().toISOString(),
        type: 'failed',
      });
    });
  }

  return entries.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtShortDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getCountdown(iso: string | null): string {
  if (!iso) return '';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Overdue';
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: PostStatus }): React.JSX.Element {
  const config: Record<PostStatus, { variant: 'gray' | 'blue' | 'green' | 'red' | 'default'; label: string }> = {
    draft: { variant: 'gray', label: 'Draft' },
    scheduled: { variant: 'blue', label: 'Scheduled' },
    published: { variant: 'green', label: 'Published' },
    failed: { variant: 'red', label: 'Failed' },
    cancelled: { variant: 'default', label: 'Cancelled' },
  };
  const { variant, label } = config[status] ?? { variant: 'gray', label: status };
  return (
    <Badge variant={variant} className="capitalize text-sm px-3 py-1">
      {label}
    </Badge>
  );
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
          : 'bg-red-50 text-red-800 border border-red-200',
      )}
    >
      {type === 'success' ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Char counter
// ---------------------------------------------------------------------------

function CharCounter({ count, limit }: { count: number; limit: number }): React.JSX.Element {
  const remaining = limit - count;
  const pct = Math.min(count / limit, 1);
  const color = pct >= 1 ? '#ef4444' : pct >= 0.9 ? '#f59e0b' : '#3b82f6';
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-4 w-4">
        <svg viewBox="0 0 16 16" className="h-full w-full -rotate-90">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#e2e8f0" strokeWidth="2" />
          <circle
            cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="2"
            strokeDasharray={`${pct * 37.7} 37.7`} strokeLinecap="round"
          />
        </svg>
      </div>
      <span className={cn(
        'text-xs font-medium tabular-nums',
        remaining < 0 ? 'text-red-600' : remaining <= 20 ? 'text-amber-600' : 'text-slate-400',
      )}>
        {remaining < 0 ? `-${Math.abs(remaining)}` : remaining}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cross-post dialog
// ---------------------------------------------------------------------------

const ALL_PLATFORMS_LIST: Platform[] = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'];

function CrossPostDialog({
  open, onClose, sourceContent, sourcePlatform, existingPlatforms, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  sourceContent: string;
  sourcePlatform: Platform;
  existingPlatforms: Platform[];
  onConfirm: (targets: Platform[], contents: Record<string, string>) => void;
}): React.JSX.Element {
  const available = ALL_PLATFORMS_LIST.filter((p) => !existingPlatforms.includes(p));
  const [selected, setSelected] = React.useState<Platform[]>([]);
  const [contents, setContents] = React.useState<Record<string, string>>({});
  const [previewPlatform, setPreviewPlatform] = React.useState<Platform | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSelected([]);
      setContents({});
      setPreviewPlatform(null);
      setSubmitting(false);
    }
  }, [open]);

  function toggle(p: Platform): void {
    setSelected((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      if (!contents[p]) {
        const limit = PLATFORM_CHAR_LIMITS[p];
        let adapted = sourceContent;
        if (adapted.length > limit) adapted = `${adapted.slice(0, limit - 3)}...`;
        setContents((c) => ({ ...c, [p]: adapted }));
      }
      setPreviewPlatform(p);
      return [...prev, p];
    });
  }

  function handleConfirm(): void {
    setSubmitting(true);
    const finalContents: Record<string, string> = {};
    selected.forEach((p) => { finalContents[p] = contents[p] ?? sourceContent; });
    onConfirm(selected, finalContents);
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Share to Other Platforms"
      description={`Cross-post your ${getPlatformLabel(sourcePlatform)} content to additional platforms.`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <PlatformIcon platform={sourcePlatform} size="sm" />
            <span className="text-xs font-semibold text-slate-600">Source: {getPlatformLabel(sourcePlatform)}</span>
          </div>
          <p className="text-xs text-slate-500 line-clamp-2">{sourceContent}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Select target platforms</p>
          {available.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Already posted to all platforms.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {available.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggle(p)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all text-sm',
                    selected.includes(p)
                      ? 'border-blue-300 bg-blue-50 text-blue-800 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <PlatformIcon platform={p} size="sm" />
                  <span className="flex-1 text-left">{getPlatformLabel(p)}</span>
                  {selected.includes(p) && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-1 border-b border-slate-100 pb-2 flex-wrap">
              {selected.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreviewPlatform(p)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    previewPlatform === p ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100',
                  )}
                >
                  <PlatformIcon platform={p} size="sm" />
                  {getPlatformLabel(p).split(' ')[0]}
                  {(contents[p]?.length ?? 0) > PLATFORM_CHAR_LIMITS[p] && (
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>
              ))}
            </div>

            {previewPlatform !== null && selected.includes(previewPlatform) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Adapt content for {getPlatformLabel(previewPlatform)}
                    </span>
                    <CharCounter
                      count={(contents[previewPlatform] ?? '').length}
                      limit={PLATFORM_CHAR_LIMITS[previewPlatform]}
                    />
                  </div>
                  <textarea
                    value={contents[previewPlatform] ?? sourceContent}
                    onChange={(e) => {
                      const val = e.target.value;
                      setContents((c) => ({ ...c, [previewPlatform!]: val }));
                    }}
                    rows={6}
                    className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    placeholder={`Adapt for ${getPlatformLabel(previewPlatform)}…`}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Preview</p>
                  <PostPreview
                    content={contents[previewPlatform] ?? sourceContent}
                    platform={previewPlatform}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          disabled={selected.length === 0 || submitting}
          onClick={handleConfirm}
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          Share to {selected.length} platform{selected.length !== 1 ? 's' : ''}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Inline title editor
// ---------------------------------------------------------------------------

function InlineTitleEditor({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}): React.JSX.Element {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  function commit(): void {
    const trimmed = draft.trim() || value;
    onChange(trimmed);
    setEditing(false);
  }

  if (disabled) {
    return (
      <h1 className="text-2xl font-bold text-slate-900 leading-tight">{value}</h1>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        autoFocus
        className="text-2xl font-bold text-slate-900 leading-tight bg-transparent border-b-2 border-blue-500 outline-none w-full max-w-lg"
        aria-label="Edit post title"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true); }}
      className="group flex items-center gap-2 text-left"
      title="Click to edit title"
    >
      <h1 className="text-2xl font-bold text-slate-900 leading-tight">{value}</h1>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 text-xs border border-slate-200 rounded px-1.5 py-0.5">
        edit
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Platform content tab panel
// ---------------------------------------------------------------------------

function PlatformContentPanel({
  platforms,
  contents,
  targets,
  mediaUrls,
  disabled,
  onContentChange,
  onCrossPost,
}: {
  platforms: Platform[];
  contents: Record<string, string>;
  targets: PostTarget[];
  mediaUrls: string[];
  disabled: boolean;
  onContentChange: (platform: Platform, value: string) => void;
  onCrossPost: (platform: Platform, content: string) => void;
}): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<Platform | null>(platforms[0] ?? null);

  React.useEffect(() => {
    if (platforms.length > 0 && (activeTab === null || !platforms.includes(activeTab))) {
      setActiveTab(platforms[0] ?? null);
    }
  }, [platforms, activeTab]);

  if (platforms.length === 0) {
    // No platforms — still show content as a generic text block
    const genericContent = Object.values(contents)[0] ?? '';
    return (
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Content</p>
          {genericContent ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{genericContent}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">No content yet.</p>
          )}
          {!disabled && (
            <p className="text-xs text-slate-400 mt-2">Select platforms above to customize content per platform.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  const currentPlatform = activeTab ?? platforms[0]!;
  const content = contents[currentPlatform] ?? '';
  const limit = PLATFORM_CHAR_LIMITS[currentPlatform];
  const target = targets.find((t) => t.platform === currentPlatform);
  const accentBorder = PLATFORM_ACCENT[currentPlatform];

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100 pb-0 flex-wrap">
        {platforms.map((p) => {
          const t = targets.find((x) => x.platform === p);
          const c = contents[p] ?? '';
          const isOver = c.length > PLATFORM_CHAR_LIMITS[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => setActiveTab(p)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-all',
                currentPlatform === p
                  ? 'border-blue-500 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200',
              )}
            >
              <PlatformIcon platform={p} size="sm" />
              <span className="hidden sm:inline">{getPlatformLabel(p).split(' ')[0]}</span>
              {t && (
                <span className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  t.status === 'published' ? 'bg-emerald-500' :
                  t.status === 'failed' ? 'bg-red-500' :
                  t.status === 'pending' ? 'bg-slate-300' : 'bg-blue-400',
                )} />
              )}
              {isOver && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
            </button>
          );
        })}
      </div>

      {/* Active platform panel */}
      <div className={cn('rounded-xl border-l-4 border border-slate-200 overflow-hidden', accentBorder)}>
        {/* Platform header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
          <PlatformIcon platform={currentPlatform} size="sm" />
          <span className="text-sm font-semibold text-slate-800">{getPlatformLabel(currentPlatform)}</span>

          {target && (
            <Badge
              variant={
                target.status === 'published' ? 'green' :
                target.status === 'failed' ? 'red' :
                target.status === 'scheduled' ? 'blue' : 'gray'
              }
              className="text-[10px] capitalize"
            >
              {target.status}
            </Badge>
          )}

          {target?.socialAccountName && (
            <span className="text-xs text-slate-500">@{target.socialAccountName}</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {target?.status === 'published' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={() => onCrossPost(currentPlatform, content)}
              >
                <Share2 className="h-3 w-3" /> Share to…
              </Button>
            )}

            {!disabled && platforms.length > 1 && (
              <button
                type="button"
                title="Copy to all platforms"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100"
                onClick={() => {
                  platforms.forEach((p) => { if (p !== currentPlatform) onContentChange(p, content); });
                }}
              >
                <Copy className="h-3 w-3" /> Copy to all
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {target?.errorMessage && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-600">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            {target.errorMessage}
          </div>
        )}

        {/* Metrics (if published) */}
        {target?.metrics && (
          <div className="px-4 py-3 bg-emerald-50/50 border-b border-emerald-100">
            <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-2">Performance</p>
            <div className="flex flex-wrap gap-4">
              {[
                { icon: Heart, label: 'Likes', value: target.metrics.likes, color: 'text-red-500' },
                { icon: MessageCircle, label: 'Comments', value: target.metrics.comments, color: 'text-amber-500' },
                { icon: Eye, label: 'Impressions', value: target.metrics.impressions, color: 'text-violet-500' },
                { icon: BarChart3, label: 'Eng. Rate', value: target.metrics.engagementRate, color: 'text-emerald-600', suffix: '%' },
              ].map(({ icon: Icon, label, value, color, suffix }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className={cn('h-3.5 w-3.5', color)} />
                  <span className="text-xs font-semibold text-slate-700">
                    {suffix ? `${value}${suffix}` : fmtNum(value)}
                  </span>
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content editor + preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Content</span>
              <CharCounter count={content.length} limit={limit} />
            </div>
            <textarea
              value={content}
              onChange={(e) => onContentChange(currentPlatform, e.target.value)}
              placeholder={`Write your ${getPlatformLabel(currentPlatform)} post…`}
              rows={8}
              disabled={disabled}
              className={cn(
                'flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5',
                'text-sm placeholder:text-slate-400 resize-y',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent',
                disabled && 'cursor-not-allowed opacity-60 bg-slate-50',
              )}
            />
            {target?.publishedAt && (
              <p className="text-xs text-slate-400">
                Published {fmtDate(target.publishedAt)}
              </p>
            )}
          </div>

          <div className="p-4 bg-slate-50/50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Live Preview</p>
            <PostPreview
              content={content}
              platform={currentPlatform}
              mediaList={mediaUrls.length > 0 ? mediaUrls : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform targets panel
// ---------------------------------------------------------------------------

function PlatformTargetsPanel({ targets }: { targets: PostTarget[] }): React.JSX.Element {
  if (targets.length === 0) return <></>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Platform Targets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {targets.map((t) => (
          <div
            key={t.id || t.platform}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              t.status === 'published' ? 'border-emerald-100 bg-emerald-50/40' :
              t.status === 'failed' ? 'border-red-100 bg-red-50/40' :
              'border-slate-100 bg-slate-50/40',
            )}
          >
            <PlatformIcon platform={t.platform} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-800">{getPlatformLabel(t.platform)}</span>
                {t.socialAccountName && (
                  <span className="text-xs text-slate-400">@{t.socialAccountName}</span>
                )}
                <Badge
                  variant={
                    t.status === 'published' ? 'green' :
                    t.status === 'failed' ? 'red' :
                    t.status === 'scheduled' ? 'blue' : 'gray'
                  }
                  className="text-[10px] capitalize"
                >
                  {t.status}
                </Badge>
              </div>
              {t.publishedAt && (
                <p className="text-xs text-slate-400 mt-0.5">{fmtDate(t.publishedAt)}</p>
              )}
              {t.errorMessage && (
                <p className="text-xs text-red-600 mt-0.5 flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  {t.errorMessage}
                </p>
              )}
              {t.metrics && (
                <div className="flex gap-3 mt-1.5">
                  <span className="text-xs text-slate-500">
                    <Heart className="h-3 w-3 inline mr-0.5 text-red-400" />
                    {fmtNum(t.metrics.likes)}
                  </span>
                  <span className="text-xs text-slate-500">
                    <MessageCircle className="h-3 w-3 inline mr-0.5 text-amber-400" />
                    {fmtNum(t.metrics.comments)}
                  </span>
                  <span className="text-xs text-slate-500">
                    <Eye className="h-3 w-3 inline mr-0.5 text-violet-400" />
                    {fmtNum(t.metrics.impressions)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Activity timeline
// ---------------------------------------------------------------------------

function ActivityTimeline({ entries }: { entries: ActivityEntry[] }): React.JSX.Element {
  const iconMap: Record<ActivityEntry['type'], React.JSX.Element> = {
    created: <div className="h-2 w-2 rounded-full bg-slate-400" />,
    scheduled: <Clock className="h-3 w-3 text-blue-500" />,
    published: <CheckCircle2 className="h-3 w-3 text-emerald-500" />,
    failed: <XCircle className="h-3 w-3 text-red-500" />,
    cancelled: <X className="h-3 w-3 text-amber-500" />,
    updated: <RefreshCw className="h-3 w-3 text-slate-400" />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">No activity recorded.</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry, i) => (
              <li key={entry.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
                    {iconMap[entry.type]}
                  </div>
                  {i < entries.length - 1 && (
                    <div className="mt-1 h-4 w-px bg-slate-100" />
                  )}
                </div>
                <div className="flex-1 pb-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 leading-tight">{entry.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(entry.timestamp)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Media gallery
// ---------------------------------------------------------------------------

function MediaGallery({
  media,
  editable,
  onRemove,
  onUpload,
}: {
  media: MediaItem[];
  editable: boolean;
  onRemove: (id: string) => Promise<void>;
  onUpload: (files: UploadedFile[]) => void;
}): React.JSX.Element {
  const [removing, setRemoving] = React.useState<string | null>(null);

  async function handleRemove(id: string): Promise<void> {
    setRemoving(id);
    await onRemove(id);
    setRemoving(null);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-slate-400" />
          Media
          {media.length > 0 && (
            <span className="text-xs font-normal text-slate-400">({media.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {media.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {media.map((m) => {
              const isImage = m.type.toLowerCase().includes('image') || m.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              return (
                <div key={m.id} className="group relative rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.url}
                      alt={m.filename || 'Media'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center flex-col gap-1">
                      <ImageIcon className="h-6 w-6 text-slate-400" />
                      <span className="text-[10px] text-slate-400 px-2 text-center truncate max-w-full">
                        {m.filename || 'Video'}
                      </span>
                    </div>
                  )}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => void handleRemove(m.id)}
                      disabled={removing === m.id}
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                      aria-label="Remove media"
                    >
                      {removing === m.id ? (
                        <Loader2 className="h-3 w-3 text-white animate-spin" />
                      ) : (
                        <X className="h-3 w-3 text-white" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {editable && (
          <UploadZone onFilesChange={onUpload} maxFiles={4} maxSizeMB={50} />
        )}

        {!editable && media.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">No media attached.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Post info sidebar
// ---------------------------------------------------------------------------

function PostInfoSidebar({
  post,
  scheduleDate,
  scheduleTime,
  editable,
  onScheduleDateChange,
  onScheduleTimeChange,
}: {
  post: PostDetail;
  scheduleDate: string;
  scheduleTime: string;
  editable: boolean;
  onScheduleDateChange: (v: string) => void;
  onScheduleTimeChange: (v: string) => void;
}): React.JSX.Element {
  const countdown = post.status === 'scheduled' ? getCountdown(post.scheduledAt) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Post Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {post.clientName && (
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Client</p>
              <span className="text-sm font-medium text-slate-700">
                {post.clientName}
              </span>
            </div>
          </div>
        )}

        {post.createdAt && (
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Created</p>
              <p className="text-slate-700">{fmtShortDate(post.createdAt)}</p>
            </div>
          </div>
        )}

        {post.publishedAt && (
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Published</p>
              <p className="text-slate-700">{fmtDate(post.publishedAt)}</p>
            </div>
          </div>
        )}

        {post.status === 'scheduled' && post.scheduledAt && !editable && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Scheduled</p>
              <p className="text-slate-700">{fmtDate(post.scheduledAt)}</p>
              {countdown && (
                <p className="text-xs text-blue-600 font-medium mt-0.5">In {countdown}</p>
              )}
            </div>
          </div>
        )}

        {editable && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Schedule</p>
            <Input
              label="Date"
              type="date"
              value={scheduleDate}
              onChange={(e) => onScheduleDateChange(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <Input
              label="Time"
              type="time"
              value={scheduleTime}
              onChange={(e) => onScheduleTimeChange(e.target.value)}
            />
            {scheduleDate && scheduleTime && countdown !== null && (
              <p className="text-xs text-blue-600 font-medium">In {countdown}</p>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Platforms</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {(post.platforms ?? []).map((p) => (
                  <PlatformIcon key={p} platform={p} size="sm" />
                ))}
                {post.platforms.length === 0 && (
                  <span className="text-slate-400 text-xs">None</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Schedule dialog
// ---------------------------------------------------------------------------

function ScheduleDialog({
  open,
  onClose,
  onConfirm,
  loading,
  initialDate,
  initialTime,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
  loading: boolean;
  initialDate: string;
  initialTime: string;
}): React.JSX.Element {
  const [date, setDate] = React.useState(initialDate);
  const [time, setTime] = React.useState(initialTime);

  React.useEffect(() => {
    if (open) {
      setDate(initialDate);
      setTime(initialTime);
    }
  }, [open, initialDate, initialTime]);

  const today = new Date().toISOString().split('T')[0]!;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Schedule Post"
      description="Choose when this post should be published."
    >
      <div className="space-y-4">
        <Input
          label="Date"
          type="date"
          value={date}
          min={today}
          onChange={(e) => setDate(e.target.value)}
        />
        <Input
          label="Time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          disabled={!date || !time || loading}
          onClick={() => onConfirm(date, time)}
          className="gap-1.5"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
          {loading ? 'Scheduling…' : 'Schedule'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page component
// ---------------------------------------------------------------------------

export default function PostDetailPage(): React.JSX.Element {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const postId = params.postId ?? '';

  // Fetch state
  const [post, setPost] = React.useState<PostDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Edit state
  const [title, setTitle] = React.useState('');
  const [contents, setContents] = React.useState<Record<string, string>>({});
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('09:00');
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);

  // Social accounts for target selection
  const [socialAccounts, setSocialAccounts] = React.useState<Array<{ id: string; platform: string; displayName: string | null }>>([]);

  // Dialog state
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [crossPostOpen, setCrossPostOpen] = React.useState(false);
  const [crossPostSource, setCrossPostSource] = React.useState<{ platform: Platform; content: string } | null>(null);

  // ── Fetch post ─────────────────────────────────────────────────────────────
  const fetchPost = React.useCallback(async (): Promise<void> => {
    if (!postId) return;
    try {
      setLoading(true);
      setFetchError(null);
      setNotFound(false);
      const data = await apiClient.get<Record<string, unknown>>(`/posts/${postId}`);
      const mapped = mapApiPost(data);
      setPost(mapped);
      setTitle(mapped.title);

      const initContents: Record<string, string> = {};
      if (mapped.platforms.length > 0) {
        mapped.platforms.forEach((p) => {
          initContents[p] = mapped.content;
        });
      } else {
        // No platforms — store content under a generic key so it's still accessible
        initContents['_default'] = mapped.content;
      }
      setContents(initContents);

      if (mapped.scheduledAt) {
        const d = new Date(mapped.scheduledAt);
        setScheduleDate(d.toISOString().slice(0, 10));
        setScheduleTime(
          `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        );
      }
    } catch (err: unknown) {
      const apiErr = err as { statusCode?: number };
      if (apiErr?.statusCode === 404) {
        setNotFound(true);
      } else {
        console.error('Failed to fetch post:', err);
        setFetchError('Failed to load post. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  React.useEffect(() => {
    void fetchPost();
    // Fetch social accounts for platform target selection
    apiClient.get<Array<{ id: string; platform: string; displayName: string | null; platformUsername: string | null }>>('/social-accounts')
      .then((accounts) => setSocialAccounts(accounts.map((a) => ({ id: a.id, platform: (a.platform ?? '').toLowerCase(), displayName: a.displayName ?? a.platformUsername ?? 'Unknown' }))))
      .catch(() => { /* non-fatal */ });
  }, [fetchPost]);

  function showToast(message: string, type: 'success' | 'error'): void {
    setToast({ message, type });
  }

  // Derived values
  const status = post?.status ?? 'draft';
  const isEditable = status === 'draft' || status === 'scheduled';
  const isPublished = status === 'published';
  const isFailed = status === 'failed';
  const isCancelled = status === 'cancelled';
  const isScheduled = status === 'scheduled';

  const mediaUrls = uploadedFiles
    .filter((f) => f.preview !== null)
    .map((f) => f.preview!);

  const apiMediaUrls = (post?.media ?? []).map((m) => m.url).filter(Boolean);
  const allMediaUrls = [...apiMediaUrls, ...mediaUrls];

  function handleContentChange(platform: Platform, value: string): void {
    setContents((prev) => ({ ...prev, [platform]: value }));
  }

  // ── Build patch payload ────────────────────────────────────────────────────
  function buildPatchPayload(): Record<string, unknown> {
    const firstPlatform = post?.platforms?.[0] ?? 'twitter';
    const contentText = contents[firstPlatform] ?? post?.content ?? '';

    // Build targets from connected social accounts matching selected platforms
    const platformSet = new Set(Object.keys(contents).length > 0 ? Object.keys(contents) : post?.platforms ?? []);
    const targets = socialAccounts
      .filter((a) => platformSet.has(a.platform))
      .map((a) => ({ socialAccountId: a.id }));

    const payload: Record<string, unknown> = {
      title: title.trim(),
      content: { text: contentText },
    };

    // Only send targets if we have social accounts to map
    if (targets.length > 0) {
      payload.targets = targets;
    }

    return payload;
  }

  // ── Save draft ─────────────────────────────────────────────────────────────
  async function handleSaveDraft(): Promise<void> {
    if (!post) return;
    setActionLoading(true);
    try {
      await apiClient.patch(`/posts/${post.id}`, buildPatchPayload());
      showToast('Draft saved', 'success');
      void fetchPost();
    } catch (err) {
      console.error('Failed to save draft:', err);
      showToast('Failed to save draft. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Schedule ───────────────────────────────────────────────────────────────
  async function handleSchedule(date: string, time: string): Promise<void> {
    if (!post) return;
    setActionLoading(true);
    try {
      await apiClient.patch(`/posts/${post.id}`, buildPatchPayload());
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      await apiClient.post(`/posts/${post.id}/schedule`, { scheduledAt });
      showToast('Post scheduled successfully', 'success');
      setScheduleOpen(false);
      void fetchPost();
    } catch (err) {
      console.error('Failed to schedule post:', err);
      showToast('Failed to schedule post. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Publish now ────────────────────────────────────────────────────────────
  async function handlePublishNow(): Promise<void> {
    if (!post) return;
    setActionLoading(true);
    try {
      if (isEditable) {
        await apiClient.patch(`/posts/${post.id}`, buildPatchPayload());
      }
      await apiClient.post(`/posts/${post.id}/publish-now`);
      showToast('Post published!', 'success');
      void fetchPost();
    } catch (err) {
      console.error('Failed to publish post:', err);
      showToast('Failed to publish post. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Cancel scheduled ───────────────────────────────────────────────────────
  async function handleCancel(): Promise<void> {
    if (!post) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/posts/${post.id}/cancel`);
      showToast('Post cancelled', 'success');
      void fetchPost();
    } catch (err) {
      console.error('Failed to cancel post:', err);
      showToast('Failed to cancel post. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Restore to draft ───────────────────────────────────────────────────────
  async function handleRestoreToDraft(): Promise<void> {
    if (!post) return;
    setActionLoading(true);
    try {
      await apiClient.patch(`/posts/${post.id}`, { status: 'DRAFT' });
      showToast('Post restored to draft', 'success');
      void fetchPost();
    } catch (err) {
      console.error('Failed to restore post:', err);
      showToast('Failed to restore post. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  // ── Retry (failed) ─────────────────────────────────────────────────────────
  async function handleRetry(): Promise<void> {
    await handlePublishNow();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(): Promise<void> {
    if (!post) return;
    setActionLoading(true);
    try {
      await apiClient.delete(`/posts/${post.id}`);
      router.push('/dashboard/posts');
    } catch (err) {
      console.error('Failed to delete post:', err);
      showToast('Failed to delete post. Please try again.', 'error');
      setDeleteOpen(false);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Remove media ───────────────────────────────────────────────────────────
  async function handleRemoveMedia(mediaId: string): Promise<void> {
    if (!post) return;
    try {
      await apiClient.delete(`/posts/${post.id}/media/${mediaId}`);
      showToast('Media removed', 'success');
      void fetchPost();
    } catch (err) {
      console.error('Failed to remove media:', err);
      showToast('Failed to remove media. Please try again.', 'error');
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400">Loading post…</p>
        </div>
      </div>
    );
  }

  // ── 404 state ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <AlertCircle className="h-8 w-8 text-slate-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-800">Post not found</h2>
          <p className="text-sm text-slate-500 mt-1">This post may have been deleted or does not exist.</p>
        </div>
        <Link href="/dashboard/posts">
          <Button variant="outline" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Posts
          </Button>
        </Link>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (fetchError || !post) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600">{fetchError ?? 'Something went wrong.'}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void fetchPost()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Link href="/dashboard/posts">
            <Button variant="outline">Back to Posts</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activityLog = buildActivityLog(post);

  return (
    <>
      {toast !== null && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="space-y-6 pb-20">
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link href="/dashboard/posts">
              <button
                type="button"
                className="mt-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
                aria-label="Back to posts"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </Link>
            <div className="min-w-0">
              <InlineTitleEditor
                value={title}
                disabled={!isEditable}
                onChange={setTitle}
              />
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <StatusBadge status={status} />
                {post.clientName && (
                  <span className="text-xs text-slate-400">
                    {post.clientName}
                  </span>
                )}
                {isScheduled && post.scheduledAt && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                    <Clock className="h-3 w-3" />
                    {getCountdown(post.scheduledAt)} remaining
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Draft actions */}
            {status === 'draft' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => void handleSaveDraft()}
                  className="gap-1.5"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save Draft
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => setScheduleOpen(true)}
                  className="gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Schedule
                </Button>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => void handlePublishNow()}
                  className="gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Publish Now
                </Button>
              </>
            )}

            {/* Scheduled actions */}
            {isScheduled && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => setScheduleOpen(true)}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => void handlePublishNow()}
                  className="gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Publish Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => void handleCancel()}
                  className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </>
            )}

            {/* Published actions */}
            {isPublished && post.platforms.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const firstPlatform = post.platforms[0]!;
                  setCrossPostSource({
                    platform: firstPlatform,
                    content: contents[firstPlatform] ?? post.content,
                  });
                  setCrossPostOpen(true);
                }}
                className="gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                Cross-Post
              </Button>
            )}

            {/* Failed actions */}
            {isFailed && (
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={() => void handleRetry()}
                className="gap-1.5"
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Retry
              </Button>
            )}

            {/* Cancelled actions */}
            {isCancelled && (
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={() => void handleRestoreToDraft()}
                className="gap-1.5"
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Restore to Draft
              </Button>
            )}

            {/* Delete — available for any non-published status */}
            {!isPublished && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* ── Failed error banner ────────────────────────────────────────────── */}
        {isFailed && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Publishing failed</p>
              {post.targets.filter((t) => t.status === 'failed').map((t) => (
                <p key={t.id || t.platform} className="text-sm text-red-700 mt-0.5">
                  {getPlatformLabel(t.platform)}: {t.errorMessage ?? 'Unknown error'}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── Cancelled info banner ──────────────────────────────────────────── */}
        {isCancelled && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
            <X className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800">
              This post was cancelled. You can restore it to draft to make changes and republish.
            </p>
          </div>
        )}

        {/* ── Scheduled countdown banner ─────────────────────────────────────── */}
        {isScheduled && post.scheduledAt && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-500 shrink-0" />
            <p className="text-sm text-blue-800">
              Scheduled to publish <span className="font-semibold">{fmtDate(post.scheduledAt)}</span>
              {' '}— <span className="font-medium">{getCountdown(post.scheduledAt)} remaining</span>
            </p>
          </div>
        )}

        {/* ── Main two-column layout ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: content editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Platform selector (editable only) */}
            {isEditable && socialAccounts.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Target Platforms</p>
                  <div className="flex flex-wrap gap-2">
                    {ALL_PLATFORMS_LIST.map((p) => {
                      const hasAccount = socialAccounts.some((a) => a.platform === p);
                      const isSelected = Object.keys(contents).includes(p) || post.platforms.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          disabled={!hasAccount}
                          onClick={() => {
                            if (isSelected) {
                              // Remove platform
                              setContents((prev) => {
                                const next = { ...prev };
                                delete next[p];
                                return next;
                              });
                              setPost((prev) => prev ? { ...prev, platforms: prev.platforms.filter((x) => x !== p) } : prev);
                            } else {
                              // Add platform with current content
                              const currentContent = Object.values(contents)[0] ?? post.content ?? '';
                              const limit = PLATFORM_CHAR_LIMITS[p];
                              const adapted = currentContent.length > limit ? currentContent.slice(0, limit - 3) + '...' : currentContent;
                              setContents((prev) => ({ ...prev, [p]: adapted }));
                              setPost((prev) => prev ? { ...prev, platforms: [...prev.platforms, p] } : prev);
                            }
                          }}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
                            isSelected
                              ? 'border-blue-300 bg-blue-50 text-blue-800 font-medium shadow-sm'
                              : hasAccount
                                ? 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                : 'border-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                          )}
                          title={!hasAccount ? `No ${getPlatformLabel(p)} account connected` : isSelected ? `Remove ${getPlatformLabel(p)}` : `Add ${getPlatformLabel(p)}`}
                        >
                          <PlatformIcon platform={p} size="sm" className={!hasAccount ? 'grayscale' : ''} />
                          {getPlatformLabel(p)}
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />}
                        </button>
                      );
                    })}
                  </div>
                  {socialAccounts.length === 0 && (
                    <p className="text-xs text-slate-400 mt-2">No social accounts connected. <Link href="/dashboard/social-accounts" className="text-blue-600 hover:underline">Connect accounts</Link></p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Platform content panel */}
            <PlatformContentPanel
              platforms={post.platforms}
              contents={contents}
              targets={post.targets}
              mediaUrls={allMediaUrls}
              disabled={!isEditable}
              onContentChange={handleContentChange}
              onCrossPost={(platform, content) => {
                setCrossPostSource({ platform, content });
                setCrossPostOpen(true);
              }}
            />

            {/* Platform targets panel (if targets exist) */}
            {post.targets.length > 0 && (
              <PlatformTargetsPanel targets={post.targets} />
            )}

            {/* Activity timeline */}
            <ActivityTimeline entries={activityLog} />
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">
            {/* Post info */}
            <PostInfoSidebar
              post={post}
              scheduleDate={scheduleDate}
              scheduleTime={scheduleTime}
              editable={isEditable}
              onScheduleDateChange={setScheduleDate}
              onScheduleTimeChange={setScheduleTime}
            />

            {/* Media gallery */}
            <MediaGallery
              media={post.media}
              editable={isEditable}
              onRemove={handleRemoveMedia}
              onUpload={setUploadedFiles}
            />
          </div>
        </div>
      </div>

      {/* ── Delete dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Post"
        description="This will permanently remove the post and all its platform versions. This action cannot be undone."
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={actionLoading}
            onClick={() => void handleDelete()}
            className="gap-1.5"
          >
            {actionLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
            ) : (
              <><Trash2 className="h-4 w-4" /> Delete Post</>
            )}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── Schedule dialog ────────────────────────────────────────────────── */}
      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onConfirm={(date, time) => void handleSchedule(date, time)}
        loading={actionLoading}
        initialDate={scheduleDate}
        initialTime={scheduleTime}
      />

      {/* ── Cross-post dialog ──────────────────────────────────────────────── */}
      {crossPostSource !== null && (
        <CrossPostDialog
          open={crossPostOpen}
          onClose={() => { setCrossPostOpen(false); setCrossPostSource(null); }}
          sourceContent={crossPostSource.content}
          sourcePlatform={crossPostSource.platform}
          existingPlatforms={post.platforms}
          onConfirm={async (targets, newContents) => {
            try {
              // Create a new post per target platform with adapted content
              for (const platform of targets) {
                const adaptedContent = newContents[platform] ?? crossPostSource.content;
                await apiClient.post('/posts', {
                  title: `${post.title} (${getPlatformLabel(platform)})`,
                  content: { text: adaptedContent },
                  clientId: post.clientId || undefined,
                });
              }
              showToast(`Cross-posted to ${targets.length} platform${targets.length > 1 ? 's' : ''}`, 'success');
              // Refresh post data
              void fetchPost();
            } catch (err) {
              console.error('Cross-post failed:', err);
              showToast('Failed to cross-post. Please try again.', 'error');
            }
          }}
        />
      )}
    </>
  );
}
