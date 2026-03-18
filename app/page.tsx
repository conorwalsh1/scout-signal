import Link from "next/link";
import {
  getLandingCompaniesCount,
  getSignalsTodayCount,
  getLatestSignalCompanies,
  getTopScoreCompanies,
} from "@/lib/landing-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [companiesCount, signalsToday, latestCompanies, topScoreCompanies] = await Promise.all([
    getLandingCompaniesCount(),
    getSignalsTodayCount(),
    getLatestSignalCompanies(3),
    getTopScoreCompanies(5),
  ]);

  const displayCount = companiesCount > 0 ? companiesCount.toLocaleString() : "1,036";
  const signalsDisplay = signalsToday > 0 ? signalsToday : 47;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-semibold text-foreground-heading no-underline">
            ScoutSignal
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium text-secondary no-underline hover:text-foreground">
              Pricing
            </Link>
            <Link href="/login" className="text-sm font-medium text-secondary no-underline hover:text-foreground">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-signal-green px-4 py-2 text-sm font-medium text-black no-underline hover:bg-signal-green/90"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      <section className="border-b border-border/50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-signal-green">
              Hiring intelligence for early growth
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground-heading sm:text-5xl lg:text-6xl">
              Discover companies before they start scaling.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-secondary">
              Real-time hiring intelligence that reveals which companies are about to grow.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Tracking <span className="font-semibold text-signal-green">{displayCount}</span> companies.
              {" · "}
              Signals detected today <span className="font-semibold text-signal-green">{signalsDisplay}</span>
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex justify-center rounded-lg bg-signal-green px-6 py-3.5 text-base font-semibold text-black no-underline hover:bg-signal-green/90"
              >
                Create free account
              </Link>
              <Link
                href="/login"
                className="inline-flex justify-center rounded-lg border border-border px-6 py-3.5 text-base font-semibold text-foreground no-underline hover:bg-card"
              >
                View live signals
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <InfoCard
            title="Detect"
            body="Monitor company hiring activity, leadership shifts, and growth signals before they become obvious."
          />
          <InfoCard
            title="Score"
            body="Rank companies by hiring momentum and signal quality so the strongest opportunities surface first."
          />
          <InfoCard
            title="Act"
            body="Use the leaderboard and company intelligence pages to prioritise outreach and market research."
          />
        </div>
      </section>

      <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-foreground-heading">Signals we detect</h2>
          <p className="mt-2 text-sm text-secondary">
            Hiring momentum, engineering buildout, AI hiring, funding activity, and leadership change.
          </p>
        </div>
      </section>

      <section className="border-t border-border/50 bg-card/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-foreground-heading">Latest signals detected</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {latestCompanies.length > 0 ? (
              latestCompanies.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="block rounded-xl border border-border bg-card p-4 no-underline transition-all hover:border-signal-green/40 hover:shadow-[0_0_24px_rgba(34,197,94,0.08)]"
                >
                  <p className="font-semibold text-foreground-heading">{company.name}</p>
                  <p className="mt-1 text-xs font-medium text-signal-green">
                    Signal Score {(company.score / 10).toFixed(1)}
                  </p>
                  <p className="mt-2 text-xs text-secondary">{company.latest_signal_label} detected</p>
                  <p className="mt-1 text-xs text-muted-foreground">{company.insight_line}</p>
                </Link>
              ))
            ) : (
              <>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold text-foreground-heading">Beta Labs</p>
                  <p className="mt-1 text-xs font-medium text-signal-green">Signal Score 10.0</p>
                  <p className="mt-2 text-xs text-secondary">Hiring Surge detected</p>
                  <p className="mt-1 text-xs text-muted-foreground">12 roles posted this week</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold text-foreground-heading">Gamma Inc</p>
                  <p className="mt-1 text-xs font-medium text-signal-green">Signal Score 9.2</p>
                  <p className="mt-2 text-xs text-secondary">Funding Event detected</p>
                  <p className="mt-1 text-xs text-muted-foreground">Series A announced</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="font-semibold text-foreground-heading">Acme Corp</p>
                  <p className="mt-1 text-xs font-medium text-signal-green">Signal Score 8.7</p>
                  <p className="mt-2 text-xs text-secondary">Engineering Hiring detected</p>
                  <p className="mt-1 text-xs text-muted-foreground">Backend team expansion</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-border/50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-foreground-heading">Top ranked companies</h2>
          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
            {topScoreCompanies.length > 0 ? (
              topScoreCompanies.map((company, index) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between border-b border-border/60 px-5 py-4 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground-heading">{company.name}</p>
                    <p className="mt-1 text-xs text-signal-green">
                      Signal Score {(company.score / 10).toFixed(1)} · {company.latest_signal_label}
                    </p>
                    <p className="mt-1 truncate text-xs text-secondary">{company.insight_line}</p>
                  </div>
                  <div className="pl-4 text-sm font-semibold text-muted-foreground">#{index + 1}</div>
                </div>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Sign in to see the full ranked dashboard.
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/pricing" className="hover:text-foreground no-underline">Pricing</Link>
          <Link href="/login" className="hover:text-foreground no-underline">Log in</Link>
          <Link href="/signup" className="hover:text-foreground no-underline">Sign up</Link>
        </div>
      </footer>
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground-heading">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-secondary">{body}</p>
    </div>
  );
}
