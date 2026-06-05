"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { NotificationType } from "@social-pro/shared-types";

// ---------------------------------------------------------------------------
// Local types (NotificationChannel not yet in shared-types)
// ---------------------------------------------------------------------------

type NotificationChannel = "IN_APP" | "EMAIL";

interface NotificationPreference {
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
}

interface PreferencesResponse {
  preferences: NotificationPreference[];
}

// ---------------------------------------------------------------------------
// Human-readable labels
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<NotificationType, { label: string; description: string }> = {
  [NotificationType.POST_PUBLISHED]: {
    label: "Post Published",
    description: "When a scheduled post is successfully published.",
  },
  [NotificationType.POST_FAILED]: {
    label: "Post Failed",
    description: "When a post fails to publish on a platform.",
  },
  [NotificationType.INVITATION]: {
    label: "Team Invitations",
    description: "When someone invites you to join a team or workspace.",
  },
  [NotificationType.PAYMENT_SUCCESS]: {
    label: "Payment Successful",
    description: "When a subscription payment is processed successfully.",
  },
  [NotificationType.PAYMENT_FAILED]: {
    label: "Payment Failed",
    description: "When a subscription payment fails.",
  },
  [NotificationType.ACCOUNT_DISCONNECT]: {
    label: "Account Disconnected",
    description: "When a social media account gets disconnected.",
  },
  [NotificationType.LIMIT_WARNING]: {
    label: "Plan Limit Warning",
    description: "When you approach a usage limit on your current plan.",
  },
  [NotificationType.REPORT_READY]: {
    label: "Report Ready",
    description: "When an analytics report has been generated.",
  },
};

const ALL_TYPES = Object.values(NotificationType);
const CHANNELS: NotificationChannel[] = ["IN_APP", "EMAIL"];

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: "In-App",
  EMAIL: "Email",
};

// ---------------------------------------------------------------------------
// Preference state helpers
// ---------------------------------------------------------------------------

type PreferenceMap = Map<`${NotificationType}:${NotificationChannel}`, boolean>;

function buildDefaultMap(): PreferenceMap {
  const map: PreferenceMap = new Map();
  for (const type of ALL_TYPES) {
    for (const channel of CHANNELS) {
      map.set(`${type}:${channel}`, true);
    }
  }
  return map;
}

function preferencesToMap(prefs: NotificationPreference[]): PreferenceMap {
  const map = buildDefaultMap();
  for (const pref of prefs) {
    map.set(`${pref.type}:${pref.channel}`, pref.enabled);
  }
  return map;
}

function mapToPreferences(map: PreferenceMap): NotificationPreference[] {
  const result: NotificationPreference[] = [];
  for (const [key, enabled] of map.entries()) {
    const [type, channel] = key.split(":") as [NotificationType, NotificationChannel];
    result.push({ type, channel, enabled });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
}

function Toggle({ enabled, onChange, label }: ToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        enabled ? "bg-blue-600" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          enabled ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function TableSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse">
      {ALL_TYPES.map((type) => (
        <div
          key={type}
          className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-0"
        >
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-40 rounded bg-slate-200" />
            <div className="h-3 w-64 rounded bg-slate-100" />
          </div>
          <div className="flex gap-8">
            <div className="h-5 w-9 rounded-full bg-slate-200" />
            <div className="h-5 w-9 rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NotificationPreferencesPage(): React.JSX.Element {
  const [prefMap, setPrefMap] = useState<PreferenceMap>(buildDefaultMap());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">(
    "idle"
  );

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const response = await apiClient.get<PreferencesResponse>(
          "/notifications/preferences"
        );
        setPrefMap(preferencesToMap(response.preferences ?? []));
      } catch {
        // Keep defaults
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  function handleToggle(
    type: NotificationType,
    channel: NotificationChannel,
    enabled: boolean
  ): void {
    setPrefMap((prev) => {
      const next = new Map(prev);
      next.set(`${type}:${channel}`, enabled);
      return next;
    });
    setSaveStatus("idle");
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      await apiClient.patch("/notifications/preferences", {
        preferences: mapToPreferences(prefMap),
      } as unknown as Record<string, unknown>);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      {/* Back link + header */}
      <div className="mb-6">
        <Link
          href="/dashboard/notifications"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Notifications
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Notification Preferences
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose which notifications you want to receive and how.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saveStatus === "saved" && (
              <p className="text-sm font-medium text-emerald-600">
                Preferences saved.
              </p>
            )}
            {saveStatus === "error" && (
              <p className="text-sm font-medium text-red-600">
                Failed to save. Try again.
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving || isLoading}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                "bg-blue-600 text-white shadow-sm transition-colors",
                "hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                (isSaving || isLoading) && "opacity-60 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Preferences
            </button>
          </div>
        </div>
      </div>

      {/* Preferences table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center px-6 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Notification Type
            </span>
          </div>
          <div className="flex gap-8 shrink-0">
            {CHANNELS.map((channel) => (
              <span
                key={channel}
                className="w-9 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {CHANNEL_LABELS[channel]}
              </span>
            ))}
          </div>
        </div>

        {/* Rows */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="divide-y divide-slate-100">
            {ALL_TYPES.map((type) => {
              const meta = TYPE_LABELS[type];
              return (
                <div
                  key={type}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {meta.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {meta.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-8 shrink-0">
                    {CHANNELS.map((channel) => {
                      const enabled =
                        prefMap.get(`${type}:${channel}`) ?? true;
                      return (
                        <div key={channel} className="flex w-9 justify-center">
                          <Toggle
                            enabled={enabled}
                            onChange={(val) => handleToggle(type, channel, val)}
                            label={`${meta.label} — ${CHANNEL_LABELS[channel]}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info note */}
      <p className="mt-4 text-xs text-slate-400 text-center">
        Changes take effect immediately after saving. Email delivery depends on
        your verified email address.
      </p>
    </div>
  );
}
