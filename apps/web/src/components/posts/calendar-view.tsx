'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, ImageIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';
import { PlatformIcon } from '@/components/social/platform-icon';
// ---------------------------------------------------------------------------
// Shared Post types (kept here to avoid circular imports with the page)
// ---------------------------------------------------------------------------

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

export interface PostMetrics {
  likes: number;
  comments: number;
  impressions: number;
  engagementRate: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  platforms: import('@/components/social/platform-icon').Platform[];
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt?: string | null;
  clientId: string;
  clientName: string;
  createdAt: string;
  thumbnail?: string | null;
  metrics?: PostMetrics;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarViewProps {
  posts: Post[];
  onPostClick?: (post: Post) => void;
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<PostStatus, string> = {
  draft: 'bg-slate-400',
  scheduled: 'bg-blue-500',
  publishing: 'bg-violet-500',
  published: 'bg-emerald-500',
  failed: 'bg-red-500',
  cancelled: 'bg-orange-500',
};

const STATUS_BAR: Record<PostStatus, string> = {
  draft: 'bg-slate-400',
  scheduled: 'bg-blue-500',
  publishing: 'bg-violet-500',
  published: 'bg-emerald-500',
  failed: 'bg-red-500',
  cancelled: 'bg-orange-500',
};

const STATUS_CHIP: Record<PostStatus, string> = {
  draft: 'bg-slate-50 hover:bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-50 hover:bg-blue-100 text-blue-800',
  publishing: 'bg-violet-50 hover:bg-violet-100 text-violet-800',
  published: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
  failed: 'bg-red-50 hover:bg-red-100 text-red-800',
  cancelled: 'bg-orange-50 hover:bg-orange-100 text-orange-800',
};

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_PILL: Record<PostStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  publishing: 'bg-violet-100 text-violet-700',
  published: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-orange-100 text-orange-700',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Best available date for placing a post on the calendar. */
function postDate(p: Post): Date | null {
  const v = p.scheduledAt ?? p.publishedAt ?? p.createdAt ?? null;
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeLabel(p: Post): string | null {
  const d = postDate(p);
  if (!d) return null;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Post chip (inside a day cell)
// ---------------------------------------------------------------------------

function PostChip({ post, onClick }: { post: Post; onClick: () => void }): React.JSX.Element {
  const platform = post.platforms[0];
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={post.title}
      className={cn(
        'group/chip flex w-full items-center gap-1 overflow-hidden rounded-md py-0.5 pl-1 pr-1.5 text-left transition-colors',
        STATUS_CHIP[post.status]
      )}
    >
      <span className={cn('h-3 w-0.5 shrink-0 rounded-full', STATUS_BAR[post.status])} />
      {platform ? (
        <PlatformIcon platform={platform} size="sm" />
      ) : post.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnail} alt="" className="h-3.5 w-3.5 shrink-0 rounded object-cover" />
      ) : null}
      <span className="truncate text-[11px] font-medium leading-tight">{post.title}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// DayCell sub-component
// ---------------------------------------------------------------------------

interface DayCellProps {
  day: number;
  isToday: boolean;
  isOtherMonth: boolean;
  posts: Post[];
  onOpenDay: (day: number) => void;
  onPostClick?: (post: Post) => void;
}

const MAX_CHIPS = 2;

function DayCell({ day, isToday, isOtherMonth, posts, onOpenDay, onPostClick }: DayCellProps): React.JSX.Element {
  const hasPosts = posts.length > 0;
  const visible = posts.slice(0, MAX_CHIPS);
  const overflow = posts.length - visible.length;

  return (
    <div
      onClick={() => hasPosts && onOpenDay(day)}
      className={cn(
        'relative flex min-h-[104px] w-full flex-col gap-1 rounded-xl border p-1.5 transition-colors',
        isOtherMonth
          ? 'border-transparent bg-slate-50/40'
          : hasPosts
          ? 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm cursor-pointer'
          : 'border-slate-200 bg-white'
      )}
    >
      {/* Day number */}
      <div className="flex items-center justify-between px-0.5">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium leading-none',
            isOtherMonth && 'text-slate-300',
            isToday && !isOtherMonth && 'bg-blue-600 text-white font-semibold',
            !isToday && !isOtherMonth && 'text-slate-700'
          )}
        >
          {day}
        </span>
        {!isOtherMonth && hasPosts && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-500">
            {posts.length}
          </span>
        )}
      </div>

      {/* Post chips */}
      {!isOtherMonth && hasPosts && (
        <div className="flex flex-col gap-0.5">
          {visible.map((post) => (
            <PostChip key={post.id} post={post} onClick={() => onPostClick?.(post)} />
          ))}
          {overflow > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenDay(day); }}
              className="rounded-md px-1.5 py-0.5 text-left text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              +{overflow} more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day modal — lists all posts on a single day
// ---------------------------------------------------------------------------

interface DayModalProps {
  day: number;
  month: number;
  year: number;
  posts: Post[];
  onClose: () => void;
  onPostClick?: (post: Post) => void;
}

function DayModal({ day, month, year, posts, onClose, onPostClick }: DayModalProps): React.JSX.Element {
  const dateLabel = new Date(year, month, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={dateLabel}
      description={`${posts.length} post${posts.length !== 1 ? 's' : ''} on this day`}
      maxWidth="max-w-lg"
    >
      <div className="-mx-1 max-h-[60vh] space-y-2 overflow-y-auto px-1 py-1">
        {posts.map((post) => {
          const time = timeLabel(post);
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => onPostClick?.(post)}
              className="flex w-full items-start gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/40"
            >
              {/* Thumbnail */}
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                {post.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{post.title}</p>
                {post.content && (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400">{post.content}</p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-medium', STATUS_PILL[post.status])}>
                    {STATUS_LABEL[post.status]}
                  </span>
                  {time && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {time}
                    </span>
                  )}
                  {post.platforms.length > 0 && (
                    <span className="flex items-center gap-1">
                      {[...new Set(post.platforms)].map((p) => (
                        <PlatformIcon key={p} platform={p} size="sm" />
                      ))}
                    </span>
                  )}
                  {post.metrics && (
                    <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3 text-red-400" />
                        {post.metrics.likes}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-3 w-3 text-amber-500" />
                        {post.metrics.comments}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// CalendarView
// ---------------------------------------------------------------------------

export function CalendarView({ posts, onPostClick }: CalendarViewProps): React.JSX.Element {
  const today = new Date();
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth());
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);

  // Build a map: day number => posts on that day (using the best available date).
  const postsByDay = React.useMemo(() => {
    const map = new Map<number, Post[]>();
    posts.forEach((post) => {
      const d = postDate(post);
      if (!d) return;
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        const existing = map.get(day) ?? [];
        map.set(day, [...existing, post]);
      }
    });
    // Sort each day's posts chronologically.
    for (const [, list] of map) {
      list.sort((a, b) => (postDate(a)?.getTime() ?? 0) - (postDate(b)?.getTime() ?? 0));
    }
    return map;
  }, [posts, currentYear, currentMonth]);

  const monthTotal = React.useMemo(
    () => Array.from(postsByDay.values()).reduce((sum, list) => sum + list.length, 0),
    [postsByDay]
  );

  function prevMonth(): void {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  }

  function nextMonth(): void {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  }

  function goToToday(): void {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(null);
  }

  // Grid construction
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonth);
  const prevMonthDays = getDaysInMonth(
    currentMonth === 0 ? currentYear - 1 : currentYear,
    currentMonth === 0 ? 11 : currentMonth - 1
  );

  // Build 42-cell grid (6 rows × 7)
  type GridCell = { day: number; isOtherMonth: boolean };
  const cells: GridCell[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, isOtherMonth: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isOtherMonth: false });
  }
  let trailing = 1;
  while (cells.length < 42) {
    cells.push({ day: trailing++, isOtherMonth: true });
  }

  const isToday = (day: number, isOtherMonth: boolean): boolean =>
    !isOtherMonth &&
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const selectedDayPosts = selectedDay !== null ? (postsByDay.get(selectedDay) ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Month navigation header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {monthTotal} post{monthTotal !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        {(Object.entries(STATUS_DOT) as [PostStatus, string][]).map(([status, dotClass]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', dotClass)} />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>

      {/* Day headers */}
      <div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => (
            <DayCell
              key={idx}
              day={cell.day}
              isToday={isToday(cell.day, cell.isOtherMonth)}
              isOtherMonth={cell.isOtherMonth}
              posts={cell.isOtherMonth ? [] : (postsByDay.get(cell.day) ?? [])}
              onOpenDay={(d) => setSelectedDay(d)}
              onPostClick={onPostClick}
            />
          ))}
        </div>
      </div>

      {/* Day modal */}
      {selectedDay !== null && selectedDayPosts.length > 0 && (
        <DayModal
          day={selectedDay}
          month={currentMonth}
          year={currentYear}
          posts={selectedDayPosts}
          onClose={() => setSelectedDay(null)}
          onPostClick={onPostClick}
        />
      )}
    </div>
  );
}
