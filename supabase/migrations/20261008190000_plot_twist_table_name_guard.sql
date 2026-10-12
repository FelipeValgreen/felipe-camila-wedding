-- Plot Twist V1: add a database-level uniqueness guard for team display names.
-- REVIEW IN ISOLATED DB BEFORE APPLYING. NOT APPLIED TO PRODUCTION.
-- Existing duplicate names must be reconciled before creating this index.
-- Use a partial index to allow unnamed tables in lobby.
CREATE UNIQUE INDEX IF NOT EXISTS plot_twist_unique_team_name_per_game
ON public.plot_twist_tables (game_id, lower(btrim(team_name)))
WHERE team_name IS NOT NULL AND btrim(team_name) <> '';
