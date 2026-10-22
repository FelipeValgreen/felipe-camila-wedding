-- Transactional behavior smoke test, isolated PostgreSQL only.
begin;
do $$
declare g uuid; t1 uuid; t2 uuid; p1 uuid; p2 uuid; invitation uuid; result jsonb; result2 jsonb;
begin
 insert into public.plot_twist_games(slug,status) values('smoke-test','live') returning id into g;
 insert into public.plot_twist_tables(game_id,join_token_hash,team_name)
  values(g,'smoke-hash-1','Uno') returning id into t1;
 insert into public.plot_twist_tables(game_id,join_token_hash,team_name)
  values(g,'smoke-hash-2','Dos') returning id into t2;
 insert into public.plot_twist_players(game_id,table_id,nickname,device_token_hash,role)
  values(g,t1,'Uno','smoke-device-1','complice') returning id into p1;
 insert into public.plot_twist_players(game_id,table_id,nickname,device_token_hash,role)
  values(g,t2,'Dos','smoke-device-2','complice') returning id into p2;
 result:=public.plot_twist_alliance_action(g,p1,'invite',t2,null);
 invitation:=(result->>'id')::uuid;
 if result->>'status'<>'pending' then raise exception 'Invitation not pending'; end if;
 result2:=public.plot_twist_alliance_action(g,p1,'invite',t2,null);
 if result2->>'id'<>invitation::text or result2->>'replayed'<>'true' then
  raise exception 'Invitation retry was not idempotent';
 end if;
 result:=public.plot_twist_alliance_action(g,p2,'accept',null,invitation);
 if result->>'status'<>'accepted' then raise exception 'Alliance not accepted'; end if;
 result2:=public.plot_twist_alliance_action(g,p2,'accept',null,invitation);
 if result2->>'replayed'<>'true' then raise exception 'Acceptance retry was not idempotent'; end if;
 if (select count(*) from public.plot_twist_score_ledger where game_id=g and reason='alliance_verified')<>2 then
  raise exception 'Social ledger must have exactly two entries';
 end if;
 if (select count(*) from public.plot_twist_tables where id in(t1,t2) and secret_score_cache=100)<>2 then
  raise exception 'Both tables must receive exactly 100 social points';
 end if;
end $$;
rollback;
