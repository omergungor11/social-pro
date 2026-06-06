"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Check,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Video,
  FileText,
  Users,
  Mail,
  Upload,
  Sparkles,
  ArrowRight,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

interface AgencySetupState {
  agencyName: string;
  timezone: string;
}

interface FirstPostState {
  content: string;
  platform: string;
}

interface InviteState {
  email: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: WizardStep[] = [
  {
    id: 1,
    title: "Agency Setup",
    description: "Name your agency and configure defaults",
    icon: Building2,
  },
  {
    id: 2,
    title: "Connect Account",
    description: "Link your first social media profile",
    icon: Twitter,
  },
  {
    id: 3,
    title: "Create First Post",
    description: "Schedule your first piece of content",
    icon: FileText,
  },
  {
    id: 4,
    title: "Invite Team",
    description: "Bring your colleagues on board",
    icon: Users,
  },
];

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "(UTC-5) Eastern Time — New York" },
  { value: "America/Chicago", label: "(UTC-6) Central Time — Chicago" },
  { value: "America/Denver", label: "(UTC-7) Mountain Time — Denver" },
  { value: "America/Los_Angeles", label: "(UTC-8) Pacific Time — Los Angeles" },
  { value: "Europe/London", label: "(UTC+0) GMT — London" },
  { value: "Europe/Paris", label: "(UTC+1) CET — Paris" },
  { value: "Europe/Istanbul", label: "(UTC+3) Turkey Time — Istanbul" },
  { value: "Asia/Dubai", label: "(UTC+4) Gulf Standard Time — Dubai" },
  { value: "Asia/Kolkata", label: "(UTC+5:30) India Standard Time — Kolkata" },
  { value: "Asia/Singapore", label: "(UTC+8) Singapore Time — Singapore" },
  { value: "Asia/Tokyo", label: "(UTC+9) Japan Standard Time — Tokyo" },
  { value: "Australia/Sydney", label: "(UTC+11) Sydney Time — Sydney" },
];

const PLATFORM_OPTIONS: { value: string; label: string }[] = [
  { value: "twitter", label: "X (Twitter)" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
];

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "editor", label: "Editor — Can create and edit posts" },
  { value: "viewer", label: "Viewer — Read-only access" },
  { value: "admin", label: "Admin — Full access" },
];

const SOCIAL_PLATFORMS = [
  {
    id: "twitter",
    label: "X (Twitter)",
    icon: Twitter,
    color: "text-slate-900",
    bg: "bg-slate-100 hover:bg-slate-200",
    border: "border-slate-200",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-600",
    bg: "bg-blue-50 hover:bg-blue-100",
    border: "border-blue-200",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "text-rose-500",
    bg: "bg-rose-50 hover:bg-rose-100",
    border: "border-rose-200",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-700",
    bg: "bg-blue-50 hover:bg-blue-100",
    border: "border-blue-200",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: Video,
    color: "text-slate-900",
    bg: "bg-slate-100 hover:bg-slate-200",
    border: "border-slate-200",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "text-red-600",
    bg: "bg-red-50 hover:bg-red-100",
    border: "border-red-200",
  },
];

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

interface StepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
}

function StepIndicator({
  steps,
  currentStep,
}: StepIndicatorProps): React.JSX.Element {
  return (
    <div className="relative mb-8">
      {/* Progress bar track */}
      <div
        className="absolute left-0 top-5 h-0.5 bg-slate-200"
        style={{ right: "0" }}
        aria-hidden="true"
      />
      {/* Progress bar fill */}
      <div
        className="absolute left-0 top-5 h-0.5 bg-blue-500 transition-all duration-500"
        style={{
          width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
        }}
        aria-hidden="true"
      />

      <ol className="relative flex justify-between" aria-label="Onboarding progress">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;

          return (
            <li key={step.id} className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                  isCompleted &&
                    "border-blue-500 bg-blue-500 text-white",
                  isCurrent &&
                    "border-blue-500 bg-white text-blue-600 shadow-md shadow-blue-200",
                  !isCompleted &&
                    !isCurrent &&
                    "border-slate-200 bg-white text-slate-400"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden="true" />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  isCurrent ? "text-blue-600" : "text-slate-400"
                )}
              >
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Agency Setup
// ---------------------------------------------------------------------------

interface AgencySetupStepProps {
  state: AgencySetupState;
  onChange: (state: AgencySetupState) => void;
}

function AgencySetupStep({
  state,
  onChange,
}: AgencySetupStepProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Set up your agency
        </h2>
        <p className="text-sm text-slate-500">
          Give your workspace a name and pick your default timezone.
        </p>
      </div>

      <div className="space-y-5">
        <Input
          label="Agency name"
          type="text"
          placeholder="e.g. Bright Agency"
          value={state.agencyName}
          onChange={(e) => onChange({ ...state, agencyName: e.target.value })}
          autoComplete="organization"
        />

        {/* Logo upload placeholder */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-none text-slate-700">
            Agency logo{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <div className="flex h-28 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-blue-300 hover:bg-blue-50/40">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Upload
                  className="h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Click to upload logo
                </p>
                <p className="text-xs text-slate-400">
                  PNG, JPG, SVG up to 2MB
                </p>
              </div>
            </div>
          </div>
        </div>

        <Select
          label="Default timezone"
          options={TIMEZONE_OPTIONS}
          value={state.timezone}
          onChange={(e) => onChange({ ...state, timezone: e.target.value })}
          hint="Used for scheduling posts and analytics."
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Connect Account
// ---------------------------------------------------------------------------

interface ConnectAccountStepProps {
  connectedPlatforms: string[];
  onToggle: (platformId: string) => void;
}

function ConnectAccountStep({
  connectedPlatforms,
  onToggle,
}: ConnectAccountStepProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Connect a social account
        </h2>
        <p className="text-sm text-slate-500">
          Link your first social media profile. You can connect more later from
          the Social Accounts page.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SOCIAL_PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isConnected = connectedPlatforms.includes(platform.id);

          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => onToggle(platform.id)}
              className={cn(
                "relative flex flex-col items-center gap-3 rounded-xl border p-4 text-left transition-all duration-150",
                isConnected
                  ? "border-blue-400 bg-blue-50 ring-2 ring-blue-300 ring-offset-1"
                  : `${platform.bg} ${platform.border}`
              )}
            >
              {isConnected && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                  <Check className="h-3 w-3 text-white" aria-hidden="true" />
                </div>
              )}
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isConnected ? "bg-blue-100" : "bg-white shadow-sm"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isConnected ? "text-blue-600" : platform.color
                  )}
                  aria-hidden="true"
                />
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  isConnected ? "text-blue-700" : "text-slate-700"
                )}
              >
                {platform.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">
        This is a demo UI — actual OAuth connection happens on the Social
        Accounts page. Clicking connects in this wizard session only.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Create First Post
// ---------------------------------------------------------------------------

interface FirstPostStepProps {
  state: FirstPostState;
  onChange: (state: FirstPostState) => void;
}

function FirstPostStep({
  state,
  onChange,
}: FirstPostStepProps): React.JSX.Element {
  const charLimit = 280;
  const remaining = charLimit - state.content.length;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Create your first post
        </h2>
        <p className="text-sm text-slate-500">
          Write a test post to see how scheduling works. You can edit or delete
          it any time.
        </p>
      </div>

      <div className="space-y-5">
        <Select
          label="Platform"
          options={PLATFORM_OPTIONS}
          value={state.platform}
          onChange={(e) => onChange({ ...state, platform: e.target.value })}
          placeholder="Select a platform"
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="post-content"
              className="text-sm font-medium leading-none text-slate-700"
            >
              Post content
            </label>
            <span
              className={cn(
                "text-xs font-medium tabular-nums transition-colors",
                remaining < 20 ? "text-red-500" : "text-slate-400"
              )}
              aria-live="polite"
            >
              {remaining} remaining
            </span>
          </div>
          <textarea
            id="post-content"
            rows={5}
            maxLength={charLimit}
            placeholder="What would you like to share? Try using AI to generate ideas..."
            value={state.content}
            onChange={(e) => onChange({ ...state, content: e.target.value })}
            className={cn(
              "flex w-full resize-none rounded-md border border-input bg-background px-3 py-2",
              "text-sm ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>

        {/* AI suggestion prompt */}
        <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
            <Sparkles
              className="h-4 w-4 text-violet-600"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-violet-800">
              Need inspiration?
            </p>
            <p className="text-xs text-violet-600">
              Use AI content generation on the Posts page for full Claude +
              OpenAI powered suggestions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Invite Team
// ---------------------------------------------------------------------------

interface InviteTeamStepProps {
  state: InviteState;
  onChange: (state: InviteState) => void;
}

function InviteTeamStep({
  state,
  onChange,
}: InviteTeamStepProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Invite your team
        </h2>
        <p className="text-sm text-slate-500">
          Bring colleagues on board. They&apos;ll receive an email with a link
          to create their account.
        </p>
      </div>

      <div className="space-y-5">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label="Email address"
              type="email"
              placeholder="colleague@agency.com"
              value={state.email}
              onChange={(e) => onChange({ ...state, email: e.target.value })}
              autoComplete="email"
            />
          </div>
          <div className="w-44 shrink-0 pt-6">
            <Select
              options={ROLE_OPTIONS}
              value={state.role}
              onChange={(e) => onChange({ ...state, role: e.target.value })}
            />
          </div>
        </div>

        {/* Role explanation */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Role permissions
          </h3>
          <div className="space-y-2">
            {[
              {
                role: "Viewer",
                description: "Read-only access to clients and posts.",
              },
              {
                role: "Editor",
                description:
                  "Can create, edit, and schedule posts for assigned clients.",
              },
              {
                role: "Admin",
                description:
                  "Full access including billing, team management, and settings.",
              },
            ].map((item) => (
              <div key={item.role} className="flex gap-2 text-sm">
                <span className="w-16 shrink-0 font-medium text-slate-700">
                  {item.role}
                </span>
                <span className="text-slate-500">{item.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Invite icon row */}
        <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Mail className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p className="text-sm text-blue-700">
            Invites are sent immediately. You can add more teammates from the
            Team page after setup.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5: Done
// ---------------------------------------------------------------------------

interface DoneStepProps {
  agencyName: string;
  onGoToDashboard: () => void;
}

function DoneStep({
  agencyName,
  onGoToDashboard,
}: DoneStepProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      {/* Success animation */}
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check
            className="h-10 w-10 text-emerald-600"
            aria-hidden="true"
          />
        </div>
        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-200 opacity-30" />
      </div>

      <h2 className="mb-2 text-2xl font-bold text-slate-900">
        You&apos;re all set!
      </h2>
      <p className="mb-2 text-base text-slate-600">
        {agencyName !== "" ? (
          <>
            <span className="font-semibold text-slate-800">{agencyName}</span>{" "}
            is ready to go.
          </>
        ) : (
          "Your agency workspace is ready to go."
        )}
      </p>
      <p className="mb-8 max-w-sm text-sm text-slate-500">
        Your dashboard is set up. Start scheduling posts, managing clients, and
        growing your agency with Social Pro.
      </p>

      {/* Checklist summary */}
      <div className="mb-8 w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
          What&apos;s next
        </p>
        <div className="space-y-2">
          {[
            { label: "Connect your first account", href: "/dashboard/social-accounts" },
            {
              label: "Connect more social accounts",
              href: "/dashboard/social-accounts",
            },
            { label: "Explore AI content tools", href: "/dashboard/ai" },
            { label: "View your analytics", href: "/dashboard/analytics" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-white hover:text-blue-600"
            >
              <ArrowRight
                className="h-3.5 w-3.5 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              {item.label}
            </a>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={onGoToDashboard}
        className="h-11 bg-blue-600 px-8 font-semibold text-white hover:bg-blue-500"
      >
        Go to Dashboard
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OnboardingPage(): React.JSX.Element {
  const router = useRouter();

  const [currentStep, setCurrentStep] = React.useState<number>(1);
  const totalSteps = STEPS.length;
  const isDone = currentStep > totalSteps;

  // Step state
  const [agencySetup, setAgencySetup] = React.useState<AgencySetupState>({
    agencyName: "",
    timezone: "America/New_York",
  });

  const [connectedPlatforms, setConnectedPlatforms] = React.useState<string[]>(
    []
  );

  const [firstPost, setFirstPost] = React.useState<FirstPostState>({
    content: "",
    platform: "",
  });

  const [invite, setInvite] = React.useState<InviteState>({
    email: "",
    role: "editor",
  });

  function handlePlatformToggle(platformId: string): void {
    setConnectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  }

  function handleNext(): void {
    setCurrentStep((prev) => prev + 1);
  }

  function handleBack(): void {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }

  function handleSkip(): void {
    setCurrentStep((prev) => prev + 1);
  }

  function handleGoToDashboard(): void {
    router.push("/dashboard");
  }

  const progressPercent = Math.round(
    ((currentStep - 1) / totalSteps) * 100
  );

  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-8">
      {/* Page header */}
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome to Social Pro
        </h1>
        <p className="text-sm text-slate-500">
          Let&apos;s get your agency workspace set up in just a few steps.
        </p>
      </div>

      {/* Wizard card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Progress header */}
        {!isDone && (
          <div className="border-b border-slate-100 px-6 pt-6 pb-0">
            {/* Step counter */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-xs font-semibold text-blue-600">
                {progressPercent}% complete
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{
                  width: `${((currentStep - 1) / totalSteps) * 100}%`,
                }}
                role="progressbar"
                aria-valuenow={currentStep - 1}
                aria-valuemin={0}
                aria-valuemax={totalSteps}
                aria-label={`Onboarding progress: step ${currentStep} of ${totalSteps}`}
              />
            </div>

            {/* Step dots */}
            <StepIndicator steps={STEPS} currentStep={currentStep} />
          </div>
        )}

        {/* Step content */}
        <div className="p-6 sm:p-8">
          {isDone ? (
            <DoneStep
              agencyName={agencySetup.agencyName}
              onGoToDashboard={handleGoToDashboard}
            />
          ) : (
            <>
              {currentStep === 1 && (
                <AgencySetupStep
                  state={agencySetup}
                  onChange={setAgencySetup}
                />
              )}
              {currentStep === 2 && (
                <ConnectAccountStep
                  connectedPlatforms={connectedPlatforms}
                  onToggle={handlePlatformToggle}
                />
              )}
              {currentStep === 3 && (
                <FirstPostStep state={firstPost} onChange={setFirstPost} />
              )}
              {currentStep === 4 && (
                <InviteTeamStep state={invite} onChange={setInvite} />
              )}
            </>
          )}
        </div>

        {/* Navigation footer */}
        {!isDone && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
            {/* Back button */}
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-1.5 text-slate-600 hover:text-slate-800 disabled:opacity-0"
              aria-label="Go to previous step"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>

            {/* Right-side actions */}
            <div className="flex items-center gap-3">
              {/* Skip button — shown on optional steps */}
              {currentStep >= 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkip}
                  className="gap-1.5 text-slate-500 hover:text-slate-700"
                  aria-label={`Skip step ${currentStep}`}
                >
                  <SkipForward
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  Skip
                </Button>
              )}

              {/* Next button */}
              <Button
                type="button"
                onClick={handleNext}
                disabled={
                  currentStep === 1 && agencySetup.agencyName.trim() === ""
                }
                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                aria-label={
                  currentStep === totalSteps
                    ? "Finish setup"
                    : "Go to next step"
                }
              >
                {currentStep === totalSteps ? "Finish" : "Next"}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Save progress note */}
      {!isDone && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Your progress is saved automatically. You can return to this wizard
          any time.
        </p>
      )}
    </div>
  );
}
