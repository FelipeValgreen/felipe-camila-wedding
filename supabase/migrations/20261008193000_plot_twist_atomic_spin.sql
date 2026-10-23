-- Draft migration: transactional tombola resolution. DO NOT RUN IN PRODUCTION WITHOUT APPROVAL.
-- One spin per table per stage; a retry with the same UUID returns the saved result.
alter table public.plot_twist_spins
  add column if not exists stage_id uuid references public.plot_twist_stages(id) on delete cascade;
create unique index if not exists plot_twist_one_spin_per_table_stage
  on public.plot_twist_spins(stage_id,table_id) where stage_id is not null;

create or replace function public.plot_twist_spin_atomic(
 p_game_id uuid, p_table_id uuid, p_player_id uuid, p_idempotency_key uuid
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare g record; s record; old record; outcome text; family text; roll integer; details jsonb;
begin
 -- Serialize concurrent requests per table, including requests from both co-responsibles.
 perform 1 from public.plot_twist_tables
   where id=p_table_id and game_id=p_game_id for update;
 if not found then raise exception 'TABLE_NOT_FOUND'; end if;
 select * into old from public.plot_twist_spins
   where game_id=p_game_id and idempotency_key=p_idempotency_key;
 if old.id is not null then
   if old.table_id<>p_table_id then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
   return jsonb_build_object('resultKey',old.result_key,'payload',old.result_payload,'replayed',true);
 end if;
 select * into g from public.plot_twist_games where id=p_game_id;
 select * into s from public.plot_twist_stages
   where game_id=p_game_id and stage_key=g.current_stage_key;
 if s.id is null or s.type<>'live_tombola' or s.status<>'open' then
   raise exception 'STAGE_CLOSED';
 end if;
 select * into old from public.plot_twist_spins
   where stage_id=s.id and table_id=p_table_id limit 1;
 if old.id is not null then raise exception 'SPIN_ALREADY_USED'; end if;
 if not exists(select 1 from public.plot_twist_players
    where id=p_player_id and table_id=p_table_id and game_id=p_game_id
      and active and role in ('complice','dupla')) then
   raise exception 'ROLE_REQUIRED';
 end if;
 -- Randomness generated server-side inside transaction. Catalog weights are provisional.
 roll:=floor(random()*7)::integer;
 outcome:=case roll when 0 then 'bonus_300' when 1 then 'bonus_300'
  when 2 then 'immunity' when 3 then 'gift_shot' when 4 then 'steal_10'
  when 5 then 'half_next' else 'duel' end;
 family:=case when outcome in ('bonus_300','immunity') then 'premio'
   when outcome='half_next' then 'penitencia' else 'plot_twist' end;
 details:=jsonb_build_object('family',family,'stageKey',s.stage_key);
 insert into public.plot_twist_spins
   (game_id,stage_id,table_id,player_id,result_key,result_payload,idempotency_key)
 values(p_game_id,s.id,p_table_id,p_player_id,outcome,details,p_idempotency_key);
 insert into public.plot_twist_powers
   (game_id,owner_table_id,power_key,payload)
 values(p_game_id,p_table_id,outcome,details);
 insert into public.plot_twist_events
   (game_id,table_id,event_type,visibility,payload)
 values(p_game_id,p_table_id,'tombola','public',jsonb_build_object('result',outcome));
 return jsonb_build_object('resultKey',outcome,'payload',details,'replayed',false);
end $$;
revoke all on function public.plot_twist_spin_atomic(uuid,uuid,uuid,uuid)
 from public,anon,authenticated;
comment on function public.plot_twist_spin_atomic(uuid,uuid,uuid,uuid) is
 '[PLOT TWIST] Atomic spin record, power grant and public event; no direct guest access.';
-- IMPORTANT: bonus_300 and other outcomes are granted as powers, NOT applied to score.
-- Follow-up: implement server-side effect settlement in a separate idempotent ledger RPC.
