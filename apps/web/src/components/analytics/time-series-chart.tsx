'use client';

import * as React from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChartKind = 'area' | 'line';

export type TimeSeriesMetric = 'FOLLOWERS' | 'IMPRESSIONS' | 'ENGAGEMENT';

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface TimeSeriesChartProps {
  title: string;
  description: string;
  metric: TimeSeriesMetric;
  kind: ChartKind;
  startDate: string;
  endDate: string;
  /** When true, format values/axis/tooltip as a percentage. */
  percent?: boolean;
  /** Message shown when the series has no data points. */
  emptyMessage: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAxisDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAxisValue(value: number, percent: boolean): string {
  if (percent) return `${value}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

interface TooltipPayloadEntry {
  value?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadEntry[];
  percent: boolean;
}

function ChartTooltip({ active, label, payload, percent }: ChartTooltipProps): React.JSX.Element | null {
  if (active !== true || payload === undefined || payload.length === 0) return null;
  const raw = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-slate-400">{label !== undefined ? formatAxisDate(label) : ''}</p>
      <p className="text-sm font-semibold text-slate-800 tabular-nums">
        {percent ? `${raw.toFixed(2)}%` : raw.toLocaleString()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeSeriesChart({
  title,
  description,
  metric,
  kind,
  startDate,
  endDate,
  percent = false,
  emptyMessage,
  color,
}: TimeSeriesChartProps): React.JSX.Element {
  const [data, setData] = React.useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = React.useState(true);
  const gradientId = React.useId();

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiClient
      .get<TimeSeriesPoint[]>(
        `/analytics/timeseries?metric=${metric}&startDate=${startDate}&endDate=${endDate}`
      )
      .then((points) => {
        if (cancelled) return;
        setData(Array.isArray(points) ? points : []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error(`[TimeSeriesChart] Failed to fetch ${metric} series:`, err);
        setData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return (): void => {
      cancelled = true;
    };
  }, [metric, startDate, endDate]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-800">{title}</CardTitle>
          <Badge variant="default">{percent ? 'Daily avg' : 'Snapshot'}</Badge>
        </div>
        <p className="text-xs text-slate-400">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" aria-label="Loading chart..." />
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 text-center">
              <p className="text-xs text-slate-400">{emptyMessage}</p>
            </div>
          ) : kind === 'area' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v: number) => formatAxisValue(v, percent)}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip percent={percent} />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatAxisDate}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v: number) => formatAxisValue(v, percent)}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ChartTooltip percent={percent} />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
