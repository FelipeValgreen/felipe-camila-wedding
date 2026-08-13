-- Canonical relationship groups for seating intelligence.
-- IMPORTANT: this public repository intentionally contains no guest names,
-- phone numbers or relationship seed data. Runtime data is managed privately.

create table if not exists public.guest_relationship_groups (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  name text not null,
  link_type text not null default 'Familia',
  confidence text not null default 'confirmed'
    check (confidence in ('confirmed', 'probable')),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_relationship_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.guest_relationship_groups(id) on delete cascade,
  guest_id uuid references public.wedding_guests(id) on delete set null,
  person_name text not null,
  relation text,
  rsvp_status text,
  source_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, person_name)
);

create index if not exists guest_relationship_members_guest_id_idx
  on public.guest_relationship_members(guest_id);

create index if not exists guest_relationship_groups_status_idx
  on public.guest_relationship_groups(status, confidence);

alter table public.guest_relationship_groups enable row level security;
alter table public.guest_relationship_members enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guest_relationship_groups'
      and policyname = 'Auth Select guest_relationship_groups'
  ) then
    create policy "Auth Select guest_relationship_groups"
      on public.guest_relationship_groups
      for select to authenticated
      using ((select security.get_my_role()) is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guest_relationship_groups'
      and policyname = 'Auth Insert guest_relationship_groups'
  ) then
    create policy "Auth Insert guest_relationship_groups"
      on public.guest_relationship_groups
      for insert to authenticated
      with check ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guest_relationship_groups'
      and policyname = 'Auth Update guest_relationship_groups'
  ) then
    create policy "Auth Update guest_relationship_groups"
      on public.guest_relationship_groups
      for update to authenticated
      using ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]))
      with check ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guest_relationship_groups'
      and policyname = 'Auth Delete guest_relationship_groups'
  ) then
    create policy "Auth Delete guest_relationship_groups"
      on public.guest_relationship_groups
      for delete to authenticated
      using ((select security.get_my_role()) = 'owner'::text);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guest_relationship_members'
      and policyname = 'Auth Select guest_relationship_members'
  ) then
    create policy "Auth Select guest_relationship_members"
      on public.guest_relationship_members
      for select to authenticated
      using ((select security.get_my_role()) is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guest_relationship_members'
      and policyname = 'Auth Insert guest_relationship_members'
  ) then
    create policy "Auth Insert guest_relationship_members"
      on public.guest_relationship_members
      for insert to authenticated
      with check ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guest_relationship_members'
      and policyname = 'Auth Update guest_relationship_members'
  ) then
    create policy "Auth Update guest_relationship_members"
      on public.guest_relationship_members
      for update to authenticated
      using ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]))
      with check ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'guest_relationship_members'
      and policyname = 'Auth Delete guest_relationship_members'
  ) then
    create policy "Auth Delete guest_relationship_members"
      on public.guest_relationship_members
      for delete to authenticated
      using ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]));
  end if;
end
$$;
