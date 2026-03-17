"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface RegisterFormState {
  name: string;
  email: string;
  password: string;
  agencyName: string;
  showPassword: boolean;
  isSubmitting: boolean;
  error: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function PasswordStrength({ password }: { password: string }): React.JSX.Element {
  const checks = [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Number", met: /\d/.test(password) },
  ];

  if (password.length === 0) return <></>;

  return (
    <div className="flex gap-3 mt-1.5">
      {checks.map((check) => (
        <span
          key={check.label}
          className={cn(
            "flex items-center gap-1 text-xs transition-colors",
            check.met ? "text-emerald-400" : "text-slate-500"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              check.met ? "bg-emerald-400" : "bg-slate-600"
            )}
          />
          {check.label}
        </span>
      ))}
    </div>
  );
}

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter();

  const [state, setState] = useState<RegisterFormState>({
    name: "",
    email: "",
    password: "",
    agencyName: "",
    showPassword: false,
    isSubmitting: false,
    error: null,
  });

  function handleChange(
    field: keyof Pick<
      RegisterFormState,
      "name" | "email" | "password" | "agencyName"
    >
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, [field]: e.target.value, error: null }));
    };
  }

  function togglePassword() {
    setState((prev) => ({ ...prev, showPassword: !prev.showPassword }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      !state.name.trim() ||
      !state.email.trim() ||
      !state.password ||
      !state.agencyName.trim()
    ) {
      setState((prev) => ({ ...prev, error: "Please fill in all fields." }));
      return;
    }

    if (state.password.length < 8) {
      setState((prev) => ({
        ...prev,
        error: "Password must be at least 8 characters long.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const tokens = await apiClient.post<AuthTokens>("/auth/register", {
        name: state.name.trim(),
        email: state.email.trim().toLowerCase(),
        password: state.password,
        agencyName: state.agencyName.trim(),
      });

      localStorage.setItem("sp_access_token", tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem("sp_refresh_token", tokens.refreshToken);
      }

      console.log("Registration successful. Token:", tokens.accessToken);
      router.push("/dashboard");
    } catch (err) {
      let message = "An unexpected error occurred. Please try again.";

      if (err instanceof ApiRequestError) {
        if (err.statusCode === 409) {
          message =
            "An account with this email already exists. Try signing in instead.";
        } else if (err.statusCode === 400) {
          message = err.message;
        } else {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      setState((prev) => ({
        ...prev,
        error: message,
        isSubmitting: false,
      }));
    }
  }

  const inputClass = cn(
    "flex h-11 w-full rounded-lg border px-3 py-2",
    "bg-white/5 border-white/10 text-white text-sm",
    "placeholder:text-slate-500",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent",
    "transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50"
  );

  const labelClass = "text-sm font-medium text-slate-300";

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Create your account
        </h1>
        <p className="text-sm text-slate-400">
          Start managing your clients&apos; social media today
        </p>
      </div>

      {/* Error banner */}
      {state.error !== null && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/20 text-red-400"
        >
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Full name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            disabled={state.isSubmitting}
            value={state.name}
            onChange={handleChange("name")}
            placeholder="Jane Smith"
            className={inputClass}
          />
        </div>

        {/* Agency name */}
        <div className="space-y-1.5">
          <label htmlFor="agencyName" className={labelClass}>
            Agency name
          </label>
          <input
            id="agencyName"
            name="agencyName"
            type="text"
            autoComplete="organization"
            required
            disabled={state.isSubmitting}
            value={state.agencyName}
            onChange={handleChange("agencyName")}
            placeholder="Acme Media Agency"
            className={inputClass}
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className={labelClass}>
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={state.isSubmitting}
            value={state.email}
            onChange={handleChange("email")}
            placeholder="jane@acmemedia.com"
            className={inputClass}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={state.showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              disabled={state.isSubmitting}
              value={state.password}
              onChange={handleChange("password")}
              placeholder="Min. 8 characters"
              className={cn(inputClass, "pr-10")}
            />
            <button
              type="button"
              onClick={togglePassword}
              disabled={state.isSubmitting}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
              aria-label={state.showPassword ? "Hide password" : "Show password"}
            >
              {state.showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <PasswordStrength password={state.password} />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={state.isSubmitting}
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 border-0 mt-2"
        >
          {state.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Create account
            </>
          )}
        </Button>

        <p className="text-center text-xs text-slate-500 leading-relaxed">
          By creating an account, you agree to our{" "}
          <Link
            href="/terms"
            className="text-slate-400 hover:text-slate-300 underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-slate-400 hover:text-slate-300 underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      {/* Login link */}
      <p className="text-center text-sm text-slate-400 border-t border-white/10 pt-5">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
