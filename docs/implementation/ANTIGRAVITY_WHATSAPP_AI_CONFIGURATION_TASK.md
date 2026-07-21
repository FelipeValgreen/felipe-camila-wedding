# Antigravity Task — Complete WhatsApp AI Configuration

## Mission

Design, configure, implement and test the complete WhatsApp AI concierge for Felipe and Camila's wedding.

Felipe and Camila should act primarily as approvers. Antigravity must perform all work that can be performed through code, CLI, browser automation, provider dashboards and authenticated integrations, while never bypassing provider security or human-only legal/account gates.

## Mandatory reading

Before acting, read:

- `.agents/rules/`;
- all `docs/audit/`;
- all `docs/product/`;
- `docs/reviews/01_AUDIT_AND_CONCEPT_REVIEW.md`;
- `docs/implementation/WHATSAPP_AI_END_TO_END_ARCHITECTURE.md`;
- `docs/implementation/AI_PROVIDER_DECISION_AND_EVALUATION.md`;
- `docs/implementation/N8N_OPERATIONAL_WORKFLOWS.md`;
- `docs/implementation/WHATSAPP_TOOL_CONTRACTS.md`.

## Working rules

- Never work directly on `main`.
- Never deploy production without explicit approval.
- Never paste secrets into chat, Git, logs, screenshots or documentation.
- Never use unofficial WhatsApp automation.
- Never expose service-role or AI-provider keys to the browser.
- Never claim an external service is configured without test evidence.
- Distinguish completed, blocked, unverified and human-action-required work.
- Stop automated replies when a human operator controls a WhatsApp thread.

## Phase 0 — External-service inventory

Document existing status of:

- Meta Business portfolio;
- Meta developer app;
- WhatsApp Business Account;
- official phone number;
- Vercel project and environments;
- Supabase project and migrations;
- Google Cloud / Google AI project;
- OpenAI API project;
- n8n workspace or deployment;
- Google Sheets and OAuth access;
- human notification channels.

Create:

```text
docs/implementation/EXTERNAL_SERVICE_INVENTORY.md
```

For every service record:

- account/project name;
- non-secret identifiers;
- owner;
- environment;
- authentication status;
- billing status without payment data;
- configuration completed;
- blocker;
- required human action;
- evidence reference.

## Phase 1 — Human action checklist

Create:

```text
docs/decisions/EXTERNAL_ACCOUNT_APPROVALS.md
```

Ask the user only for actions that cannot legally or technically be completed by the agent, such as:

- login or multi-factor authentication;
- accepting terms;
- business verification;
- phone-number verification code;
- billing method;
- creation/approval of production API keys;
- WhatsApp template submission approval;
- final production approval.

Ask one focused action at a time. Continue all independent work without waiting.

## Phase 2 — Technical branch and application skeleton

After architecture approval, create a new branch from the approved base, for example:

```text
feat/whatsapp-ai-concierge
```

Create the server-side modules and tests without affecting production.

Expected structure, adapt after architecture review:

```text
app/api/whatsapp/webhook/route.ts
app/api/whatsapp/send/route.ts
app/api/whatsapp/tools/[toolName]/route.ts
lib/whatsapp/meta-client.ts
lib/whatsapp/webhook-verification.ts
lib/whatsapp/message-normalizer.ts
lib/whatsapp/idempotency.ts
lib/ai/provider.ts
lib/ai/openai-provider.ts
lib/ai/gemini-provider.ts
lib/ai/tool-router.ts
lib/ai/prompt-policy.ts
lib/supabase/server.ts
lib/conversations/state-machine.ts
lib/handoff/service.ts
tests/whatsapp/
tests/ai-evals/
automation/n8n/
```

## Phase 3 — Supabase migration proposal

Create reviewed, reversible migrations for:

- conversation threads;
- conversation messages;
- tool calls;
- handoffs;
- approved knowledge;
- communication consent;
- audit events;
- workflow failures;
- idempotency records.

Do not apply production migrations.

Deliver:

```text
supabase/migrations/<timestamp>_whatsapp_concierge.sql
docs/implementation/WHATSAPP_DATA_MODEL.md
docs/implementation/WHATSAPP_MIGRATION_ROLLBACK.md
```

Include RLS policies, indexes, retention implications, row counts to validate and rollback tests.

## Phase 4 — Meta WhatsApp setup

Using the authorized Meta account, configure or prepare:

- app and WhatsApp product;
- test number;
- callback URL;
- verification token secret;
- webhook subscriptions;
- access-token management;
- approved templates;
- test recipients;
- status webhook handling.

Do not document token values.

Create evidence:

```text
docs/evidence/meta-whatsapp-setup.md
```

Evidence must record settings, dates, non-secret IDs, test message IDs, delivery status and screenshots with secrets redacted.

## Phase 5 — AI provider adapters

Implement both OpenAI and Gemini adapters behind the shared interface.

Requirements:

- provider selected by environment variable;
- model selected by environment variable;
- strict tool schemas;
- provider timeout;
- maximum tool calls;
- safe uncertainty behavior;
- no provider-managed long-term state unless approved;
- provider/model/latency/usage logging;
- kill switch `AI_MODE=human_only`;
- mocked tests;
- identical evaluation suite.

Create:

```text
tests/ai-evals/dataset.jsonl
docs/evidence/AI_PROVIDER_EVALUATION.md
docs/decisions/AI_PROVIDER_APPROVAL.md
```

Do not select the production provider without human approval.

## Phase 6 — n8n

Use an approved n8n workspace or deployment.

Implement all workflows in `N8N_OPERATIONAL_WORKFLOWS.md`.

Export each workflow without credentials to:

```text
automation/n8n/*.json
```

For each workflow provide:

- disabled development export;
- staging test evidence;
- idempotency proof;
- retry/dead-letter proof;
- disable and rollback instructions.

If n8n is unavailable, prepare deployable configuration and a setup checklist. Do not silently substitute Make.

## Phase 7 — Google Sheets synchronization

Configure OAuth or an approved service connection and implement:

- idempotent upsert to `RSVP_WEB_RAW` or approved operational tab;
- sync status back to Supabase;
- reconciliation workflow;
- duplicate prevention;
- error logging;
- no public-browser writes.

Use stable guest identifiers, not names, as keys.

## Phase 8 — Human inbox

Propose and implement the simplest approved operator experience.

Minimum capabilities:

- open handoffs;
- identity confidence;
- RSVP status;
- safe AI summary;
- last messages;
- reason and urgency;
- assignment;
- pause/resume AI;
- resolution;
- audit history.

This may be an authenticated admin route backed by Supabase. Do not require ordinary operators to edit database tables directly.

## Phase 9 — End-to-end staging

Create a staging deployment and test:

- webhook verification;
- inbound text;
- unknown phone;
- recognized guest;
- schedule and maps;
- RSVP confirmation;
- RSVP decline;
- dietary update;
- duplicate message;
- companion request;
- explicit human handoff;
- provider timeout;
- tool failure;
- n8n outage;
- Sheets outage;
- delivery/read/failure statuses;
- AI kill switch;
- operator takeover;
- AI remains paused;
- replay and recovery.

Use test guests and production-like but non-sensitive data.

## Phase 10 — Approval package

Before production, deliver:

```text
docs/decisions/AI_CONCIERGE_APPROVAL.md
docs/decisions/AI_PROVIDER_APPROVAL.md
docs/decisions/WHATSAPP_TEMPLATE_APPROVAL.md
docs/decisions/STAGING_ACCEPTANCE.md
docs/decisions/PRODUCTION_RELEASE_APPROVAL.md
```

Also deliver:

- preview URL;
- commit SHA;
- environment-variable names;
- migrations;
- n8n workflow exports;
- evaluation report;
- security findings;
- known limitations;
- monthly cost estimate assumptions;
- rollback procedure;
- production smoke-test plan.

Stop for explicit approval.

## Status reporting

After every phase report:

```text
Completed
Evidence
Blocked
Human action required
Risks
Files changed
External configuration changed
Next authorized action
```

Do not summarize a partially configured system as complete.
