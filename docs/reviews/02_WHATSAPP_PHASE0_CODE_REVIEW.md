# WhatsApp AI Concierge — Phase 0 Code Review

**Branch:** `feature/whatsapp-ai-concierge`  
**Review status:** Changes required before Meta webhook integration or any database migration  
**Production authorization:** Not granted

## Executive decision

The branch is a useful local scaffold, but it is not yet a production-ready WhatsApp or AI implementation. It contains mock providers, a mock database, a webhook normalizer, a tool router and a console-based test script. The current implementation must not be connected to Meta, Vercel production or Supabase production until the P0 findings below are corrected and covered by executable tests.

## P0 — Blocking findings

### WA-P0-001 — Sensitive writes execute without explicit confirmation

`AIProvider` returns `confirmationRequired: true` for RSVP writes, but `ConciergeEngine` executes the tool immediately. The required `ACTION_CONFIRMATION` state is absent.

**Required correction:**
- persist a pending action;
- ask the guest to confirm the exact change;
- execute only after a clear affirmative reply;
- expire or cancel pending actions safely;
- add tests proving that the first RSVP message does not mutate data.

### WA-P0-002 — Unknown guests cannot be handed off, but receive false success copy

`ToolRouter.execute` requires `guestId` for every tool, including `create_human_handoff`. Unknown guests therefore cannot create a handoff. `ConciergeEngine` ignores the failed handoff result and still tells the user that the team will continue the conversation.

**Required correction:**
- allow `create_human_handoff` for unidentified threads;
- require identity only for guest-data read/write tools;
- never claim a handoff succeeded without checking the tool result;
- add an unknown-phone handoff test.

### WA-P0-003 — RLS policies are publicly permissive

Policies named `Service role full access` or `Backend full access` use `FOR ALL USING (true)` without a `TO` role restriction. Service-role clients bypass RLS and do not need policies. These policies can grant broad access to public API roles.

**Required correction:**
- remove permissive policies;
- keep conversation tables with RLS enabled and no anon/authenticated policies unless explicitly required;
- use service-role credentials only in server-only code;
- add explicit grants/revokes and verify with anon/authenticated/service-role tests;
- do not apply the current migration anywhere.

### WA-P0-004 — Unknown inbound messages violate the database constraint

The engine writes `sender_type: 'unknown'`, while the migration only allows `guest`, `ai`, `operator`, or `system`.

**Required correction:**
- either add `unknown` as an approved enum/check value or store unidentified inbound senders under a defined safe category;
- add a migration test for an unknown number.

### WA-P0-005 — Migration depends on a live table previously reported missing

`conversation_threads.guest_id` references `public.guest_list(id)`, while the audit reports that `guest_list` is absent in the live schema.

**Required correction:**
- resolve and approve the canonical guest schema first;
- make the WhatsApp migration depend on a reviewed base migration;
- test migrations from an empty local database and from a sanitized legacy snapshot;
- provide a real rollback migration.

## P1 — Required before preview integration

### WA-P1-001 — Providers are mocks, not OpenAI/Gemini integrations

The current adapters use keyword matching and simulated metadata. Rename them clearly as mocks and implement real provider adapters separately with schema-validated tool calling, timeouts, retry policy and safe logging.

### WA-P1-002 — Idempotency is claimed before processing completes

The mock database records a message ID during the duplicate check. A later processing failure could make a retry look like a completed duplicate.

Use states such as `received`, `processing`, `completed`, `failed`, with atomic acquisition and controlled replay.

### WA-P1-003 — `confirmationRequired`, `maxToolCalls` and pending state are unused

Implement the documented state machine, tool-call budget and pending-action persistence.

### WA-P1-004 — Test script is not an asserting test suite

`local_test.js` prints `PASS` or `FAIL` but does not fail the process on failed expectations. It also validates immediate RSVP mutation, which is the opposite of the approved confirmation flow.

Replace or supplement it with Node test runner, Vitest or Jest. Tests must use assertions and non-zero exit status on failure.

### WA-P1-005 — Sensitive values are logged to console

RSVP previous and next values, guest identifiers and error details are printed directly. Implement structured redacted logging and an audit-event repository.

### WA-P1-006 — The webhook handles only the first entry/change/message

Meta can batch events. Normalize and process every supported event, with per-event deduplication and partial-failure handling.

### WA-P1-007 — No outbound WhatsApp transport exists

The branch currently returns text locally but does not implement a Cloud API sender, delivery-status persistence, template sending, rate-limit handling or retries.

### WA-P1-008 — No production repository implementations exist

Interfaces for Supabase, approved knowledge, conversation history, handoff queue and audit events must be implemented and tested separately from `MockDatabase`.

## P2 — Completeness and operations

- Add `conversation_tool_calls`, `audit_events`, `workflow_failures`, `communication_consents` and template/version tracking or document why an equivalent model is used.
- Normalize phones to E.164 and define shared-phone/duplicate-phone behavior.
- Add retention, deletion and data-minimization rules.
- Add environment validation at startup.
- Add n8n workflow exports and test fixtures.
- Add Google Sheets reconciliation rather than mock sync text.
- Add human operator resume/unpause workflow and audit.
- Add tests for image, audio, unsupported messages, status batches, provider timeout, database timeout, prompt injection and malicious tool arguments.

## Required next phase

Antigravity may continue without human credentials by:

1. correcting all P0 findings;
2. replacing console tests with an asserting suite;
3. implementing pending confirmation and unknown-user handoff;
4. correcting migrations and RLS in a local Supabase environment only;
5. implementing real provider adapters behind disabled environment flags;
6. implementing a mock outbound WhatsApp transport and contract tests;
7. exporting n8n workflows as disabled templates;
8. producing a phase report with command output and exact test counts.

## Human action gate

Creating a Meta Developer app (`HA-001`) is reversible and may be done in parallel, but it does not authorize:

- registering or migrating the production number;
- adding production billing;
- applying migrations;
- deploying a public webhook;
- sending real messages;
- enabling real AI-provider keys.

The next approval request must include the corrected commit SHA, passing assertion-based tests, migration dry-run evidence and a precise Meta setup action.