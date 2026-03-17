"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface ForgotPasswordState {
  email: string;
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
}

export default function ForgotPasswordPage(): React.JSX.Element {
  const [state, setState] = useState<ForgotPasswordState>({
    email: "",
    isSubmitting: false,
    isSuccess: false,
    error: null,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setState((prev) => ({
      ...prev,
      email: e.target.value,
      error: null,
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!state.email.trim()) {
      setState((prev) => ({
        ...prev,
        error: "Please enter your email address.",
      }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(state.email.trim())) {
      setState((prev) => ({
        ...prev,
        error: "Please enter a valid email address.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      await apiClient.post("/auth/forgot-password", {
        email: state.email.trim().toLowerCase(),
      });

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        isSuccess: true,
      }));
    } catch (err) {
      let message = "An unexpected error occurred. Please try again.";

      if (err instanceof ApiRequestError) {
        if (err.statusCode === 429) {
          message = "Too many requests. Please wait a few minutes and try again.";
        } else {
          // For security, don't reveal if email exists
          // Show success even on 404
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            isSuccess: true,
          }));
          return;
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

  if (state.isSuccess) {
    return (
      <div className="p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Check your inbox
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            If an account exists for{" "}
            <span className="text-slate-300 font-medium">{state.email}</span>,
            we&apos;ve sent a password reset link. It may take a minute or two
            to arrive.
          </p>
        </div>

        <div className="rounded-lg bg-white/5 border border-white/10 p-4 text-left space-y-2">
          <p className="text-xs font-medium text-slate-300">Didn&apos;t receive it?</p>
          <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
            <li>Check your spam or junk folder</li>
            <li>Make sure you used the right email</li>
            <li>The link expires after 1 hour</li>
          </ul>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            onClick={() =>
              setState({
                email: "",
                isSubmitting: false,
                isSuccess: false,
                error: null,
              })
            }
            variant="outline"
            className="w-full h-11 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          >
            Try a different email
          </Button>

          <Link
            href="/login"
            className={cn(
              "flex items-center justify-center gap-2 w-full h-11 rounded-lg",
              "text-sm font-medium text-blue-400 hover:text-blue-300",
              "transition-colors"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20">
            <Mail className="h-5 w-5 text-blue-400" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white text-center">
          Forgot password?
        </h1>
        <p className="text-sm text-slate-400 text-center leading-relaxed">
          No worries. Enter your email and we&apos;ll send you reset instructions.
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
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium text-slate-300"
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
            onChange={handleChange}
            placeholder="you@agency.com"
            className={cn(
              "flex h-11 w-full rounded-lg border px-3 py-2",
              "bg-white/5 border-white/10 text-white text-sm",
              "placeholder:text-slate-500",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent",
              "transition-colors duration-150",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={state.isSubmitting}
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 border-0"
        >
          {state.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending reset link...
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
      </form>

      {/* Back link */}
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  );
}
