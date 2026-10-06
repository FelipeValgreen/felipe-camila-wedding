# Plot Twist — fixtures & simulation contract

Before production E2E, simulate 20 tables with deterministic fake identities. Do not use real guest names.

## Dataset
- 20 tables, 8 synthetic players each.
- 2 responsible claims attempted concurrently per table + a third rejected.
- Collective answers distributed across all options.
- Individual votes include unique winner, tie and zero-participation cases.
- Wagers: 25/50/100%.
- Retries reuse idempotency keys.
- Offline queue includes only low-risk eligible actions.

## Assertions
- 20 distinct table tokens/codes.
- 160 active players; nickname uniqueness scoped per table.
- exactly <=2 responsible roles/table.
- exactly <=1 accepted table_decision/table/stage.
- exactly <=1 individual_vote/player/stage.
- exactly <=1 wager/table/stage.
- score_cache and secret_score_cache equal ledger sums.
- retrying resolution cannot alter score twice.
- locked/revealed stages reject new score-bearing guest actions.
- final visible ranking derives only from visible ledger.
- hidden ranking cannot mutate visible winner.

This fixture is a contract until a runnable isolated database harness is available. Never claim these assertions PASS without execution evidence in TEST-REPORT.md.
