'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  Sparkles,
  Plus,
  Minus,
  Clock,
  Send,
  FileText,
  Globe,
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

const CLIENT_OPTIONS = [
  { value: '', label: 'Select a client…' },
  { value: 'c1', label: 'Acme Corporation' },
  { value: 'c2', label: 'Bright Ideas Studio' },
  { value: 'c3', label: 'CloudSync Systems' },
  { value: 'c4', label: 'Delta Health Partners' },
  { value: 'c5', label: 'Echo Commerce' },
  { value: 'c6', label: 'Founders Launchpad' },
  { value: 'c7', label: 'Greenleaf Organics' },
  { value: 'c8', label: 'Harbor Analytics' },
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

// ---------------------------------------------------------------------------
// Character counter
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
// Platform selector item
// ---------------------------------------------------------------------------

function PlatformToggle({
  platform,
  selected,
  onToggle,
}: {
  platform: Platform;
  selected: boolean;
  onToggle: (p: Platform) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onToggle(platform)}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all w-full',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        selected
          ? 'border-blue-300 bg-blue-50 text-blue-800'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      )}
      aria-pressed={selected}
      aria-label={`${selected ? 'Deselect' : 'Select'} ${getPlatformLabel(platform)}`}
    >
      <PlatformIcon platform={platform} size="sm" />
      <span className="flex-1 text-sm font-medium">{getPlatformLabel(platform)}</span>
      <div
        className={cn(
          'h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors shrink-0',
          selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300 bg-white'
        )}
        aria-hidden="true"
      >
        {selected && (
          <svg viewBox="0 0 8 8" className="h-2.5 w-2.5" fill="white" aria-hidden="true">
            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewPostPage(): React.JSX.Element {
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

  // ── Settings state ─────────────────────────────────────────────────────────
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Platform[]>([
    'twitter',
    'linkedin',
  ]);
  const [activePlatformTab, setActivePlatformTab] = React.useState<Platform>('twitter');
  const [clientId, setClientId] = React.useState('');
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('09:00');
  const [timezone, setTimezone] = React.useState('America/New_York');
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);

  // ── Preview state ──────────────────────────────────────────────────────────
  const [previewPlatform, setPreviewPlatform] = React.useState<Platform>('twitter');

  // ── Derived ────────────────────────────────────────────────────────────────
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

  function handlePlatformToggle(platform: Platform): void {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        const next = prev.filter((p) => p !== platform);
        // Reset active tab if the removed one was active
        if (activePlatformTab === platform && next.length > 0) {
          setActivePlatformTab(next[0]!);
        }
        return next;
      } else {
        if (prev.length === 0) setActivePlatformTab(platform);
        return [...prev, platform];
      }
    });
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
      // Remove override
      setPlatformContents((prev) => ({
        ...prev,
        [activePlatformTab]: { text: '', overridden: false },
      }));
    } else {
      // Start override with current default content
      setPlatformContents((prev) => ({
        ...prev,
        [activePlatformTab]: { text: defaultContent, overridden: true },
      }));
    }
  }

  const canSave = title.trim().length > 0 && selectedPlatforms.length > 0;
  const canSchedule = canSave && scheduleDate !== '' && scheduleTime !== '';

  return (
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

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ── LEFT: Content editor ─────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Title */}
          <Card>
            <CardContent className="pt-5">
              <Input
                label="Post Title"
                placeholder="Give this post a descriptive title…"
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

              {/* Platform tabs (only shown when 2+ platforms selected) */}
              {selectedPlatforms.length > 1 && (
                <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-slate-200 pb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePlatformTab(selectedPlatforms[0]!);
                    }}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      !platformContents[activePlatformTab].overridden
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:bg-slate-100'
                    )}
                  >
                    All Platforms
                  </button>
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
              {/* Override toggle for per-platform content */}
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
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium transition-colors',
                      platformContents[activePlatformTab].overridden
                        ? 'text-amber-700 hover:text-amber-900'
                        : 'text-amber-700 hover:text-amber-900'
                    )}
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
                  placeholder={`Write your ${selectedPlatforms.length === 1 ? getPlatformLabel(selectedPlatforms[0]!) : 'social'} post here…`}
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

              {/* Per-platform char info */}
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

        {/* ── RIGHT: Settings panel ────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Platform selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Platforms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ALL_PLATFORMS.map((p) => (
                  <PlatformToggle
                    key={p}
                    platform={p}
                    selected={selectedPlatforms.includes(p)}
                    onToggle={handlePlatformToggle}
                  />
                ))}
              </div>
              {selectedPlatforms.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  Select at least one platform to publish.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Client */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                label="Assign to client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                options={CLIENT_OPTIONS}
                placeholder="Select a client…"
              />
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

      {/* ── Bottom action bar ───────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {selectedPlatforms.length > 0 ? (
              <>
                <Globe className="h-3.5 w-3.5" />
                Publishing to{' '}
                <span className="font-medium text-slate-700">
                  {selectedPlatforms.map((p) => getPlatformLabel(p)).join(', ')}
                </span>
              </>
            ) : (
              <span className="text-amber-600">No platforms selected</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/posts">
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              disabled={!canSave}
              onClick={() => alert('Draft saved! (mock)')}
            >
              <FileText className="h-4 w-4" />
              Save Draft
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canSchedule}
              onClick={() => alert('Post scheduled! (mock)')}
            >
              <Clock className="h-4 w-4" />
              Schedule
            </Button>
            <Button
              size="sm"
              disabled={!canSave}
              onClick={() => alert('Post published! (mock)')}
            >
              <Send className="h-4 w-4" />
              Publish Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
