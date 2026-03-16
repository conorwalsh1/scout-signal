"use client";

/**
 * Password reset page. Users reach this via the link in the "Forgot password?" email.
 * Supabase Dashboard → Authentication → URL Configuration → Redirect URLs must include:
 *   https://yourdomain.com/reset-password  (and http://localhost:3000/reset-password for dev)
 * Otherwise Supabase redirects to the Site URL (e.g. landing) and the user never sees this form.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!password || !confirmPassword) {
      setError("Enter and confirm your new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message ?? "Could not reset password.");
      return;
    }

    router.replace("/login?reset=success");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground-heading">Reset password</h1>
          <p className="mt-1 text-sm text-secondary">
            Opened from your email recovery link. Set a new password below.
          </p>
        </div>

        {!ready && !message ? (
          <div className="space-y-3 text-sm">
            <p className="text-secondary">
              Waiting for a valid recovery session. Open this page from the password reset email.
            </p>
            <Link href="/login" className="font-medium text-foreground underline">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground mb-1">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoComplete="new-password"
                required
              />
            </div>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            {message ? <p className="text-sm text-signal-green">{message}</p> : null}
            <Button type="submit" className="w-full" disabled={loading || !ready}>
              {loading ? "Updating password…" : "Set new password"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
