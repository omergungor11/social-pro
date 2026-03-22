'use client';

import * as React from 'react';
import {
  CreditCard,
  Download,
  CheckCircle2,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  ExternalLink,
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
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InvoiceStatus = 'paid' | 'pending' | 'failed';
type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'paused';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: InvoiceStatus;
  description: string;
}

interface Subscription {
  planName: string;
  planId: string;
  status: SubscriptionStatus;
  priceMonthly: number;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  features: string[];
  invoices: Invoice[];
}

interface UsageStats {
  socialAccounts: { current: number; max: number };
  clients: { current: number; max: number };
  teamMembers: { current: number; max: number };
  postsThisMonth: { current: number; max: number };
  aiCredits: { current: number; max: number };
  storageGb: { current: number; max: number };
}

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface ApiSubscription {
  plan?: {
    name?: string;
    id?: string;
    price?: number;
    monthlyPrice?: number;
    features?: string[];
  };
  planName?: string;
  planId?: string;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  invoices?: ApiInvoice[];
}

interface ApiInvoice {
  id?: string;
  number?: string;
  date?: string;
  createdAt?: string;
  amount?: number;
  amountDue?: number;
  status?: string;
  description?: string;
}

interface ApiUsage {
  socialAccounts?: { used?: number; current?: number; limit?: number; max?: number };
  clients?: { used?: number; current?: number; limit?: number; max?: number };
  teamMembers?: { used?: number; current?: number; limit?: number; max?: number };
  posts?: { used?: number; current?: number; limit?: number; max?: number };
  aiCredits?: { used?: number; current?: number; limit?: number; max?: number };
  storage?: { usedGb?: number; used?: number; current?: number; limitGb?: number; limit?: number; max?: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUsageValue(obj: { used?: number; current?: number; limit?: number; max?: number } | undefined, field: 'current' | 'max'): number {
  if (!obj) return 0;
  if (field === 'current') return obj.current ?? obj.used ?? 0;
  return obj.max ?? obj.limit ?? 0;
}

function mapSubscription(data: ApiSubscription): Subscription {
  const planName = data.plan?.name ?? data.planName ?? 'Free Plan';
  const planId = data.plan?.id ?? data.planId ?? 'free';
  const rawStatus = (data.status ?? 'active').toLowerCase().replace(/_/g, '_') as SubscriptionStatus;
  const priceMonthly = data.plan?.monthlyPrice ?? data.plan?.price ?? 0;
  const renewsAt = data.currentPeriodEnd
    ? new Date(data.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const features = data.plan?.features ?? [];
  const invoices: Invoice[] = (data.invoices ?? []).map(mapInvoice);

  return { planName, planId, status: rawStatus, priceMonthly, renewsAt, cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false, features, invoices };
}

function mapInvoice(inv: ApiInvoice): Invoice {
  const rawStatus = (inv.status ?? 'paid').toLowerCase();
  let status: InvoiceStatus = 'paid';
  if (rawStatus === 'pending' || rawStatus === 'open' || rawStatus === 'draft') status = 'pending';
  else if (rawStatus === 'failed' || rawStatus === 'void' || rawStatus === 'uncollectible') status = 'failed';

  const amountCents = inv.amount ?? inv.amountDue ?? 0;
  const amount = amountCents > 0
    ? `$${(amountCents / 100).toFixed(2)}`
    : '$0.00';

  const date = inv.date ?? inv.createdAt;
  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return {
    id: inv.id ?? inv.number ?? `inv-${Date.now()}`,
    date: formattedDate,
    amount,
    status,
    description: inv.description ?? `${inv.id ?? 'Invoice'}`,
  };
}

function mapUsage(data: ApiUsage): UsageStats {
  return {
    socialAccounts: {
      current: getUsageValue(data.socialAccounts, 'current'),
      max: getUsageValue(data.socialAccounts, 'max'),
    },
    clients: {
      current: getUsageValue(data.clients, 'current'),
      max: getUsageValue(data.clients, 'max'),
    },
    teamMembers: {
      current: getUsageValue(data.teamMembers, 'current'),
      max: getUsageValue(data.teamMembers, 'max'),
    },
    postsThisMonth: {
      current: getUsageValue(data.posts, 'current'),
      max: getUsageValue(data.posts, 'max'),
    },
    aiCredits: {
      current: getUsageValue(data.aiCredits, 'current'),
      max: getUsageValue(data.aiCredits, 'max'),
    },
    storageGb: {
      current: data.storage?.usedGb ?? getUsageValue(data.storage, 'current'),
      max: data.storage?.limitGb ?? getUsageValue(data.storage, 'max'),
    },
  };
}

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
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [subscription, setSubscription] = React.useState<Subscription | null>(null);
  const [usage, setUsage] = React.useState<UsageStats | null>(null);
  const [canceling, setCanceling] = React.useState(false);
  const [portalLoading, setPortalLoading] = React.useState(false);

  const fetchData = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [subData, usageData] = await Promise.all([
        apiClient.get<ApiSubscription>('/billing/subscription').catch(() => null),
        apiClient.get<ApiUsage>('/billing/usage').catch(() => null),
      ]);

      if (subData !== null) {
        setSubscription(mapSubscription(subData));
      }
      if (usageData !== null) {
        setUsage(mapUsage(usageData));
      }
    } catch (err) {
      console.error('[BillingPage] Failed to fetch billing data:', err);
      setError('Failed to load billing information. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleManageBilling(): Promise<void> {
    setPortalLoading(true);
    try {
      const result = await apiClient.post<{ url: string }>('/billing/portal');
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('[BillingPage] Failed to get portal URL:', err);
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleCancel(): Promise<void> {
    if (!confirm('Are you sure you want to cancel your subscription? You will keep access until the end of your billing period.')) return;
    setCanceling(true);
    try {
      await apiClient.post('/billing/cancel');
      // Refresh subscription data
      await fetchData();
    } catch (err) {
      console.error('[BillingPage] Failed to cancel subscription:', err);
    } finally {
      setCanceling(false);
    }
  }

  const isFreePlan = subscription === null || subscription.planId === 'free' || subscription.priceMonthly === 0;
  const isCanceled = subscription?.status === 'canceled' || subscription?.cancelAtPeriodEnd === true;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing</h1>
        <p className="text-sm text-slate-500">
          Manage your subscription, monitor usage, and view invoices.
        </p>
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
            onClick={() => void fetchData()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Loading billing data..." />
        </div>
      )}

      {!loading && (
        <>
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
                      <h2 className="text-lg font-bold text-slate-900">
                        {subscription?.planName ?? 'Free Plan'}
                      </h2>
                      {isCanceled ? (
                        <Badge variant="default">Canceling</Badge>
                      ) : (
                        <Badge variant="green">
                          {subscription?.status === 'trialing' ? 'Trial' : 'Active'}
                        </Badge>
                      )}
                    </div>
                    {!isFreePlan && subscription !== null && (
                      <p className="text-2xl font-bold text-blue-700">
                        ${subscription.priceMonthly}
                        <span className="text-sm font-normal text-slate-500"> / month</span>
                      </p>
                    )}
                    {isFreePlan && (
                      <p className="text-2xl font-bold text-blue-700">
                        Free
                        <span className="text-sm font-normal text-slate-500"> forever</span>
                      </p>
                    )}
                    {subscription?.renewsAt !== null && subscription?.renewsAt !== undefined && (
                      <p className="text-sm text-slate-500">
                        {isCanceled ? 'Access until' : 'Renews on'}{' '}
                        <span className="font-medium text-slate-700">{subscription.renewsAt}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!isFreePlan && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleManageBilling()}
                        disabled={portalLoading}
                      >
                        {portalLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        )}
                        Manage Subscription
                      </Button>
                      {!isCanceled && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => void handleCancel()}
                          disabled={canceling}
                        >
                          {canceling ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : null}
                          {canceling ? 'Canceling...' : 'Cancel Plan'}
                        </Button>
                      )}
                    </>
                  )}
                  <Button size="sm" asChild>
                    <a href="/dashboard/billing/plans">
                      <CreditCard className="h-4 w-4" aria-hidden="true" />
                      {isFreePlan ? 'Upgrade Plan' : 'Change Plan'}
                    </a>
                  </Button>
                </div>
              </div>

              {/* Plan features pill list */}
              {subscription !== null && subscription.features.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {subscription.features.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-blue-100 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm"
                    >
                      <Shield className="h-3 w-3 text-blue-500" aria-hidden="true" />
                      {feature}
                    </span>
                  ))}
                </div>
              )}

              {/* No subscription — upgrade prompt */}
              {subscription === null && error === null && (
                <div className="mt-4 rounded-lg border border-blue-100 bg-white/60 px-4 py-3 text-sm text-slate-600">
                  You are on the free plan. Upgrade to unlock more clients, social accounts, and AI credits.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage meters */}
          {usage !== null && (
            <section aria-labelledby="usage-heading">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-slate-800">
                    Current Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <UsageMeter label="Social Accounts" current={usage.socialAccounts.current} max={usage.socialAccounts.max} />
                    <UsageMeter label="Clients" current={usage.clients.current} max={usage.clients.max} />
                    <UsageMeter label="Team Members" current={usage.teamMembers.current} max={usage.teamMembers.max} />
                    <UsageMeter label="Posts This Month" current={usage.postsThisMonth.current} max={usage.postsThisMonth.max} />
                    <UsageMeter label="AI Credits" current={usage.aiCredits.current} max={usage.aiCredits.max} />
                    <UsageMeter label="Storage" current={usage.storageGb.current} max={usage.storageGb.max} unit="GB" decimals={1} />
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
          )}

          {/* Invoice history */}
          {subscription !== null && subscription.invoices.length > 0 && (
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
                  {subscription.invoices.map((invoice) => (
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
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
