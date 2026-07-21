# 01 — Repository Architecture

Status: **Pending Antigravity audit**

## Required inventory

Document:

- complete directory tree;
- application stack and runtime;
- build system and package management;
- entry points;
- HTML, CSS and JavaScript boundaries;
- third-party scripts and CDNs;
- application routes;
- database and storage clients;
- analytics and tracking;
- media assets and large files;
- duplicated, orphaned or unused files;
- local-only files not represented in GitHub;
- Git remotes and branch strategy.

## Architecture diagram

```text
Browser
  -> frontend entry point
  -> application scripts
  -> Supabase / external services
  -> WhatsApp / Google Sheets / Vercel
```

Replace the diagram with the verified implementation.

## Technical-debt table

| Area | Current implementation | Evidence | Risk | Priority | Recommended disposition |
|---|---|---|---:|---:|---|
| Pending | Pending | Pending | Pending | Pending | Retain / refactor / replace |

## Constraints

- Do not infer architecture from filenames alone.
- Distinguish verified behavior from intended behavior.
- Record exact file paths and relevant line ranges.
- Never include secret values.
