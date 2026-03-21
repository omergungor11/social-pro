"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, ApiRequestError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Dev mode auto-login
// ---------------------------------------------------------------------------

const DEV_MODE = process.env.NODE_ENV === "development";
const DEV_EMAIL = "admin@socialpro.dev";
const DEV_PASSWORD = "159753*a";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [devLogging, setDevLogging] = useState(DEV_MODE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dev auto-login
  useEffect(() => {
    if (!DEV_MODE) return;

    const existing = localStorage.getItem("sp_access_token");
    if (existing) {
      router.push("/dashboard");
      return;
    }

    async function autoLogin() {
      try {
        const tokens = await apiClient.post<AuthTokens>("/auth/login", {
          email: DEV_EMAIL,
          password: DEV_PASSWORD,
        });
        localStorage.setItem("sp_access_token", tokens.accessToken);
        if (tokens.refreshToken) {
          localStorage.setItem("sp_refresh_token", tokens.refreshToken);
        }
        router.push("/dashboard");
      } catch {
        setDevLogging(false);
      }
    }

    void autoLogin();
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tokens = await apiClient.post<AuthTokens>("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      localStorage.setItem("sp_access_token", tokens.accessToken);
      if (tokens.refreshToken) {
        localStorage.setItem("sp_refresh_token", tokens.refreshToken);
      }
      router.push("/dashboard");
    } catch (err) {
      let message = "An unexpected error occurred. Please try again.";
      if (err instanceof ApiRequestError) {
        if (err.statusCode === 401 || err.statusCode === 400) {
          message = "Invalid email or password.";
        } else if (err.statusCode === 429) {
          message = "Too many attempts. Try again later.";
        } else {
          message = err.message;
        }
      }
      setError(message);
      setIsSubmitting(false);
    }
  }

  // Dev auto-login loading state
  if (devLogging) {
    return (
      <div className="p-8 flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <p className="text-sm text-slate-400">Dev auto-login...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="text-sm text-slate-400">
          Sign in to your Social Pro account
        </p>
      </div>

      {error !== null && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/20 text-red-400"
        >
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            disabled={isSubmitting}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="you@agency.com"
            className={cn(
              "flex h-11 w-full rounded-lg border px-3 py-2",
              "bg-white/5 border-white/10 text-white text-sm",
              "placeholder:text-slate-500",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent",
              "transition-colors duration-150",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error !== null && "border-red-500/50"
            )}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
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
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              className={cn(
                "flex h-11 w-full rounded-lg border px-3 py-2 pr-10",
                "bg-white/5 border-white/10 text-white text-sm",
                "placeholder:text-slate-500",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent",
                "transition-colors duration-150",
                "disabled:cursor-not-allowed disabled:opacity-50",
                error !== null && "border-red-500/50"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              disabled={isSubmitting}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-600/20 border-0 mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-transparent px-2 text-slate-500">New to Social Pro?</span>
        </div>
      </div>

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
