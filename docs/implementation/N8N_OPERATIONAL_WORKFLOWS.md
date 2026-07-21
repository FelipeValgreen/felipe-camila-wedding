# n8n Operational Workflows

## Role of n8n

n8n is the operational orchestration layer. It must not become the sole source of truth or the only real-time path for inbound WhatsApp conversations.

Supabase remains authoritative. Application code remains responsible for identity, authorization and critical writes.

Antigravity must create versioned workflow exports under:

```text
automation/n8n/
```

Each workflow must include:

- purpose;
- trigger;
- credentials required by name, never value;
- idempotency key;
- retry policy;
- dead-letter behavior;
- inputs and outputs;
- test fixture;
- rollback/disable instructions;
- owner;
- screenshots or execution evidence.

## Workflow 01 — RSVP to Google Sheets

### Trigger

Preferred:

- Supabase Database Webhook or controlled application event after committed RSVP.

Fallback:

- scheduled reconciliation every 5–15 minutes.

### Flow

```text
RSVP committed in Supabase
  -> validate event payload
  -> lookup existing Sheet row by stable guest ID
  -> insert or update RSVP_WEB_RAW
  -> write synchronization result to Supabase
  -> retry transient failure
  -> dead-letter permanent failure
```

### Rules

- Never use guest name as the unique key.
- Never create duplicate rows for a repeated event.
- Never write from public frontend JavaScript.
- Sheets failure must not roll back a successful Supabase RSVP.
- Reconciliation must identify and repair drift.

## Workflow 02 — Pending RSVP reminders

### Trigger

Scheduled and date-controlled.

### Eligibility

- individually invited;
- RSVP pending;
- valid WhatsApp consent/policy status;
- not in human-only or suppressed state;
- not contacted within the configured cooldown;
- campaign approved.

### Flow

```text
Schedule
  -> query eligible guests through controlled endpoint
  -> select approved WhatsApp template
  -> send at controlled rate
  -> capture Meta message ID
  -> update send status
  -> process delivery/read/failure webhook
  -> produce campaign report
```

No bulk improvisational AI text. Outbound initiation uses approved templates.

## Workflow 03 — Reconfirmation campaign

Used near the wedding date.

Actions:

- send approved reconfirmation template;
- receive reply through core WhatsApp webhook;
- allow the AI assistant to interpret response;
- require explicit tool execution for data changes;
- flag non-responses and exceptions;
- synchronize results to Sheets.

## Workflow 04 — Human handoff notification

### Trigger

A `human_handoffs` row enters `OPEN` or `URGENT`.

### Flow

```text
Handoff created
  -> enrich with safe guest/thread summary
  -> notify approved operators
  -> assign or leave unassigned according to policy
  -> record notification outcome
  -> escalate after SLA threshold
```

Notification channels may include email, Slack or another approved internal channel. Do not send sensitive guest data beyond what the operator needs.

## Workflow 05 — Daily operations digest

Daily summary containing:

- new confirmations;
- new declines;
- dietary updates;
- unresolved handoffs;
- failed messages;
- failed Sheets synchronization;
- photo moderation queue;
- campaign status;
- critical system alerts.

No full guest list in ordinary email summaries.

## Workflow 06 — WhatsApp delivery-status reconciliation

### Trigger

Scheduled or event-driven.

### Purpose

- reconcile queued/sent/delivered/read/failed statuses;
- find messages missing final status;
- identify repeated failures;
- update operational dashboard;
- create an incident when thresholds are exceeded.

## Workflow 07 — Dead-letter replay

### Trigger

Manual approval or controlled schedule.

### Rules

- display original failure and attempts;
- require an idempotency key;
- prevent replay after successful completion;
- record the operator or automation responsible;
- cap retries;
- never replay a socially sensitive outbound message without approval.

## Workflow 08 — Approved knowledge publication

### Flow

```text
Human edits draft knowledge
  -> validation
  -> approval gate
  -> publish version to approved_knowledge
  -> invalidate concierge cache
  -> record previous/new version
```

The AI must not use draft or unapproved facts.

## Workflow 09 — Post-event gallery and thanks

After explicit approval:

- identify eligible recipients;
- send approved thank-you/gallery template;
- link to `/galeria`;
- respect suppression and consent;
- track status;
- stop campaign if failure threshold is exceeded.

## Workflow 10 — Data consistency reconciliation

Scheduled checks:

- Supabase RSVP vs Google Sheets;
- message statuses vs Meta status events;
- Storage objects vs photo metadata;
- open human handoffs vs thread state;
- duplicate conversation messages;
- incomplete tool calls;
- guests without stable identity mapping.

Output issues, do not silently rewrite ambiguous data.

## Credentials

Antigravity may create credential placeholders and guide authenticated setup. Values must be entered into n8n's credential store by an authorized human or through an approved secrets process.

Expected credentials:

```text
Supabase service credential
Google Sheets OAuth credential
Meta WhatsApp Cloud API credential
OpenAI API credential
Gemini API credential
Internal notification credential
```

No credentials inside workflow JSON exports.

## Environment separation

Maintain:

- development/test workflows;
- staging workflows;
- production workflows.

Production workflows must be inactive until release approval.

## Acceptance criteria

- all workflows exported to Git;
- no secrets in exports;
- mocked tests pass;
- staging executions recorded;
- idempotency proven;
- failure and retry behavior proven;
- disable/rollback documented;
- production activation explicitly approved.
