-- Wedding experience requests: no public access to personal data.
create table if not exists public.wedding_experience_requests (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('raspe','complice','civil_prize')),
 claimant_name text not null check(char_length(claimant_name) between 2 and 120),
 table_number integer check(table_number between 1 and 23),
 category text,
 details jsonb not null default '{}'::jsonb,
 status text not null default 'pending' check(status in ('pending','approved','rejected','fulfilled')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewer_note text
);
create index if not exists wedding_requests_kind_status_idx on public.wedding_experience_requests(kind,status,created_at desc);
alter table public.wedding_experience_requests enable row level security;
revoke all on public.wedding_experience_requests from anon,authenticated;
-- Only server-side service role may access; never expose rows through public API.
