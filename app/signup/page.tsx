"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { RadarAnimation } from "@/components/radar-animation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined },
      });
      if (err) {
        const isRateLimit =
          err.message?.toLowerCase().includes("rate limit") ||
          err.message?.toLowerCase().includes("email rate limit");
        setError(
          isRateLimit
            ? "Too many signup emails sent. Please try again in an hour."
            : err.message ?? "Sign up failed."
        );
        return;
      }
      // Supabase often requires email confirmation: no session until user clicks link
      if (data?.user && !data?.session) {
        setMessage("Check your email for a confirmation link to activate your account.");
        return;
      }
      // Signed in immediately (e.g. email confirmation disabled)
      if (data?.session) {
        window.location.href = "/dashboard";
        return;
      }
      setMessage("Account created. Check your email to confirm, then log in.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Radar panel – mirror login layout */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-12 border-b border-border lg:border-b-0 lg:border-r lg:border-border bg-sidebar/50 min-h-[280px] lg:min-h-0">
        <RadarAnimation size={280} className="max-w-full max-h-[min(280px,50vw)]" />
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground-heading">Sign up</h1>
            <p className="mt-1 text-sm text-secondary">
              Create your account to start tracking hiring signals.
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
                autoComplete="new-password"
                required
                minLength={6}
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
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
