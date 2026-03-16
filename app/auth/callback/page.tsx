"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles the redirect after email confirmation (signup) or magic link.
 * Supabase sends users here with tokens in the URL hash. The server never sees the hash,
 * so we must run on the client: establish the session from the hash, then redirect to dashboard.
 * Add this URL to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 *   https://yourdomain.com/auth/callback  (and http://localhost:3000/auth/callback for dev)
 */
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const supabase = createClient();

    const hashParams = typeof window !== "undefined" ? window.location.hash : "";
    if (!hashParams) {
      setStatus("error");
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus("ok");
        const redirectTo = searchParams.get("redirect") ?? "/dashboard";
        router.replace(redirectTo);
        return;
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("ok");
        const redirectTo = searchParams.get("redirect") ?? "/dashboard";
        router.replace(redirectTo);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  if (status === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Invalid or expired link</h1>
          <p className="text-sm text-muted-foreground">
            This link may have been used already or has expired. Try signing in or request a new confirmation email.
          </p>
          <a href="/login" className="text-sm font-medium text-primary underline">
            Go to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <p className="text-muted-foreground">Confirming your account…</p>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-background p-8">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
