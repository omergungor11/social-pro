"use client";

import * as React from "react";
import { Building2, User, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgencyFormState {
  name: string;
  slug: string;
  timezone: string;
}

interface ProfileFormState {
  displayName: string;
  email: string;
  avatarUrl: string;
}

type SaveStatus = "idle" | "saving" | "success" | "error";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "(UTC-5) Eastern Time — New York" },
  { value: "America/Chicago", label: "(UTC-6) Central Time — Chicago" },
  { value: "America/Denver", label: "(UTC-7) Mountain Time — Denver" },
  { value: "America/Los_Angeles", label: "(UTC-8) Pacific Time — Los Angeles" },
  { value: "America/Anchorage", label: "(UTC-9) Alaska Time — Anchorage" },
  { value: "Pacific/Honolulu", label: "(UTC-10) Hawaii Time — Honolulu" },
  { value: "America/Sao_Paulo", label: "(UTC-3) Brasilia Time — Sao Paulo" },
  { value: "Europe/London", label: "(UTC+0) Greenwich Mean Time — London" },
  { value: "Europe/Paris", label: "(UTC+1) Central European Time — Paris" },
  { value: "Europe/Berlin", label: "(UTC+1) Central European Time — Berlin" },
  { value: "Europe/Helsinki", label: "(UTC+2) Eastern European Time — Helsinki" },
  { value: "Europe/Istanbul", label: "(UTC+3) Turkey Time — Istanbul" },
  { value: "Asia/Dubai", label: "(UTC+4) Gulf Standard Time — Dubai" },
  { value: "Asia/Karachi", label: "(UTC+5) Pakistan Standard Time — Karachi" },
  { value: "Asia/Kolkata", label: "(UTC+5:30) India Standard Time — Kolkata" },
  { value: "Asia/Dhaka", label: "(UTC+6) Bangladesh Standard Time — Dhaka" },
  { value: "Asia/Bangkok", label: "(UTC+7) Indochina Time — Bangkok" },
  { value: "Asia/Singapore", label: "(UTC+8) Singapore Time — Singapore" },
  { value: "Asia/Tokyo", label: "(UTC+9) Japan Standard Time — Tokyo" },
  { value: "Australia/Sydney", label: "(UTC+11) Australian Eastern Time — Sydney" },
  { value: "Pacific/Auckland", label: "(UTC+13) New Zealand Time — Auckland" },
];

// Mock initial data — will be replaced with API calls
const INITIAL_AGENCY: AgencyFormState = {
  name: "Acme Media Group",
  slug: "acme-media-group",
  timezone: "America/New_York",
};

const INITIAL_PROFILE: ProfileFormState = {
  displayName: "Jane Doe",
  email: "jane@acmemedia.com",
  avatarUrl: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

interface ToastProps {
  status: SaveStatus;
  message: string;
}

function Toast({ status, message }: ToastProps): React.JSX.Element | null {
  if (status === "idle" || status === "saving") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-sm",
        status === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      )}
    >
      {status === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
      )}
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agency Settings Card
// ---------------------------------------------------------------------------

function AgencySettingsCard(): React.JSX.Element {
  const [form, setForm] = React.useState<AgencyFormState>(INITIAL_AGENCY);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [errors, setErrors] = React.useState<Partial<AgencyFormState>>({});

  function validate(): boolean {
    const newErrors: Partial<AgencyFormState> = {};
    if (!form.name.trim()) {
      newErrors.name = "Agency name is required.";
    }
    if (!form.slug.trim()) {
      newErrors.slug = "Slug is required.";
    } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
      newErrors.slug = "Slug can only contain lowercase letters, numbers, and hyphens.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAgencyNameChange(
    e: React.ChangeEvent<HTMLInputElement>
  ): void {
    const name = e.target.value;
    setForm((prev) => ({
      ...prev,
      name,
      // Auto-derive slug while it hasn't been manually edited
      slug:
        prev.slug === slugify(prev.name)
          ? slugify(name)
          : prev.slug,
    }));
    if (errors.name !== undefined) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    if (!validate()) return;

    setSaveStatus("saving");

    // Simulate API call — replace with apiClient.patch('/agency', form)
    await new Promise<void>((resolve) => setTimeout(resolve, 900));

    setSaveStatus("success");
    setTimeout(() => setSaveStatus("idle"), 4000);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Building2 className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Agency Settings</CardTitle>
            <CardDescription className="mt-1">
              Update your agency name, URL slug, and default timezone.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-5">
          <Input
            label="Agency name"
            type="text"
            placeholder="Acme Media Group"
            value={form.name}
            onChange={handleAgencyNameChange}
            error={errors.name}
            autoComplete="organization"
          />

          <Input
            label="Slug"
            type="text"
            placeholder="acme-media-group"
            value={form.slug}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }));
              if (errors.slug !== undefined) {
                setErrors((prev) => ({ ...prev, slug: undefined }));
              }
            }}
            error={errors.slug}
            hint={`Your workspace URL: socialpro.app/${form.slug || "your-slug"}`}
          />

          <Select
            label="Default timezone"
            options={TIMEZONE_OPTIONS}
            value={form.timezone}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, timezone: e.target.value }))
            }
            hint="Used for scheduling posts and displaying analytics."
          />

          {(saveStatus === "success" || saveStatus === "error") && (
            <Toast
              status={saveStatus}
              message={
                saveStatus === "success"
                  ? "Agency settings saved successfully."
                  : "Something went wrong. Please try again."
              }
            />
          )}
        </CardContent>

        <CardFooter className="border-t border-slate-100 pt-5">
          <Button
            type="submit"
            disabled={saveStatus === "saving"}
            className="ml-auto"
          >
            {saveStatus === "saving" ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// User Profile Card
// ---------------------------------------------------------------------------

function UserProfileCard(): React.JSX.Element {
  const [form, setForm] = React.useState<ProfileFormState>(INITIAL_PROFILE);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ProfileFormState, string>>
  >({});

  function validate(): boolean {
    const newErrors: Partial<Record<keyof ProfileFormState, string>> = {};
    if (!form.displayName.trim()) {
      newErrors.displayName = "Display name is required.";
    }
    if (
      form.avatarUrl.trim() !== "" &&
      !/^https?:\/\/.+/.test(form.avatarUrl.trim())
    ) {
      newErrors.avatarUrl = "Avatar URL must be a valid http/https URL.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    if (!validate()) return;

    setSaveStatus("saving");

    // Simulate API call — replace with apiClient.patch('/auth/me', form)
    await new Promise<void>((resolve) => setTimeout(resolve, 900));

    setSaveStatus("success");
    setTimeout(() => setSaveStatus("idle"), 4000);
  }

  const showAvatar = form.avatarUrl.trim() !== "" && errors.avatarUrl === undefined;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
            <User className="h-5 w-5 text-violet-600" aria-hidden="true" />
          </div>
          <div>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription className="mt-1">
              Update your personal display name and avatar.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-5">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white text-lg font-bold shadow-md overflow-hidden",
                !showAvatar &&
                  "bg-gradient-to-br from-blue-500 to-violet-600"
              )}
            >
              {showAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.avatarUrl}
                  alt={`${form.displayName} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(form.displayName || "?")
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {form.displayName || "Your Name"}
              </p>
              <p className="text-xs text-slate-500 truncate">{form.email}</p>
            </div>
          </div>

          <Input
            label="Display name"
            type="text"
            placeholder="Jane Doe"
            value={form.displayName}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, displayName: e.target.value }));
              if (errors.displayName !== undefined) {
                setErrors((prev) => ({ ...prev, displayName: undefined }));
              }
            }}
            error={errors.displayName}
            autoComplete="name"
          />

          <Input
            label="Email address"
            type="email"
            value={form.email}
            disabled
            hint="Email cannot be changed here. Contact support to update your email."
          />

          <Input
            label="Avatar URL"
            type="url"
            placeholder="https://example.com/avatar.jpg"
            value={form.avatarUrl}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, avatarUrl: e.target.value }));
              if (errors.avatarUrl !== undefined) {
                setErrors((prev) => ({ ...prev, avatarUrl: undefined }));
              }
            }}
            error={errors.avatarUrl}
            hint="Paste a public image URL. Leave blank to use your initials."
          />

          {(saveStatus === "success" || saveStatus === "error") && (
            <Toast
              status={saveStatus}
              message={
                saveStatus === "success"
                  ? "Profile updated successfully."
                  : "Something went wrong. Please try again."
              }
            />
          )}
        </CardContent>

        <CardFooter className="border-t border-slate-100 pt-5">
          <Button
            type="submit"
            disabled={saveStatus === "saving"}
            className="ml-auto"
          >
            {saveStatus === "saving" ? "Saving..." : "Update Profile"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your agency configuration and personal profile.
        </p>
      </div>

      {/* Settings cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AgencySettingsCard />
        <UserProfileCard />
      </div>
    </div>
  );
}
