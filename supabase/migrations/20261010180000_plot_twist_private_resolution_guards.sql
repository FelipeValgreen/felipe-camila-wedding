-- Guard score resolution against cross-game stages and unresolved wagering.
create or replace function public.plot_twist_resolve_wager_private(p_stage_id uuid,p_wager_stage_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s record; stage_row record; wager_row record; a record; w record; amount integer; correct boolean; n integer:=0;
begin
 select * into stage_row from public.plot_twist_stages where id=p_stage_id for update;
 select * into wager_row from public.plot_twist_stages where id=p_wager_stage_id;
 if stage_row.id is null or wager_row.id is null or stage_row.game_id<>wager_row.game_id
   or stage_row.type<>'table_decision' or wager_row.type<>'wager' then
  raise exception 'INVALID_WAGER_STAGE_PAIR';
 end if;
 if stage_row.status='revealed' then return jsonb_build_object('resolved_tables',0,'replayed',true); end if;
 if stage_row.status not in ('closed','resolving') or wager_row.status not in ('closed','revealed') then
  raise exception 'WAGER_STAGES_MUST_BE_CLOSED';
 end if;
 select * into s from public.plot_twist_stage_secrets where stage_id=p_stage_id;
 if s.stage_id is null or s.answer_key is null then raise exception 'STAGE_SECRET_NOT_FOUND'; end if;
 for a in select * from public.plot_twist_actions where stage_id=p_stage_id
  and game_id=stage_row.game_id and kind='table_decision' and status='accepted' loop
  select * into w from public.plot_twist_actions where stage_id=p_wager_stage_id
   and game_id=a.game_id and table_id=a.table_id and kind='wager' and status='accepted' limit 1;
  if w.id is not null then
   if (w.payload->>'fraction')::numeric not in (0.25,0.5,1) then raise exception 'BAD_WAGER_FRACTION'; end if;
   amount:=floor(greatest(0,(w.payload->>'scoreSnapshot')::integer)*(w.payload->>'fraction')::numeric);
   correct:=a.payload->>'answer'=s.answer_key;
   perform public.plot_twist_apply_score(a.game_id,a.table_id,a.id,
    case when correct then amount else -amount end,0,'final_wager:'||p_stage_id::text,
    a.id,jsonb_build_object('correct',correct,'amount',amount));
   n:=n+1;
  end if;
 end loop;
 update public.plot_twist_stages set status='revealed' where id=p_stage_id;
 return jsonb_build_object('resolved_tables',n,'replayed',false);
end $$;
revoke all on function public.plot_twist_resolve_wager_private(uuid,uuid) from public,anon,authenticated;
