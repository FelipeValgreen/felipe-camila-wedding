-- Hard stop for advancing past unresolved scoring rounds.
-- Apply only after the base Plot Twist migrations; test on isolated DB.
create or replace function public.plot_twist_advance_stage(p_game_id uuid,p_force boolean default false)
returns jsonb language plpgsql security definer set search_path=public as $$
declare g record; cur record; nxt record; total integer; ready_count integer; ratio numeric;
begin
 select * into g from public.plot_twist_games where id=p_game_id for update;
 if g.id is null then raise exception 'GAME_NOT_FOUND'; end if;
 if g.status in ('ended','locked') then return jsonb_build_object('advanced',false,'reason','GAME_NOT_ACTIVE'); end if;
 select * into cur from public.plot_twist_stages where game_id=g.id and stage_key=g.current_stage_key;
 if cur.id is not null and cur.status in ('open','resolving')
    and cur.type='table_decision' then
  return jsonb_build_object('advanced',false,'reason','SCORING_STAGE_NOT_RESOLVED');
 end if;
 select count(*),count(*) filter(where ready) into total,ready_count
  from public.plot_twist_tables where game_id=g.id;
 ratio:=case when total=0 then 0 else ready_count::numeric/total end;
 if not p_force and ratio<g.readiness_threshold then
  return jsonb_build_object('advanced',false,'reason','READINESS_THRESHOLD_NOT_MET','ratio',ratio);
 end if;
 select * into nxt from public.plot_twist_stages
  where game_id=g.id and position>coalesce(cur.position,-1) order by position limit 1;
 if nxt.id is null then return jsonb_build_object('advanced',false,'reason','NO_NEXT_STAGE'); end if;
 if cur.id is not null and cur.status='open' then
  update public.plot_twist_stages set status='closed',closes_at=now() where id=cur.id;
 end if;
 update public.plot_twist_stages set status='open',opened_at=now() where id=nxt.id;
 update public.plot_twist_games set current_stage_key=nxt.stage_key,
  status=case when nxt.type='reveal' then 'reveal' else 'live' end,updated_at=now()
  where id=g.id;
 update public.plot_twist_tables set ready=false,updated_at=now() where game_id=g.id;
 return jsonb_build_object('advanced',true,'stage_key',nxt.stage_key,'ratio',ratio);
end $$;
revoke all on function public.plot_twist_advance_stage(uuid,boolean) from public,anon,authenticated;
