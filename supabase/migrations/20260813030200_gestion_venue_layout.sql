-- Versioned, editable venue layout for the management application.

create table if not exists public.event_venue_layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue_name text not null default 'Arboleda Chicureo',
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  version integer not null default 1,
  elements jsonb not null default '[]'::jsonb,
  reference_url text,
  source text not null default 'Centro de Gestión',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists event_venue_layouts_active_unique
  on public.event_venue_layouts((status))
  where status = 'active';

alter table public.event_venue_layouts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_venue_layouts'
      and policyname = 'Auth Select event_venue_layouts'
  ) then
    create policy "Auth Select event_venue_layouts"
      on public.event_venue_layouts
      for select to authenticated
      using ((select security.get_my_role()) is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_venue_layouts'
      and policyname = 'Auth Insert event_venue_layouts'
  ) then
    create policy "Auth Insert event_venue_layouts"
      on public.event_venue_layouts
      for insert to authenticated
      with check ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_venue_layouts'
      and policyname = 'Auth Update event_venue_layouts'
  ) then
    create policy "Auth Update event_venue_layouts"
      on public.event_venue_layouts
      for update to authenticated
      using ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]))
      with check ((select security.get_my_role()) = any(array['editor'::text, 'owner'::text]));
  end if;
end
$$;

-- Non-personal default layout. If an active layout already exists, keep it.
insert into public.event_venue_layouts (
  name, venue_name, status, version, elements, reference_url, source, notes
)
select
  'Arboleda · Base operativa',
  'Arboleda Chicureo',
  'active',
  1,
  '[
    {"id":"stage-main","kind":"stage","label":"Escenario / DJ","x":55,"y":11,"width":25,"height":8,"rotation":0,"locked":false},
    {"id":"dance-main","kind":"dance","label":"Pista de baile","x":58,"y":52,"width":28,"height":28,"rotation":45,"locked":false},
    {"id":"bar-main","kind":"bar","label":"Bar / apoyo","x":11,"y":48,"width":10,"height":27,"rotation":0,"locked":false},
    {"id":"entrance-main","kind":"entrance","label":"Acceso","x":87,"y":84,"width":15,"height":7,"rotation":0,"locked":false},
    {"id":"cocktail-main","kind":"cocktail","label":"Cocktail / recepción","x":21,"y":18,"width":19,"height":10,"rotation":0,"locked":false}
  ]'::jsonb,
  'https://static.wixstatic.com/media/85640d_53a2c4d7c999494dbba4bc95c126c80b~mv2.png/v1/fill/w_990%2Ch_655%2Cal_c%2Cq_90%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/PLANO%20ARBOLEDA345.png',
  'Arboleda oficial + Centro de Gestión',
  'Base editable. La referencia oficial no implica que la distribución interior sea definitiva.'
where not exists (
  select 1 from public.event_venue_layouts where status = 'active'
);
