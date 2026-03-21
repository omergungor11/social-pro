'use client';

import * as React from 'react';
import {
  CreditCard,
  Download,
  CheckCircle2,
  AlertCircle,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { UsageMeter } from '@/components/billing/usage-meter';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceStatus = 'paid' | 'pending' | 'failed';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: InvoiceStatus;
  description: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const INVOICES: Invoice[] = [
  { id: 'inv-001', date: 'Mar 1, 2026', amount: '$99.00', status: 'paid', description: 'Business Plan — March 2026' },
  { id: 'inv-002', date: 'Feb 1, 2026', amount: '$99.00', status: 'paid', description: 'Business Plan — February 2026' },
  { id: 'inv-003', date: 'Jan 1, 2026', amount: '$99.00', status: 'paid', description: 'Business Plan — January 2026' },
  { id: 'inv-004', date: 'Dec 1, 2025', amount: '$49.00', status: 'paid', description: 'Pro Plan — December 2025' },
  { id: 'inv-005', date: 'Nov 1, 2025', amount: '$49.00', status: 'paid', description: 'Pro Plan — November 2025' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }): React.JSX.Element {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
        Paid
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="default">Pending</Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
      <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
      Failed
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BillingPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing</h1>
        <p className="text-sm text-slate-500">
          Manage your subscription, monitor usage, and view invoices.
        </p>
      </div>

      {/* Current plan card */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 to-violet-50/40 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Plan info */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
                <Zap className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">Business Plan</h2>
                  <Badge variant="green">Active</Badge>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  $99
                  <span className="text-sm font-normal text-slate-500"> / month</span>
                </p>
                <p className="text-sm text-slate-500">
                  Renews on <span className="font-medium text-slate-700">April 1, 2026</span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button variant="outline" size="sm">
                Manage Subscription
              </Button>
              <Button size="sm">
                <CreditCard className="h-4 w-4" />
                Change Plan
              </Button>
            </div>
          </div>

          {/* Plan features pill list */}
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              '25 Social Accounts',
              '10 Clients',
              '5 Team Members',
              '500 Posts/month',
              '5,000 AI Credits',
              '10 GB Storage',
            ].map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-blue-100 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm"
              >
                <Shield className="h-3 w-3 text-blue-500" aria-hidden="true" />
                {feature}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage meters */}
      <section aria-labelledby="usage-heading">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-800">
              Current Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <UsageMeter label="Social Accounts" current={18} max={25} />
              <UsageMeter label="Clients" current={7} max={10} />
              <UsageMeter label="Team Members" current={4} max={5} />
              <UsageMeter label="Posts This Month" current={412} max={500} />
              <UsageMeter label="AI Credits" current={3840} max={5000} />
              <UsageMeter label="Storage" current={6.7} max={10} unit="GB" decimals={1} />
            </div>

            {/* Usage legend */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                Under 60% — Healthy
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                60–80% — Warning
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
                Over 80% — Critical
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Invoice history */}
      <section aria-labelledby="invoices-heading">
        <div className="flex items-center justify-between mb-4">
          <h2
            id="invoices-heading"
            className="text-sm font-semibold text-slate-700"
          >
            Invoice History
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INVOICES.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-800">{invoice.description}</p>
                    <p className="text-xs text-slate-400 tabular-nums">{invoice.id}</p>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-500">
                  {invoice.date}
                </TableCell>
                <TableCell className="font-semibold tabular-nums text-slate-800">
                  {invoice.amount}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Download PDF for ${invoice.description}`}
                    className={cn(
                      invoice.status === 'paid'
                        ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                        : 'text-slate-300'
                    )}
                    disabled={invoice.status !== 'paid'}
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
