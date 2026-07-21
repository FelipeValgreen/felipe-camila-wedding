# 03 — Vercel Configuration

Status: **Complete**

## Inspect without exposing values

- **Vercel Project:** `felipe-camila-wedding`
- **Account/Scope:** `FelipeValgreen`
- **Repository linked:** `FelipeValgreen/felipe-camila-wedding`
- **Production branch:** `main`
- **Framework preset:** `Other` (Static HTML)
- **Staging environment:** Not configured (direct branch deployments serve as preview).

## Environment matrix

| Variable name | Development | Preview | Production | Purpose known? | Value exposed? |
|---|---:|---:|---:|---:|---:|
| `SUPABASE_URL` | Hardcoded | Hardcoded | Hardcoded | Yes | Yes (in JS) |
| `SUPABASE_ANON_KEY` | Hardcoded | Hardcoded | Hardcoded | Yes | Yes (in JS) |

## Deployment safety

Production deployments are triggered automatically when commits are merged/pushed into `main`. Previews are generated for other feature branches.

## Required outputs

- **Staging recommendation:** Set up Vercel Preview Deployments on a dedicated `staging` branch. Migrate to a Next.js framework so that environment keys can be kept server-side using `NEXT_PUBLIC_` prefixes where allowed, and hidden where they are not.
