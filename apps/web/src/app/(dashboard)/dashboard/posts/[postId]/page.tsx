'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, Sparkles, Clock, Send, FileText, Globe, Trash2,
  ExternalLink, CheckCircle2, XCircle, Loader2, AlertCircle,
  Eye, Heart, MessageCircle, Share2, BarChart3, Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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

type PublishStatus = 'published' | 'failed' | 'pending' | 'scheduled';

interface PlatformTarget {
  platform: Platform;
  status: PublishStatus;
  publishedAt: string | null;
  url: string | null;
  error: string | null;
  metrics?: { likes: number; comments: number; shares: number; impressions: number; engagementRate: number };
}

interface PostDetail {
  id: string;
  title: string;
  content: string;
  platformContents?: Record<string, string>;
  platforms: Platform[];
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  clientId: string;
  clientName: string;
  targets: PlatformTarget[];
}

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

interface ApiPost {
  id: string;
  title: string;
  content: string;
  platformContents?: Record<string, string> | null;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
  timezone?: string | null;
  clientId: string | null;
  client?: { id: string; name: string } | null;
  targets?: {
    platform: string;
    status: string;
    publishedAt: string | null;
    url: string | null;
    error: string | null;
    metrics?: {
      likes?: number;
      comments?: number;
      shares?: number;
      impressions?: number;
      engagementRate?: number;
    } | null;
  }[] | null;
}

interface ApiClient {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Map API post to local PostDetail shape
// ---------------------------------------------------------------------------

function mapApiPost(a: ApiPost): PostDetail {
  let scheduledDate = '';
  let scheduledTime = '09:00';
  if (a.scheduledAt) {
    const d = new Date(a.scheduledAt);
    scheduledDate = d.toISOString().slice(0, 10);
    scheduledTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return {
    id: a.id,
    title: a.title || 'Untitled Post',
    content: a.content,
    platformContents: a.platformContents ?? undefined,
    platforms: a.platforms.map((p) => p.toLowerCase()) as Platform[],
    status: (a.status.toLowerCase()) as PostDetail['status'],
    scheduledDate,
    scheduledTime,
    timezone: a.timezone ?? 'America/New_York',
    clientId: a.clientId ?? '',
    clientName: a.client?.name ?? '',
    targets: (a.targets ?? []).map((t) => ({
      platform: t.platform.toLowerCase() as Platform,
      status: (t.status.toLowerCase()) as PublishStatus,
      publishedAt: t.publishedAt,
      url: t.url,
      error: t.error,
      metrics: t.metrics
        ? {
            likes: t.metrics.likes ?? 0,
            comments: t.metrics.comments ?? 0,
            shares: t.metrics.shares ?? 0,
            impressions: t.metrics.impressions ?? 0,
            engagementRate: t.metrics.engagementRate ?? 0,
          }
        : undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_PLATFORMS: Platform[] = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'];
const TZ_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
  { value: 'UTC', label: 'UTC' },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
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
// Char counter
// ---------------------------------------------------------------------------

function CharCounter({ count, limit }: { count: number; limit: number }): React.JSX.Element {
  const remaining = limit - count;
  const pct = count / limit;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-4 w-4">
        <svg viewBox="0 0 16 16" className="h-full w-full -rotate-90">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#e2e8f0" strokeWidth="2" />
          <circle cx="8" cy="8" r="6" fill="none" stroke={pct >= 1 ? '#ef4444' : pct >= 0.9 ? '#f59e0b' : '#3b82f6'} strokeWidth="2" strokeDasharray={`${Math.min(pct, 1) * 37.7} 37.7`} strokeLinecap="round" />
        </svg>
      </div>
      <span className={cn('text-xs font-medium tabular-nums', remaining < 0 ? 'text-red-600' : remaining <= 20 ? 'text-amber-600' : 'text-slate-400')}>
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
  open: boolean; onClose: () => void; sourceContent: string; sourcePlatform: Platform;
  existingPlatforms: Platform[]; onConfirm: (targets: Platform[], contents: Record<string, string>) => void;
}): React.JSX.Element {
  const available = ALL_PLATFORMS_LIST.filter((p) => !existingPlatforms.includes(p));
  const [selected, setSelected] = React.useState<Platform[]>([]);
  const [contents, setContents] = React.useState<Record<string, string>>({});
  const [previewPlatform, setPreviewPlatform] = React.useState<Platform | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelected([]);
      setContents({});
      setPreviewPlatform(null);
    }
  }, [open]);

  function toggle(p: Platform): void {
    setSelected((prev) => {
      const next = prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p];
      if (!prev.includes(p) && !contents[p]) {
        const limit = PLATFORM_CHAR_LIMITS[p];
        let adapted = sourceContent;
        if (adapted.length > limit) adapted = adapted.slice(0, limit - 3) + '...';
        setContents((c) => ({ ...c, [p]: adapted }));
      }
      if (!prev.includes(p)) setPreviewPlatform(p);
      return next;
    });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Share to Other Platforms" description={`Cross-post your ${getPlatformLabel(sourcePlatform)} content to additional platforms.`} maxWidth="max-w-3xl">
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
                <button key={p} type="button" onClick={() => toggle(p)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all text-sm',
                    selected.includes(p)
                      ? 'border-blue-300 bg-blue-50 text-blue-800 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
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
            <div className="flex gap-1 border-b border-slate-100 pb-2">
              {selected.map((p) => (
                <button key={p} type="button" onClick={() => setPreviewPlatform(p)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    previewPlatform === p ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
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

            {previewPlatform && selected.includes(previewPlatform) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Adapt content for {getPlatformLabel(previewPlatform)}</span>
                    <CharCounter count={(contents[previewPlatform] ?? '').length} limit={PLATFORM_CHAR_LIMITS[previewPlatform]} />
                  </div>
                  <textarea
                    value={contents[previewPlatform] ?? sourceContent}
                    onChange={(e) => setContents((c) => ({ ...c, [previewPlatform!]: e.target.value }))}
                    rows={6}
                    className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    placeholder={`Adapt for ${getPlatformLabel(previewPlatform)}…`}
                  />
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Preview</p>
                  <PostPreview content={contents[previewPlatform] ?? sourceContent} platform={previewPlatform} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={selected.length === 0} onClick={() => {
          const finalContents: Record<string, string> = {};
          selected.forEach((p) => { finalContents[p] = contents[p] ?? sourceContent; });
          onConfirm(selected, finalContents);
          onClose();
        }} className="gap-1.5">
          <Send className="h-3.5 w-3.5" />
          Share to {selected.length} platform{selected.length !== 1 ? 's' : ''}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Platform editor + preview panel
// ---------------------------------------------------------------------------

function PlatformEditor({
  platform, content, onChange, target, media, mediaList, disabled, onCrossPost,
}: {
  platform: Platform; content: string; onChange: (v: string) => void;
  target?: PlatformTarget; media: string | null; mediaList?: string[]; disabled: boolean;
  onCrossPost?: (sourcePlatform: Platform, sourceContent: string) => void;
}): React.JSX.Element {
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const m = target?.metrics;
  const accentBorder = PLATFORM_ACCENT[platform];
  const isPublished = target?.status === 'published';

  return (
    <div className={cn('rounded-xl border-l-4 border border-slate-200 bg-white overflow-hidden', accentBorder)}>
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
        <PlatformIcon platform={platform} size="sm" />
        <span className="text-sm font-semibold text-slate-800">{getPlatformLabel(platform)}</span>

        {target && (
          <Badge variant={target.status === 'published' ? 'green' : target.status === 'failed' ? 'red' : target.status === 'scheduled' ? 'blue' : 'gray'} className="text-[10px]">
            {target.status}
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isPublished && onCrossPost && (
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => onCrossPost(platform, content)}
            >
              <Share2 className="h-3 w-3" /> Share to…
            </Button>
          )}

          {target?.url && (
            <a href={target.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
              View <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {target?.error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5 shrink-0" /> {target.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Content</span>
            <CharCounter count={content.length} limit={limit} />
          </div>
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Write your ${getPlatformLabel(platform)} post…`}
            rows={6}
            disabled={disabled}
            className={cn(
              'flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5',
              'text-sm placeholder:text-slate-400 resize-y',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent',
              disabled && 'cursor-not-allowed opacity-60 bg-slate-50'
            )}
          />

          {m && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Performance</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Heart, label: 'Likes', value: m.likes, color: 'text-red-500' },
                  { icon: MessageCircle, label: 'Comments', value: m.comments, color: 'text-amber-500' },
                  { icon: Share2, label: 'Shares', value: m.shares, color: 'text-blue-500' },
                  { icon: Eye, label: 'Impressions', value: m.impressions, color: 'text-violet-500' },
                  { icon: BarChart3, label: 'Eng. Rate', value: m.engagementRate, color: 'text-emerald-600' },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <Icon className={cn('h-3 w-3', s.color)} />
                      <span className="text-xs font-semibold text-slate-700">
                        {s.label === 'Eng. Rate' ? `${s.value}%` : fmt(s.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50/50">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Live Preview</p>
          <PostPreview content={content} platform={platform} media={media} mediaList={mediaList} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditPostPage(): React.JSX.Element {
  const params = useParams<{ postId: string }>();
  const router = useRouter();
  const postId = params.postId;

  // ── Fetch state ───────────────────────────────────────────────────────────
  const [post, setPost] = React.useState<PostDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = React.useState(false);

  // ── Client options from API ───────────────────────────────────────────────
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([
    { value: '', label: 'Select a client…' },
  ]);

  // ── Editor state (initialised after fetch) ────────────────────────────────
  const [title, setTitle] = React.useState('');
  const [platforms, setPlatforms] = React.useState<Platform[]>([]);
  const [contents, setContents] = React.useState<Record<string, string>>({});
  const [clientId, setClientId] = React.useState('');
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('09:00');
  const [timezone, setTimezone] = React.useState('America/New_York');
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [crossPostOpen, setCrossPostOpen] = React.useState(false);
  const [crossPostSource, setCrossPostSource] = React.useState<{ platform: Platform; content: string } | null>(null);

  // ── Fetch post ────────────────────────────────────────────────────────────
  const fetchPost = React.useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<ApiPost>(`/posts/${postId}`);
      const mapped = mapApiPost(data);
      setPost(mapped);
      setTitle(mapped.title);
      setPlatforms(mapped.platforms);
      const initContents: Record<string, string> = {};
      mapped.platforms.forEach((p) => {
        initContents[p] = mapped.platformContents?.[p] ?? mapped.content;
      });
      setContents(initContents);
      setClientId(mapped.clientId);
      setScheduleDate(mapped.scheduledDate);
      setScheduleTime(mapped.scheduledTime);
      setTimezone(mapped.timezone);
    } catch (err) {
      console.error('Failed to fetch post:', err);
      setError('Failed to load post. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const fetchClients = React.useCallback(async () => {
    try {
      const data = await apiClient.get<ApiClient[]>('/clients');
      setClientOptions([
        { value: '', label: 'Select a client…' },
        ...data.map((c) => ({ value: c.id, label: c.name })),
      ]);
    } catch (err) {
      console.error('Failed to fetch clients for selector:', err);
    }
  }, []);

  React.useEffect(() => {
    void fetchPost();
    void fetchClients();
  }, [fetchPost, fetchClients]);

  const isPublished = post?.status === 'published';
  const allMedia = uploadedFiles.filter((f) => f.preview !== null).map((f) => f.preview!);
  const firstMedia = allMedia[0] ?? null;

  function setContentFor(p: Platform, v: string): void {
    setContents((prev) => ({ ...prev, [p]: v }));
  }
  function getContentFor(p: Platform): string {
    return contents[p] ?? post?.content ?? '';
  }
  function togglePlatform(p: Platform): void {
    if (isPublished) return;
    setPlatforms((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      if (!contents[p]) setContents((c) => ({ ...c, [p]: post?.content ?? '' }));
      return [...prev, p];
    });
  }
  function copyToAll(): void {
    if (platforms.length === 0) return;
    const src = getContentFor(platforms[0]!);
    const updated: Record<string, string> = {};
    platforms.forEach((p) => { updated[p] = src; });
    setContents((prev) => ({ ...prev, ...updated }));
  }

  const canSave = title.trim().length > 0 && platforms.length > 0;
  const canSchedule = canSave && scheduleDate !== '' && scheduleTime !== '';

  // ── Save draft ─────────────────────────────────────────────────────────────
  async function handleSaveDraft(): Promise<void> {
    if (!post || !canSave) return;
    setSaving(true);
    try {
      const platformContentsPayload: Record<string, string> = {};
      platforms.forEach((p) => { platformContentsPayload[p] = getContentFor(p); });
      await apiClient.patch(`/posts/${post.id}`, {
        title: title.trim(),
        content: getContentFor(platforms[0] ?? 'twitter'),
        platforms,
        platformContents: platformContentsPayload,
        clientId: clientId || undefined,
        timezone,
      });
      setToast({ message: 'Draft saved', type: 'success' });
    } catch (err) {
      console.error('Failed to save draft:', err);
      setToast({ message: 'Failed to save draft. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Schedule ───────────────────────────────────────────────────────────────
  async function handleSchedule(): Promise<void> {
    if (!post || !canSchedule) return;
    setSaving(true);
    try {
      // First save any changes, then schedule
      const platformContentsPayload: Record<string, string> = {};
      platforms.forEach((p) => { platformContentsPayload[p] = getContentFor(p); });
      await apiClient.patch(`/posts/${post.id}`, {
        title: title.trim(),
        content: getContentFor(platforms[0] ?? 'twitter'),
        platforms,
        platformContents: platformContentsPayload,
        clientId: clientId || undefined,
        timezone,
      });
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      await apiClient.post(`/posts/${post.id}/schedule`, { scheduledAt });
      setToast({ message: 'Post scheduled successfully', type: 'success' });
      void fetchPost();
    } catch (err) {
      console.error('Failed to schedule post:', err);
      setToast({ message: 'Failed to schedule post. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Publish now ────────────────────────────────────────────────────────────
  async function handlePublishNow(): Promise<void> {
    if (!post || !canSave) return;
    setSaving(true);
    try {
      const platformContentsPayload: Record<string, string> = {};
      platforms.forEach((p) => { platformContentsPayload[p] = getContentFor(p); });
      await apiClient.patch(`/posts/${post.id}`, {
        title: title.trim(),
        content: getContentFor(platforms[0] ?? 'twitter'),
        platforms,
        platformContents: platformContentsPayload,
        clientId: clientId || undefined,
        timezone,
      });
      await apiClient.post(`/posts/${post.id}/publish-now`);
      setToast({ message: 'Post published!', type: 'success' });
      void fetchPost();
    } catch (err) {
      console.error('Failed to publish post:', err);
      setToast({ message: 'Failed to publish post. Please try again.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(): Promise<void> {
    if (!post) return;
    setSaving(true);
    try {
      await apiClient.delete(`/posts/${post.id}`);
      router.push('/dashboard/posts');
    } catch (err) {
      console.error('Failed to delete post:', err);
      setToast({ message: 'Failed to delete post. Please try again.', type: 'error' });
      setDeleteOpen(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-slate-600">{error ?? 'Post not found.'}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => void fetchPost()}>Retry</Button>
          <Link href="/dashboard/posts">
            <Button variant="outline">Back to Posts</Button>
          </Link>
        </div>
      </div>
    );
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
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/posts">
              <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{isPublished ? 'View Post' : 'Edit Post'}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{post.clientName || 'No client assigned'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={post.status === 'published' ? 'green' : post.status === 'scheduled' ? 'blue' : post.status === 'failed' ? 'red' : post.status === 'cancelled' ? 'default' : 'gray'} className="capitalize text-sm px-3 py-1">
              {post.status}
            </Badge>
            {!isPublished && (
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>

        {/* Title + Settings row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent className="pt-5 space-y-4">
              <Input label="Post Title" placeholder="Give this post a title…" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isPublished} hint="Internal only — not shown on platforms." />
              <div className="grid grid-cols-2 gap-3">
                <Select label="Client" value={clientId} onChange={(e) => setClientId(e.target.value)} options={clientOptions} disabled={isPublished} />
                <Select label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={TZ_OPTIONS} disabled={isPublished} />
              </div>
              {!isPublished && (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  <Input label="Time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Media</p>
                {isPublished ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                    <p className="text-xs text-slate-400">Media cannot be modified on published posts.</p>
                  </div>
                ) : (
                  <UploadZone onFilesChange={setUploadedFiles} maxFiles={4} maxSizeMB={50} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Platforms</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {ALL_PLATFORMS.map((p) => (
                <button
                  key={p} type="button" onClick={() => togglePlatform(p)}
                  disabled={isPublished}
                  className={cn(
                    'flex items-center gap-2 w-full rounded-lg px-2.5 py-2 text-left transition-all text-sm',
                    isPublished && 'opacity-60 cursor-not-allowed',
                    platforms.includes(p) ? 'bg-blue-50 border border-blue-200 text-blue-800 font-medium' : 'border border-transparent text-slate-500 hover:bg-slate-50'
                  )}
                >
                  <PlatformIcon platform={p} size="sm" />
                  <span className="flex-1">{getPlatformLabel(p)}</span>
                  {platforms.includes(p) && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Platform-specific content editors */}
        {platforms.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Platform Content</h2>
              {platforms.length > 1 && !isPublished && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={copyToAll}>
                  <Copy className="h-3.5 w-3.5" /> Copy first to all
                </Button>
              )}
            </div>

            {platforms.map((p) => (
              <PlatformEditor
                key={p}
                platform={p}
                content={getContentFor(p)}
                onChange={(v) => setContentFor(p, v)}
                target={post.targets.find((t) => t.platform === p)}
                media={firstMedia}
                mediaList={allMedia}
                disabled={isPublished}
                onCrossPost={(srcPlatform, srcContent) => {
                  setCrossPostSource({ platform: srcPlatform, content: srcContent });
                  setCrossPostOpen(true);
                }}
              />
            ))}
          </div>
        )}

        {/* AI shortcut */}
        {!isPublished && (
          <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-4 flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <Sparkles className="h-5 w-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">Generate with AI</p>
              <p className="text-xs text-slate-500 mt-0.5">Let AI create platform-optimized content for each channel.</p>
            </div>
            <Link href="/dashboard/ai">
              <Button variant="outline" size="sm" className="border-violet-200 text-violet-700 hover:bg-violet-100 gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Generate
              </Button>
            </Link>
          </div>
        )}

        {/* Bottom action bar */}
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {platforms.length > 0 ? (
                <>
                  <Globe className="h-3.5 w-3.5" />
                  {isPublished ? 'Published to' : 'Publishing to'}{' '}
                  <span className="font-medium text-slate-700">
                    {platforms.map((p) => getPlatformLabel(p).split(' ')[0]).join(', ')}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>{platforms.length} platform{platforms.length > 1 ? 's' : ''}</span>
                </>
              ) : (
                <span className="text-amber-600">No platforms selected</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/posts">
                <Button variant="ghost" size="sm">{isPublished ? 'Close' : 'Cancel'}</Button>
              </Link>
              {!isPublished && (
                <>
                  <Button variant="outline" size="sm" disabled={!canSave || saving} onClick={() => void handleSaveDraft()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Save Draft
                  </Button>
                  <Button variant="outline" size="sm" disabled={!canSchedule || saving} onClick={() => void handleSchedule()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                    Schedule
                  </Button>
                  <Button size="sm" disabled={!canSave || saving} onClick={() => void handlePublishNow()}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Publish Now
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Post" description="This will permanently remove the post and all platform versions. This cannot be undone.">
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="destructive" disabled={saving} onClick={() => void handleDelete()}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Delete Post'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Cross-post dialog */}
      {crossPostSource && (
        <CrossPostDialog
          open={crossPostOpen}
          onClose={() => { setCrossPostOpen(false); setCrossPostSource(null); }}
          sourceContent={crossPostSource.content}
          sourcePlatform={crossPostSource.platform}
          existingPlatforms={platforms}
          onConfirm={(targets, newContents) => {
            setPlatforms((prev) => [...prev, ...targets]);
            setContents((prev) => ({ ...prev, ...newContents }));
          }}
        />
      )}
    </>
  );
}
