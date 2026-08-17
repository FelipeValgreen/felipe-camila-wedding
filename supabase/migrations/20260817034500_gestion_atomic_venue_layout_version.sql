begin;

create or replace function public.create_venue_layout_version(
  p_name text,
  p_venue_name text,
  p_elements jsonb,
  p_reference_url text default null,
  p_notes text default null,
  p_template_key text default null,
  p_space_width_m numeric default 30,
  p_space_height_m numeric default 18,
  p_grid_step_m numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, security, pg_temp
as $$
declare
  v_role text;
  v_actor text;
  v_version integer;
  v_previous public.event_venue_layouts%rowtype;
  v_layout public.event_venue_layouts%rowtype;
begin
  v_role := security.get_my_role();
  if auth.uid() is null or v_role not in ('editor', 'owner') then
    raise exception 'FORBIDDEN';
  end if;

  if nullif(btrim(p_name), '') is null then
    raise exception 'NAME_REQUIRED';
  end if;
  if nullif(btrim(p_venue_name), '') is null then
    raise exception 'VENUE_NAME_REQUIRED';
  end if;
  if coalesce(jsonb_typeof(p_elements), 'null') <> 'array' then
    raise exception 'ELEMENTS_INVALID';
  end if;
  if p_space_width_m is null or p_space_width_m <= 0 or p_space_width_m > 500 then
    raise exception 'SPACE_WIDTH_INVALID';
  end if;
  if p_space_height_m is null or p_space_height_m <= 0 or p_space_height_m > 500 then
    raise exception 'SPACE_HEIGHT_INVALID';
  end if;
  if p_grid_step_m is null or p_grid_step_m <= 0 or p_grid_step_m > 25 then
    raise exception 'GRID_STEP_INVALID';
  end if;

  -- Serialize the full active-layout transition. If any later statement fails,
  -- PostgreSQL rolls back the archival and preserves the previous active layout.
  lock table public.event_venue_layouts in share row exclusive mode;

  select *
    into v_previous
    from public.event_venue_layouts
   where status = 'active'
   order by version desc
   limit 1;

  select coalesce(max(version), 0) + 1
    into v_version
    from public.event_venue_layouts;

  update public.event_venue_layouts
     set status = 'archived',
         updated_at = now()
   where status = 'active';

  insert into public.event_venue_layouts(
    name,
    venue_name,
    status,
    version,
    elements,
    reference_url,
    source,
    notes,
    space_width_m,
    space_height_m,
    grid_step_m,
    unit_system,
    template_key
  ) values (
    btrim(p_name),
    btrim(p_venue_name),
    'active',
    v_version,
    p_elements,
    nullif(btrim(coalesce(p_reference_url, '')), ''),
    'Centro de Gestión',
    nullif(btrim(coalesce(p_notes, '')), ''),
    p_space_width_m,
    p_space_height_m,
    p_grid_step_m,
    'metric',
    nullif(btrim(coalesce(p_template_key, '')), '')
  ) returning * into v_layout;

  v_actor := coalesce(auth.jwt() ->> 'email', auth.uid()::text);

  insert into public.audit_log(
    entity_type,
    entity_id,
    action,
    before_data,
    after_data,
    actor,
    origin
  ) values (
    'event_venue_layouts',
    v_layout.id,
    'CREATE_VENUE_LAYOUT_VERSION',
    case when v_previous.id is null then null else to_jsonb(v_previous) end,
    to_jsonb(v_layout),
    v_actor,
    'dashboard'
  );

  return to_jsonb(v_layout);
end;
$$;

revoke all on function public.create_venue_layout_version(text,text,jsonb,text,text,text,numeric,numeric,numeric) from public;
revoke all on function public.create_venue_layout_version(text,text,jsonb,text,text,text,numeric,numeric,numeric) from anon;
grant execute on function public.create_venue_layout_version(text,text,jsonb,text,text,text,numeric,numeric,numeric) to authenticated;

commit;
