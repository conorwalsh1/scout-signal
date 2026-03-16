# Scout Signal — Local setup

Use this when running the app locally. If you see **"Could not find the table 'public.users' in the schema cache"**, the database schema is missing: run the steps below.

## 1. Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set at least:

- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key  
- `SUPABASE_SERVICE_KEY` — service role key (for workers, seed script, and landing-page company count)  
- `ADMIN_EMAIL` — (optional) email of the admin user. Sign up via the app, then set this to that email. Admin sees all companies (no plan limit) and can delete companies.
- `CRON_SECRET` — (optional) secret for `/api/cron/ingest`. If set, requests must send `Authorization: Bearer <CRON_SECRET>`. On Vercel, set this in project env so cron triggers are authorized.

## 2. Database schema (required)

Create the tables in your Supabase project by running the migrations.

**Option A — Supabase Dashboard (one shot)**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Open `supabase/apply-schema.sql` in this repo, copy **all** of its contents, paste into the SQL editor, and click **Run**.

**Option B — Supabase CLI**

If the project is linked:

```bash
supabase db push
```

## 2b. company_sources (only for older databases)

New installs already get `company_sources` from `supabase/apply-schema.sql`.

If your database was created before this change and you want to import the FT1000 list, run `supabase/migrations/20240315000000_company_sources.sql` in Supabase Dashboard → SQL Editor (or use `supabase db push`).

## 3. Seed (optional)

To get demo companies and scores on the dashboard:

```bash
npm run db:seed
```

## 4. Run the app

```bash
npm install
npm run dev
```

Then open the app, sign up or log in, and open the dashboard.

## 5. Feed real data (optional)

The seed script (`npm run db:seed`) only adds three demo companies (Acme Corp, Beta Labs, Gamma Inc). To add **real** companies from Greenhouse job boards, FT1000-style career pages, and funding news, run the full worker pipeline once (workers read from `.env.local` automatically):

Before the first run, seed the monitored source registry:

```bash
npm run db:seed-sources
```

```bash
npm run worker:all
```

Or run step by step:

```bash
npm run worker:ingest   # Fetch from Greenhouse, FT1000-style list, funding RSS → insert events
npm run worker:signals  # Turn events into signals (job_post, funding_event, hiring_spike)
npm run worker:score    # Recalculate company scores for the dashboard
```

Then refresh the dashboard: you should see companies like Stripe, Notion, Figma, Moneybox, and funding headlines alongside the seed data.

- **FT1000 career** (`lib/connectors/ft1000-careers.ts`): List of European fast-growing companies; fetches career pages and infers job counts.
- **Greenhouse hiring** (`lib/connectors/greenhouse-hiring.ts`): Public Greenhouse API for companies like Stripe, Notion, Figma; emits job-post events.
- **Lever hiring** (`lib/connectors/lever-hiring.ts`): Public Lever postings for companies like Monzo, Moneybox, and Zilch.
- **Ashby hiring** (`lib/connectors/ashby-hiring.ts`): Public Ashby boards where available.
- **Funding news** (`lib/connectors/funding-news.ts`): Parses TechCrunch and VentureBeat RSS for funding headlines and extracts company names; emits funding events.

### Monitored source registry

ATS targets now live in the database instead of only in code.

- Apply `supabase/migrations/20260316000001_monitored_sources.sql` if your DB predates this change.
- Seed default sources with `npm run db:seed-sources`.
- Review source health in the admin UI at `/admin/source-registry`.

The worker updates each monitored source with:

- `last_checked_at`
- `last_status`
- `last_result_count`

You can also discover additional supported ATS boards from company websites:

```bash
npm run db:discover-sources -- --limit 25
```

This scans company homepages and common career paths for supported ATS links and upserts any detected:

- `greenhouse_hiring`
- `lever_hiring`
- `ashby_hiring`

### Import FT1000 (1000 companies)

1. If your database was created before this change, apply the `company_sources` migration from step 2b above.
2. Generate `scripts/data/ft1000.json` automatically with `npm run db:fetch-ft1000`, or add your own file with rows like `[{ "name": "...", "domain": "...", "website": "...", "rank": 1 }]`.
3. Run `npm run db:import-ft1000`.
4. Or use a custom file: `npm run db:import-ft1000 -- --file path/to/ft1000.json`.

This imports companies into `companies`, links each one in `company_sources` with `source_type = 'ft1000'`, and ensures each company has a `company_scores` row so it appears on the dashboard.

## 6. Scheduled pipeline (cron)

The pipeline (ingest → signals → score) can run on a schedule so the dashboard stays fresh without manual `npm run worker:all`.

**On Vercel:** `vercel.json` defines a cron that hits `GET /api/cron/ingest` every 45 minutes. Set `CRON_SECRET` in the project’s Environment Variables; Vercel sends it when invoking the cron. The route runs the same logic as `worker:ingest`, `worker:signals`, and `worker:score` in sequence.

**Locally or other hosts:** Trigger the pipeline by calling the API with the secret (if `CRON_SECRET` is set):

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/cron/ingest
```

Or keep running `npm run worker:all` on a schedule (e.g. system cron every 30–60 minutes).

See [DEPLOY.md](./DEPLOY.md) for production deployment.

## 7. Backfilling missing company websites

Companies imported without a `website` or `domain` (e.g. from FT1000 JSON that has no URLs) can be filled in so records stay legit and logos/links work.

**Step 1 — From events (no API key)**  
Uses existing event data (e.g. career-page URLs) to set `website`/`domain` where the event URL is a company site (not news or job boards):

```bash
npm run db:backfill-websites
```

Use `--dry-run` to only log what would be updated:

```bash
npx tsx scripts/backfill-website-from-events.ts --dry-run
```

**Step 2 — Search enrichment (needs SERPAPI_KEY or DuckDuckGo)**  
Fills the rest by searching for “[company name] official website”, validating the result, and updating the `companies` table. When a result is found, **every** company with the same name in the DB is updated (not just one per name). Set `SERPAPI_KEY` in `.env.local` for Google search; otherwise the script falls back to DuckDuckGo.

```bash
npm run db:enrich-web
```

Options:

- `--limit N` — process only the next N groups (e.g. `--limit 100`).
- `--offset N` — start at group index N.
- `--resume` — continue from last checkpoint (stored in `scripts/data/enrich-web-progress.json`).
- `--dry-run` — log updates only; do not write to the DB.

Example: process 50 groups, then resume later for the rest:

```bash
npm run db:enrich-web -- --limit 50
npm run db:enrich-web -- --resume
```

## Troubleshooting

### No hiring signals detected / all companies show score 0

Signals come from the **pipeline**: ingestion (job boards, funding RSS) → events → signals → company scores. You must run it at least once:

1. **Locally:** From the project root run `npm run worker:all`. Check the console: ingestion logs how many events were **inserted** vs **skipped (already exist)**. If you see `totalInserted: 0` and `totalSkippedAlreadyExist: 20` (or similar), events are already in the DB and signals/scores should exist from a previous run; if you see `totalInserted: 20` (or more), the run added new events and the signals/score steps will have updated the dashboard.
2. **On Vercel:** The cron hits `/api/cron/ingest` every 45 minutes. Ensure `CRON_SECRET` and `SUPABASE_SERVICE_KEY` are set in the project’s Environment Variables so the pipeline can run.

After a successful run, refresh the dashboard; companies with job posts (e.g. from Greenhouse) or funding news should show non-zero scores and signal badges.

### "Cannot find module './vendor-chunks/next.js'" when opening a company page (dev)

This can happen in **dev** when clicking a company from the dashboard. The app includes an instrumentation hook (`instrumentation.js`) that patches Node’s module resolution so vendor chunks load from `.next/server`. Ensure `experimental.instrumentationHook: true` is set in `next.config.js` (it is by default in this repo). If the error persists, use production for that flow: `npm run build && npm run start`.
