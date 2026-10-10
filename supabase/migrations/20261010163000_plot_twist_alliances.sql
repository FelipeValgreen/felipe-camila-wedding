-- PLOT TWIST: draft social links, not deployed. Test with isolated Supabase first.
create table if not exists public.plot_twist_alliances (
 id uuid primary key default gen_random_uuid(),
 game_id uuid not null references public.plot_twist_games(id) on delete cascade,
 source_table_id uuid not null references public.plot_twist_tables(id) on delete cascade,
 target_table_id uuid not null references public.plot_twist_tables(id) on delete cascade,
 created_by uuid not null references public.plot_twist_players(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined','expired')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '8 minutes'),
 resolved_at timestamptz,
 check(source_table_id<>target_table_id)
);
create unique index if not exists plot_twist_unique_pending_alliance
 on public.plot_twist_alliances(game_id,source_table_id,target_table_id)
 where status='pending';
create index if not exists plot_twist_alliances_target_pending
 on public.plot_twist_alliances(target_table_id,status,expires_at);
alter table public.plot_twist_alliances enable row level security;
-- No anon policies. Backend service role only.
create or replace function public.plot_twist_alliance_action(
 p_game_id uuid,p_player_id uuid,p_action text,p_target_table_id uuid default null,p_alliance_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare p record; a record; t record; g record;
begin
 select * into p from public.plot_twist_players where id=p_player_id and game_id=p_game_id
  and active and role in ('complice','dupla');
 if p.id is null then raise exception 'ROLE_REQUIRED'; end if;
 select * into g from public.plot_twist_games where id=p_game_id;
 if g.status not in ('lobby','live') then raise exception 'GAME_NOT_ACTIVE'; end if;
 if p_action='invite' then
  select * into t from public.plot_twist_tables
   where id=p_target_table_id and game_id=p_game_id and id<>p.table_id;
  if t.id is null then raise exception 'INVALID_TARGET_TABLE'; end if;
  -- Prevent duplicate or reverse-direction pending invitations.
  perform pg_advisory_xact_lock(hashtext(p_game_id::text||least(p.table_id,p_target_table_id)::text||greatest(p.table_id,p_target_table_id)::text));
  -- Clear expired pending rows before unique-index insertion.
  update public.plot_twist_alliances set status='expired',resolved_at=now()
   where game_id=p_game_id and status='pending' and expires_at<=now()
    and ((source_table_id=p.table_id and target_table_id=p_target_table_id)
     or (source_table_id=p_target_table_id and target_table_id=p.table_id));
  select * into a from public.plot_twist_alliances
   where game_id=p_game_id and status='pending' and expires_at>now()
    and ((source_table_id=p.table_id and target_table_id=p_target_table_id)
     or (source_table_id=p_target_table_id and target_table_id=p.table_id)) limit 1;
  if a.id is not null then return jsonb_build_object('id',a.id,'status',a.status,'replayed',true); end if;
  insert into public.plot_twist_alliances(game_id,source_table_id,target_table_id,created_by)
   values(p_game_id,p.table_id,p_target_table_id,p_player_id) returning * into a;
 elsif p_action in ('accept','decline') then
  select * into a from public.plot_twist_alliances
   where id=p_alliance_id and game_id=p_game_id and target_table_id=p.table_id for update;
  if a.id is null then raise exception 'ALLIANCE_NOT_FOUND'; end if;
  if a.status<>'pending' then return jsonb_build_object('id',a.id,'status',a.status,'replayed',true); end if;
  if a.expires_at<=now() then
   update public.plot_twist_alliances set status='expired',resolved_at=now() where id=a.id;
   return jsonb_build_object('id',a.id,'status','expired');
  end if;
  update public.plot_twist_alliances
   set status=case when p_action='accept' then 'accepted' else 'declined' end,resolved_at=now()
   where id=a.id returning * into a;
  if a.status='accepted' then
   insert into public.plot_twist_events(game_id,table_id,event_type,visibility,payload)
    values(p_game_id,a.source_table_id,'alliance_accepted','public',
     jsonb_build_object('sourceTableId',a.source_table_id,'targetTableId',a.target_table_id));
  end if;
 else raise exception 'INVALID_ACTION';
 end if;
 return jsonb_build_object('id',a.id,'status',a.status,'replayed',false);
end $$;
revoke all on function public.plot_twist_alliance_action(uuid,uuid,text,uuid,uuid) from public,anon,authenticated;
