# 02 — Routes and Components

Status: **Pending Antigravity audit**

## Route inventory

Verify all public, internal and legacy routes, including at minimum:

- `/`
- `/invitacion?t=TOKEN` or current equivalent
- `/fotos`
- `/galeria`
- `/civil`
- `/admin`
- redirects, rewrites and static files

| Route | Purpose | Entry file | Data source | Authentication | Current status | Risk |
|---|---|---|---|---|---|---|
| Pending | Pending | Pending | Pending | Pending | Pending | Pending |

## Approved route behavior

### Home `/`

The home experience must include an integrated photo-gallery section sourced from the same authoritative Supabase records used by `/galeria`.

The section must:

- show approved historical civil-wedding photos and future event photos;
- support album or event-context filtering when useful;
- include a clear `Subir fotos` action;
- allow camera or photo-library selection on compatible mobile devices;
- refresh after a successful upload without requiring a redeploy;
- link to `/galeria` for the complete archive.

### Full gallery `/galeria`

Keep `/galeria` as the dedicated full archive, with complete browsing, filtering, lightbox, progressive loading, empty and error states, and the same moderation and data rules as the home gallery.

### Photo upload `/fotos`

The existing route may remain as a dedicated upload experience or fallback, but it must use the same upload component, validation, storage bucket, metadata model and success logic as the home upload action. Do not create parallel data flows.

## Component / section inventory

Document every major section or component, including:

- opening interaction;
- navigation;
- ceremony and venue information;
- history and civil archive;
- RSVP;
- WhatsApp CTA;
- integrated home gallery;
- reusable photo-upload component;
- full gallery route and lightbox;
- music;
- trivia;
- playlist / song requests;
- footer and metadata.

For each item identify:

- owning file;
- dependencies;
- mobile behavior;
- data writes;
- whether it is essential to the primary invitation journey;
- retain, relocate, refactor or remove recommendation.

## Experience conflict check

Flag components that dilute the core journey:

```text
Invitation
  -> event information
  -> individual RSVP
  -> integrated living gallery / upload
  -> WhatsApp concierge
```

The gallery should feel like part of the living invitation, not an unrelated social widget.
