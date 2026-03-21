'use client';

import * as React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Eye,
  FileText,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
// Mock data
// ---------------------------------------------------------------------------

const OVERVIEW_METRICS: OverviewMetric[] = [
  {
    label: 'Total Followers',
    value: '248,392',
    change: 12.4,
    icon: Users,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    label: 'Engagement Rate',
    value: '4.87%',
    change: 0.6,
    icon: BarChart3,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    label: 'Total Impressions',
    value: '1.24M',
    change: -3.2,
    icon: Eye,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    label: 'Posts Published',
    value: '142',
    change: 8.1,
    icon: FileText,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
];

const PLATFORM_STATS: PlatformStat[] = [
  { platform: 'instagram', followers: 92400, followerChange: 5.3, engagementRate: 6.2, impressions: 480000 },
  { platform: 'linkedin', followers: 67800, followerChange: 11.8, engagementRate: 3.9, impressions: 290000 },
  { platform: 'twitter', followers: 54200, followerChange: -1.2, engagementRate: 2.7, impressions: 210000 },
  { platform: 'facebook', followers: 33992, followerChange: 2.1, engagementRate: 1.8, impressions: 140000 },
  { platform: 'tiktok', followers: 0, followerChange: 0, engagementRate: 0, impressions: 120000 },
];

const TOP_POSTS: TopPost[] = [
  { id: 'p1', platform: 'instagram', content: 'Excited to announce our partnership with Acme Corp! Together we\'re building the future of social...', publishedAt: 'Mar 15', likes: 1842, comments: 214, shares: 89, engagementRate: 8.4 },
  { id: 'p2', platform: 'linkedin', content: '5 social media trends every marketing agency needs to know in 2026. Thread below...', publishedAt: 'Mar 12', likes: 967, comments: 132, shares: 201, engagementRate: 6.9 },
  { id: 'p3', platform: 'twitter', content: 'Hot take: most agencies are measuring the wrong metrics. Here\'s what actually drives client ROI...', publishedAt: 'Mar 10', likes: 723, comments: 88, shares: 312, engagementRate: 5.7 },
  { id: 'p4', platform: 'facebook', content: 'Behind the scenes of our agency\'s monthly strategy session. Our team reviews every client dashboard...', publishedAt: 'Mar 8', likes: 541, comments: 67, shares: 45, engagementRate: 4.8 },
  { id: 'p5', platform: 'instagram', content: 'New case study alert: how we helped Globex Media grow their Instagram following by 340% in 90 days.', publishedAt: 'Mar 5', likes: 489, comments: 73, shares: 38, engagementRate: 4.2 },
];

const ACCOUNT_FILTER_OPTIONS = [
  { value: 'all', label: 'All Accounts' },
  { value: 'acme-corp', label: 'Acme Corp' },
  { value: 'globex-media', label: 'Globex Media' },
  { value: 'initech', label: 'Initech Solutions' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Date range tab
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

// Overview metric card
function MetricCard({ metric }: { metric: OverviewMetric }): React.JSX.Element {
  const Icon = metric.icon;
  const isPositive = metric.change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate">{metric.label}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{metric.value}</p>
            <div className="flex items-center gap-1">
              <TrendIcon
                className={cn('h-3.5 w-3.5 shrink-0', isPositive ? 'text-emerald-500' : 'text-red-500')}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  isPositive ? 'text-emerald-600' : 'text-red-600'
                )}
              >
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

// Chart placeholder
interface ChartPlaceholderProps {
  title: string;
  description: string;
  mockNumbers: string[];
}

function ChartPlaceholder({ title, description, mockNumbers }: ChartPlaceholderProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800">{title}</CardTitle>
          <Badge variant="default">Preview</Badge>
        </div>
        <p className="text-xs text-slate-400">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <BarChart3 className="h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-500">Chart: {title}</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
              {mockNumbers.map((n) => (
                <span key={n} className="text-xs text-slate-400 tabular-nums">{n}</span>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              Recharts integration coming in next phase
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Platform breakdown card
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
          <DateRangeTabs value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Overview metrics */}
      <section aria-label="Overview metrics">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {OVERVIEW_METRICS.map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
        </div>
      </section>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPlaceholder
          title="Follower Growth"
          description="Cumulative followers across all platforms"
          mockNumbers={['Jan: 218K', 'Feb: 231K', 'Mar: 248K', 'Peak: 248,392', 'Growth: +13.9%']}
        />
        <ChartPlaceholder
          title="Engagement Rate"
          description="Average engagement rate per day"
          mockNumbers={['Avg: 4.87%', 'Peak: 8.4%', 'Low: 1.8%', 'Best day: Tuesday', 'Best platform: Instagram']}
        />
      </div>

      {/* Platform breakdown */}
      <section aria-labelledby="platform-breakdown-heading">
        <h2
          id="platform-breakdown-heading"
          className="text-sm font-semibold text-slate-700 mb-4"
        >
          Platform Breakdown
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLATFORM_STATS.map((stat) => (
            <PlatformBreakdownCard key={stat.platform} stat={stat} />
          ))}
        </div>
      </section>

      {/* Top performing posts */}
      <section aria-labelledby="top-posts-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="top-posts-heading"
            className="text-sm font-semibold text-slate-700"
          >
            Top Performing Posts
          </h2>
          <Badge variant="default">Top 5 by engagement</Badge>
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
            {TOP_POSTS.map((post) => (
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
    </div>
  );
}
