# Audit Workspace — Felipe & Camila

Branch: `audit/world-class-rebuild`

This directory is the source of truth for the read-only audit before any redesign or production work.

## Non-negotiable rules

- Do not modify production.
- Do not deploy.
- Do not merge into `main`.
- Do not expose secrets, tokens, passwords, private keys or environment values.
- Do not change Supabase tables, rows, buckets, functions, triggers, auth settings or RLS policies during the audit.
- Do not assume the current website structure must be preserved.
- Preserve all historical civil-wedding photos and data.
- RSVP is individual: no partner, companion, pass or visible family logic.
- Supabase remains the central source of truth.
- Google Sheets remains the operational layer.
- WhatsApp remains the communication and concierge channel.
- RSVP must save successfully before WhatsApp opens.

## Required finding format

Every finding must include:

1. Evidence
2. Impact
3. Complexity
4. Risk
5. Priority: P0, P1, P2 or P3
6. Acceptance criterion

## Priority model

- **P0:** blocks invitations, data integrity, security or production safety.
- **P1:** improves RSVP conversion or core usability.
- **P2:** elevates experience and quality.
- **P3:** experimental or non-essential.

## Audit documents

- `00_EXECUTIVE_SUMMARY.md`
- `01_REPOSITORY_ARCHITECTURE.md`
- `02_ROUTES_AND_COMPONENTS.md`
- `03_VERCEL_CONFIGURATION.md`
- `04_SUPABASE_SCHEMA.md`
- `05_RLS_AND_STORAGE_POLICIES.md`
- `06_DATA_FLOWS.md`
- `07_ASSET_INVENTORY.md`
- `08_SECURITY_FINDINGS.md`
- `09_PERFORMANCE_BASELINE.md`
- `10_REBUILD_RECOMMENDATION.md`
