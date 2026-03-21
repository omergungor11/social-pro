'use client';

import * as React from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import {
  PlatformIcon,
  getPlatformLabel,
  type Platform,
} from '@/components/social/platform-icon';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Platform cards data
// ---------------------------------------------------------------------------

interface PlatformCard {
  platform: Platform;
  description: string;
}

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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Connect a Social Account"
      description="Choose a platform to link via OAuth. You will be redirected to authorize Social Pro."
      maxWidth="max-w-xl"
    >
      {/* Platform grid */}
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label="Select platform to connect"
      >
        {PLATFORM_CARDS.map(({ platform, description }) => {
          const isSelected = selected === platform;

          return (
            <button
              key={platform}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelected(platform)}
              className={cn(
                'group flex flex-col items-center gap-3 rounded-xl border-2 p-4 text-center',
                'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isSelected
                  ? 'border-blue-600 bg-blue-50 shadow-md shadow-blue-100'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              )}
            >
              <PlatformIcon
                platform={platform}
                size="lg"
                className={cn(
                  'transition-transform duration-150',
                  !isSelected && 'group-hover:scale-105'
                )}
              />

              <div className="space-y-0.5">
                <p
                  className={cn(
                    'text-sm font-semibold leading-tight',
                    isSelected ? 'text-blue-700' : 'text-slate-800'
                  )}
                >
                  {getPlatformLabel(platform)}
                </p>
                <p className="text-[11px] leading-snug text-slate-500 line-clamp-2">
                  {description}
                </p>
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <span className="absolute" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
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
          disabled={selected === null || connecting}
          className="gap-1.5"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {connecting
            ? 'Connecting…'
            : selected !== null
            ? `Connect ${getPlatformLabel(selected)}`
            : 'Select a Platform'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
