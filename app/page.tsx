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
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          <InfoCard
            title="Track"
            body="Keep tabs on multiple accounts without overload. One place for the signals you’d otherwise miss."
          />
          <InfoCard
            title="Prioritise"
            body="See what’s worth acting on. Rank changes and hiring momentum so you focus on the right opportunities."
          />
          <InfoCard
            title="Act"
            body="Know what changed, when it changed, and where it came from — then reach out at the right time."
          />
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
