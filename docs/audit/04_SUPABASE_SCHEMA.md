# 04 — Supabase Schema

Status: **Pending Antigravity audit**

## Project identification

Record only non-secret identifiers:

- project name;
- project reference;
- region;
- linked environments;
- CLI link status.

Never record database passwords, service-role keys, access tokens or connection strings containing credentials.

## Database inventory

Document every relevant table, view, function, trigger, extension and relationship.

Expected names to verify, not assume:

- `guest_list`
- `rsvp_guests`
- `guest_photos`
- `song_requests`
- any invitation, WhatsApp, reconfirmation or audit tables

| Object | Type | Columns / signature | Relationships | Current use | Data sensitivity | Risk |
|---|---|---|---|---|---|---|
| Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Data model requirements

Evaluate the current model against these approved constraints:

- one invitation per individual;
- no visible partner, pass or companion logic;
- one stable guest identifier and token;
- idempotent RSVP updates rather than uncontrolled duplicates;
- Supabase is the source of truth;
- Google Sheets is operational, not authoritative;
- WhatsApp conversations and actions must link to the same guest record;
- historical civil data must remain separated from the active religious event.

## Data quality checks

- duplicate guests;
- duplicate RSVP records;
- orphaned photos;
- missing foreign keys;
- inconsistent event labels;
- nullable fields that break flows;
- timestamps and timezone handling;
- auditability of updates.
