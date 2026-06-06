'use client';

import * as React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  BarChart3,
  Eye,
  FileText,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { PlatformIcon, type Platform } from '@/components/social/platform-icon';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { TimeSeriesChart } from '@/components/analytics/time-series-chart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = '7d' | '30d' | '90d' | 'custom';

interface OverviewMetric {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

interface PlatformStat {
  platform: Platform;
  followers: number;
  followerChange: number;
  engagementRate: number;
  impressions: number;
}

interface TopPost {
  id: string;
  platform: Platform;
  content: string;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface ApiOverviewResponse {
  totalFollowers?: number;
  followerChange?: number;
  engagementRate?: number;
  engagementRateChange?: number;
  totalImpressions?: number;
  impressionChange?: number;
  postsPublished?: number;
  postsChange?: number;
  platformBreakdown?: Array<{
    platform: string;
    followers?: number;
    followerChange?: number;
    engagementRate?: number;
    impressions?: number;
  }>;
  topPosts?: Array<{
    id: string;
    platform: string;
    content?: string;
    publishedAt?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    engagementRate?: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getRangeDate(range: DateRange): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  start.setDate(start.getDate() - days);
  const fmt = (d: Date): string => d.toISOString().split('T')[0] ?? '';
  return { startDate: fmt(start), endDate: fmt(end) };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCOUNT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Accounts' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface DateRangeTabsProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Custom', value: 'custom' },
];

function DateRangeTabs({ value, onChange }: DateRangeTabsProps): React.JSX.Element {
  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm"
      role="tablist"
      aria-label="Date range"
    >
      {DATE_RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150',
            value === opt.value
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({ metric }: { metric: OverviewMetric }): React.JSX.Element {
  const Icon = metric.icon;
  const isNeutral = metric.change === 0;
  const isPositive = metric.change > 0;
  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const trendIconColor = isNeutral ? 'text-slate-400' : isPositive ? 'text-emerald-500' : 'text-red-500';
  const trendTextColor = isNeutral ? 'text-slate-500' : isPositive ? 'text-emerald-600' : 'text-red-600';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate">{metric.label}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{metric.value}</p>
            <div className="flex items-center gap-1">
              <TrendIcon
                className={cn('h-3.5 w-3.5 shrink-0', trendIconColor)}
                aria-hidden="true"
              />
              <span className={cn('text-xs font-medium', trendTextColor)}>
                {isPositive ? '+' : ''}{metric.change}% vs prev period
              </span>
            </div>
          </div>
          <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', metric.iconBg)}>
            <Icon className={cn('h-5 w-5', metric.iconColor)} aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformBreakdownCard({ stat }: { stat: PlatformStat }): React.JSX.Element {
  const isPositive = stat.followerChange >= 0;

  return (
    <Card className="hover:border-blue-200 transition-colors duration-150">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <PlatformIcon platform={stat.platform} size="sm" />
          <div>
            <p className="text-sm font-semibold text-slate-800 capitalize">{stat.platform}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Followers</p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">
              {stat.followers > 0 ? stat.followers.toLocaleString() : '—'}
            </p>
            {stat.followers > 0 && (
              <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-red-600')}>
                {isPositive ? '+' : ''}{stat.followerChange}%
              </span>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Engagement</p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">
              {stat.engagementRate > 0 ? `${stat.engagementRate}%` : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage(): React.JSX.Element {
  const [dateRange, setDateRange] = React.useState<DateRange>('30d');
  const [account, setAccount] = React.useState('all');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [overviewMetrics, setOverviewMetrics] = React.useState<OverviewMetric[]>([]);
  const [platformStats, setPlatformStats] = React.useState<PlatformStat[]>([]);
  const [topPosts, setTopPosts] = React.useState<TopPost[]>([]);

  const fetchOverview = React.useCallback(async (range: DateRange): Promise<void> => {
    if (range === 'custom') return; // Custom range requires date picker — skip auto-fetch
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getRangeDate(range);
      const data = await apiClient.get<ApiOverviewResponse>(
        `/analytics/overview?startDate=${startDate}&endDate=${endDate}`
      );

      const metrics: OverviewMetric[] = [
        {
          label: 'Total Followers',
          value: formatBigNumber(data.totalFollowers ?? 0),
          change: Math.round((data.followerChange ?? 0) * 10) / 10,
          icon: Users,
          iconBg: 'bg-blue-50',
          iconColor: 'text-blue-600',
        },
        {
          label: 'Engagement Rate',
          value: `${(data.engagementRate ?? 0).toFixed(2)}%`,
          change: Math.round((data.engagementRateChange ?? 0) * 10) / 10,
          icon: BarChart3,
          iconBg: 'bg-violet-50',
          iconColor: 'text-violet-600',
        },
        {
          label: 'Total Impressions',
          value: formatBigNumber(data.totalImpressions ?? 0),
          change: Math.round((data.impressionChange ?? 0) * 10) / 10,
          icon: Eye,
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-600',
        },
        {
          label: 'Posts Published',
          value: (data.postsPublished ?? 0).toLocaleString(),
          change: Math.round((data.postsChange ?? 0) * 10) / 10,
          icon: FileText,
          iconBg: 'bg-emerald-50',
          iconColor: 'text-emerald-600',
        },
      ];

      setOverviewMetrics(metrics);

      const platforms: PlatformStat[] = (data.platformBreakdown ?? []).map((p) => ({
        platform: p.platform as Platform,
        followers: p.followers ?? 0,
        followerChange: Math.round((p.followerChange ?? 0) * 10) / 10,
        engagementRate: Math.round((p.engagementRate ?? 0) * 10) / 10,
        impressions: p.impressions ?? 0,
      }));
      setPlatformStats(platforms);

      const posts: TopPost[] = (data.topPosts ?? []).map((p) => ({
        id: p.id,
        platform: p.platform as Platform,
        content: p.content ?? '',
        publishedAt: p.publishedAt
          ? new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : '—',
        likes: p.likes ?? 0,
        comments: p.comments ?? 0,
        shares: p.shares ?? 0,
        engagementRate: Math.round((p.engagementRate ?? 0) * 10) / 10,
      }));
      setTopPosts(posts);
    } catch (err) {
      console.error('[AnalyticsPage] Failed to fetch overview:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchOverview(dateRange);
  }, [fetchOverview, dateRange]);

  const handleDateRangeChange = (range: DateRange): void => {
    setDateRange(range);
  };

  const chartRange = dateRange === 'custom' ? getRangeDate('30d') : getRangeDate(dateRange);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-slate-500">
            Monitor performance across all your social accounts.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <Select
              value={account}
              options={ACCOUNT_FILTER_OPTIONS}
              onChange={(e) => setAccount(e.target.value)}
              className="w-44"
            />
          </div>
          <DateRangeTabs value={dateRange} onChange={handleDateRangeChange} />
        </div>
      </div>

      {/* Error state */}
      {error !== null && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-100"
            onClick={() => void fetchOverview(dateRange)}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Loading analytics..." />
        </div>
      )}

      {!loading && (
        <>
          {/* Overview metrics */}
          <section aria-label="Overview metrics">
            {overviewMetrics.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {overviewMetrics.map((m) => (
                  <MetricCard key={m.label} metric={m} />
                ))}
              </div>
            ) : error === null && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {['Total Followers', 'Engagement Rate', 'Total Impressions', 'Posts Published'].map((label) => (
                  <Card key={label} className="overflow-hidden">
                    <CardContent className="p-6">
                      <p className="text-sm font-medium text-slate-500">{label}</p>
                      <p className="mt-3 text-3xl font-bold text-slate-300">—</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TimeSeriesChart
              title="Follower Growth"
              description="Total followers across all platforms"
              metric="FOLLOWERS"
              kind="area"
              startDate={chartRange.startDate}
              endDate={chartRange.endDate}
              emptyMessage="Collecting data — this chart fills in as snapshots accumulate"
              color="#2563eb"
            />
            <TimeSeriesChart
              title="Engagement Rate"
              description="Average engagement rate per day"
              metric="ENGAGEMENT"
              kind="line"
              startDate={chartRange.startDate}
              endDate={chartRange.endDate}
              percent
              emptyMessage="No published posts in this range"
              color="#7c3aed"
            />
          </div>

          {/* Platform breakdown */}
          {platformStats.length > 0 && (
            <section aria-labelledby="platform-breakdown-heading">
              <h2
                id="platform-breakdown-heading"
                className="text-sm font-semibold text-slate-700 mb-4"
              >
                Platform Breakdown
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {platformStats.map((stat) => (
                  <PlatformBreakdownCard key={stat.platform} stat={stat} />
                ))}
              </div>
            </section>
          )}

          {/* Top performing posts */}
          {topPosts.length > 0 && (
            <section aria-labelledby="top-posts-heading">
              <div className="flex items-center justify-between mb-4">
                <h2
                  id="top-posts-heading"
                  className="text-sm font-semibold text-slate-700"
                >
                  Top Performing Posts
                </h2>
                <Badge variant="default">Top {topPosts.length} by engagement</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Likes</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Engagement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="max-w-xs">
                        <p className="truncate text-slate-700">{post.content}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PlatformIcon platform={post.platform} size="sm" />
                          <span className="sr-only capitalize">{post.platform}</span>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-500">
                        {post.publishedAt}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {post.likes.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {post.comments.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {post.shares.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-emerald-600 tabular-nums">
                          {post.engagementRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}

          {/* Empty state when no data and no error */}
          {error === null && overviewMetrics.length === 0 && platformStats.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
              <BarChart3 className="h-10 w-10 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-600">No analytics data yet</p>
              <p className="mt-1 text-xs text-slate-400">Publish some posts to start seeing metrics here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
