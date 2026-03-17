'use client';

import * as React from 'react';
import { RefreshCw, Unlink, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import {
  PlatformIcon,
  getPlatformLabel,
  PLATFORM_ACCENT,
  type Platform,
} from '@/components/social/platform-icon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountStatus = 'active' | 'expiring' | 'disconnected';

export interface SocialAccount {
  id: string;
  platform: Platform;
  username: string;
  displayName: string;
  status: AccountStatus;
  connectedAt: string;
  /** ISO date string — only relevant when status === 'expiring' */
  expiresAt?: string;
  assignedClient?: string;
}

interface AccountCardProps {
  account: SocialAccount;
  onRefresh: (id: string) => void;
  onDisconnect: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<AccountStatus, string> = {
  active: 'bg-emerald-500',
  expiring: 'bg-amber-400',
  disconnected: 'bg-red-500',
};

const STATUS_LABEL: Record<AccountStatus, string> = {
  active: 'Active',
  expiring: 'Expiring Soon',
  disconnected: 'Disconnected',
};

const STATUS_BADGE_VARIANT: Record<
  AccountStatus,
  'green' | 'default' | 'red'
> = {
  active: 'green',
  expiring: 'default',
  disconnected: 'red',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// AccountCard
// ---------------------------------------------------------------------------

export function AccountCard({
  account,
  onRefresh,
  onDisconnect,
}: AccountCardProps): React.JSX.Element {
  const [refreshing, setRefreshing] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  async function handleRefresh(): Promise<void> {
    setRefreshing(true);
    // Simulate async token refresh
    await new Promise<void>((resolve) => setTimeout(resolve, 1200));
    onRefresh(account.id);
    setRefreshing(false);
  }

  function handleDisconnectConfirm(): void {
    setConfirmOpen(false);
    onDisconnect(account.id);
  }

  const accentBorder = PLATFORM_ACCENT[account.platform];

  return (
    <>
      <article
        className={cn(
          'relative flex flex-col rounded-xl border bg-white shadow-sm',
          'border-l-4 transition-shadow hover:shadow-md',
          accentBorder
        )}
        aria-label={`${getPlatformLabel(account.platform)} account: ${account.displayName}`}
      >
        {/* Card body */}
        <div className="flex flex-col gap-4 p-5">
          {/* Top row: icon + name + status */}
          <div className="flex items-start gap-3">
            <PlatformIcon platform={account.platform} size="md" />

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate leading-tight">
                {account.displayName}
              </p>
              <p className="text-sm text-slate-500 truncate">
                @{account.username}
              </p>
            </div>

            {/* Status dot */}
            <span
              className={cn(
                'mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white',
                STATUS_DOT[account.status]
              )}
              title={STATUS_LABEL[account.status]}
              aria-label={`Status: ${STATUS_LABEL[account.status]}`}
            />
          </div>

          {/* Meta rows */}
          <div className="space-y-2 text-xs text-slate-500">
            {/* Platform + status badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="default" className="text-[11px]">
                {getPlatformLabel(account.platform)}
              </Badge>
              <Badge
                variant={STATUS_BADGE_VARIANT[account.status]}
                className="text-[11px]"
              >
                {STATUS_LABEL[account.status]}
              </Badge>
            </div>

            {/* Connected date */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Connected</span>
              <time dateTime={account.connectedAt}>
                {formatDate(account.connectedAt)}
              </time>
            </div>

            {/* Expiry warning */}
            {account.status === 'expiring' && account.expiresAt !== undefined && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <span>Expires</span>
                <time dateTime={account.expiresAt}>
                  {formatDate(account.expiresAt)}
                </time>
              </div>
            )}

            {/* Assigned client */}
            {account.assignedClient !== undefined ? (
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-slate-400" aria-hidden="true" />
                <span className="truncate text-slate-600">
                  {account.assignedClient}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-400">
                <User className="h-3 w-3" aria-hidden="true" />
                <span>Unassigned</span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            aria-label={`Refresh ${account.displayName}`}
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
              aria-hidden="true"
            />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Disconnect ${account.displayName}`}
          >
            <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
            Disconnect
          </Button>
        </div>
      </article>

      {/* Disconnect confirmation dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Disconnect Account"
        description={`Remove @${account.username} (${getPlatformLabel(account.platform)}) from Social Pro? Scheduled posts for this account will be paused.`}
      >
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDisconnectConfirm}>
            Disconnect
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
