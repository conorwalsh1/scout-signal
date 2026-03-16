import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { feature: "Signal feed coverage", basic: "Top companies only", pro: "Full" },
  { feature: "Company intelligence pages", basic: "Yes", pro: "Yes" },
  { feature: "Signal scoring", basic: "Yes", pro: "Yes" },
  { feature: "Signal tags and events", basic: "Yes", pro: "Yes" },
  { feature: "Saved companies", basic: "25", pro: "Unlimited" },
  { feature: "Search and ranking tools", basic: "Yes", pro: "Yes" },
  { feature: "Signal history timeline", basic: "No", pro: "Yes" },
  { feature: "Signal badges", basic: "No", pro: "Yes" },
  { feature: "Signal alerts", basic: "No", pro: "Yes" },
  { feature: "Advanced signal filters", basic: "No", pro: "Yes" },
  { feature: "Data export", basic: "No", pro: "Yes" },
  { feature: "Hiring trend analytics", basic: "—", pro: "Yes" },
  { feature: "Signal score breakdown", basic: "—", pro: "Yes" },
] as const;

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground-heading mb-2">Pricing</h1>
        <p className="text-secondary mb-10">
          Choose the plan that fits your recruiting workflow.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="rounded-xl border border-border bg-card p-6 md:p-8 flex flex-col min-h-[220px]">
            <h2 className="text-xl font-semibold text-foreground-heading">Basic</h2>
            <p className="mt-2 text-2xl font-bold text-foreground">
              €39.99 <span className="text-sm font-normal text-muted-foreground">/ month</span>
            </p>
            <div className="mt-auto pt-6">
              <Link href={user ? "/dashboard" : "/signup"}>
                <Button variant="outline" className="w-full">
                  {user ? "Current plan" : "Sign up for Basic"}
                </Button>
              </Link>
            </div>
          </div>
          <div
            className="rounded-xl border-2 border-signal-green/70 bg-card p-6 md:p-8 flex flex-col min-h-[220px]"
            style={{
              boxShadow: "0 0 32px rgba(34, 197, 94, 0.18), 0 0 0 1px rgba(34, 197, 94, 0.25)",
            }}
          >
            <span className="mb-3 inline-flex w-fit px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-signal-green/25 text-signal-green border border-signal-green/50">
              Recommended
            </span>
            <h2 className="text-xl font-semibold text-foreground-heading">Pro</h2>
            <p className="mt-2 text-2xl font-bold text-signal-green">
              €99.99 <span className="text-sm font-normal text-muted-foreground">/ month</span>
            </p>
            <div className="mt-auto pt-6">
              {user ? (
                <form action="/api/stripe/checkout" method="POST" className="w-full">
                  <Button type="submit" className="w-full">
                    Upgrade to Pro
                  </Button>
                </form>
              ) : (
                <Link href="/signup">
                  <Button className="w-full">Get Pro</Button>
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
                <th className="px-5 py-4 font-semibold text-foreground-heading w-[120px] text-center">
                  Basic
                </th>
                <th className="px-5 py-4 font-semibold text-signal-green w-[120px] text-center">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-b-0 hover:bg-card/60 transition-colors">
                  <td className="px-5 py-4 text-foreground">{row.feature}</td>
                  <td className="px-5 py-4 text-center text-secondary">{row.basic}</td>
                  <td className="px-5 py-4 text-center text-foreground font-medium">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          <Link href="/" className="underline hover:text-foreground">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
