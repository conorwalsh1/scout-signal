"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  const raw = error?.message != null ? String(error.message) : "";
  const message =
    raw && raw !== "[object Object]" && !raw.startsWith("{")
      ? raw
      : "We couldn't load this page. You can try again.";

  const isConfigError =
    raw.toLowerCase().includes("supabase_service_key") ||
    raw.toLowerCase().includes("missing next_public_supabase");

  return (
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
      <p className="text-muted-foreground text-sm mb-4">{message}</p>
      {isConfigError && (
        <p className="text-muted-foreground text-sm mb-4">
          On deployed builds, set <code className="bg-muted px-1 rounded">SUPABASE_SERVICE_KEY</code> and other server env vars from <code className="bg-muted px-1 rounded">.env.local</code> in your hosting dashboard (e.g. Vercel → Project → Settings → Environment Variables).
        </p>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
