'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  Sparkles,
  Plus,
  Minus,
  Clock,
  Send,
  FileText,
  Globe,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UploadZone, type UploadedFile } from '@/components/media/upload-zone';
import { PostPreview, PLATFORM_CHAR_LIMITS } from '@/components/posts/post-preview';
import {
  PlatformIcon,
  getPlatformLabel,
  type Platform,
} from '@/components/social/platform-icon';

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
}

interface MockPost {
  id: string;
  title: string;
  content: string;
  platforms: Platform[];
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  clientId: string;
  targets: PlatformTarget[];
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_POST_DATA: Record<string, MockPost> = {
  p1: {
    id: 'p1',
    title: 'Q1 Product Launch Announcement',
    content: 'Exciting news! We\'re thrilled to announce the launch of our new product line this spring. Stay tuned for more details! #ProductLaunch #Spring2026',
    platforms: ['twitter', 'linkedin', 'facebook'],
    status: 'published',
    scheduledDate: '2026-03-01',
    scheduledTime: '10:00',
    timezone: 'America/New_York',
    clientId: 'c1',
    targets: [
      {
        platform: 'twitter',
        status: 'published',
        publishedAt: '2026-03-01T10:00:00Z',
        url: 'https://twitter.com/example/status/123456789',
        error: null,
      },
      {
        platform: 'linkedin',
        status: 'published',
        publishedAt: '2026-03-01T10:01:00Z',
        url: 'https://linkedin.com/posts/example-123',
        error: null,
      },
      {
        platform: 'facebook',
        status: 'failed',
        publishedAt: null,
        url: null,
        error: 'Access token expired. Please reconnect your Facebook account.',
      },
    ],
  },
  p2: {
    id: 'p2',
    title: 'Spring Sale — 30% Off Everything',
    content: 'Our biggest sale of the year starts NOW. Shop all categories and save 30% sitewide. Limited time only! Use code SPRING30 at checkout.',
    platforms: ['instagram', 'facebook'],
    status: 'scheduled',
    scheduledDate: '2026-03-20',
    scheduledTime: '09:00',
    timezone: 'America/New_York',
    clientId: 'c5',
    targets: [
      {
        platform: 'instagram',
        status: 'scheduled',
        publishedAt: null,
        url: null,
        error: null,
      },
      {
        platform: 'facebook',
        status: 'scheduled',
        publishedAt: null,
        url: null,
        error: null,
      },
    ],
  },
  p4: {
    id: 'p4',
    title: 'Thought Leadership: The Future of SaaS',
    content: 'As we look ahead to 2027, the SaaS landscape is evolving faster than ever. Here are 5 trends you need to know about:\n\n1. AI-native workflows\n2. Vertical specialization\n3. Embedded finance\n4. Developer-led growth\n5. Privacy-first architecture\n\nWhich of these do you think will have the biggest impact?',
    platforms: ['linkedin'],
    status: 'draft',
    scheduledDate: '',
    scheduledTime: '09:00',
    timezone: 'America/New_York',
    clientId: 'c3',
    targets: [
      {
        platform: 'linkedin',
        status: 'pending',
        publishedAt: null,
        url: null,
        error: null,
      },
    ],
  },
};

// Fallback for any postId not in our mock
function generateMockPost(id: string): MockPost {
  return {
    id,
    title: 'Sample Post',
    content: 'This is a sample post content. Edit this to create your message.',
    platforms: ['twitter'],
    status: 'draft',
    scheduledDate: '',
    scheduledTime: '09:00',
    timezone: 'America/New_York',
    clientId: '',
    targets: [
      { platform: 'twitter', status: 'pending', publishedAt: null, url: null, error: null },
    ],
  };
}

// ---------------------------------------------------------------------------
// Constants (same as new post page)
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
// Target status icon
// ---------------------------------------------------------------------------

function TargetStatusIcon({ status }: { status: PublishStatus }): React.JSX.Element {
  switch (status) {
    case 'published':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'scheduled':
      return <Clock className="h-4 w-4 text-blue-500" />;
    default:
      return <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />;
  }
}

const TARGET_STATUS_LABEL: Record<PublishStatus, string> = {
  published: 'Published',
  failed: 'Failed',
  pending: 'Pending',
  scheduled: 'Scheduled',
};

const TARGET_STATUS_BADGE: Record<PublishStatus, 'green' | 'red' | 'gray' | 'blue'> = {
  published: 'green',
  failed: 'red',
  pending: 'gray',
  scheduled: 'blue',
};

// ---------------------------------------------------------------------------
// Character counter (same as new post)
// ---------------------------------------------------------------------------

function CharCounter({ count, limit }: { count: number; limit: number }): React.JSX.Element {
  const remaining = limit - count;
  const pct = count / limit;

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-4 w-4">
        <svg viewBox="0 0 16 16" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="#e2e8f0" strokeWidth="2" />
          <circle
            cx="8" cy="8" r="6" fill="none"
            stroke={pct >= 1 ? '#ef4444' : pct >= 0.9 ? '#f59e0b' : '#3b82f6'}
            strokeWidth="2"
            strokeDasharray={`${Math.min(pct, 1) * 37.7} 37.7`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className={cn('text-xs font-medium tabular-nums', remaining < 0 ? 'text-red-600' : remaining <= 20 ? 'text-amber-600' : 'text-slate-400')}>
        {remaining < 0 ? `-${Math.abs(remaining)}` : remaining}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform toggle (same as new post)
// ---------------------------------------------------------------------------

function PlatformToggle({
  platform,
  selected,
  onToggle,
  disabled,
}: {
  platform: Platform;
  selected: boolean;
  onToggle: (p: Platform) => void;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle(platform)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all w-full',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && selected && 'border-blue-300 bg-blue-50 text-blue-800',
        !disabled && !selected && 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      )}
      aria-pressed={selected}
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

export default function EditPostPage(): React.JSX.Element {
  const params = useParams<{ postId: string }>();
  const postId = params.postId;

  const mockPost = MOCK_POST_DATA[postId] ?? generateMockPost(postId);
  const isPublished = mockPost.status === 'published';

  // ── Content state ──────────────────────────────────────────────────────────
  const [title, setTitle] = React.useState(mockPost.title);
  const [content, setContent] = React.useState(mockPost.content);

  // ── Settings state ─────────────────────────────────────────────────────────
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Platform[]>(
    mockPost.platforms
  );
  const [clientId, setClientId] = React.useState(mockPost.clientId);
  const [scheduleDate, setScheduleDate] = React.useState(mockPost.scheduledDate);
  const [scheduleTime, setScheduleTime] = React.useState(mockPost.scheduledTime);
  const [timezone, setTimezone] = React.useState(mockPost.timezone);
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [previewPlatform, setPreviewPlatform] = React.useState<Platform>(
    mockPost.platforms[0] ?? 'twitter'
  );

  const firstMedia = uploadedFiles.find((f) => f.preview !== null)?.preview ?? null;

  function handlePlatformToggle(platform: Platform): void {
    if (isPublished) return;
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  const canSave = title.trim().length > 0 && selectedPlatforms.length > 0;
  const canSchedule = canSave && scheduleDate !== '' && scheduleTime !== '';

  const activeLimit =
    selectedPlatforms.length === 1
      ? PLATFORM_CHAR_LIMITS[selectedPlatforms[0]!]
      : Math.min(...selectedPlatforms.map((p) => PLATFORM_CHAR_LIMITS[p]));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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
            <h1 className="text-2xl font-bold text-slate-900">Edit Post</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Post ID: {postId}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-3">
          <Badge
            variant={
              mockPost.status === 'published' ? 'green' :
              mockPost.status === 'scheduled' ? 'blue' :
              mockPost.status === 'failed' ? 'red' :
              mockPost.status === 'cancelled' ? 'default' :
              'gray'
            }
            className="capitalize text-sm px-3 py-1"
          >
            {mockPost.status}
          </Badge>
          {isPublished && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <AlertCircle className="h-3.5 w-3.5" />
              Read-only — already published
            </span>
          )}
        </div>
      </div>

      {/* Published platform targets status */}
      {mockPost.targets.some((t) => t.status !== 'pending') && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Publishing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockPost.targets.map((target) => (
                <div
                  key={target.platform}
                  className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <PlatformIcon platform={target.platform} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        {getPlatformLabel(target.platform)}
                      </span>
                      <Badge variant={TARGET_STATUS_BADGE[target.status]} className="text-[11px]">
                        {TARGET_STATUS_LABEL[target.status]}
                      </Badge>
                    </div>
                    {target.publishedAt !== null && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Published{' '}
                        {new Date(target.publishedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                    {target.error !== null && (
                      <p className="mt-1 text-xs text-red-600">{target.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TargetStatusIcon status={target.status} />
                    {target.url !== null && (
                      <a
                        href={target.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {target.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => alert('Retry publish (mock)')}
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                disabled={isPublished}
              />
            </CardContent>
          </Card>

          {/* Content editor */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Content</CardTitle>
                {!isPublished && (
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
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your social post here…"
                  rows={8}
                  disabled={isPublished}
                  className={cn(
                    'flex w-full rounded-md border border-input bg-background px-3 py-2.5',
                    'text-sm placeholder:text-muted-foreground resize-y',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isPublished && 'cursor-not-allowed opacity-60'
                  )}
                />
                {!isPublished && selectedPlatforms.length > 0 && (
                  <div className="absolute bottom-2.5 right-3">
                    <CharCounter
                      count={content.length}
                      limit={activeLimit}
                    />
                  </div>
                )}
              </div>

              {/* Per-platform char info */}
              {!isPublished && selectedPlatforms.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedPlatforms.map((p) => {
                    const limit = PLATFORM_CHAR_LIMITS[p];
                    const over = content.length > limit;
                    return (
                      <span
                        key={p}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-medium',
                          over ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
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
              {isPublished ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm text-slate-500">
                    Media cannot be modified on published posts.
                  </p>
                </div>
              ) : (
                <UploadZone
                  onFilesChange={setUploadedFiles}
                  maxFiles={4}
                  maxSizeMB={50}
                />
              )}
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
                    disabled={isPublished}
                  />
                ))}
              </div>
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
                disabled={isPublished}
              />
            </CardContent>
          </Card>

          {/* Schedule */}
          {!isPublished && (
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
          )}

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
                  content={content}
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
                {isPublished ? 'Published to' : 'Publishing to'}{' '}
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
                {isPublished ? 'Close' : 'Cancel'}
              </Button>
            </Link>
            {!isPublished && (
              <>
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
                  onClick={() => alert('Post rescheduled! (mock)')}
                >
                  <Clock className="h-4 w-4" />
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  disabled={!canSave}
                  onClick={() => alert('Changes published! (mock)')}
                >
                  <Send className="h-4 w-4" />
                  Publish Now
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
