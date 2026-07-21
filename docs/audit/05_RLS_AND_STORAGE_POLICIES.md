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
| `guest_photos` | SELECT | public | `USING (true)` (since approved is missing) | Yes | No | High | P0 |

## Mandatory tests [VERIFIED LIVE via direct API checks]

- **Can an anonymous visitor enumerate the guest list?** No, because the table `guest_list` does not exist on the live database.
- **Can an anonymous visitor read another guest's RSVP?** Yes, because SELECT on `rsvp_guests` is public [VERIFIED LIVE].
- **Can an anonymous visitor insert unlimited RSVP records?** Yes, because public INSERT is open [VERIFIED LIVE].
- **Can an anonymous visitor upload arbitrary files?** Yes, because the public bucket policy allows write access [VERIFIED LIVE].
- **Can public URLs expose unmoderated photos?** Yes, because the live table `guest_photos` lacks the `approved` column and is entirely public [VERIFIED LIVE].

## Historical-photo protection

Original civil-wedding photos must be stored as read-only objects in a protected path of the storage bucket (`civil_archive/`), where public UPDATE/DELETE operations are disabled.
