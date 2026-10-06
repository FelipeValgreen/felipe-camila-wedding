-- Plot Twist V1B — private resolution contract. Additive; not applied automatically.
create table if not exists public.plot_twist_stage_secrets (
 stage_id uuid primary key references public.plot_twist_stages(id) on delete cascade,
 answer_key text,
 points integer not null default 0,
 secret_correct integer not null default 0,
 config jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.plot_twist_stage_secrets enable row level security;
comment on table public.plot_twist_stage_secrets is '[PLOT TWIST] Server-only answers and scoring config. Never expose through guest or screen APIs.';

create or replace function public.plot_twist_resolve_stage_private(p_stage_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s record; a record; awarded integer:=0;
begin
 select * into s from public.plot_twist_stage_secrets where stage_id=p_stage_id;
 if s.stage_id is null then raise exception 'STAGE_SECRET_NOT_FOUND'; end if;
 for a in select * from public.plot_twist_actions where stage_id=p_stage_id and kind='table_decision' and status='accepted' loop
  if a.payload->>'answer'=s.answer_key then
   perform public.plot_twist_apply_score(a.game_id,a.table_id,a.id,s.points,s.secret_correct,'stage_correct:'||p_stage_id::text,a.id,jsonb_build_object('resolved',true));
   awarded:=awarded+1;
  end if;
 end loop;
 update public.plot_twist_stages set status='revealed' where id=p_stage_id and status in ('open','resolving');
 return jsonb_build_object('awarded_tables',awarded);
end $$;
revoke all on function public.plot_twist_resolve_stage_private(uuid) from public,anon,authenticated;

create or replace function public.plot_twist_resolve_wager_private(p_stage_id uuid,p_wager_stage_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s record; a record; w record; amount integer; correct boolean; n integer:=0;
begin
 select * into s from public.plot_twist_stage_secrets where stage_id=p_stage_id;
 if s.stage_id is null then raise exception 'STAGE_SECRET_NOT_FOUND'; end if;
 for a in select * from public.plot_twist_actions where stage_id=p_stage_id and kind='table_decision' and status='accepted' loop
  select * into w from public.plot_twist_actions where stage_id=p_wager_stage_id and game_id=a.game_id and table_id=a.table_id and kind='wager' and status='accepted' limit 1;
  if w.id is not null then
   amount:=floor(greatest(0,(w.payload->>'scoreSnapshot')::integer)*(w.payload->>'fraction')::numeric);
   correct:=a.payload->>'answer'=s.answer_key;
   perform public.plot_twist_apply_score(a.game_id,a.table_id,a.id,case when correct then amount else -amount end,0,'final_wager:'||p_stage_id::text,a.id,jsonb_build_object('correct',correct,'amount',amount));
   n:=n+1;
  end if;
 end loop;
 update public.plot_twist_stages set status='revealed' where id=p_stage_id;
 return jsonb_build_object('resolved_tables',n);
end $$;
revoke all on function public.plot_twist_resolve_wager_private(uuid,uuid) from public,anon,authenticated;
