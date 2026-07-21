# Deployment Safety

## Protected workflow

All implementation work must follow:

```text
audit
-> verified backup
-> separate branch
-> implementation
-> local tests
-> staging / preview deployment
-> visual QA
-> functional QA
-> approval
-> production release
-> production smoke test
-> rollback readiness
```

## Prohibitions

- Never push implementation work directly to `main`.
- Never deploy with `--prod` during audit or concept work.
- Never connect staging tests to destructive production operations.
- Never commit `.env` files or secret values.
- Never alter production Supabase schema or policies without reviewed migrations.
- Never merge without test evidence and an explicit acceptance decision.

## Required release record

Every release proposal must include:

- source branch and commit SHA;
- preview URL;
- changed files;
- migration list;
- environment-variable names affected, without values;
- automated and manual test evidence;
- known risks;
- rollback instructions;
- approver.

Production remains unchanged until all gates are satisfied.
