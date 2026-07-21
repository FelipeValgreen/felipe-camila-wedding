# 05 — RLS and Storage Policies

Status: **Pending Antigravity audit**

## Scope

Audit all Row Level Security policies and Storage policies that affect:

- guest lookup;
- RSVP reads and writes;
- photo uploads;
- gallery reads;
- song requests;
- authentication;
- admin or moderation access.

## Required policy table

| Resource | Operation | Role | Policy condition | Publicly reachable? | Intended? | Risk | Priority |
|---|---|---|---|---:|---:|---:|---:|
| Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Mandatory tests

- Can an anonymous visitor enumerate the guest list?
- Can an anonymous visitor read another guest's RSVP?
- Can an anonymous visitor insert unlimited RSVP records?
- Can an anonymous visitor overwrite existing records?
- Can an anonymous visitor upload arbitrary files or unsupported MIME types?
- Can an anonymous visitor list or delete storage objects?
- Can public URLs expose unmoderated or private photos?
- Can client-side requests bypass expected token validation?

## Historical-photo protection

Verify that civil-wedding originals cannot be deleted or overwritten by the public frontend. Document backup status, object count and recovery procedure without downloading or altering the originals.

## Audit constraint

Do not change policies during this audit. Propose changes separately, with migration and rollback plans.
