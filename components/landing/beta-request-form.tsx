"use client";

import { useMemo, useState } from "react";

export function BetaRequestForm() {
  const [email, setEmail] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const buttonLabel = useMemo(() => {
    if (status === "loading") return "Submitting…";
    if (status === "success") return "Request received";
    return "Request beta access";
  }, [status]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setStatus("loading");

    try {
      const res = await fetch("/api/beta/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, agency_name: agencyName }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Request failed");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Request failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl">
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-4 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground-heading">Early access</p>
            <p className="mt-1 text-sm text-secondary">
              Join the list and we&apos;ll send beta access links before Pro unlocks on Fri 3 Apr at 9:00am (Dublin).
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Work email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="name@agency.com"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-signal-green/60"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground">Agency name</span>
            <input
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              type="text"
              required
              placeholder="Your agency"
              className="h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-signal-green/60"
            />
          </label>
        </div>

        {status === "error" && errorMsg && (
          <p className="text-xs font-medium text-danger">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-signal-green px-4 text-sm font-semibold text-black hover:bg-signal-green/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {buttonLabel}
        </button>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          By submitting, you agree we can contact you about beta access. No spam.
        </p>
      </div>
    </form>
  );
}

