-- Snapshot of live schema, inspected 2026-10-23.
-- Idempotent for fresh installations. Existing objects are preserved.
-- IMPORTANT: CREATE TABLE IF NOT EXISTS does not reconcile schema drift.
-- No data modifications are included.

create table if not exists public.plot_twist_express_answers (
    id uuid not null default gen_random_uuid(),
    game_id uuid not null,
    table_id uuid not null,
    player_id uuid not null,
    question integer not null,
    answer integer not null,
    points integer not null,
    created_at timestamp with time zone not null default now(),
    constraint plot_twist_express_answers_pkey primary key (id),
    constraint plot_twist_express_answers_game_id_fkey foreign key (game_id) references public.plot_twist_games(id),
    constraint plot_twist_express_answers_table_id_fkey foreign key (table_id) references public.plot_twist_tables(id),
    constraint plot_twist_express_answers_player_id_fkey foreign key (player_id) references public.plot_twist_players(id),
    constraint plot_twist_express_answers_player_id_question_key unique (player_id, question),
    constraint plot_twist_express_answers_question_check check (question >= 1 and question <= 8),
    constraint plot_twist_express_answers_answer_check check (answer >= 0 and answer <= 2),
    constraint plot_twist_express_answers_points_check check (points = any (array[0, 100]))
);

create index if not exists pt_express_table_idx
    on public.plot_twist_express_answers using btree (table_id);

alter table public.plot_twist_express_answers enable row level security;
-- Live database: zero pg_policies rows for this table. No policies to recreate.

create or replace function public.plot_twist_express_answer(p_player uuid, p_question integer, p_answer integer, p_correct integer)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$ declare v_player public.plot_twist_players%rowtype;v_points integer; begin if p_question not between 1 and 8 or p_answer not between 0 and 2 or p_correct not between 0 and 2 then raise exception 'BAD_ANSWER';end if;select * into v_player from public.plot_twist_players where id=p_player and active=true;if not found then raise exception 'PLAYER_NOT_FOUND';end if;v_points:=case when p_answer=p_correct then 100 else 0 end;insert into public.plot_twist_express_answers(game_id,table_id,player_id,question,answer,points) values(v_player.game_id,v_player.table_id,v_player.id,p_question,p_answer,v_points) on conflict(player_id,question) do nothing;return (select points from public.plot_twist_express_answers where player_id=p_player and question=p_question);end $function$;

-- Hardening: the RPC trusts p_correct, so it must only be reachable through the server (service key).
-- Safe to apply any time: /api/plot-twist/express uses the service key and is unaffected.
revoke execute on function public.plot_twist_express_answer(uuid, integer, integer, integer) from public, anon, authenticated;
