-- PLOT TWIST draft only. REVIEW/TEST BEFORE APPLYING. Settles only bonus_300; other effects fail closed.
-- The server owns the authorization check; this RPC additionally checks game,
-- ownership, target and active stage, and serializes concurrent requests.
create or replace function public.plot_twist_use_power_atomic(
 p_game_id uuid, p_player_id uuid, p_power_id uuid, p_target_table_id uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare g record; s record; p record; pw record;
begin
 select * into p from public.plot_twist_players
  where id=p_player_id and game_id=p_game_id and active
    and role in ('complice','dupla');
 if p.id is null then raise exception 'ROLE_REQUIRED'; end if;
 select * into g from public.plot_twist_games where id=p_game_id;
 select * into s from public.plot_twist_stages
  where game_id=p_game_id and stage_key=g.current_stage_key;
 if s.id is null or s.type<>'powers' or s.status<>'open' then
  raise exception 'STAGE_CLOSED';
 end if;
 select * into pw from public.plot_twist_powers
  where id=p_power_id and game_id=p_game_id and owner_table_id=p.table_id
  for update;
 if pw.id is null then raise exception 'POWER_NOT_FOUND'; end if;
 if pw.status='used' then
  return jsonb_build_object('ok',true,'power',pw.power_key,'replayed',true);
 end if;
 if pw.status<>'available' then raise exception 'POWER_UNAVAILABLE'; end if;
 -- Until every effect has an audited resolver, never consume an unusable power.
 if pw.power_key<>'bonus_300' then raise exception 'POWER_EFFECT_NOT_READY'; end if;
 if p_target_table_id is not null then raise exception 'TARGET_NOT_ALLOWED'; end if;
 -- The power UUID is the ledger idempotency key: retries cannot double-credit.
 perform public.plot_twist_apply_score(p_game_id,p.table_id,null,300,0,
  'power_bonus_300',p_power_id,jsonb_build_object('powerId',p_power_id));
 update public.plot_twist_powers set status='used',
  target_table_id=p_target_table_id, used_at=now() where id=p_power_id;
 insert into public.plot_twist_events
  (game_id,table_id,event_type,visibility,payload)
 values(p_game_id,p.table_id,'power_used','public',
  jsonb_build_object('power',pw.power_key,'targetTableId',p_target_table_id));
 return jsonb_build_object('ok',true,'power',pw.power_key,'replayed',false);
end $$;
revoke all on function public.plot_twist_use_power_atomic(uuid,uuid,uuid,uuid)
 from public,anon,authenticated;
comment on function public.plot_twist_use_power_atomic(uuid,uuid,uuid,uuid) is
 '[PLOT TWIST] Atomically consumes power and emits one event. Applies bonus_300 through append-only ledger; rejects other effects.';
