'use client';

import * as React from 'react';
import {
  Plus,
  Download,
  Eye,
  FileBarChart,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ReportType = 'weekly' | 'monthly' | 'custom';
type ReportStatus = 'ready' | 'generating' | 'failed';

interface Report {
  id: string;
  title: string;
  dateRange: string;
  type: ReportType;
  status: ReportStatus;
  createdAt: string;
  client: string;
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface ApiReport {
  id: string;
  title?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  dateRange?: string;
  type?: string;
  reportType?: string;
  status?: string;
  createdAt?: string;
  clientName?: string;
  client?: string | { name?: string };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapApiReport(r: ApiReport): Report {
  // Normalise status — API may return different casing or values
  const rawStatus = (r.status ?? 'ready').toLowerCase();
  let status: ReportStatus = 'ready';
  if (rawStatus === 'generating' || rawStatus === 'pending' || rawStatus === 'processing') {
    status = 'generating';
  } else if (rawStatus === 'failed' || rawStatus === 'error') {
    status = 'failed';
  }

  // Normalise type
  const rawType = (r.type ?? r.reportType ?? 'custom').toLowerCase();
  let type: ReportType = 'custom';
  if (rawType === 'weekly') type = 'weekly';
  else if (rawType === 'monthly') type = 'monthly';

  // Date range label
  let dateRange = r.dateRange ?? '';
  if (!dateRange && r.startDate && r.endDate) {
    const fmt = (s: string): string =>
      new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    dateRange = `${fmt(r.startDate)} – ${fmt(r.endDate)}`;
  }

  // Client label
  let client = '';
  if (typeof r.client === 'string') {
    client = r.client;
  } else if (r.client && typeof r.client === 'object') {
    client = r.client.name ?? '';
  }
  if (!client) client = r.clientName ?? '';

  // Created at
  const createdAt = r.createdAt
    ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return {
    id: r.id,
    title: r.title ?? r.name ?? 'Untitled Report',
    dateRange,
    type,
    status,
    createdAt,
    client,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CLIENT_OPTIONS = [
  { value: 'acme-corp', label: 'Acme Corp' },
  { value: 'globex-media', label: 'Globex Media' },
  { value: 'initech', label: 'Initech Solutions' },
  { value: 'umbrella-corp', label: 'Umbrella Corp' },
  { value: 'soylent-media', label: 'Soylent Media' },
];

const REPORT_TYPE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom Range' },
];

const TYPE_BADGE_VARIANT: Record<ReportType, 'default' | 'blue' | 'purple'> = {
  weekly: 'blue',
  monthly: 'purple',
  custom: 'default',
};

const TYPE_LABEL: Record<ReportType, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ReportStatus }): React.JSX.Element {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
        Ready
      </span>
    );
  }
  if (status === 'generating') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" aria-hidden="true" />
        Generating
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
      <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
      Failed
    </span>
  );
}

const PLATFORMS = ['LinkedIn', 'Twitter / X', 'Instagram', 'Facebook', 'TikTok', 'YouTube'];

interface GenerateReportDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (payload: {
    title: string;
    clientId: string;
    clientLabel: string;
    type: ReportType;
    startDate: string;
    endDate: string;
    platforms: string[];
  }) => void;
  submitting: boolean;
}

function GenerateReportDialog({
  open,
  onClose,
  onGenerate,
  submitting,
}: GenerateReportDialogProps): React.JSX.Element {
  const [title, setTitle] = React.useState('');
  const [client, setClient] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [reportType, setReportType] = React.useState<ReportType>('monthly');
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Set<string>>(
    new Set(PLATFORMS)
  );

  React.useEffect(() => {
    if (!open) return;
    setTitle('');
    setClient('');
    setDateFrom('');
    setDateTo('');
    setReportType('monthly');
    setSelectedPlatforms(new Set(PLATFORMS));
  }, [open]);

  function togglePlatform(p: string, checked: boolean): void {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (checked) next.add(p);
      else next.delete(p);
      return next;
    });
  }

  const isValid =
    title.trim().length > 0 &&
    client.length > 0 &&
    dateFrom.length > 0 &&
    dateTo.length > 0 &&
    selectedPlatforms.size > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (!isValid || submitting) return;
    const clientLabel = CLIENT_OPTIONS.find((c) => c.value === client)?.label ?? client;
    onGenerate({
      title: title.trim(),
      clientId: client,
      clientLabel,
      type: reportType,
      startDate: dateFrom,
      endDate: dateTo,
      platforms: Array.from(selectedPlatforms),
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Generate Report"
      description="Configure and generate a new analytics report."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Report Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Acme Corp March 2026 Monthly Report"
          required
        />

        <Select
          label="Client"
          value={client}
          options={CLIENT_OPTIONS}
          placeholder="Select a client"
          onChange={(e) => setClient(e.target.value)}
          required
        />

        <Select
          label="Report Type"
          value={reportType}
          options={REPORT_TYPE_OPTIONS}
          onChange={(e) => setReportType(e.target.value as ReportType)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            required
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Platforms</p>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => (
              <Checkbox
                key={p}
                label={p}
                checked={selectedPlatforms.has(p)}
                onChange={(checked) => togglePlatform(p, checked)}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid || submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileBarChart className="h-4 w-4" aria-hidden="true" />
            )}
            {submitting ? 'Generating...' : 'Generate Report'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReportsPage(): React.JSX.Element {
  const [reports, setReports] = React.useState<Report[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const fetchReports = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ApiReport[] | { items?: ApiReport[] }>('/analytics/reports');
      const items = Array.isArray(data) ? data : (data.items ?? []);
      setReports(items.map(mapApiReport));
    } catch (err) {
      console.error('[ReportsPage] Failed to fetch reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  async function handleGenerate(payload: {
    title: string;
    clientId: string;
    clientLabel: string;
    type: ReportType;
    startDate: string;
    endDate: string;
    platforms: string[];
  }): Promise<void> {
    setSubmitting(true);
    try {
      const created = await apiClient.post<ApiReport>('/analytics/reports', {
        title: payload.title,
        clientId: payload.clientId,
        type: payload.type,
        startDate: payload.startDate,
        endDate: payload.endDate,
        platforms: payload.platforms,
      });

      const newReport: Report = {
        ...mapApiReport(created),
        // Ensure client label from form if API doesn't return it
        client: created.clientName ?? payload.clientLabel,
        status: 'generating',
      };
      setReports((prev) => [newReport, ...prev]);
      setDialogOpen(false);
    } catch (err) {
      console.error('[ReportsPage] Failed to generate report:', err);
      // Add an optimistic entry with failed status so the user sees what happened
      const fallback: Report = {
        id: `optimistic-${Date.now()}`,
        title: payload.title,
        dateRange: `${payload.startDate} – ${payload.endDate}`,
        type: payload.type,
        status: 'failed',
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        client: payload.clientLabel,
      };
      setReports((prev) => [fallback, ...prev]);
      setDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-sm text-slate-500">
            Generate and download analytics reports for your clients.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={loading}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Generate Report
        </Button>
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
            onClick={() => void fetchReports()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Loading reports..." />
        </div>
      )}

      {/* Empty state */}
      {!loading && reports.length === 0 && error === null && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-center">
          <FileBarChart className="h-10 w-10 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-600">No reports yet</p>
          <p className="mt-1 text-xs text-slate-400">Generate your first report to get started.</p>
          <Button className="mt-5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Generate Report
          </Button>
        </div>
      )}

      {/* Reports table */}
      {!loading && reports.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="max-w-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileBarChart className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="truncate font-medium text-slate-800">{report.title}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-500">
                  {report.client}
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-500 text-xs">
                  {report.dateRange}
                </TableCell>
                <TableCell>
                  <Badge variant={TYPE_BADGE_VARIANT[report.type]}>
                    {TYPE_LABEL[report.type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={report.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-500 text-xs">
                  {report.createdAt}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={report.status !== 'ready'}
                      aria-label={`View ${report.title}`}
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={report.status !== 'ready'}
                      aria-label={`Download PDF for ${report.title}`}
                      className={cn(
                        report.status === 'ready'
                          ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                          : ''
                      )}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      PDF
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <GenerateReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGenerate={handleGenerate}
        submitting={submitting}
      />
    </div>
  );
}
