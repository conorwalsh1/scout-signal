import Link from "next/link";
import {
  getLandingCompaniesCount,
  getSignalsTodayCount,
  getLatestSignalCompanies,
  getRadarSignalLabels,
  getTopScoreCompanies,
} from "@/lib/landing-data";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingRadar } from "@/components/landing/landing-radar";
import { LandingCompanyCard } from "@/components/landing/landing-company-card";
import { CursorTrail } from "@/components/landing/cursor-trail";
import { ClickRipple } from "@/components/landing/click-ripple";
import { BADGES } from "@/lib/badges";
import { CompanyBadge } from "@/components/company-badge";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [companiesCount, signalsToday, latestCompanies, radarLabels, topScoreCompanies] = await Promise.all([
    getLandingCompaniesCount(),
    getSignalsTodayCount(),
    getLatestSignalCompanies(3),
    getRadarSignalLabels(6),
    getTopScoreCompanies(5),
  ]);

  const displayCount = companiesCount > 0 ? companiesCount.toLocaleString() : "1,036";
  const signalsDisplay = signalsToday > 0 ? signalsToday : 47;

  return (
    <div className="min-h-screen bg-background">
      <CursorTrail />
      <ClickRipple />
      <LandingNav />

      {/* Hero: two-column */}
      <section className="relative pt-28 pb-20 lg:pt-36 lg:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 100% 60% at 70% 30%, rgba(34, 197, 94, 0.06) 0%, transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl flex flex-col lg:flex-row lg:items-center lg:gap-16 gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground-heading tracking-tight max-w-2xl mx-auto lg:mx-0">
              Discover companies before they start scaling.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Real-time hiring intelligence that reveals which companies are about to grow.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Tracking {displayCount} high-growth companies across Europe and the US.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/signup"
                className="inline-flex justify-center rounded-lg bg-signal-green px-6 py-3.5 text-base font-semibold text-black no-underline hover:bg-signal-green/90 transition-colors"
              >
                Start Free
              </Link>
              <Link
                href="/login"
                className="inline-flex justify-center rounded-lg border-2 border-border px-6 py-3.5 text-base font-semibold text-foreground no-underline hover:border-signal-green/50 hover:bg-signal-green/5 transition-colors"
              >
                View Live Signals
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground font-medium">
              Companies tracked: <span className="text-signal-green">{displayCount}</span>
              {" · "}
              Signals detected today: <span className="text-signal-green">{signalsDisplay}</span>
            </p>
          </div>
          <div className="flex-1 flex justify-center lg:justify-end">
            <div
              className="rounded-2xl p-1"
              style={{
                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(11, 15, 20, 0.9) 50%)",
                boxShadow: "0 0 60px rgba(34, 197, 94, 0.08)",
              }}
            >
              <LandingRadar size={380} labels={radarLabels} />
            </div>
          </div>
        </div>
      </section>

      {/* Latest Signals Detected */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground-heading text-center mb-10">
            Latest Signals Detected
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {latestCompanies.length > 0
              ? latestCompanies.map((company) => (
                  <LandingCompanyCard key={company.id} company={company} />
                ))
              : (
                <>
                  <PlaceholderCard name="Beta Labs" score="10.0" signal="Hiring Surge" line="12 roles posted this week" />
                  <PlaceholderCard name="Gamma Inc" score="9.2" signal="Funding Event" line="Series A announced" />
                  <PlaceholderCard name="Acme Corp" score="8.7" signal="Engineering Hiring" line="Backend team expansion" />
                </>
              )}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/login"
              className="inline-flex rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground no-underline hover:border-signal-green/50 hover:bg-signal-green/5 transition-colors"
            >
              Explore full signal feed
            </Link>
          </div>
        </div>
      </section>

      {/* How ScoutSignal Works */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-card/30 border-t border-border/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground-heading text-center mb-14">
            How ScoutSignal Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 rounded-xl bg-signal-green/15 items-center justify-center text-signal-green font-bold text-lg mb-4">1</div>
              <h3 className="text-lg font-semibold text-foreground-heading mb-2">Detect</h3>
              <p className="text-sm text-secondary leading-relaxed">
                We monitor thousands of company career pages and data sources to detect early hiring signals.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-12 w-12 rounded-xl bg-signal-green/15 items-center justify-center text-signal-green font-bold text-lg mb-4">2</div>
              <h3 className="text-lg font-semibold text-foreground-heading mb-2">Score</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Our signal engine ranks companies by hiring momentum and growth indicators.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-12 w-12 rounded-xl bg-signal-green/15 items-center justify-center text-signal-green font-bold text-lg mb-4">3</div>
              <h3 className="text-lg font-semibold text-foreground-heading mb-2">Act</h3>
              <p className="text-sm text-secondary leading-relaxed">
                Identify companies that are about to scale before everyone else does.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground-heading text-center mb-14">
            Built for people who need early signals.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <h3 className="text-lg font-semibold text-foreground-heading mb-2">Recruiters</h3>
              <p className="text-sm text-secondary">Find companies before hiring ramps up.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <h3 className="text-lg font-semibold text-foreground-heading mb-2">Investors</h3>
              <p className="text-sm text-secondary">Spot high-growth companies earlier.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <h3 className="text-lg font-semibold text-foreground-heading mb-2">Operators</h3>
              <p className="text-sm text-secondary">Track competitors and industry momentum.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Signal types – reuse real badge system styling */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-card/30 border-t border-border/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground-heading text-center mb-14">
            Signals we detect
          </h2>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-3xl mx-auto">
            {BADGES.map((badge) => (
              <CompanyBadge
                key={badge.id}
                badgeId={badge.id}
                className="text-[11px] sm:text-xs px-3 py-1.5"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground-heading text-center mb-4">
            Company Intelligence Dashboard
          </h2>
          <p className="text-center text-secondary max-w-2xl mx-auto mb-10">
            Track companies, understand hiring momentum, and discover growth signals.
          </p>
          <div className="rounded-xl border border-border bg-card overflow-hidden max-w-4xl mx-auto shadow-2xl">
            <div className="bg-sidebar flex flex-col divide-y divide-border/60">
              {topScoreCompanies.length > 0 ? (
                topScoreCompanies.map((company, index) => (
                  <div
                    key={company.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-background/40 transition-colors"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-background/70 flex items-center justify-center">
                      {/* Reuse company logo logic from dashboard/landing cards */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${company.domain ?? ""}`}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground-heading truncate">
                        {company.name}
                        {company.domain && (
                          <span className="ml-1 text-xs text-muted-foreground">· {company.domain}</span>
                        )}
                      </p>
                      <p className="text-[11px] text-signal-green font-medium mt-0.5">
                        Signal Score {(company.score / 10).toFixed(1)} / 10 · {company.latest_signal_label}
                      </p>
                      <p className="text-[11px] text-secondary mt-0.5 truncate">
                        {company.insight_line}
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-muted-foreground pl-2">
                      #{index + 1}
                    </div>
                  </div>
                ))
              ) : (
                <div className="aspect-video bg-sidebar flex items-center justify-center p-8">
                  <div className="text-center text-muted-foreground text-sm">
                    <p className="font-medium text-foreground mb-2">Live company rankings and signal feed</p>
                    <p className="text-xs">Sign in to see the full dashboard</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex rounded-lg border-2 border-signal-green/50 px-5 py-2.5 text-sm font-semibold text-signal-green no-underline hover:bg-signal-green/10 transition-colors"
            >
              View example company page
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 lg:py-28 px-4 sm:px-6 lg:px-8 border-t border-border/50">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground-heading mb-6">
            Start discovering hiring signals today.
          </h2>
          <Link
            href="/signup"
            className="inline-flex rounded-lg bg-signal-green px-8 py-4 text-base font-semibold text-black no-underline hover:bg-signal-green/90 transition-colors"
          >
            Create free account
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Free plan available. No credit card required.
          </p>
        </div>
      </section>

      <footer className="py-6 px-4 border-t border-border/50">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link href="/pricing" className="hover:text-foreground no-underline">Pricing</Link>
          <Link href="/login" className="hover:text-foreground no-underline">Log in</Link>
        </div>
      </footer>
    </div>
  );
}

function PlaceholderCard({
  name,
  score,
  signal,
  line,
}: {
  name: string;
  score: string;
  signal: string;
  line: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 opacity-90">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 rounded-lg border border-border bg-sidebar flex items-center justify-center text-signal-green text-xs font-semibold">
          {name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground-heading">{name}</p>
          <p className="text-xs text-signal-green font-medium mt-0.5">Signal Score {score}</p>
          <p className="text-xs text-secondary mt-1">{signal} detected</p>
          <p className="text-xs text-muted-foreground mt-0.5">{line}</p>
        </div>
      </div>
    </div>
  );
}
