-- Plot Twist V1 isolated schema. Safe additive migration.
create extension if not exists pgcrypto;

create table if not exists public.plot_twist_games (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 title text not null default 'Plot Twist',
 status text not null default 'draft' check (status in ('draft','lobby','live','locked','reveal','ended')),
 current_stage_key text,
 readiness_threshold numeric(4,3) not null default .75 check (readiness_threshold between 0 and 1),
 config jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.plot_twist_tables (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 wedding_table_id uuid references public.wedding_tables(id) on delete set null,
 join_token_hash text not null, join_code_hash text, team_name text, ready boolean not null default false,
 score_cache integer not null default 0, secret_score_cache integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(game_id,wedding_table_id), unique(game_id,join_token_hash)
);
create table if not exists public.plot_twist_players (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 table_id uuid not null references public.plot_twist_tables(id) on delete cascade,
 nickname text not null, device_token_hash text not null,
 role text not null default 'spectator' check (role in ('complice','dupla','spectator')),
 active boolean not null default true, last_seen_at timestamptz not null default now(), created_at timestamptz not null default now(),
 unique(game_id,device_token_hash)
);
create unique index if not exists plot_twist_one_complice_per_table on public.plot_twist_players(table_id) where role='complice' and active;
create unique index if not exists plot_twist_one_dupla_per_table on public.plot_twist_players(table_id) where role='dupla' and active;

create table if not exists public.plot_twist_stages (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 stage_key text not null, position integer not null, type text not null,
 status text not null default 'draft' check(status in ('draft','queued','open','resolving','revealed','closed')),
 payload jsonb not null default '{}'::jsonb, opened_at timestamptz, closes_at timestamptz, created_at timestamptz not null default now(),
 unique(game_id,stage_key), unique(game_id,position)
);
create table if not exists public.plot_twist_actions (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 stage_id uuid not null references public.plot_twist_stages(id) on delete cascade,
 table_id uuid not null references public.plot_twist_tables(id) on delete cascade,
 player_id uuid references public.plot_twist_players(id) on delete set null,
 kind text not null, payload jsonb not null default '{}'::jsonb,
 status text not null default 'accepted' check(status in ('pending','accepted','rejected','superseded')),
 idempotency_key uuid not null, client_created_at timestamptz, created_at timestamptz not null default now(),
 unique(game_id,idempotency_key)
);
create unique index if not exists plot_twist_one_table_decision_per_stage on public.plot_twist_actions(stage_id,table_id,kind) where status='accepted' and kind='table_decision';

create table if not exists public.plot_twist_score_ledger (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 table_id uuid not null references public.plot_twist_tables(id) on delete cascade,
 action_id uuid references public.plot_twist_actions(id) on delete set null,
 delta integer not null, secret_delta integer not null default 0, reason text not null,
 idempotency_key uuid not null unique, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.plot_twist_events (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 table_id uuid references public.plot_twist_tables(id) on delete cascade,
 event_type text not null, visibility text not null default 'public' check(visibility in ('public','table','operator','hidden')),
 payload jsonb not null default '{}'::jsonb, reveal_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.plot_twist_moments (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 moment_key text not null, title text not null, instructions text not null, bonus_points integer not null default 0,
 active boolean not null default false, config jsonb not null default '{}'::jsonb, unique(game_id,moment_key)
);
create table if not exists public.plot_twist_media (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 table_id uuid not null references public.plot_twist_tables(id) on delete cascade,
 player_id uuid references public.plot_twist_players(id) on delete set null,
 moment_id uuid references public.plot_twist_moments(id) on delete set null,
 storage_bucket text not null default 'wedding-photos', storage_path text not null,
 media_type text not null default 'image', status text not null default 'pending_review' check(status in ('local_pending','uploaded','pending_review','visible','hidden')),
 score_awarded integer not null default 0, idempotency_key uuid not null unique, created_at timestamptz not null default now()
);
create table if not exists public.plot_twist_powers (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 owner_table_id uuid not null references public.plot_twist_tables(id) on delete cascade,
 target_table_id uuid references public.plot_twist_tables(id) on delete set null,
 power_key text not null, status text not null default 'available' check(status in ('available','reserved','used','expired','void')),
 payload jsonb not null default '{}'::jsonb, used_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.plot_twist_spins (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 table_id uuid not null references public.plot_twist_tables(id) on delete cascade,
 player_id uuid references public.plot_twist_players(id) on delete set null,
 result_key text not null, result_payload jsonb not null default '{}'::jsonb, idempotency_key uuid not null unique, created_at timestamptz not null default now()
);
create table if not exists public.plot_twist_reactions (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.plot_twist_events(id) on delete cascade,
 player_id uuid not null references public.plot_twist_players(id) on delete cascade,
 emoji text not null check(emoji in ('😂','❤️','🔥')), created_at timestamptz not null default now(), unique(event_id,player_id)
);
create table if not exists public.plot_twist_operator_log (
 id uuid primary key default gen_random_uuid(), game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 actor text not null, action text not null, payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.plot_twist_games enable row level security;
alter table public.plot_twist_tables enable row level security;
alter table public.plot_twist_players enable row level security;
alter table public.plot_twist_stages enable row level security;
alter table public.plot_twist_actions enable row level security;
alter table public.plot_twist_score_ledger enable row level security;
alter table public.plot_twist_events enable row level security;
alter table public.plot_twist_moments enable row level security;
alter table public.plot_twist_media enable row level security;
alter table public.plot_twist_powers enable row level security;
alter table public.plot_twist_spins enable row level security;
alter table public.plot_twist_reactions enable row level security;
alter table public.plot_twist_operator_log enable row level security;

-- No anon policies intentionally: guest writes will go through narrowly scoped server/API/RPC logic.
comment on table public.plot_twist_score_ledger is '[PLOT TWIST] Append-only source of truth for visible and hidden scoring. Corrections are compensating entries.';
comment on table public.plot_twist_actions is '[PLOT TWIST] Idempotent player/table actions. Do not trust client scoring.';
