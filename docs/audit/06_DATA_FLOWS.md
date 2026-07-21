# 06 — Data Flows

Status: **Pending Antigravity audit**

## Required verified flows

### Individual RSVP

```text
Personal invitation URL / direct entry
  -> guest identification
  -> individual RSVP form
  -> client and server validation
  -> Supabase write / update
  -> Google Sheets operational sync
  -> success acknowledgement
  -> WhatsApp opens only after successful save
```

Document the actual implementation and every failure state.

### Direct WhatsApp conversation

```text
Incoming WhatsApp message
  -> identify guest by phone or secure token
  -> approved knowledge response or controlled operation
  -> Supabase conversation log
  -> human handoff when needed
```

Mark all parts as current, partial, missing or planned.

### Photo upload and gallery

```text
Photo selection / camera
  -> validation
  -> Storage upload
  -> metadata insert
  -> optional moderation
  -> gallery query
  -> public rendering without redeploy
```

### Reconfirmation

```text
Confirmed guests
  -> approved WhatsApp template
  -> confirm / modify / decline
  -> update existing record
  -> Sheets operational reflection
```

## Failure-state matrix

| Flow | Failure | Current behavior | Data-loss risk | User message | Required correction | Priority |
|---|---|---|---:|---|---|---:|
| Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Audit logging

Determine whether every guest-data modification records actor, source, timestamp, previous value and new value.
