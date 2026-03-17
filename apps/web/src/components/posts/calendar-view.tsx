'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
// ---------------------------------------------------------------------------
// Shared Post types (kept here to avoid circular imports with the page)
// ---------------------------------------------------------------------------

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';

export interface Post {
  id: string;
  title: string;
  content: string;
  platforms: import('@/components/social/platform-icon').Platform[];
  status: PostStatus;
  scheduledAt: string | null;
  clientId: string;
  clientName: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarViewProps {
  posts: Post[];
  onPostClick?: (post: Post) => void;
}

// ---------------------------------------------------------------------------
// Status dot colors
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<PostStatus, string> = {
  draft: 'bg-slate-400',
  scheduled: 'bg-blue-500',
  published: 'bg-emerald-500',
  failed: 'bg-red-500',
  cancelled: 'bg-orange-500',
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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// DayCell sub-component
// ---------------------------------------------------------------------------

interface DayCellProps {
  day: number;
  isToday: boolean;
  isOtherMonth: boolean;
  posts: Post[];
  onDayClick: (day: number, posts: Post[]) => void;
}

function DayCell({ day, isToday, isOtherMonth, posts, onDayClick }: DayCellProps): React.JSX.Element {
  const hasPosts = posts.length > 0;
  const visibleDots = posts.slice(0, 3);
  const overflow = posts.length - 3;

  return (
    <button
      type="button"
      onClick={() => hasPosts && onDayClick(day, posts)}
      className={cn(
        'relative flex min-h-[72px] w-full flex-col rounded-xl border p-2 text-left transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        isOtherMonth
          ? 'border-transparent bg-slate-50/40 cursor-default'
          : hasPosts
          ? 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer'
          : 'border-slate-200 bg-white cursor-default'
      )}
      aria-label={`${isOtherMonth ? 'Other month' : 'Day'} ${day}${posts.length > 0 ? `, ${posts.length} post${posts.length !== 1 ? 's' : ''}` : ''}`}
      disabled={!hasPosts}
    >
      {/* Day number */}
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

      {/* Post dots */}
      {!isOtherMonth && visibleDots.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-0.5">
          {visibleDots.map((post) => (
            <span
              key={post.id}
              className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[post.status])}
              title={post.title}
            />
          ))}
          {overflow > 0 && (
            <span className="text-[10px] leading-none text-slate-500 self-center">
              +{overflow}
            </span>
          )}
        </div>
      )}

      {/* Mobile: compact count */}
      {!isOtherMonth && posts.length > 0 && (
        <div className="absolute bottom-1.5 right-1.5 hidden sm:flex items-center justify-center">
          <span className="rounded-full bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-500 leading-none">
            {posts.length}
          </span>
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Day sidebar / popover
// ---------------------------------------------------------------------------

interface DaySidebarProps {
  day: number;
  month: number;
  year: number;
  posts: Post[];
  onClose: () => void;
  onPostClick?: (post: Post) => void;
}

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const STATUS_PILL: Record<PostStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-orange-100 text-orange-700',
};

function DaySidebar({ day, month, year, posts, onClose, onPostClick }: DaySidebarProps): React.JSX.Element {
  const dateLabel = new Date(year, month, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{dateLabel}</p>
          <p className="text-xs text-slate-500">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close day details"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => onPostClick?.(post)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
          >
            <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', STATUS_DOT[post.status])} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{post.title}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-medium', STATUS_PILL[post.status])}>
                  {STATUS_LABEL[post.status]}
                </span>
                {post.scheduledAt !== null && (
                  <span className="text-xs text-slate-400">
                    {new Date(post.scheduledAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
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

  // Build a map: day number => posts on that day
  const postsByDay = React.useMemo(() => {
    const map = new Map<number, Post[]>();
    posts.forEach((post) => {
      if (post.scheduledAt === null) return;
      const d = new Date(post.scheduledAt);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        const day = d.getDate();
        const existing = map.get(day) ?? [];
        map.set(day, [...existing, post]);
      }
    });
    return map;
  }, [posts, currentYear, currentMonth]);

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

  function handleDayClick(day: number, _dayPosts: Post[]): void {
    setSelectedDay(day);
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

  // Leading days from previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, isOtherMonth: true });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isOtherMonth: false });
  }

  // Trailing days from next month
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

      <div className={cn('grid gap-4', selectedDay !== null ? 'grid-cols-1 lg:grid-cols-[1fr_300px]' : 'grid-cols-1')}>
        {/* Calendar grid */}
        <div>
          {/* Day headers */}
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
                onDayClick={handleDayClick}
              />
            ))}
          </div>
        </div>

        {/* Day sidebar */}
        {selectedDay !== null && (
          <div className="lg:sticky lg:top-4 h-fit">
            <DaySidebar
              day={selectedDay}
              month={currentMonth}
              year={currentYear}
              posts={selectedDayPosts}
              onClose={() => setSelectedDay(null)}
              onPostClick={onPostClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}

