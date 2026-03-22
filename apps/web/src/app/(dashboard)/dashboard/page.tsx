'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Users,
  Share2,
  CalendarClock,
  Sparkles,
  PlusCircle,
  UserPlus,
  Link2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatCard {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface ApiClientsResponse {
  total?: number;
  count?: number;
  items?: unknown[];
}

interface ApiPostsResponse {
  total?: number;
  count?: number;
  items?: unknown[];
}

interface ApiSocialAccountsResponse {
  total?: number;
  count?: number;
  items?: unknown[];
}

interface ApiUsageResponse {
  aiCredits?: { current?: number; used?: number; limit?: number; max?: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCount(data: { total?: number; count?: number; items?: unknown[] } | null): number {
  if (data === null) return 0;
  return data.total ?? data.count ?? data.items?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Create Post',
    description: 'Schedule content for any social platform',
    href: '/dashboard/posts/new',
    icon: PlusCircle,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  {
    label: 'Add Client',
    description: 'Onboard a new agency client',
    href: '/dashboard/clients/new',
    icon: UserPlus,
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-50',
  },
  {
    label: 'Connect Account',
    description: 'Link a new social media profile',
    href: '/dashboard/social-accounts/connect',
    icon: Link2,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
];

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function StatCardItem({ card }: { card: StatCard }): React.JSX.Element {
  const Icon = card.icon;
  const TrendIcon =
    card.trend === 'up'
      ? TrendingUp
      : card.trend === 'down'
      ? TrendingDown
      : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate">
              {card.label}
            </p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">
              {card.value}
            </p>
            <div className="flex items-center gap-1">
              {TrendIcon !== null && (
                <TrendIcon
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    card.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                  )}
                  aria-hidden="true"
                />
              )}
              <p
                className={cn(
                  'text-xs font-medium',
                  card.trend === 'up' && 'text-emerald-600',
                  card.trend === 'down' && 'text-red-500',
                  card.trend === 'neutral' && 'text-slate-500'
                )}
              >
                {card.change}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              card.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', card.iconColor)} aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  action,
}: {
  action: QuickAction;
}): React.JSX.Element {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 transition-all duration-150"
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105',
          action.iconBg
        )}
      >
        <Icon
          className={cn('h-5 w-5', action.iconColor)}
          aria-hidden="true"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
          {action.label}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {action.description}
        </p>
      </div>
      <ArrowRight
        className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-150 shrink-0"
        aria-hidden="true"
      />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage(): React.JSX.Element {
  const [statsLoading, setStatsLoading] = React.useState(false);
  const [statCards, setStatCards] = React.useState<StatCard[]>([]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const fetchStats = React.useCallback(async (): Promise<void> => {
    setStatsLoading(true);
    try {
      const [clientsData, postsData, socialAccountsData, usageData] = await Promise.all([
        apiClient.get<ApiClientsResponse>('/clients').catch(() => null),
        apiClient.get<ApiPostsResponse>('/posts?status=scheduled&limit=1').catch(() => null),
        apiClient.get<ApiSocialAccountsResponse>('/social-accounts').catch(() => null),
        apiClient.get<ApiUsageResponse>('/billing/usage').catch(() => null),
      ]);

      const totalClients = getCount(clientsData);
      const scheduledPosts = getCount(postsData);
      const socialAccounts = getCount(socialAccountsData);
      const aiCreditsUsed = usageData?.aiCredits?.current ?? usageData?.aiCredits?.used ?? 0;
      const aiCreditsMax = usageData?.aiCredits?.max ?? usageData?.aiCredits?.limit ?? 0;
      const aiCreditsRemaining = aiCreditsMax > 0 ? aiCreditsMax - aiCreditsUsed : 0;

      const cards: StatCard[] = [
        {
          label: 'Total Clients',
          value: totalClients.toString(),
          change: 'across your agency',
          trend: 'neutral',
          icon: Users,
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-50',
        },
        {
          label: 'Social Accounts',
          value: socialAccounts.toString(),
          change: 'connected accounts',
          trend: 'neutral',
          icon: Share2,
          iconColor: 'text-violet-600',
          iconBg: 'bg-violet-50',
        },
        {
          label: 'Scheduled Posts',
          value: scheduledPosts.toString(),
          change: 'queued for publishing',
          trend: scheduledPosts > 0 ? 'up' : 'neutral',
          icon: CalendarClock,
          iconColor: 'text-amber-600',
          iconBg: 'bg-amber-50',
        },
        {
          label: 'AI Credits Used',
          value: aiCreditsUsed.toLocaleString(),
          change: aiCreditsRemaining > 0 ? `${aiCreditsRemaining.toLocaleString()} remaining` : 'check billing for limits',
          trend: 'neutral',
          icon: Sparkles,
          iconColor: 'text-emerald-600',
          iconBg: 'bg-emerald-50',
        },
      ];

      setStatCards(cards);
    } catch (err) {
      console.error('[DashboardPage] Failed to fetch stats:', err);
      // Show zeros gracefully — don't crash
      setStatCards([
        { label: 'Total Clients', value: '—', change: 'unavailable', trend: 'neutral', icon: Users, iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
        { label: 'Social Accounts', value: '—', change: 'unavailable', trend: 'neutral', icon: Share2, iconColor: 'text-violet-600', iconBg: 'bg-violet-50' },
        { label: 'Scheduled Posts', value: '—', change: 'unavailable', trend: 'neutral', icon: CalendarClock, iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
        { label: 'AI Credits Used', value: '—', change: 'unavailable', trend: 'neutral', icon: Sparkles, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
      ]);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome to Social Pro
        </h1>
        <p className="text-sm text-slate-500">{today}</p>
      </div>

      {/* Stat cards */}
      <section aria-label="Key metrics">
        {statsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Loading stats..." />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <StatCardItem key={card.label} card={card} />
            ))}
          </div>
        )}
      </section>

      {/* Quick actions + recent activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <section aria-label="Quick actions" className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-800">
                Quick actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <QuickActionCard key={action.label} action={action} />
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Recent activity */}
        <section aria-label="Recent activity" className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Recent activity
                </CardTitle>
                <Link
                  href="/dashboard/posts"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {/* Activity feed placeholder — real-time activity from WebSocket/audit log */}
              <div className="space-y-1">
                {[
                  {
                    action: 'Dashboard loaded',
                    detail: 'Stats fetched from API',
                    time: 'just now',
                    dot: 'bg-emerald-500',
                  },
                  {
                    action: 'View posts',
                    detail: 'Go to Posts to see scheduled content',
                    time: '',
                    dot: 'bg-blue-500',
                  },
                  {
                    action: 'Connect accounts',
                    detail: 'Link more social profiles in Social Accounts',
                    time: '',
                    dot: 'bg-violet-500',
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0"
                  >
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        item.dot
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {item.action}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {item.detail}
                      </p>
                    </div>
                    {item.time !== '' && (
                      <time className="text-xs text-slate-400 shrink-0">
                        {item.time}
                      </time>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Onboarding checklist */}
      <section aria-label="Getting started">
        <Card className="border-dashed border-blue-200 bg-blue-50/40">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                <Sparkles className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-slate-800">
                  Get started with Social Pro
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 mb-4">
                  Complete these steps to unlock the full power of your agency
                  dashboard.
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Add your first client', done: true },
                    { label: 'Connect a social account', done: true },
                    { label: 'Schedule your first post', done: false },
                    { label: 'Invite a team member', done: false },
                  ].map((step) => (
                    <div key={step.label} className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                          step.done
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-300 bg-white'
                        )}
                        aria-hidden="true"
                      >
                        {step.done && (
                          <svg
                            viewBox="0 0 10 10"
                            className="h-2.5 w-2.5 fill-white"
                            aria-hidden="true"
                          >
                            <path d="M8.5 2L4 7.5 1.5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-sm',
                          step.done
                            ? 'text-slate-400 line-through'
                            : 'text-slate-700 font-medium'
                        )}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-2xl font-bold text-blue-700">50%</p>
                <p className="text-xs text-blue-500">complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
