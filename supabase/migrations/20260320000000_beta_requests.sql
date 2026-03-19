-- Landing beta capture: store requested emails for Pro unlock later.
create table if not exists public.beta_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  agency_name text not null,
  created_at timestamptz not null default now(),
  activated_at timestamptz null
);

create index if not exists index_beta_requests_activated_at on public.beta_requests (activated_at);

alter table public.beta_requests enable row level security;
-- No policies required for service-role writes (API route). Admin/activation can use service role.

