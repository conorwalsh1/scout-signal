import Link from "next/link";
import Image from "next/image";
import {
  getLandingCompaniesCount,
  getRadarSignalLabels,
  getSignalsTodayCount,
  getLatestSignalCompanies,
  getTopScoreCompanies,
} from "@/lib/landing-data";
import { LandingHeroWithRadar } from "@/components/landing/landing-hero-with-radar";
import { LandingBadges } from "@/components/landing/landing-badges";
import { CompanyLogo } from "@/components/company-logo";
import { BADGES, BADGE_STYLES, getCompanyBadgesForPlan, pickDisplayBadges } from "@/lib/badges";
import type { ScoreComponents } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [companiesCount, signalsToday, latestCompanies, topScoreCompanies, radarLabels] = await Promise.all([
    getLandingCompaniesCount(),
    getSignalsTodayCount(),
    getLatestSignalCompanies(3),
    getTopScoreCompanies(5),
    getRadarSignalLabels(6),
  ]);

  const displayCount = companiesCount > 0 ? companiesCount.toLocaleString() : "1,036";
  const signalsDisplay = signalsToday > 0 ? signalsToday : 47;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold text-foreground-heading no-underline">
            <Image
              src="/brand-mark.png"
              alt="Signal Scout"
              width={18}
              height={18}
              className="h-[18px] w-[18px] object-contain"
              priority
            />
            <span>Signal Scout</span>
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

      <LandingHeroWithRadar
        radarLabels={radarLabels}
        displayCount={displayCount}
        signalsDisplay={signalsDisplay}
      />

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
            <FlowStep
              step={1}
              title="Track"
              body="Keep tabs on multiple accounts without overload. One place for the signals you’d otherwise miss."
              icon={<IconRadar className="h-5 w-5 text-signal-green" />}
            />
            <FlowConnector variant="first" />
            <FlowStep
              step={2}
              title="Prioritise"
              body="See what’s worth acting on. Rank changes and hiring momentum so you focus on the right opportunities."
              icon={<IconBolt className="h-5 w-5 text-signal-green" />}
            />
            <FlowConnector variant="second" />
            <FlowStep
              step={3}
              title="Act"
              body="Know what changed, when it changed, and where it came from — then reach out at the right time."
              icon={<IconArrowOut className="h-5 w-5 text-signal-green" />}
            />
          </div>
        </div>
      </section>

      <LandingBadges />

      <section className="border-t border-border/50 bg-card/30 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-foreground-heading">What changed today</h2>
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
          <h2 className="text-2xl font-bold text-foreground-heading">Focus list (highest signal)</h2>
          <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
            {topScoreCompanies.length > 0 ? (
              topScoreCompanies.map((company, index) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="flex items-center justify-between border-b border-border/60 px-5 py-4 no-underline last:border-b-0 hover:bg-card/70"
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-sidebar flex items-center justify-center">
                      <CompanyLogo
                        name={company.name}
                        website={company.website}
                        domain={company.domain}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground-heading">{company.name}</p>
                      <p className="mt-1 text-xs text-signal-green">
                        Signal Score {(company.score / 10).toFixed(1)} · {company.latest_signal_label}
                      </p>
                      <p className="mt-1 truncate text-xs text-secondary">{company.insight_line}</p>
                      {(() => {
                        const badgeIds = pickDisplayBadges(
                          getCompanyBadgesForPlan(company.score_components_json as ScoreComponents, {
                            score: company.score,
                            plan: "free",
                          }),
                          3
                        );
                        if (badgeIds.length === 0) return null;

                        return (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {badgeIds.map((bid) => {
                              const label =
                                bid === "leadership_hire"
                                  ? "Exec signal"
                                  : BADGES.find((b) => b.id === bid)?.label ?? bid.replace(/_/g, " ");
                              const styleClass = BADGE_STYLES[bid] ?? "bg-muted/80 text-secondary border border-border";

                              return (
                                <span
                                  key={bid}
                                  className={[
                                    "inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
                                    styleClass,
                                  ].join(" ")}
                                >
                                  {label}
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="pl-4 text-sm font-semibold text-muted-foreground shrink-0">#{index + 1}</div>
                </Link>
              ))
            ) : (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Sign in to see the live focus list.
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link
            href="https://www.linkedin.com/in/scout-signal-1b78a63b7/"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/30 no-underline transition-colors hover:border-signal-green/40 hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Signal Scout on LinkedIn"
            title="Signal Scout on LinkedIn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6.94 8.5a1.56 1.56 0 1 1 0-3.12 1.56 1.56 0 0 1 0 3.12zM5.5 9.75h2.88v8.75H5.5zM10.25 9.75h2.75v1.2h.04c.38-.72 1.32-1.48 2.72-1.48 2.9 0 3.44 1.9 3.44 4.36v4.67h-2.88v-4.14c0-.99-.02-2.26-1.38-2.26-1.38 0-1.6 1.07-1.6 2.18v4.22h-2.89z" />
            </svg>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/pricing" className="hover:text-foreground no-underline">Pricing</Link>
            <Link href="/login" className="hover:text-foreground no-underline">Log in</Link>
            <Link href="/signup" className="hover:text-foreground no-underline">Sign up</Link>
          </div>
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

function FlowStep({
  step,
  title,
  body,
  icon,
}: {
  step: number;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 md:flex-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-signal-green/25 bg-background">
            <div className="absolute -inset-1 rounded-xl opacity-30 blur-md bg-gradient-to-r from-signal-green/0 via-signal-green/35 to-signal-green/0" />
            <div className="relative z-10">{icon}</div>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground-heading">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-secondary">{body}</p>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-signal-green/40 bg-[rgba(34,197,94,0.08)] px-2 py-1 text-xs font-semibold text-signal-green">
          {step}
        </div>
      </div>
    </div>
  );
}

function FlowConnector({ variant }: { variant: "first" | "second" }) {
  return (
    <>
      {/* Desktop: arrow connector between cards */}
      <div className="hidden md:flex w-28 items-center justify-center">
        <div className="relative h-10 w-full">
          {/* Base connector line (neutral; green highlight comes from the traveling overlay) */}
          <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-border via-signal-green/8 to-border" />
          {/* Travelling green highlight segment */}
          <div
            className={[
              "absolute left-1/2 top-1/2 h-0.5 w-full -translate-x-1/2 -translate-y-1/2 rounded-full",
              variant === "first" ? "flow-connector-travel-first" : "flow-connector-travel-second",
            ].join(" ")}
          />
        </div>
      </div>

      {/* Mobile: chevron down between stacked cards */}
      <div className="flex items-center justify-center md:hidden py-1 text-muted-foreground">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5 opacity-70">
          <path
            d="M5 7.5l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </>
  );
}

function IconRadar(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10 18c4.418 0 8-3.582 8-8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10 14c2.21 0 4-1.79 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M10 10l5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" />
    </svg>
  );
}

function IconBolt(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M11 1.5L4.5 11h5L9 18.5 15.5 9h-5L11 1.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconArrowOut(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 12l8-8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M11 4h5v5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 12.5v3A2.5 2.5 0 0 1 13.5 18h-9A2.5 2.5 0 0 1 2 15.5v-9A2.5 2.5 0 0 1 4.5 4h3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}
