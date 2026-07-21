# 03 — Vercel Configuration

Status: **Pending Antigravity audit**

## Inspect without exposing values

Document:

- Vercel account and team name;
- linked project name and project ID;
- production domain and aliases;
- Git repository and production branch;
- framework preset and build settings;
- root directory;
- deployment protection;
- preview deployment behavior;
- environment-variable **names and environments only**;
- recent deployments, failures and rollbacks;
- functions, logs, redirects and rewrites;
- whether a staging environment exists.

## Environment matrix

| Variable name | Development | Preview | Production | Purpose known? | Value exposed? |
|---|---:|---:|---:|---:|---:|
| Pending | Pending | Pending | Pending | Pending | Must be No |

## Deployment safety

Verify that no production change occurs without:

1. audit;
2. backup;
3. separate branch;
4. preview or staging deployment;
5. test evidence;
6. documented rollback.

## Required outputs

- current production commit SHA;
- last successful deployment;
- last failed deployment;
- rollback method;
- staging recommendation;
- configuration risks with P0–P3 classification.
