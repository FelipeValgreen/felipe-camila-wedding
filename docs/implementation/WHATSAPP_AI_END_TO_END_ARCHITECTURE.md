# WhatsApp AI — End-to-End Architecture

## Objective

Build a production-ready, automated WhatsApp concierge for Felipe and Camila's wedding. Antigravity is responsible for designing, configuring, implementing, testing and documenting the complete system. Felipe and Camila approve human-only gates, credentials, billing, templates, privacy and production release.

## Core decision

Use a hybrid architecture:

```text
WhatsApp Cloud API
  -> verified webhook on Vercel
  -> ingestion, signature verification and deduplication
  -> Supabase conversation store and guest identity resolution
  -> AI provider adapter
  -> controlled tool router
  -> Supabase / Google Sheets / human handoff
  -> WhatsApp Cloud API response
```

Use n8n for operational automation, schedules, synchronization, notifications and retries. Do not make n8n the only authority for the real-time inbound conversation loop.

## Why hybrid

- Core RSVP and guest-data writes remain deterministic and version-controlled.
- WhatsApp webhook behavior is testable in the application repository.
- Supabase remains the source of truth.
- n8n can be changed without risking the core guest-facing flow.
- AI provider can be replaced without rewriting WhatsApp or data logic.
- Human approval can be inserted for sensitive operations.

## Components

### 1. Meta / WhatsApp Cloud API

Antigravity must configure or prepare:

- Meta Business portfolio and app linkage;
- WhatsApp Business Account;
- official phone number;
- phone-number ID and business-account ID;
- permanent or appropriately managed access token;
- webhook callback URL;
- webhook verification token;
- subscribed message events;
- message templates;
- test and production phone-number environments;
- delivery, read and failure status processing.

Never use unofficial browser automation or WhatsApp Web scraping.

### 2. Vercel application backend

Target endpoints:

```text
GET  /api/whatsapp/webhook
POST /api/whatsapp/webhook
POST /api/whatsapp/send
POST /api/whatsapp/tools/:toolName
POST /api/whatsapp/handoff
POST /api/rsvp
```

Responsibilities:

- verify webhook challenge;
- verify request authenticity;
- parse and normalize inbound events;
- deduplicate by WhatsApp message ID;
- acknowledge webhooks quickly;
- enqueue or process messages safely;
- load approved knowledge;
- resolve guest identity;
- call the selected AI provider;
- validate tool-call arguments;
- execute only approved tools;
- persist all messages, actions and outcomes;
- send the final WhatsApp response;
- apply retry and dead-letter behavior.

### 3. Supabase

Supabase is the source of truth for:

- guests;
- invitations;
- RSVP;
- dietary restrictions;
- conversation state;
- inbound and outbound messages;
- tool calls;
- human handoffs;
- approved knowledge;
- consent and communication preferences;
- audit logs.

Target logical tables, subject to reviewed migration:

```text
guests
invitations
rsvps
conversation_threads
conversation_messages
conversation_tool_calls
human_handoffs
approved_knowledge
message_templates
communication_consents
audit_events
workflow_failures
```

No provider API key, Meta token or service-role key may be exposed in browser code.

### 4. AI provider abstraction

Implement one interface:

```ts
interface WeddingAIProvider {
  createTurn(input: ConversationTurnInput): Promise<ConversationTurnResult>;
}
```

Required adapters:

```text
OpenAIWeddingProvider
GeminiWeddingProvider
```

Selection occurs through an environment variable:

```text
AI_PROVIDER=openai | gemini
```

Only one provider is active in production. Both must pass the same evaluation suite before approval.

The AI must never directly execute SQL or call provider credentials supplied by the browser. It returns either:

- an approved conversational response;
- a structured request to call an allowed tool;
- a human-handoff decision;
- an uncertainty response.

### 5. Controlled tool router

Approved tools include:

- lookup_guest_by_phone;
- lookup_guest_by_secure_context;
- get_guest_rsvp_status;
- get_verified_event_information;
- confirm_attendance;
- decline_attendance;
- request_rsvp_change;
- update_dietary_restriction;
- update_contact_information;
- send_verified_map;
- send_gallery_link;
- send_photo_upload_link;
- create_human_handoff.

Every write must:

1. verify guest identity;
2. validate authorization;
3. request explicit confirmation when required;
4. execute server-side;
5. return structured success or failure;
6. log previous and new values;
7. produce no success message before backend confirmation.

### 6. Google Sheets

Google Sheets remains an operational view, not the authoritative database.

Synchronize through n8n or a reviewed backend service:

```text
Supabase event / scheduled reconciliation
  -> transform
  -> RSVP_WEB_RAW or approved operational tab
  -> record sync result in Supabase
```

Do not write directly from public browser JavaScript.

### 7. n8n

Use n8n for:

- Supabase-to-Google-Sheets synchronization;
- RSVP reminder schedules;
- reconfirmation campaigns;
- human-handoff notifications;
- failed-workflow retries;
- daily operations digest;
- approved template campaigns;
- post-event gallery and thank-you messages;
- consistency reconciliation.

Core inbound WhatsApp processing must remain operable even if n8n is temporarily unavailable.

## Message lifecycle

```text
Inbound WhatsApp event
  -> validate and deduplicate
  -> persist raw event
  -> resolve thread
  -> resolve identity confidence
  -> load approved knowledge and conversation context
  -> call AI provider
  -> validate AI output
  -> execute tool if requested
  -> call AI again with tool result when needed
  -> send WhatsApp response
  -> persist response and delivery status
  -> update analytics and audit log
```

## Human handoff

Human handoff is mandatory when:

- requested explicitly;
- identity is ambiguous;
- companion or invitation exception is requested;
- a sensitive dietary, medical or accessibility issue exceeds approved information;
- an action is unsupported;
- provider confidence is low;
- a tool repeatedly fails;
- a complaint or personal conflict appears.

When a human is active:

- AI replies stop;
- the same WhatsApp thread is preserved;
- operator actions are logged;
- AI resumes only through an approved state transition.

## Privacy

- Minimize context sent to the AI provider.
- Do not send the complete guest list.
- Do not expose tokens or database IDs in messages.
- Store provider keys only as server-side secrets.
- Maintain a documented retention policy.
- Support correction and deletion requests under the approved policy.
- Use provider-side storage only when explicitly approved; otherwise maintain conversation state in Supabase.

## Reliability

Required:

- idempotency by message ID and tool-action key;
- retry policy with exponential backoff;
- dead-letter table for unresolved failures;
- timeout handling;
- provider fallback only when approved and safe;
- health checks;
- structured logs;
- alerts for repeated failures;
- manual replay with audit trail.

## Human-only approval gates

Antigravity may prepare and navigate setup, but Felipe or Camila must approve or perform where required:

- accepting provider terms;
- Meta Business verification;
- phone-number verification;
- billing and payment methods;
- creation or disclosure of production API keys;
- WhatsApp template submission;
- privacy and retention policy;
- AI provider selection;
- production release.

## Definition of done

The system is ready only when:

- a real inbound WhatsApp message reaches the verified webhook;
- the guest is safely recognized or treated as unknown;
- approved questions are answered correctly;
- RSVP writes are deterministic and auditable;
- no pass count is exposed;
- companion requests hand off;
- human takeover stops AI responses;
- messages and statuses are persisted;
- Sheets synchronization works and reconciles;
- failures retry safely;
- both AI adapters pass evaluation;
- staging evidence exists;
- production is explicitly approved.
