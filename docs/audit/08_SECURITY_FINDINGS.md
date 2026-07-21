# 08 — Security Findings

Status: **Pending Antigravity audit**

## Scope

Review:

- repository visibility;
- browser-exposed configuration;
- committed keys and credentials;
- Git history for previously exposed secrets;
- third-party form and email services;
- Supabase anon access and RLS;
- Storage policies;
- input validation and rate limiting;
- file-upload validation;
- personal-data exposure;
- admin routes;
- dependency and CDN risks;
- logging and error messages.

## Finding template

### SEC-000 — Pending

- **Evidence:** Pending
- **Impact:** Pending
- **Complexity:** Pending
- **Risk:** Pending
- **Priority:** P0 / P1 / P2 / P3
- **Affected resources:** Pending
- **Acceptance criterion:** Pending
- **Proposed remediation:** Pending
- **Rollback requirement:** Pending

## Rules

- Never copy secret values into this report.
- Replace sensitive values with `[REDACTED]`.
- A publishable client key is not automatically a vulnerability; evaluate it together with RLS and intended public access.
- Any credential embedded in frontend code or Git history must be evaluated for rotation and scope restriction.
- Do not rotate or revoke anything during the audit without explicit approval and an operational plan.
