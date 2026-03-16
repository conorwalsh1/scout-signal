# Data files for scripts

## FT1000 import

- **`ft1000.json`** — Put your full FT1000 list here (1000 companies). Not committed; create from FT data or your own source.
- **`ft1000.sample.json`** — Example shape for one row.

If you do not want to build `ft1000.json` by hand, try:

```bash
npm run db:fetch-ft1000
```

This attempts to fetch the latest fully published ranking page and write `scripts/data/ft1000.json` automatically. You can override the source URL with:

```bash
npm run db:fetch-ft1000 -- --url https://example.com/ft1000-page
```

Each row must be an object with:

- `name` (string, required)
- `domain` (string, optional) — unique per company; used to dedupe
- `website` (string, optional)
- `rank` (number, optional) — FT1000 rank, stored in `company_sources.metadata_json` and `source_external_id`

**Before running the import**, only older databases need the extra migration. New installs already get `company_sources` from `supabase/apply-schema.sql`. If your DB predates this change, run `supabase/migrations/20240315000000_company_sources.sql` in Supabase Dashboard → SQL Editor (or run `supabase db push` if using the CLI).

Then run the import:

```bash
npm run db:fetch-ft1000
npm run db:import-ft1000
# or with a custom file:
npm run db:import-ft1000 -- --file path/to/ft1000.json
```

This inserts into `companies` and `company_sources` (source_type `ft1000`), and ensures each company has a `company_scores` row (score 0) so they appear on the dashboard.
