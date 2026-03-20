"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { RadarAnimation } from "@/components/radar-animation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const resetSuccess = searchParams.get("reset") === "success";
  const [message, setMessage] = useState<string | null>(resetSuccess ? "Password updated. You can log in with your new password now." : null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) {
      const isInvalidCreds = err.message?.toLowerCase().includes("invalid login credentials");
      setError(
        isInvalidCreds
          ? "Invalid login credentials. Wrong password? Use Forgot password below to set a new one."
          : err.message ?? "Invalid credentials."
      );
      return;
    }
    window.location.href = redirect;
  }

  async function handleResetPassword() {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Enter your email first, then click Forgot password.");
      return;
    }

    setResetLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);

    if (err) {
      const isRateLimit =
        err.message?.toLowerCase().includes("rate limit") ||
        err.message?.toLowerCase().includes("email rate limit");
      setError(
        isRateLimit
          ? "Too many reset emails sent. Please try again in an hour."
          : err.message ?? "Could not send reset email."
      );
      return;
    }

    setMessage("Password reset email sent. Check your inbox for the recovery link.");
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Radar panel – atmospheric, premium */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-12 border-b border-border lg:border-b-0 lg:border-r lg:border-border bg-sidebar/50 min-h-[280px] lg:min-h-0">
        <RadarAnimation size={280} className="max-w-full max-h-[min(280px,50vw)]" />
      </div>

      {/* Form panel – clean, minimal */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2">
              <Image
                src="/brand-mark.png"
                alt="Signal Scout"
                width={18}
                height={18}
                className="h-[18px] w-[18px] object-contain"
                priority
              />
              <span className="text-sm font-semibold text-foreground-heading">Signal Scout</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground-heading">Log in</h1>
            <p className="mt-1 text-sm text-secondary">
              Access your company signal intelligence dashboard.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="text-sm text-signal-green" role="status">
                {message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetLoading}
            className="text-sm font-medium text-foreground underline underline-offset-4 disabled:opacity-60"
          >
            {resetLoading ? "Sending reset email…" : "Forgot password?"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/signup" className="font-medium text-foreground underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Loading…</p></main>}>
      <LoginForm />
    </Suspense>
  );
}
