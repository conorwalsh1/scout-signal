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

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h1>
      <p className="text-muted-foreground text-sm mb-4">
        {message}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
