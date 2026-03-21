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
// Mock data
// ---------------------------------------------------------------------------

const MOCK_REPORTS: Report[] = [
  { id: 'r1', title: 'Acme Corp — March 2026 Monthly Report', dateRange: 'Mar 1 – Mar 31, 2026', type: 'monthly', status: 'ready', createdAt: 'Mar 18, 2026', client: 'Acme Corp' },
  { id: 'r2', title: 'Globex Media — Week 11 Report', dateRange: 'Mar 10 – Mar 16, 2026', type: 'weekly', status: 'ready', createdAt: 'Mar 17, 2026', client: 'Globex Media' },
  { id: 'r3', title: 'Initech — Q1 Custom Performance Report', dateRange: 'Jan 1 – Mar 31, 2026', type: 'custom', status: 'generating', createdAt: 'Mar 18, 2026', client: 'Initech Solutions' },
  { id: 'r4', title: 'Umbrella Corp — Week 10 Report', dateRange: 'Mar 3 – Mar 9, 2026', type: 'weekly', status: 'ready', createdAt: 'Mar 10, 2026', client: 'Umbrella Corp' },
  { id: 'r5', title: 'Soylent Media — February Monthly Report', dateRange: 'Feb 1 – Feb 28, 2026', type: 'monthly', status: 'failed', createdAt: 'Mar 1, 2026', client: 'Soylent Media' },
];

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

// Platform checkboxes for the dialog
const PLATFORMS = ['LinkedIn', 'Twitter / X', 'Instagram', 'Facebook', 'TikTok', 'YouTube'];

interface GenerateReportDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (report: Omit<Report, 'id' | 'status' | 'createdAt'>) => void;
}

function GenerateReportDialog({
  open,
  onClose,
  onGenerate,
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
    if (!isValid) return;
    const clientLabel = CLIENT_OPTIONS.find((c) => c.value === client)?.label ?? client;
    onGenerate({
      title: title.trim(),
      dateRange: `${dateFrom} – ${dateTo}`,
      type: reportType,
      client: clientLabel,
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

        {/* Date range */}
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

        {/* Platform checkboxes */}
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!isValid}>
            <FileBarChart className="h-4 w-4" />
            Generate Report
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
  const [reports, setReports] = React.useState<Report[]>(MOCK_REPORTS);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  function handleGenerate(
    data: Omit<Report, 'id' | 'status' | 'createdAt'>
  ): void {
    const newReport: Report = {
      id: `r-${Date.now()}`,
      ...data,
      status: 'generating',
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
    setReports((prev) => [newReport, ...prev]);
    setDialogOpen(false);
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
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Reports table */}
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
                    <Eye className="h-3.5 w-3.5" />
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
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <GenerateReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
