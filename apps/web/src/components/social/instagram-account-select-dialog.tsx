'use client';

import * as React from 'react';
import { Check, Instagram, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';

export interface InstagramAccount {
  igId: string;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
}

interface InstagramAccountSelectDialogProps {
  open: boolean;
  accounts: InstagramAccount[];
  onClose: () => void;
  onConnected: () => void;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function InstagramAccountSelectDialog({
  open,
  accounts,
  onClose,
  onConnected,
}: InstagramAccountSelectDialogProps): React.JSX.Element {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setConnecting(false);
      setError(null);
    }
  }, [open]);

  function toggleAccount(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll(): void {
    if (selectedIds.size === accounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(accounts.map((a) => a.igId)));
    }
  }

  async function handleConnect(): Promise<void> {
    if (selectedIds.size === 0) return;

    setConnecting(true);
    setError(null);

    try {
      const selected = accounts.filter((a) => selectedIds.has(a.igId));
      for (const account of selected) {
        await apiClient.post('/social-accounts/oauth/instagram/select-account', {
          igId: account.igId,
          username: account.username,
          name: account.name,
          profilePictureUrl: account.profilePictureUrl,
          followersCount: account.followersCount,
        });
      }
      onConnected();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect accounts';
      setError(message);
      setConnecting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Select Instagram Accounts"
      description="Choose which Instagram accounts you want to connect. You can select multiple."
      maxWidth="max-w-lg"
    >
      {accounts.length > 1 && (
        <button
          type="button"
          onClick={selectAll}
          className="mb-2 text-sm font-medium text-pink-600 hover:text-pink-700"
        >
          {selectedIds.size === accounts.length ? 'Deselect All' : 'Select All'}
        </button>
      )}

      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {accounts.map((account) => {
          const isSelected = selectedIds.has(account.igId);
          return (
            <button
              key={account.igId}
              type="button"
              onClick={() => toggleAccount(account.igId)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all duration-150',
                isSelected
                  ? 'border-pink-500 bg-pink-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {account.profilePictureUrl ? (
                <img
                  src={account.profilePictureUrl}
                  alt={account.username ?? account.name ?? ''}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                  <Instagram className="h-5 w-5 text-white" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className={cn(
                  'text-sm font-semibold truncate',
                  isSelected ? 'text-pink-700' : 'text-slate-800',
                )}>
                  {account.username ? `@${account.username}` : account.name ?? 'Unknown'}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  {account.name && account.username && (
                    <span className="text-xs text-slate-500 truncate">{account.name}</span>
                  )}
                  {(account.followersCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3 w-3" />
                      {formatFollowers(account.followersCount ?? 0)}
                    </span>
                  )}
                </div>
              </div>

              <div className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                isSelected
                  ? 'border-pink-500 bg-pink-500'
                  : 'border-slate-300 bg-white',
              )}>
                {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <DialogFooter className="mt-5">
        <Button variant="outline" onClick={onClose} disabled={connecting}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleConnect()}
          disabled={selectedIds.size === 0 || connecting}
          className="gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Instagram className="h-4 w-4" />
              {selectedIds.size > 0
                ? `Connect ${selectedIds.size} Account${selectedIds.size > 1 ? 's' : ''}`
                : 'Select Accounts'}
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
