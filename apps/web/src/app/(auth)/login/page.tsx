"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Metadata cannot be exported from a client component; define it in a
// separate server wrapper if needed. Kept here for reference during build-out.
// export const metadata: Metadata = { title: "Sign In" };

interface LoginFormState {
  email: string;
  password: string;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Login page — placeholder form structure.
 * Full implementation (server actions / API integration) will follow in
 * the auth feature slice.
 */
export default function LoginPage(): React.JSX.Element {
  const [state, setState] = useState<LoginFormState>({
    email: "",
    password: "",
    isSubmitting: false,
    error: null,
  });

  function handleChange(field: keyof Pick<LoginFormState, "email" | "password">) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setState((prev) => ({ ...prev, [field]: e.target.value, error: null }));
    };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // TODO: integrate with apiClient.post<AuthTokens>('/auth/login', { email, password })
      //       then store token and router.push('/dashboard')
      await Promise.resolve(); // placeholder
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setState((prev) => ({ ...prev, error: message, isSubmitting: false }));
    }
  }

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access Social Pro
        </p>
      </div>

      {/* Error banner */}
      {state.error !== null && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium leading-none"
          >
            Email address
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
            placeholder="you@agency.com"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
              "text-sm ring-offset-background",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none"
            >
              Password
            </label>
            <a
              href="/forgot-password"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={state.isSubmitting}
            value={state.password}
            onChange={handleChange("password")}
            placeholder="••••••••"
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
              "text-sm ring-offset-background",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>

        <button
          type="submit"
          disabled={state.isSubmitting}
          className={cn(
            "inline-flex w-full items-center justify-center rounded-md",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "h-10 px-4 py-2 text-sm font-medium",
            "ring-offset-background transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          {state.isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
