'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronDown,
  Sparkles,
  Plus,
  Minus,
  Clock,
  Send,
  FileText,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadZone, type UploadedFile } from '@/components/media/upload-zone';
import { PostPreview, PLATFORM_CHAR_LIMITS } from '@/components/posts/post-preview';
import {
  PlatformIcon,
  getPlatformLabel,
  type Platform,
} from '@/components/social/platform-icon';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_PLATFORMS: Platform[] = [
  'twitter',
  'facebook',
  'instagram',
  'linkedin',
  'tiktok',
  'youtube',
];

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'UTC', label: 'UTC' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlatformContent {
  text: string;
  overridden: boolean;
}

interface ApiClient {
  id: string;
  name?: string | null;
  companyName?: string | null;
}

interface ApiSocialAccount {
  id: string;
  platform: string;
  platformUsername?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
}

interface ApiPostTarget {
  id: string;
  status?: string;
  errorMessage?: string | null;
  socialAccount?: { platform?: string; displayName?: string };
}

interface ApiPostResponse {
  id: string;
  status?: string;
  targets?: ApiPostTarget[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Toast notification
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
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg max-w-sm',
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
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-1 opacity-60 hover:opacity-100 transition-opacity shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Character counter ring
// ---------------------------------------------------------------------------

function CharCounter({
  count,
  limit,
}: {
  count: number;
  limit: number;
}): React.JSX.Element {
  const remaining = limit - count;
  const pct = count / limit;

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-4 w-4">
        <svg viewBox="0 0 16 16" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#e2e8f0" strokeWidth="2" />
          <circle
            cx="8"
            cy="8"
            r="6"
            fill="none"
            stroke={pct >= 1 ? '#ef4444' : pct >= 0.9 ? '#f59e0b' : '#3b82f6'}
            strokeWidth="2"
            strokeDasharray={`${Math.min(pct, 1) * 37.7} 37.7`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span
        className={cn(
          'text-xs font-medium tabular-nums',
          remaining < 0
            ? 'text-red-600'
            : remaining <= 20
            ? 'text-amber-600'
            : 'text-slate-400'
        )}
      >
        {remaining < 0 ? `-${Math.abs(remaining)}` : remaining}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewPostPage(): React.JSX.Element {
  const router = useRouter();

  // ── Content state ──────────────────────────────────────────────────────────
  const [title, setTitle] = React.useState('');
  const [defaultContent, setDefaultContent] = React.useState('');
  const [platformContents, setPlatformContents] = React.useState<
    Record<Platform, PlatformContent>
  >(() =>
    Object.fromEntries(
      ALL_PLATFORMS.map((p) => [p, { text: '', overridden: false }])
    ) as Record<Platform, PlatformContent>
  );

  // ── Account / channel selection state ──────────────────────────────────────
  const [accounts, setAccounts] = React.useState<ApiSocialAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = React.useState(true);
  const [selectedAccountIds, setSelectedAccountIds] = React.useState<Set<string>>(new Set());
  const [expandedPlatforms, setExpandedPlatforms] = React.useState<Set<Platform>>(new Set());

  // ── Settings state ─────────────────────────────────────────────────────────
  const [activePlatformTab, setActivePlatformTab] = React.useState<Platform>('twitter');
  const [clientId, setClientId] = React.useState('');
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('09:00');
  const [timezone, setTimezone] = React.useState('America/New_York');
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);

  // ── Preview state ──────────────────────────────────────────────────────────
  const [previewPlatform, setPreviewPlatform] = React.useState<Platform>('twitter');

  // ── Client data ────────────────────────────────────────────────────────────
  const [clients, setClients] = React.useState<ApiClient[]>([]);
  const [clientsLoading, setClientsLoading] = React.useState(true);

  // ── Submission state ───────────────────────────────────────────────────────
  const [submitting, setSubmitting] = React.useState(false);
  const [submitAction, setSubmitAction] = React.useState<'draft' | 'schedule' | 'publish' | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── Fetch clients on mount ─────────────────────────────────────────────────
  React.useEffect(() => {
    async function loadClients(): Promise<void> {
      try {
        setClientsLoading(true);
        // API may return paginated or array — handle both
        const response = await apiClient.get<
          { items: ApiClient[]; total: number } | ApiClient[]
        >('/clients?limit=100&page=1');

        const list: ApiClient[] = Array.isArray(response)
          ? (response as ApiClient[])
          : ((response as { items: ApiClient[] }).items ?? []);

        setClients(list);
      } catch (err) {
        console.error('Failed to load clients:', err);
        // Non-fatal — user can still create post without client
      } finally {
        setClientsLoading(false);
      }
    }
    void loadClients();
  }, []);

  // ── Fetch connected social accounts on mount ───────────────────────────────
  React.useEffect(() => {
    async function loadAccounts(): Promise<void> {
      try {
        setAccountsLoading(true);
        const data = await apiClient.get<ApiSocialAccount[]>('/social-accounts');
        const active = (data ?? []).filter((a) => a.isActive !== false);
        setAccounts(active);
        // Expand every platform that has accounts by default.
        setExpandedPlatforms(
          new Set(active.map((a) => a.platform.toLowerCase() as Platform))
        );
      } catch (err) {
        console.error('Failed to load social accounts:', err);
      } finally {
        setAccountsLoading(false);
      }
    }
    void loadAccounts();
  }, []);

  // ── Accounts grouped by platform ───────────────────────────────────────────
  const accountsByPlatform = React.useMemo(() => {
    const map = new Map<Platform, ApiSocialAccount[]>();
    accounts.forEach((a) => {
      const p = a.platform.toLowerCase() as Platform;
      const list = map.get(p) ?? [];
      list.push(a);
      map.set(p, list);
    });
    return map;
  }, [accounts]);

  // Platforms that actually have at least one connected account, in canonical order.
  const availablePlatforms = React.useMemo(
    () => ALL_PLATFORMS.filter((p) => accountsByPlatform.has(p)),
    [accountsByPlatform]
  );

  // Selected platforms are DERIVED from the selected accounts — drives content
  // tabs, character limits and the live preview.
  const selectedPlatforms = React.useMemo<Platform[]>(() => {
    const set = new Set<Platform>();
    accounts.forEach((a) => {
      if (selectedAccountIds.has(a.id)) set.add(a.platform.toLowerCase() as Platform);
    });
    return ALL_PLATFORMS.filter((p) => set.has(p));
  }, [accounts, selectedAccountIds]);

  // Keep the active content tab + preview platform valid as selection changes.
  React.useEffect(() => {
    if (selectedPlatforms.length === 0) return;
    if (!selectedPlatforms.includes(activePlatformTab)) {
      setActivePlatformTab(selectedPlatforms[0]!);
    }
    if (!selectedPlatforms.includes(previewPlatform)) {
      setPreviewPlatform(selectedPlatforms[0]!);
    }
  }, [selectedPlatforms, activePlatformTab, previewPlatform]);

  // ── Account selection helpers ──────────────────────────────────────────────
  function toggleAccount(id: string): void {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePlatformExpand(p: Platform): void {
    setExpandedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  // Select / deselect all accounts of one platform at once.
  function togglePlatformAccounts(p: Platform): void {
    const ids = (accountsByPlatform.get(p) ?? []).map((a) => a.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedAccountIds.has(id));
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }

  // ── Client select options ──────────────────────────────────────────────────
  const clientOptions = React.useMemo(() => {
    const base = [{ value: '', label: 'No client (optional)' }];
    const mapped = clients.map((c) => ({
      value: c.id,
      label: c.name ?? c.companyName ?? c.id,
    }));
    return [...base, ...mapped];
  }, [clients]);

  // ── Derived helpers ────────────────────────────────────────────────────────
  const firstMedia =
    uploadedFiles.find((f) => f.preview !== null)?.preview ?? null;

  function getContentForPlatform(platform: Platform): string {
    const override = platformContents[platform];
    return override.overridden ? override.text : defaultContent;
  }

  function activeContent(): string {
    return getContentForPlatform(activePlatformTab);
  }

  function activeLimit(): number {
    return PLATFORM_CHAR_LIMITS[activePlatformTab];
  }

  function handleContentChange(text: string): void {
    if (selectedPlatforms.length <= 1) {
      setDefaultContent(text);
    } else {
      const override = platformContents[activePlatformTab];
      if (override.overridden) {
        setPlatformContents((prev) => ({
          ...prev,
          [activePlatformTab]: { text, overridden: true },
        }));
      } else {
        setDefaultContent(text);
      }
    }
  }

  function handleOverrideToggle(): void {
    const current = platformContents[activePlatformTab];
    if (current.overridden) {
      setPlatformContents((prev) => ({
        ...prev,
        [activePlatformTab]: { text: '', overridden: false },
      }));
    } else {
      setPlatformContents((prev) => ({
        ...prev,
        [activePlatformTab]: { text: defaultContent, overridden: true },
      }));
    }
  }

  // ── Build create payload ───────────────────────────────────────────────────
  function buildCreatePayload(): Record<string, unknown> {
    // Build per-platform content object
    // The API content field is Record<string, unknown> — use { text } as base
    const contentObj: Record<string, unknown> = { text: defaultContent };

    // Include platform-specific overrides as named keys
    selectedPlatforms.forEach((p) => {
      const override = platformContents[p];
      if (override.overridden && override.text !== defaultContent) {
        contentObj[p] = override.text;
      }
    });

    const payload: Record<string, unknown> = {
      title: title.trim() || undefined,
      content: contentObj,
    };

    if (clientId) {
      payload['clientId'] = clientId;
    }

    // Real targets: one per selected social account.
    payload['targets'] = [...selectedAccountIds].map((socialAccountId) => ({
      socialAccountId,
    }));

    // Attach uploaded media (only files that finished uploading to storage).
    const media = uploadedFiles
      .filter((f) => f.url && !f.error)
      .map((f) => ({
        url: f.url as string,
        mediaType: f.mediaType ?? 'IMAGE',
        ...(f.storageKey ? { storageKey: f.storageKey } : {}),
      }));
    if (media.length > 0) {
      payload['media'] = media;
    }

    return payload;
  }

  // ── Compute scheduled datetime in UTC ─────────────────────────────────────
  function buildScheduledAt(): string | null {
    if (!scheduleDate || !scheduleTime) return null;
    try {
      // Combine date + time as a local string, then let the server handle TZ
      return new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    } catch {
      return null;
    }
  }

  // ── Submit handlers ────────────────────────────────────────────────────────
  async function handleSaveDraft(): Promise<void> {
    setSubmitting(true);
    setSubmitAction('draft');
    try {
      const payload = buildCreatePayload();
      await apiClient.post<ApiPostResponse>('/posts', payload);
      setToast({ message: 'Draft saved successfully.', type: 'success' });
      // Short delay so user sees the toast, then navigate
      setTimeout(() => {
        router.push('/dashboard/posts');
      }, 1200);
    } catch (err) {
      console.error('Failed to save draft:', err);
      setToast({ message: 'Failed to save draft. Please try again.', type: 'error' });
      setSubmitting(false);
      setSubmitAction(null);
    }
  }

  async function handleSchedule(): Promise<void> {
    const scheduledAt = buildScheduledAt();
    if (!scheduledAt) {
      setToast({ message: 'Please select a valid date and time before scheduling.', type: 'error' });
      return;
    }
    setSubmitting(true);
    setSubmitAction('schedule');
    try {
      const payload = buildCreatePayload();
      const created = await apiClient.post<ApiPostResponse>('/posts', payload);
      // Schedule the newly created post
      await apiClient.post(`/posts/${created.id}/schedule`, { scheduledAt });
      setToast({ message: 'Post scheduled successfully.', type: 'success' });
      setTimeout(() => {
        router.push('/dashboard/posts');
      }, 1200);
    } catch (err) {
      console.error('Failed to schedule post:', err);
      setToast({ message: 'Failed to schedule post. Please try again.', type: 'error' });
      setSubmitting(false);
      setSubmitAction(null);
    }
  }

  async function handlePublishNow(): Promise<void> {
    setSubmitting(true);
    setSubmitAction('publish');
    try {
      const payload = buildCreatePayload();
      const created = await apiClient.post<ApiPostResponse>('/posts', payload);
      // Trigger immediate publish — the response contains per-target results.
      const published = await apiClient.post<ApiPostResponse>(
        `/posts/${created.id}/publish-now`,
        {},
      );

      // The endpoint returns 200 even when individual targets fail, so inspect
      // the per-target statuses and surface the real platform error instead of
      // blindly claiming success.
      const targets = published.targets ?? [];
      const failed = targets.filter((t) => t.status === 'FAILED');

      if (failed.length > 0 && failed.length === targets.length) {
        // Every target failed — show the first platform error verbatim.
        const f = failed[0]!;
        const platform = f.socialAccount?.platform ?? 'platform';
        const reason = f.errorMessage?.trim() || 'Unknown error';
        setToast({
          message: `Publishing failed (${platform}): ${reason}`,
          type: 'error',
        });
        setSubmitting(false);
        setSubmitAction(null);
        return;
      }

      if (failed.length > 0) {
        // Partial failure — some platforms published, some did not.
        const names = failed
          .map((t) => t.socialAccount?.platform ?? 'platform')
          .join(', ');
        setToast({
          message: `Published, but failed on: ${names}. Check the post detail for details.`,
          type: 'error',
        });
        setTimeout(() => {
          router.push('/dashboard/posts');
        }, 2000);
        return;
      }

      setToast({ message: 'Post published successfully.', type: 'success' });
      setTimeout(() => {
        router.push('/dashboard/posts');
      }, 1200);
    } catch (err) {
      console.error('Failed to publish post:', err);
      setToast({ message: 'Failed to publish post. Please try again.', type: 'error' });
      setSubmitting(false);
      setSubmitAction(null);
    }
  }

  // ── Derived guards ─────────────────────────────────────────────────────────
  const canSave = title.trim().length > 0 && selectedPlatforms.length > 0 && !submitting;
  const canSchedule = canSave && scheduleDate !== '' && scheduleTime !== '';

  // Check if any platform content is over limit
  const hasOverLimitContent = selectedPlatforms.some((p) => {
    const content = getContentForPlatform(p);
    return content.length > PLATFORM_CHAR_LIMITS[p];
  });

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
        <div className="flex items-center gap-3">
          <Link href="/dashboard/posts">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Back to posts"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create Post</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Compose and schedule a new social post
            </p>
          </div>
        </div>

        {/* Over-limit warning */}
        {hasOverLimitContent && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Some platform content exceeds the character limit and will be truncated on publish.
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT: Content editor */}
          <div className="space-y-5">
            {/* Title */}
            <Card>
              <CardContent className="pt-5">
                <Input
                  label="Post Title"
                  placeholder="Give this post a descriptive title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  hint="Internal only — not published to social platforms."
                />
              </CardContent>
            </Card>

            {/* Content editor */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Content</CardTitle>
                  <Link href="/dashboard/ai-content">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Generate
                    </Button>
                  </Link>
                </div>

                {/* Platform tabs — only shown when 2+ platforms selected */}
                {selectedPlatforms.length > 1 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-slate-200 pb-1">
                    {selectedPlatforms.map((p) => {
                      const isOverridden = platformContents[p].overridden;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setActivePlatformTab(p)}
                          className={cn(
                            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                            activePlatformTab === p
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-500 hover:bg-slate-100'
                          )}
                        >
                          <PlatformIcon platform={p} size="sm" bare className="h-3 w-3" />
                          {getPlatformLabel(p).split(' ')[0]}
                          {isOverridden && (
                            <span className="rounded-full bg-amber-100 px-1 text-[9px] font-semibold text-amber-700">
                              Custom
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {/* Override toggle */}
                {selectedPlatforms.length > 1 && (
                  <div className="mb-3 flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                    <span className="text-xs text-amber-800">
                      {platformContents[activePlatformTab].overridden
                        ? `Custom content for ${getPlatformLabel(activePlatformTab)}`
                        : `Using shared content for ${getPlatformLabel(activePlatformTab)}`}
                    </span>
                    <button
                      type="button"
                      onClick={handleOverrideToggle}
                      className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
                    >
                      {platformContents[activePlatformTab].overridden ? (
                        <>
                          <Minus className="h-3 w-3" />
                          Reset to shared
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Customize
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    value={activeContent()}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder={
                      selectedPlatforms.length === 1
                        ? `Write your ${getPlatformLabel(selectedPlatforms[0]!)} post here...`
                        : 'Write your social post here...'
                    }
                    rows={8}
                    className={cn(
                      'flex w-full rounded-md border border-input bg-background px-3 py-2.5',
                      'text-sm placeholder:text-muted-foreground resize-y',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                  />
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-2">
                    {selectedPlatforms.length > 0 && (
                      <CharCounter
                        count={activeContent().length}
                        limit={activeLimit()}
                      />
                    )}
                  </div>
                </div>

                {/* Per-platform char summary */}
                {selectedPlatforms.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedPlatforms.map((p) => {
                      const content = getContentForPlatform(p);
                      const limit = PLATFORM_CHAR_LIMITS[p];
                      const over = content.length > limit;
                      return (
                        <span
                          key={p}
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-medium',
                            over
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-500'
                          )}
                        >
                          {getPlatformLabel(p).split(' ')[0]}: {content.length}/{limit}
                        </span>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Media upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Media</CardTitle>
              </CardHeader>
              <CardContent>
                <UploadZone
                  onFilesChange={setUploadedFiles}
                  maxFiles={4}
                  maxSizeMB={50}
                />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Settings panel */}
          <div className="space-y-5">
            {/* Channel / account selector */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Channels</CardTitle>
                  {selectedAccountIds.size > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {selectedAccountIds.size} selected
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {accountsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading accounts...
                  </div>
                ) : availablePlatforms.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center">
                    <p className="text-sm text-slate-600">No connected accounts</p>
                    <Link
                      href="/dashboard/social-accounts"
                      className="mt-1 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Connect an account →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availablePlatforms.map((p) => {
                      const platformAccounts = accountsByPlatform.get(p) ?? [];
                      const selectedCount = platformAccounts.filter((a) =>
                        selectedAccountIds.has(a.id)
                      ).length;
                      const allSelected =
                        platformAccounts.length > 0 && selectedCount === platformAccounts.length;
                      const expanded = expandedPlatforms.has(p);

                      return (
                        <div
                          key={p}
                          className={cn(
                            'overflow-hidden rounded-lg border transition-colors',
                            selectedCount > 0 ? 'border-blue-200' : 'border-slate-200'
                          )}
                        >
                          {/* Platform header */}
                          <div
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2.5',
                              selectedCount > 0 ? 'bg-blue-50/60' : 'bg-white'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => togglePlatformExpand(p)}
                              className="flex flex-1 items-center gap-2.5 text-left"
                              aria-expanded={expanded}
                            >
                              <PlatformIcon platform={p} size="sm" />
                              <span className="flex-1 text-sm font-medium text-slate-800">
                                {getPlatformLabel(p)}
                              </span>
                              <span className="text-xs text-slate-400">
                                {selectedCount > 0
                                  ? `${selectedCount}/${platformAccounts.length}`
                                  : platformAccounts.length}
                              </span>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 text-slate-400 transition-transform',
                                  expanded && 'rotate-180'
                                )}
                              />
                            </button>
                          </div>

                          {/* Accounts of this platform */}
                          {expanded && (
                            <div className="border-t border-slate-100 bg-white">
                              {platformAccounts.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => togglePlatformAccounts(p)}
                                  className="flex w-full items-center justify-end gap-1 px-3 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-slate-50"
                                >
                                  {allSelected ? 'Deselect all' : 'Select all'}
                                </button>
                              )}
                              {platformAccounts.map((acc) => {
                                const checked = selectedAccountIds.has(acc.id);
                                const name = acc.displayName || acc.platformUsername || 'Account';
                                const handle = acc.platformUsername;
                                const initial = name.charAt(0).toUpperCase();
                                return (
                                  <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => toggleAccount(acc.id)}
                                    className={cn(
                                      'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                                      checked ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50'
                                    )}
                                    aria-pressed={checked}
                                  >
                                    {/* Avatar */}
                                    <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-slate-200">
                                      {acc.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={acc.avatarUrl} alt="" className="h-full w-full object-cover" />
                                      ) : (
                                        <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-500">
                                          {initial}
                                        </span>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-slate-800">{name}</p>
                                      {handle && (
                                        <p className="truncate text-xs text-slate-400">@{handle}</p>
                                      )}
                                    </div>
                                    {/* Checkbox */}
                                    <div
                                      className={cn(
                                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                                        checked ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'
                                      )}
                                      aria-hidden="true"
                                    >
                                      {checked && (
                                        <svg viewBox="0 0 8 8" className="h-2.5 w-2.5" aria-hidden="true">
                                          <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                                        </svg>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {!accountsLoading && availablePlatforms.length > 0 && selectedAccountIds.size === 0 && (
                  <p className="mt-2 text-xs text-amber-600">
                    Select at least one account to publish to.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Client selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Client</CardTitle>
              </CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading clients...
                  </div>
                ) : (
                  <Select
                    label="Assign to client"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    options={clientOptions}
                  />
                )}
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <CardTitle className="text-base">Schedule</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Input
                    label="Date"
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Input
                    label="Time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                  <Select
                    label="Timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    options={TIMEZONE_OPTIONS}
                  />
                  {scheduleDate && scheduleTime && (
                    <p className="text-xs text-slate-500">
                      Publishes at{' '}
                      <span className="font-medium text-slate-700">
                        {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            {selectedPlatforms.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Preview</CardTitle>
                    <div className="flex gap-1">
                      {selectedPlatforms.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPreviewPlatform(p)}
                          className={cn(
                            'rounded-md p-1.5 transition-colors',
                            previewPlatform === p
                              ? 'bg-slate-100 ring-1 ring-slate-300'
                              : 'hover:bg-slate-100'
                          )}
                          aria-label={`Preview ${getPlatformLabel(p)}`}
                          aria-pressed={previewPlatform === p}
                        >
                          <PlatformIcon platform={p} size="sm" />
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PostPreview
                    content={getContentForPlatform(previewPlatform)}
                    platform={previewPlatform}
                    media={firstMedia}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bottom action bar */}
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            {/* Publishing summary */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {selectedPlatforms.length > 0 ? (
                <>
                  <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Publishing to{' '}
                  <span className="font-medium text-slate-700">
                    {selectedPlatforms.map((p) => getPlatformLabel(p)).join(', ')}
                  </span>
                </>
              ) : (
                <span className="text-amber-600">No platforms selected</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Link href="/dashboard/posts">
                <Button variant="ghost" size="sm" disabled={submitting}>
                  Cancel
                </Button>
              </Link>

              {/* Save as Draft */}
              <Button
                variant="outline"
                size="sm"
                disabled={!canSave}
                onClick={() => void handleSaveDraft()}
              >
                {submitAction === 'draft' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                {submitAction === 'draft' ? 'Saving...' : 'Save Draft'}
              </Button>

              {/* Schedule */}
              <Button
                variant="outline"
                size="sm"
                disabled={!canSchedule}
                onClick={() => void handleSchedule()}
                title={!scheduleDate || !scheduleTime ? 'Set a date and time to schedule' : undefined}
              >
                {submitAction === 'schedule' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                {submitAction === 'schedule' ? 'Scheduling...' : 'Schedule'}
              </Button>

              {/* Publish Now */}
              <Button
                size="sm"
                disabled={!canSave}
                onClick={() => void handlePublishNow()}
              >
                {submitAction === 'publish' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitAction === 'publish' ? 'Publishing...' : 'Publish Now'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
