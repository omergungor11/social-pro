'use client';

import * as React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import {
  PlatformIcon,
  getPlatformLabel,
  type Platform,
} from '@/components/social/platform-icon';

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

  function handleClose(): void {
    setSelected(null);
    setConnecting(false);
    onClose();
  }

  async function handleConnect(): Promise<void> {
    if (selected === null) return;

    setConnecting(true);

    // In production this would redirect to the platform's OAuth URL.
    // For now we log the intent and simulate a short delay.
    console.log(`[ConnectDialog] Initiating OAuth for platform: ${selected}`);
    await new Promise<void>((resolve) => setTimeout(resolve, 800));

    setConnecting(false);
    handleClose();
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
