import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Aligned with actual app behavior. See docs/PRICING_TABLE_AUDIT.md.
const FEATURES = [
  { feature: "Funding feed (Series A-C focus)", free: "Live sample feed", basic: "Up to 100 companies", pro: "Up to 500 companies" },
  { feature: "Funding context (round/amount/investors)", free: "Preview only", basic: "Yes", pro: "Yes" },
  { feature: "Recruiter-ready interpretation", free: "Preview only", basic: "Yes", pro: "Yes" },
  { feature: "Outreach timing guidance", free: "Preview only", basic: "Yes", pro: "Yes" },
  { feature: "Saved / tracked companies", free: "10", basic: "25", pro: "1,000" },
  { feature: "Executive + expansion signals", free: "No", basic: "Yes", pro: "Yes" },
  { feature: "Funding-first ranking tools", free: "Yes", basic: "Yes", pro: "Yes" },
  { feature: "Signal timeline + provenance", free: "Yes", basic: "Yes", pro: "Yes" },
  { feature: "Daily intelligence feed", free: "Yes", basic: "Yes", pro: "Yes" },
  { feature: "Alerts", free: "In-app setup", basic: "In-app setup", pro: "In-app setup (email delivery coming)" },
  { feature: "Advanced signal filters", free: "Yes", basic: "Yes", pro: "Yes" },
  { feature: "Data export", free: "No", basic: "No", pro: "Coming soon" },
  { feature: "Capital-to-hiring trend analytics", free: "No", basic: "—", pro: "Coming soon" },
  { feature: "Signal score breakdown", free: "Yes", basic: "Yes", pro: "Yes" },
] as const;

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users").select("plan").eq("id", user.id).single()
    : { data: null };
  const currentPlan = (profile?.plan ?? "free") as "free" | "basic" | "pro";

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground-heading mb-2">Pricing</h1>
        <p className="text-secondary mb-10">
          Founding access pricing while we onboard early recruiter teams and refine the funding-intelligence workflow.
        </p>
        <div className="mb-8 rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-secondary">
          {user ? (
            <span>
              You&apos;re signed in. Choosing <span className="font-medium text-foreground">Basic</span> or{" "}
              <span className="font-medium text-foreground">Pro</span> will send you to Stripe Checkout.
            </span>
          ) : (
            <span>
              Create your account first, then return here to start Stripe Checkout for a paid plan.
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Free */}
          <div className="rounded-xl border border-border bg-card p-6 md:p-8 flex flex-col min-h-[220px]">
            <h2 className="text-xl font-semibold text-foreground-heading">Free</h2>
            <p className="mt-2 text-2xl font-bold text-foreground">
              €0 <span className="text-sm font-normal text-muted-foreground">/ month</span>
            </p>
            <p className="mt-3 text-sm text-secondary">
              Get a feel for the funding intelligence feed and how Signal Scout turns events into recruiter-ready insight.
            </p>
            <div className="mt-auto pt-6">
              {user ? (
                currentPlan === "free" ? (
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground opacity-50"
                    disabled
                  >
                    Current plan
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your account always includes Free. Downgrades available on request.
                  </p>
                )
              ) : (
                <Link href="/signup">
                  <span className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                    Start for free
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* Basic */}
          <div className="rounded-xl border border-border bg-card p-6 md:p-8 flex flex-col min-h-[220px]">
            <h2 className="text-xl font-semibold text-foreground-heading">Basic</h2>
            <p className="mt-2 text-2xl font-bold text-foreground">
              €29.99 <span className="text-sm font-normal text-muted-foreground">/ month</span>
            </p>
            <p className="mt-3 text-sm text-secondary">
              Founding access for recruiters running a focused desk. Track funded accounts and act before outreach gets crowded.
            </p>
            <div className="mt-auto pt-6">
              {user ? (
                currentPlan === "basic" ? (
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground opacity-50"
                    disabled
                  >
                    Current plan
                  </button>
                ) : (
                  <form action="/api/stripe/checkout" method="POST" className="w-full">
                    <input type="hidden" name="plan" value="basic" />
                    <button
                      type="submit"
                      className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      {currentPlan === "pro" ? "Switch to Basic" : "Choose Basic"}
                    </button>
                  </form>
                )
              ) : (
                <Link href="/signup">
                  <span className="inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
                    Sign up to choose Basic
                  </span>
                </Link>
              )}
            </div>
          </div>
          {/* Pro */}
          <div
            className="relative rounded-xl border-2 border-signal-green/70 bg-card p-6 md:p-8 flex flex-col min-h-[220px]"
            style={{
              boxShadow: "0 0 32px rgba(34, 197, 94, 0.18), 0 0 0 1px rgba(34, 197, 94, 0.25)",
            }}
          >
            <span className="absolute right-4 top-4 inline-flex w-fit px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-signal-green/25 text-signal-green border border-signal-green/50">
              Recommended
            </span>
            <h2 className="text-xl font-semibold text-foreground-heading">Founding Pro</h2>
            <p className="mt-2 text-2xl font-bold text-signal-green">
              €29.99 <span className="text-sm font-normal text-muted-foreground">/ month</span>
            </p>
            <p className="mt-3 text-sm text-secondary">
              Validation-stage pricing for agency desks tracking 30–50+ companies. Prioritise Series A-C momentum with supporting signals like <span className="font-medium text-foreground">Exec signal</span> and <span className="font-medium text-foreground">Hypergrowth</span>.
            </p>
            <div className="mt-auto pt-6">
              {user ? (
                <form action="/api/stripe/checkout" method="POST" className="w-full">
                  <input type="hidden" name="plan" value="pro" />
                  <button
                    type="submit"
                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                    disabled={currentPlan === "pro"}
                  >
                    {currentPlan === "pro" ? "Current plan" : "Upgrade to Pro"}
                  </button>
                </form>
              ) : (
                <Link href="/signup">
                  <span className="inline-flex h-10 w-full items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
                    Sign up to get Pro
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-foreground-heading mb-4">Feature comparison</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-sidebar/50">
                <th className="px-5 py-4 font-semibold text-foreground-heading">Feature</th>
                <th className="px-5 py-4 font-semibold text-foreground-heading w-[110px] text-center">
                  Free
                </th>
                <th className="px-5 py-4 font-semibold text-foreground-heading w-[110px] text-center">
                  Basic
                </th>
                <th className="px-5 py-4 font-semibold text-signal-green w-[110px] text-center">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-b-0 hover:bg-card/60 transition-colors">
                  <td className="px-5 py-4 text-foreground">{row.feature}</td>
                  <td className="px-5 py-4 text-center text-secondary">{row.free}</td>
                  <td className="px-5 py-4 text-center text-secondary">{row.basic}</td>
                  <td className="px-5 py-4 text-center text-foreground font-medium">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          <Link href={user ? "/dashboard" : "/"} className="underline hover:text-foreground">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
