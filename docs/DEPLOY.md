# Scout Signal — Deployment Checklist

Use this checklist for Phase 11 (Deploy and Seed Real Data). For **local development** and fixing the "Could not find the table 'public.users'" error, see [SETUP.md](./SETUP.md).

## 1. Deploy web app (Vercel)

- Connect the repo to Vercel and deploy the Next.js app.
- Ensure build command is `npm run build` and output is the default Next.js app.

## 2. Production database (Supabase)

- Create a production Supabase project (or use existing).
- Run migrations in order:
  - `supabase/migrations/20240314000000_initial_schema.sql`
  - `supabase/migrations/20240314000001_rls_policies.sql`
- Optionally use Supabase CLI: `supabase db push` or run the SQL in the Dashboard SQL editor.

## 3. Environment variables

Set these in Vercel (and in any environment where workers run):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server/workers only) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL, e.g. `https://signalscoutradar.com` (used for Stripe Checkout return URLs; can reduce 403 on checkout.stripe.com) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_BASIC_PRICE_ID` | Stripe Price ID for Basic plan |
| `STRIPE_PRO_PRICE_ID` | Stripe Price ID for Pro plan |

For local workers, copy `.env.local.example` to `.env.local` and fill in the same values.

## 4. Worker schedules

Workers do not run inside Vercel by default. Options:

- **Vercel Cron**: Create API routes that invoke the worker logic (e.g. `GET /api/cron/ingest`) and add them to `vercel.json` `crons`. Use a secret in the request to protect the endpoint.
- **External scheduler**: Run `npm run worker:ingest`, `npm run worker:signals`, `npm run worker:score` on a schedule (e.g. GitHub Actions, Render cron, or a small always-on worker).

Run order: ingest → signals → score. Suggested cadence: ingest every 30–60 min, signals after ingest, score every hour.

## 5. Seed data

- Run the seed script once to populate demo data (best on a fresh DB or after clearing demo companies):
  ```bash
  npm run db:seed
  ```
  This inserts 3 demo companies, events, signals, and company_scores so the dashboard shows ranked companies.
- Or implement a real connector in `lib/connectors/career-pages.ts` (or add a new connector) and run the ingestion worker.

## 6. Stripe (production)

- Create Pro product and recurring price in Stripe Dashboard.
- Set `STRIPE_BASIC_PRICE_ID` to the Basic recurring price ID.
- Set `STRIPE_PRO_PRICE_ID` to the Pro recurring price ID.
- Add webhook endpoint: `https://your-domain.com/api/stripe/webhook`.
- Subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Set `STRIPE_WEBHOOK_SECRET` from the webhook’s signing secret.

## 7. Smoke test

After deploy, verify:

1. Sign up and log in.
2. Open dashboard (with or without seed data).
3. Open a company detail page (if any companies exist).
4. Save a company and check /saved.
5. Account page shows plan; upgrade from /pricing goes to Stripe Checkout.
6. After test payment, webhook updates plan and Pro limits apply.

## 8. Tag release

- Tag the release (e.g. `v0.1.0`) after a successful production smoke test.
