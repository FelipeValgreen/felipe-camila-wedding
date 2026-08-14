# SMOKE_TESTS.md

## Preview read-only

- login;
- dashboard;
- guests;
- issues;
- tables;
- venue;
- planning;
- timeline;
- music;
- finance/vendors;
- documents;
- activity;
- system;
- verify mutation blocked.

## Production post-deploy

- domain 200;
- login;
- dashboard data;
- system health;
- guests read;
- tables read;
- sync health;
- no runtime regression.

Para releases de mutación, añadir una operación pequeña, reversible y autorizada específica del cambio.
