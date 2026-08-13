-- Wedding Planning OS V3: scale-aware venue, production vendors and durable AI memory.
-- Additive migration only. No event PII or business records are seeded here.

alter table public.event_venue_layouts
  add column if not exists space_width_m numeric(8,2) not null default 30.00,
  add column if not exists space_height_m numeric(8,2) not null default 18.00,
  add column if not exists grid_step_m numeric(6,2) not null default 1.00,
  add column if not exists unit_system text not null default 'metric',
  add column if not exists template_key text;

alter table public.event_venue_layouts
  drop constraint if exists event_venue_layouts_positive_dimensions;
alter table public.event_venue_layouts
  add constraint event_venue_layouts_positive_dimensions
  check (space_width_m > 0 and space_height_m > 0 and grid_step_m > 0);

alter table public.vendors
  add column if not exists day_of_contact text,
  add column if not exists arrival_at timestamptz,
  add column if not exists setup_at timestamptz,
  add column if not exists teardown_at timestamptz,
  add column if not exists location text,
  add column if not exists deliverables jsonb not null default '[]'::jsonb,
  add column if not exists equipment jsonb not null default '[]'::jsonb,
  add column if not exists technical_requirements text,
  add column if not exists contract_url text,
  add column if not exists production_status text not null default 'Por coordinar';

alter table public.event_music_items
  add column if not exists act_type text not null default 'General',
  add column if not exists set_name text,
  add column if not exists vendor_id uuid references public.vendors(id) on delete set null,
  add column if not exists technical_notes text;

create index if not exists event_music_items_vendor_idx
  on public.event_music_items(vendor_id);

create table if not exists public.event_memory (
  id uuid primary key default gen_random_uuid(),
  memory_type text not null check (memory_type in ('fact','decision','preference','relationship','constraint','rejected_option','learning')),
  subject_type text not null default 'event',
  subject_id text,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  confidence text not null default 'confirmed' check (confidence in ('confirmed','probable','inferred')),
  source text not null default 'Centro de Gestión',
  source_ref text,
  status text not null default 'active' check (status in ('active','superseded','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_memory_active_idx on public.event_memory(status, memory_type);
create index if not exists event_memory_subject_idx on public.event_memory(subject_type, subject_id);

alter table public.event_memory enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_memory' and policyname='Auth Select event_memory'
  ) then
    create policy "Auth Select event_memory" on public.event_memory
      for select to authenticated
      using ((select security.get_my_role()) is not null);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_memory' and policyname='Auth Insert event_memory'
  ) then
    create policy "Auth Insert event_memory" on public.event_memory
      for insert to authenticated
      with check ((select security.get_my_role()) = any(array['editor'::text,'owner'::text]));
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='event_memory' and policyname='Auth Update event_memory'
  ) then
    create policy "Auth Update event_memory" on public.event_memory
      for update to authenticated
      using ((select security.get_my_role()) = any(array['editor'::text,'owner'::text]))
      with check ((select security.get_my_role()) = any(array['editor'::text,'owner'::text]));
  end if;
end
$$;

create table if not exists public.copilot_review_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  last_reviewed_at timestamptz not null default now(),
  last_snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, domain)
);

alter table public.copilot_review_state enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='copilot_review_state' and policyname='Own Select copilot_review_state'
  ) then
    create policy "Own Select copilot_review_state" on public.copilot_review_state
      for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='copilot_review_state' and policyname='Own Insert copilot_review_state'
  ) then
    create policy "Own Insert copilot_review_state" on public.copilot_review_state
      for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='copilot_review_state' and policyname='Own Update copilot_review_state'
  ) then
    create policy "Own Update copilot_review_state" on public.copilot_review_state
      for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end
$$;
