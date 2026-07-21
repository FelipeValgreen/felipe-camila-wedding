# Antigravity Task — Read-Only Platform Audit

Work only on branch:

```text
audit/world-class-rebuild
```

## Mission

Complete the audit templates in `docs/audit/` using verified evidence from the local repository, Git, Vercel and Supabase.

Do not redesign or implement application code during this task.

## Before starting

1. Confirm the current repository path.
2. Confirm `git remote -v` points to `FelipeValgreen/felipe-camila-wedding`.
3. Fetch remote branches.
4. Check out `audit/world-class-rebuild`.
5. Confirm the working tree is clean.
6. Read every file in `.agents/rules/`.
7. Read `docs/audit/README.md`.

## Allowed actions

- read repository files and Git history;
- inspect local and remote branch configuration;
- inspect Vercel project metadata, deployments, logs and environment-variable names;
- inspect Supabase schema, tables, views, functions, triggers, buckets, object counts and policies;
- run non-destructive local and browser tests;
- measure performance and accessibility;
- update files only inside `docs/audit/`;
- commit and push completed audit documents to this branch.

## Prohibited actions

- do not edit application HTML, CSS, JavaScript or assets;
- do not deploy production;
- do not modify Vercel configuration;
- do not download or commit environment values;
- do not change Supabase schema, rows, policies, authentication or Storage objects;
- do not delete, replace or transform photographs;
- do not commit `.env` files, credentials or connection strings;
- do not merge the branch.

## Current approved experience requirement

The future home must contain an integrated gallery section using the same Supabase source as `/galeria`, with an in-context `Subir fotos` action.

The audit must verify the current feasibility and risks of:

- showing approved civil and future wedding photos on the home;
- preserving `/galeria` as the complete archive;
- keeping `/fotos` as a reusable upload fallback if useful;
- using one upload and metadata flow across all surfaces;
- refreshing approved content without redeployment;
- protecting historical originals;
- supporting camera and library selection on mobile;
- supporting loading, progress, moderation, failure and retry states.

## Evidence standard

For every finding include:

- exact file, configuration area or object name;
- line range, command output summary or screenshot reference;
- impact;
- complexity;
- risk;
- P0–P3 priority;
- acceptance criterion.

Never include secret values. Use `[REDACTED]` where necessary.

## Finish condition

1. Complete every audit document.
2. Scan the diff for secrets.
3. Confirm only `docs/audit/` changed during the Antigravity audit run.
4. Commit with a descriptive message.
5. Push `audit/world-class-rebuild`.
6. Report the commit SHA and any areas that could not be verified.
