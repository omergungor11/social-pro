'use client';

import * as React from 'react';
import {
  Info,
  ExternalLink,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  PlatformIcon,
  getPlatformLabel,
  type Platform,
} from '@/components/social/platform-icon';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OAuthConfig {
  platform: Platform;
  isConfigured: boolean;
  isEnabled: boolean;
  source: 'database' | 'env' | 'none';
  clientIdHint: string | null;
}

interface PlatformAvailability {
  platform: string;
  isAvailable: boolean;
  isEnabled: boolean;
  source: 'database' | 'env' | 'none';
}

interface ConfigFormState {
  clientId: string;
  clientSecret: string;
}

type FormStatus = 'idle' | 'saving' | 'success' | 'error';
type ToggleStatus = 'idle' | 'toggling';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS: Platform[] = [
  'twitter',
  'facebook',
  'instagram',
  'linkedin',
  'tiktok',
  'youtube',
];

const DEVELOPER_PORTALS: Record<Platform, { label: string; url: string }> = {
  facebook: { label: 'Meta Developer Portal', url: 'https://developers.facebook.com' },
  instagram: { label: 'Meta Developer Portal', url: 'https://developers.facebook.com' },
  twitter: { label: 'Twitter Developer Portal', url: 'https://developer.twitter.com' },
  linkedin: { label: 'LinkedIn Developers', url: 'https://linkedin.com/developers' },
  tiktok: { label: 'TikTok Developer', url: 'https://developers.tiktok.com' },
  youtube: { label: 'Google Cloud Console', url: 'https://console.cloud.google.com' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildEmptyConfig(): OAuthConfig {
  return {
    platform: 'twitter',
    isConfigured: false,
    isEnabled: false,
    source: 'none',
    clientIdHint: null,
  };
}

function getStatusVariant(
  config: OAuthConfig
): 'green' | 'gray' | 'red' {
  if (!config.isConfigured) return 'gray';
  if (!config.isEnabled) return 'red';
  return 'green';
}

function getStatusLabel(config: OAuthConfig): string {
  if (!config.isConfigured) return 'Not Configured';
  if (!config.isEnabled) return 'Disabled';
  return 'Configured';
}

function getSourceLabel(source: OAuthConfig['source']): string {
  if (source === 'database') return 'Database';
  if (source === 'env') return 'Environment';
  return '—';
}

// ---------------------------------------------------------------------------
// Info Banner
// ---------------------------------------------------------------------------

function InfoBanner(): React.JSX.Element {
  return (
    <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
      <div className="space-y-2 text-sm text-blue-900">
        <p>
          Platform credentials are encrypted and stored securely. They are shared across
          all agencies. You need to register OAuth apps on each platform&apos;s developer
          portal and enter the credentials here.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {(Object.entries(DEVELOPER_PORTALS) as [Platform, { label: string; url: string }][])
            .filter(([platform]) => platform !== 'instagram') // Meta covers both fb + ig
            .map(([platform, portal]) => (
              <a
                key={platform}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-700 underline-offset-2 hover:underline"
              >
                {portal.label}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configure Form (inline, collapsible)
// ---------------------------------------------------------------------------

interface ConfigFormProps {
  platform: Platform;
  isExisting: boolean;
  onSaved: (updatedConfig: OAuthConfig) => void;
  onCancel: () => void;
  onDeleted: () => void;
}

function ConfigForm({
  platform,
  isExisting,
  onSaved,
  onCancel,
  onDeleted,
}: ConfigFormProps): React.JSX.Element {
  const [form, setForm] = React.useState<ConfigFormState>({
    clientId: '',
    clientSecret: '',
  });
  const [showSecret, setShowSecret] = React.useState(false);
  const [status, setStatus] = React.useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    if (!form.clientId.trim()) {
      setErrorMsg('Client ID is required.');
      return;
    }
    if (!form.clientSecret.trim()) {
      setErrorMsg('Client Secret is required.');
      return;
    }

    setStatus('saving');
    setErrorMsg(null);

    try {
      const updated = await apiClient.post<OAuthConfig>(
        `/admin/oauth-configs/${platform}`,
        { clientId: form.clientId.trim(), clientSecret: form.clientSecret.trim() }
      );
      setStatus('success');
      onSaved(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save configuration.';
      setErrorMsg(message);
      setStatus('error');
    }
  }

  async function handleDelete(): Promise<void> {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      await apiClient.delete(`/admin/oauth-configs/${platform}`);
      onDeleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete configuration.';
      setErrorMsg(message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSave(e)}
      className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
      noValidate
    >
      <Input
        label="Client ID"
        type="text"
        placeholder="Enter OAuth client ID"
        value={form.clientId}
        onChange={(e) => {
          setForm((prev) => ({ ...prev, clientId: e.target.value }));
          setErrorMsg(null);
        }}
        autoComplete="off"
      />

      {/* Client Secret with show/hide toggle */}
      <div className="space-y-1.5">
        <label
          htmlFor={`${platform}-client-secret`}
          className="text-sm font-medium leading-none"
        >
          Client Secret
        </label>
        <div className="relative">
          <input
            id={`${platform}-client-secret`}
            type={showSecret ? 'text' : 'password'}
            placeholder="Enter OAuth client secret"
            value={form.clientSecret}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, clientSecret: e.target.value }));
              setErrorMsg(null);
            }}
            autoComplete="new-password"
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10',
              'text-sm ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          />
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label={showSecret ? 'Hide client secret' : 'Show client secret'}
          >
            {showSecret ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Error message */}
      {errorMsg !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {errorMsg}
        </div>
      )}

      {/* Success message */}
      {status === 'success' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Configuration saved successfully.
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2">
        {/* Delete (only for existing configs) */}
        <div>
          {isExisting && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Are you sure?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : null}
                  Yes, Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleDelete()}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
            )
          )}
        </div>

        {/* Save / Cancel */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={status === 'saving'}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={status === 'saving'}
          >
            {status === 'saving' ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Platform Card
// ---------------------------------------------------------------------------

interface PlatformCardProps {
  config: OAuthConfig;
  onUpdate: (updated: OAuthConfig) => void;
}

function PlatformCard({ config, onUpdate }: PlatformCardProps): React.JSX.Element {
  const [expanded, setExpanded] = React.useState(false);
  const [toggleStatus, setToggleStatus] = React.useState<ToggleStatus>('idle');

  const statusVariant = getStatusVariant(config);
  const statusLabel = getStatusLabel(config);

  function handleSaved(updated: OAuthConfig): void {
    onUpdate(updated);
    setExpanded(false);
  }

  function handleDeleted(): void {
    onUpdate({
      ...config,
      isConfigured: false,
      isEnabled: false,
      source: 'none',
      clientIdHint: null,
    });
    setExpanded(false);
  }

  async function handleToggle(): Promise<void> {
    if (!config.isConfigured || toggleStatus === 'toggling') return;

    setToggleStatus('toggling');
    try {
      const updated = await apiClient.post<OAuthConfig>(
        `/admin/oauth-configs/${config.platform}/toggle`,
        { enabled: !config.isEnabled }
      );
      onUpdate(updated);
    } catch {
      // silently revert — the toggle state is driven by config prop
    } finally {
      setToggleStatus('idle');
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Platform identity */}
          <div className="flex items-center gap-3">
            <PlatformIcon platform={config.platform} size="md" />
            <div className="min-w-0">
              <CardTitle className="text-base">
                {getPlatformLabel(config.platform)}
              </CardTitle>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <Badge variant={statusVariant}>{statusLabel}</Badge>
                <span className="text-xs text-muted-foreground">
                  {getSourceLabel(config.source)}
                </span>
              </div>
            </div>
          </div>

          {/* Enable/disable toggle — only shown if configured */}
          {config.isConfigured && (
            <button
              type="button"
              role="switch"
              aria-checked={config.isEnabled}
              aria-label={`${config.isEnabled ? 'Disable' : 'Enable'} ${getPlatformLabel(config.platform)}`}
              onClick={() => void handleToggle()}
              disabled={toggleStatus === 'toggling'}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 ease-in-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                config.isEnabled ? 'bg-emerald-500' : 'bg-slate-200'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0',
                  'transition-transform duration-200 ease-in-out',
                  config.isEnabled ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          )}
        </div>

        {/* Client ID hint */}
        {config.clientIdHint !== null && (
          <p className="mt-1 text-xs text-muted-foreground font-mono">
            Client ID: {config.clientIdHint}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Configure / Edit button */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="gap-1.5"
          >
            {config.isConfigured ? 'Edit' : 'Configure'}
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>

          <a
            href={DEVELOPER_PORTALS[config.platform].url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Dev Portal
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>

        {/* Inline form */}
        {expanded && (
          <ConfigForm
            platform={config.platform}
            isExisting={config.isConfigured}
            onSaved={handleSaved}
            onCancel={() => setExpanded(false)}
            onDeleted={handleDeleted}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OAuthAppsPage(): React.JSX.Element {
  const [configs, setConfigs] = React.useState<Record<Platform, OAuthConfig>>(
    () =>
      Object.fromEntries(
        PLATFORMS.map((p) => [p, { ...buildEmptyConfig(), platform: p }])
      ) as Record<Platform, OAuthConfig>
  );
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Fetch configs on mount
  React.useEffect(() => {
    let cancelled = false;

    async function loadConfigs(): Promise<void> {
      try {
        const [rawConfigs, availabilities] = await Promise.all([
          apiClient.get<OAuthConfig[]>('/admin/oauth-configs'),
          apiClient.get<PlatformAvailability[]>('/social-accounts/platforms/available'),
        ]);

        if (cancelled) return;

        // Build a map from availability data as a base
        const availMap = new Map(
          availabilities.map((a) => [a.platform, a])
        );

        // Merge configs with availability info
        const merged: Record<Platform, OAuthConfig> = Object.fromEntries(
          PLATFORMS.map((p) => {
            const conf = rawConfigs.find((c) => c.platform === p);
            const avail = availMap.get(p);

            if (conf !== undefined) {
              return [p, conf];
            }

            // Build from availability data if no explicit config entry
            return [
              p,
              {
                platform: p,
                isConfigured: avail?.isAvailable ?? false,
                isEnabled: avail?.isEnabled ?? false,
                source: avail?.source ?? 'none',
                clientIdHint: null,
              } satisfies OAuthConfig,
            ];
          })
        ) as Record<Platform, OAuthConfig>;

        setConfigs(merged);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load OAuth configs.';
        setLoadError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadConfigs();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleUpdate(updated: OAuthConfig): void {
    setConfigs((prev) => ({ ...prev, [updated.platform]: updated }));
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          OAuth App Configuration
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure platform API credentials so your team can connect social accounts.
        </p>
      </div>

      {/* Info banner */}
      <InfoBanner />

      {/* Error state */}
      {loadError !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {loadError}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && loadError === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((p) => (
            <div
              key={p}
              className="h-40 animate-pulse rounded-xl border bg-slate-100"
              aria-hidden="true"
            />
          ))}
        </div>
      )}

      {/* Platform cards grid */}
      {!loading && loadError === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((platform) => (
            <PlatformCard
              key={platform}
              config={configs[platform]}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
