"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormState {
  email: string;
  password: string;
  showPassword: boolean;
  isSubmitting: boolean;
  error: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();

  const [state, setState] = useState<LoginFormState>({
    email: "",
    password: "",
    showPassword: false,
    isSubmitting: false,
    error: null,
  });

  function handleChange(
    field: keyof Pick<LoginFormState, "email" | "password">
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

    if (!state.email.trim() || !state.password) {
      setState((prev) => ({
        ...prev,
        error: "Please fill in all fields.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const tokens = await apiClient.post<AuthTokens>("/auth/login", {
        email: state.email.trim().toLowerCase(),
        password: state.password,
      });

      // Store token and redirect
      localStorage.setItem("sp_access_token", tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem("sp_refresh_token", tokens.refreshToken);
      }

      console.log("Login successful. Token:", tokens.accessToken);
      router.push("/dashboard");
    } catch (err) {
      let message = "An unexpected error occurred. Please try again.";

      if (err instanceof ApiRequestError) {
        if (err.statusCode === 401 || err.statusCode === 400) {
          message = "Invalid email or password. Please check your credentials.";
        } else if (err.statusCode === 429) {
          message = "Too many login attempts. Please try again later.";
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

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="text-sm text-slate-400">
          Sign in to your Social Pro account
        </p>
      </div>

      {/* Error banner */}
      {state.error !== null && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-lg px-4 py-3 text-sm",
            "bg-red-500/10 border border-red-500/20 text-red-400"
          )}
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
        {/* Email */}
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
            onChange={handleChange("email")}
            placeholder="you@agency.com"
            className={cn(
              "flex h-11 w-full rounded-lg border px-3 py-2",
              "bg-white/5 border-white/10 text-white text-sm",
              "placeholder:text-slate-500",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent",
              "transition-colors duration-150",
              "disabled:cursor-not-allowed disabled:opacity-50",
              state.error !== null && "border-red-500/50"
            )}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-300"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={state.showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={state.isSubmitting}
              value={state.password}
              onChange={handleChange("password")}
              placeholder="••••••••"
              className={cn(
                "flex h-11 w-full rounded-lg border px-3 py-2 pr-10",
                "bg-white/5 border-white/10 text-white text-sm",
                "placeholder:text-slate-500",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent",
                "transition-colors duration-150",
                "disabled:cursor-not-allowed disabled:opacity-50",
                state.error !== null && "border-red-500/50"
              )}
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
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-transparent px-2 text-slate-500">
            New to Social Pro?
          </span>
        </div>
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors underline-offset-4 hover:underline"
        >
          Create a free account
        </Link>
      </p>
    </div>
  );
}
