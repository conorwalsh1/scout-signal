import Link from "next/link";
import {
  getLandingCompaniesCount,
  getRadarSignalLabels,
  getSignalsTodayCount,
  getLatestSignalCompanies,
  getTopScoreCompanies,
} from "@/lib/landing-data";
import { LandingHeroWithRadar } from "@/components/landing/landing-hero-with-radar";
import { LandingBadges } from "@/components/landing/landing-badges";
import { LandingCompanyCard } from "@/components/landing/landing-company-card";
import { CompanyLogo } from "@/components/company-logo";

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
            <FlowConnector />
            <FlowStep
              step={2}
              title="Prioritise"
              body="See what’s worth acting on. Rank changes and hiring momentum so you focus on the right opportunities."
              icon={<IconBolt className="h-5 w-5 text-signal-green" />}
            />
            <FlowConnector />
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
                <LandingCompanyCard key={company.id} company={company} plan="free" />
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
                <div
                  key={company.id}
                  className="flex items-center justify-between border-b border-border/60 px-5 py-4 last:border-b-0"
                >
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-border bg-sidebar flex items-center justify-center">
                      <CompanyLogo name={company.name} website={company.website} domain={company.domain} className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground-heading">{company.name}</p>
                      <p className="mt-1 text-xs text-signal-green">
                        Signal Score {(company.score / 10).toFixed(1)} · {company.latest_signal_label}
                      </p>
                      <p className="mt-1 truncate text-xs text-secondary">{company.insight_line}</p>
                    </div>
                  </div>
                  <div className="pl-4 text-sm font-semibold text-muted-foreground">#{index + 1}</div>
                </div>
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
        <div className="shrink-0 rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground">
          {step}
        </div>
      </div>
    </div>
  );
}

function FlowConnector() {
  return (
    <>
      {/* Desktop: arrow connector between cards */}
      <div className="hidden md:flex w-16 items-center justify-center">
        <div className="relative h-10 w-full">
          <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-border via-signal-green/60 to-border" />
          {/* Travelling pulse */}
          <div className="absolute left-0 top-1/2 h-2.5 w-2.5 rounded-full bg-signal-green/90 flow-pulse-dot" />
          <div className="absolute left-0 top-1/2 h-5 w-5 rounded-full bg-signal-green/30 blur-md flow-pulse-dot" />
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
