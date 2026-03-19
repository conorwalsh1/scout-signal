create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  trigger_source text not null,
  status text not null,
  deployment_host text null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists index_cron_runs_job_name on public.cron_runs (job_name);
create index if not exists index_cron_runs_started_at on public.cron_runs (started_at desc);

