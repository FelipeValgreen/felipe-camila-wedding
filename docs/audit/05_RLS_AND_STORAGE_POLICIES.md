# 05 — RLS and Storage Policies

Status: **Complete**

## Scope

Row Level Security (RLS) policies currently configured on Supabase:

| Resource | Operation | Role | Policy condition | Publicly reachable? | Intended? | Risk | Priority |
|---|---|---|---|---:|---:|---:|---:|
| `guest_list` | SELECT | public | `USING (true)` | Yes | Yes | High | P1 |
| `rsvp_guests` | INSERT | public | `WITH CHECK (true)` | Yes | Yes | Medium | P0 |
| `rsvp_guests` | SELECT | public | `USING (true)` | Yes | No | High | P0 |
| `guest_photos` | INSERT | public | `WITH CHECK (true)` | Yes | Yes | Medium | P0 |
| `guest_photos` | SELECT | public | `USING (approved = true)` | Yes | Yes | Low | P2 |

## Mandatory tests

- **Can an anonymous visitor enumerate the guest list?** Yes, because SELECT is public (`USING (true)`).
- **Can an anonymous visitor read another guest's RSVP?** Yes, because SELECT on `rsvp_guests` is public.
- **Can an anonymous visitor upload arbitrary files?** Yes, because the public bucket policy allows write access.
- **Can public URLs expose unmoderated photos?** No, because the SELECT policy restricts to `approved = true`.

## Historical-photo protection

Original civil-wedding photos must be stored as read-only objects in a protected path of the storage bucket (`civil_archive/`), where public UPDATE/DELETE operations are disabled.
