# Friday LinkedIn post — top funded opportunities

## What it is

A weekly post listing the **top 25 companies by global Signal Scout rank** (`company_scores.rank_position`) with funding-first commentary for recruiters. Same ordering as your in-app “sort by rank” feed.

## Before you post

1. **Refresh scores** so ranks are current (e.g. after your cron or manually):
   - `npm run worker:ingest` → `npm run worker:signals` → `npm run worker:score`  
   - Or your Vercel cron sequence.

2. **Generate copy** (from project root):

   ```bash
   npm run linkedin:weekly-draft
   ```

3. **Optional**: pass a different count (default 25):

   ```bash
   npx tsx scripts/linkedin-weekly-top25.ts 15
   ```

4. Output is printed to the terminal and saved under:

   `docs/generated/linkedin-weekly-top25-YYYY-MM-DD.txt`

5. **Paste into LinkedIn** as an article or long post. Edit the hook or hashtags to match your voice.

6. Set **`NEXT_PUBLIC_APP_URL`** in `.env.local` to your live site so the CTA link in the draft is correct.

## LinkedIn automation

Personal LinkedIn posts are not reliably automatable without LinkedIn’s APIs / partner tools. The practical workflow is: **generate draft Friday morning → paste → publish**.

## Compliance / tone

- Keep a short disclaimer (included in the template): signals are from public sources; not financial advice.
- Don’t imply guaranteed hiring or revenue outcomes.
