'use client';

import * as React from 'react';
import { ExternalLink, AlertCircle, Loader2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import {
  PlatformIcon,
  getPlatformLabel,
  type Platform,
} from '@/components/social/platform-icon';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlatformCard {
  platform: Platform;
  description: string;
}

interface PlatformAvailability {
  platform: string;
  isAvailable: boolean;
  isEnabled: boolean;
  source: 'database' | 'env' | 'none';
}

// ---------------------------------------------------------------------------
// Platform cards data
// ---------------------------------------------------------------------------

const PLATFORM_CARDS: PlatformCard[] = [
  {
    platform: 'twitter',
    description: 'Schedule tweets, threads, and monitor mentions.',
  },
  {
    platform: 'facebook',
    description: 'Manage pages, posts, and ad-connected accounts.',
  },
  {
    platform: 'instagram',
    description: 'Publish photos, reels, and stories via the API.',
  },
  {
    platform: 'linkedin',
    description: 'Share thought leadership and company updates.',
  },
  {
    platform: 'tiktok',
    description: 'Schedule short-form video content at scale.',
  },
  {
    platform: 'youtube',
    description: 'Upload videos, manage playlists, and track metrics.',
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConnectDialogProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConnectDialog({
  open,
  onClose,
}: ConnectDialogProps): React.JSX.Element {
  const [selected, setSelected] = React.useState<Platform | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Availability state
  const [availability, setAvailability] = React.useState<
    Map<string, PlatformAvailability>
  >(new Map());
  const [loading, setLoading] = React.useState(false);
  const [availError, setAvailError] = React.useState<string | null>(null);

  // Fetch availability whenever the dialog opens
  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setAvailError(null);
    setAvailability(new Map());

    async function fetchAvailability(): Promise<void> {
      try {
        const data = await apiClient.get<PlatformAvailability[]>(
          '/social-accounts/platforms/available'
        );
        if (cancelled) return;
        setAvailability(new Map(data.map((a) => [a.platform, a])));
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load platform availability.';
        setAvailError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAvailability();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleClose(): void {
    setSelected(null);
    setConnecting(false);
    setError(null);
    onClose();
  }

  async function handleConnect(): Promise<void> {
    if (selected === null) return;

    setConnecting(true);
    setError(null);

    try {
      // Call backend to get OAuth authorization URL
      const result = await apiClient.get<{ authUrl: string; state: string }>(
        `/social-accounts/oauth/${selected}/url`
      );

      // Store state in sessionStorage for CSRF verification
      sessionStorage.setItem('oauth_state', result.state);
      sessionStorage.setItem('oauth_platform', selected);

      // Redirect to platform's OAuth page
      window.location.href = result.authUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initiate OAuth';
      setError(message);
      setConnecting(false);
    }
  }

  // Derived: which platforms are available
  const noPlatformsConfigured =
    !loading &&
    availError === null &&
    availability.size > 0 &&
    PLATFORM_CARDS.every(({ platform }) => {
      const avail = availability.get(platform);
      return avail === undefined || !avail.isAvailable || !avail.isEnabled;
    });

  function isPlatformAvailable(platform: Platform): boolean {
    // While loading or on error we allow interaction (optimistic)
    if (loading || availError !== null || availability.size === 0) return true;
    const avail = availability.get(platform);
    return avail !== undefined && avail.isAvailable && avail.isEnabled;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Connect a Social Account"
      description="Choose a platform to link via OAuth. You will be redirected to authorize Social Pro."
      maxWidth="max-w-xl"
    >
      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Checking platform availability...
        </div>
      )}

      {/* Availability fetch error — non-blocking */}
      {availError !== null && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {availError}
        </div>
      )}

      {/* No platforms configured message */}
      {noPlatformsConfigured && (
        <div className="mb-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <Settings className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <span>
            No platforms configured. Ask your admin to set up OAuth apps in{' '}
            <strong>Settings &rarr; OAuth App Configuration</strong>.
          </span>
        </div>
      )}

      {/* Platform grid */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Select platform to connect"
        aria-busy={loading}
      >
        {PLATFORM_CARDS.map(({ platform, description }) => {
          const isSelected = selected === platform;
          const available = isPlatformAvailable(platform);

          return (
            <button
              key={platform}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={!available}
              onClick={() => {
                if (available) setSelected(platform);
              }}
              disabled={!available}
              className={cn(
                'group relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center',
                'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                available
                  ? isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
              )}
            >
              <PlatformIcon
                platform={platform}
                size="lg"
                className={cn(
                  'transition-transform duration-150',
                  available && !isSelected && 'group-hover:scale-105',
                  !available && 'grayscale'
                )}
              />

              <div className="space-y-0.5">
                <p
                  className={cn(
                    'text-sm font-semibold leading-tight',
                    isSelected ? 'text-blue-700' : 'text-slate-800',
                    !available && 'text-slate-400'
                  )}
                >
                  {getPlatformLabel(platform)}
                </p>
                <p className="text-[11px] leading-snug text-slate-500 line-clamp-2">
                  {description}
                </p>
              </div>

              {/* Not configured badge */}
              {!available && (
                <Badge variant="gray" className="text-[10px] px-1.5 py-0">
                  Not configured
                </Badge>
              )}

              {/* Selected checkmark */}
              {isSelected && (
                <span className="absolute" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {/* Connect error message */}
      {error !== null && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <DialogFooter className="mt-5">
        <Button variant="outline" onClick={handleClose} disabled={connecting}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleConnect()}
          disabled={selected === null || connecting || (selected !== null && !isPlatformAvailable(selected))}
          className="gap-1.5"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {connecting
            ? 'Connecting...'
            : selected !== null
            ? `Connect ${getPlatformLabel(selected)}`
            : 'Select a Platform'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
