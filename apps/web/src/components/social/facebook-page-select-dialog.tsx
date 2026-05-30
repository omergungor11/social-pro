'use client';

import * as React from 'react';
import { Check, Facebook, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';

export interface FacebookPage {
  id: string;
  name: string;
  pictureUrl?: string;
  followersCount?: number;
  category?: string;
}

interface FacebookPageSelectDialogProps {
  open: boolean;
  pages: FacebookPage[];
  onClose: () => void;
  onConnected: () => void;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function FacebookPageSelectDialog({
  open,
  pages,
  onClose,
  onConnected,
}: FacebookPageSelectDialogProps): React.JSX.Element {
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

  function togglePage(id: string): void {
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
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map((p) => p.id)));
    }
  }

  async function handleConnect(): Promise<void> {
    if (selectedIds.size === 0) return;

    setConnecting(true);
    setError(null);

    try {
      const selected = pages.filter((p) => selectedIds.has(p.id));
      for (const page of selected) {
        await apiClient.post('/social-accounts/oauth/facebook/select-page', {
          pageId: page.id,
          pageName: page.name,
          pictureUrl: page.pictureUrl,
          followersCount: page.followersCount,
          category: page.category,
        });
      }
      onConnected();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect pages';
      setError(message);
      setConnecting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Select Facebook Pages"
      description="Choose which Facebook Pages you want to connect. You can select multiple."
      maxWidth="max-w-lg"
    >
      {pages.length > 1 && (
        <button
          type="button"
          onClick={selectAll}
          className="mb-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {selectedIds.size === pages.length ? 'Deselect All' : 'Select All'}
        </button>
      )}

      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {pages.map((page) => {
          const isSelected = selectedIds.has(page.id);
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => togglePage(page.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all duration-150',
                isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {page.pictureUrl ? (
                <img
                  src={page.pictureUrl}
                  alt={page.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Facebook className="h-5 w-5 text-blue-600" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className={cn(
                  'text-sm font-semibold truncate',
                  isSelected ? 'text-blue-700' : 'text-slate-800',
                )}>
                  {page.name}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  {page.category && (
                    <span className="text-xs text-slate-500 truncate">{page.category}</span>
                  )}
                  {(page.followersCount ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3 w-3" />
                      {formatFollowers(page.followersCount ?? 0)}
                    </span>
                  )}
                </div>
              </div>

              <div className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                isSelected
                  ? 'border-blue-600 bg-blue-600'
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
          className="gap-1.5"
        >
          {connecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Facebook className="h-4 w-4" />
              {selectedIds.size > 0
                ? `Connect ${selectedIds.size} Page${selectedIds.size > 1 ? 's' : ''}`
                : 'Select Pages'}
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
