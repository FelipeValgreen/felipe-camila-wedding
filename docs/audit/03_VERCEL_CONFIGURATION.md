# 03 — Vercel Configuration

Status: **Partially Verified (Admin access unverified; public deployments verified)**

## Inspect without exposing values

- **Vercel Project:** `felipe-camila-wedding` [INFERRED via project mapping]
- **Account/Scope:** `FelipeValgreen` [INFERRED via repo metadata]
- **Linked repository:** `FelipeValgreen/felipe-camila-wedding` [VERIFIED REPOSITORY via git remote]
- **Production branch:** `main` [VERIFIED REPOSITORY via git config]
- **Framework preset:** `Other` (Static HTML) [VERIFIED REPOSITORY via zero-config setup]
- **Staging environment:** None configured [VERIFIED REPOSITORY]
- **Build and Root Directory:** `/` (Root directory, no custom build step) [VERIFIED REPOSITORY]
- **Vercel deployment headers:** [VERIFIED LIVE via HTTP check on felipeycami.cl]
  - `server: Vercel`
  - `x-vercel-cache: HIT` (Edge caching active)
  - `x-vercel-id: gru1::8j2tg-1784604108076-fd6e393dad10`
  - `last-modified: Mon, 20 Jul 2026 23:39:30 GMT`
- **Environment variables:** [VERIFIED REPOSITORY / INFERRED]
  - `SUPABASE_URL` and `SUPABASE_ANON_KEY` (No Vercel-stored secret variables; keys are loaded directly in public client-side javascript files).

## Environment matrix

| Variable name | Development | Preview | Production | Purpose known? | Value exposed? |
|---|---:|---:|---:|---:|---:|
| `SUPABASE_URL` | Hardcoded | Hardcoded | Hardcoded | Yes | Yes (in JS client) |
| `SUPABASE_ANON_KEY` | Hardcoded | Hardcoded | Hardcoded | Yes | Yes (in JS client) |

## Deployment safety

Production deployments are triggered automatically when commits are merged/pushed into `main`. Previews are generated for other feature branches.

## Required outputs

- **Staging recommendation:** Set up Vercel Preview Deployments on a dedicated `staging` branch. Migrate to a Next.js framework so that environment keys can be kept server-side using `NEXT_PUBLIC_` prefixes where allowed, and hidden where they are not.
