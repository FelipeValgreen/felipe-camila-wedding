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

### Unified home gallery and photo upload

The home gallery, `/galeria` and `/fotos` must not use separate storage or metadata logic.

```text
Home gallery / Subir fotos / dedicated upload route
  -> camera or photo-library selection
  -> client validation of MIME type and size
  -> secure Storage upload
  -> metadata insert in Supabase
  -> moderation or approval state when applicable
  -> truthful success acknowledgement
  -> invalidate or refresh gallery query
  -> new approved photo appears on home and `/galeria`
  -> no redeploy required
```

Required behavior:

- the home shows a curated gallery view;
- `/galeria` shows the complete archive;
- `/fotos` may remain as a dedicated upload fallback;
- all three surfaces use the same source of truth and reusable upload logic;
- historical civil photos are protected from overwrite or deletion;
- failed metadata insertion after Storage upload must be detected and reconciled;
- duplicate uploads and unsupported files must be handled;
- empty, loading, offline and permission-error states must be designed;
- uploaded photos must not appear publicly before the approved moderation rule allows it.

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

Determine whether every guest-data modification and photo action records actor or source, timestamp, object identifier, status and relevant previous / new values.
