# WhatsApp AI Tool Contracts

## Principle

The model may propose a tool call. Only trusted server-side code may validate and execute it.

Every tool response uses:

```ts
type ToolResult<T> =
  | { ok: true; data: T; auditEventId: string }
  | { ok: false; errorCode: string; safeMessage: string; retryable: boolean; auditEventId: string };
```

## Common requirements

Every tool receives internal execution context separately from model-provided arguments:

```ts
type ToolExecutionContext = {
  threadId: string;
  messageId: string;
  identityState: IdentityState;
  actor: 'guest' | 'ai' | 'human' | 'system';
  idempotencyKey: string;
  correlationId: string;
};
```

The model must never supply trusted identity, authorization, thread IDs or audit actor values.

## Read tools

### lookup_guest_by_phone

Input:

```json
{"phone":"+569XXXXXXXX"}
```

Output states:

- `recognized_single`;
- `ambiguous`;
- `unknown`;
- `blocked`.

Never return the whole guest list or another person's sensitive fields.

### lookup_guest_by_secure_context

Input:

```json
{"secureContext":"opaque-context-value"}
```

The secure value is transported by the application and must not be echoed in WhatsApp replies.

### get_guest_rsvp_status

Input:

```json
{}
```

Identity comes from execution context. Output may include only the current guest's own RSVP and approved editable fields.

Never return pass counts.

### get_verified_event_information

Input:

```json
{"topic":"schedule|ceremony|reception|dress_code|parking|gifts|accessibility|gallery"}
```

Output must include knowledge version and approval timestamp.

### get_verified_venue_information

Input:

```json
{"venue":"ceremony|reception","detail":"address|maps|waze|arrival|parking"}
```

## Write tools

### confirm_attendance

Input:

```json
{
  "dietaryRestriction":"none|vegetarian|vegan|celiac|gluten_free|lactose_free|shellfish_allergy|nut_allergy|egg_allergy|fish_allergy|other",
  "dietaryDetail":"optional text"
}
```

Requirements:

- recognized individual guest;
- explicit confirmation in the current thread;
- idempotent upsert;
- no companion logic;
- audit previous/new state;
- trigger Sheets synchronization asynchronously.

### decline_attendance

Input:

```json
{"confirmed":true}
```

Requirements:

- recognized guest;
- explicit confirmation;
- idempotent update;
- no social commentary or pressure.

### request_rsvp_change

Input:

```json
{"requestedChange":"string","reason":"optional string"}
```

Use when direct modification is disallowed or after a configured deadline. Create human handoff.

### update_dietary_restriction

Input:

```json
{
  "dietaryRestriction":"enum value",
  "dietaryDetail":"optional text"
}
```

Requirements:

- recognized guest;
- restate current and requested value;
- explicit confirmation;
- medical complexity triggers handoff rather than advice.

### update_contact_information

Input:

```json
{"field":"email|phone","value":"string"}
```

Validate server-side. Sensitive updates may require additional verification.

### create_human_handoff

Input:

```json
{
  "reasonCode":"human_requested|identity_ambiguous|companion_request|invitation_dispute|medical_complexity|unsupported_change|low_confidence|tool_failure|complaint|other",
  "guestSummary":"safe concise summary",
  "urgency":"normal|urgent"
}
```

The assistant must stop automated replies when the tool succeeds.

## Messaging tools

### send_verified_map

Input:

```json
{"venue":"ceremony|reception","provider":"maps|waze"}
```

URL is loaded from approved knowledge, not supplied by the model.

### send_personal_invitation_link

Input:

```json
{}
```

Requires recognized guest. The backend creates the secure link; the model never constructs tokens.

### send_gallery_link

Input:

```json
{"album":"all|civil|preparations|wedding|guests"}
```

### send_photo_upload_link

Input:

```json
{}
```

### send_approved_template

Input:

```json
{"templateKey":"approved-key","variables":{"approvedVariable":"value"}}
```

Only allow templates and variables from a server-side allowlist.

## Confirmation protocol

For every confirmation-required tool:

1. AI proposes action.
2. Backend records pending action with expiry.
3. AI restates the exact proposed change.
4. Guest explicitly confirms or cancels.
5. Backend validates pending action and identity.
6. Tool executes once using idempotency key.
7. AI receives real result.
8. AI communicates success or failure accurately.

A generic `sí` is accepted only when one unexpired action is pending and the message clearly responds to that action.

## Tool-call security tests

- malformed JSON;
- extra properties;
- SQL fragments;
- prompt injection inside fields;
- tool not in allowlist;
- unauthorized guest;
- stale pending confirmation;
- reused idempotency key;
- duplicated webhook;
- backend timeout;
- partial success;
- provider returns multiple conflicting calls;
- request to access another guest;
- companion request disguised as attendance update.

## Logging

Log:

- tool name;
- schema version;
- thread and message correlation IDs;
- provider/model that requested it;
- validated arguments with sensitive values redacted where appropriate;
- authorization result;
- execution status;
- previous/new state references;
- latency;
- error class;
- human or automated actor.
