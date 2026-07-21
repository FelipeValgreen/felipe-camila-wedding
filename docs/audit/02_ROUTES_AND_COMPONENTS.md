# 02 — Routes and Components

Status: **Complete**

## Route inventory

| Route | Purpose | Entry file | Data source | Authentication | Current status | Risk |
|---|---|---|---|---|---|---|
| `/` | Main Landing Page | `index.html` [VERIFIED REPOSITORY] | Supabase / Static | Public / Code | Operational [VERIFIED LIVE] | Medium |
| `/galeria` | Complete photo archive | `galeria/index.html` [VERIFIED REPOSITORY] | Supabase | Public | Operational [VERIFIED LIVE] | Low |
| `/fotos` | Dedicated photo upload | `fotos/index.html` [VERIFIED REPOSITORY] | Supabase | Public | Operational [VERIFIED LIVE] | High |
| `/admin` | Photos / RSVP moderation | `admin/index.html` [VERIFIED REPOSITORY] | Supabase | None | Operational [VERIFIED LIVE] | High |

## Approved route behavior

### Home `/`
- Shows main invitation, schedule, maps, countdown, and background music.
- Integrates a curated living gallery section displaying approved civil photos.
- Contains an inline `Subir fotos` float button.
- Includes a floating individual RSVP trigger.

### Full gallery `/galeria`
- Retained as the complete browsing archive with lightboxes and filter categories.

### Photo upload `/fotos`
- Kept as a reusable fallback uploading page, using the same upload validation component.

## Component / section inventory

- **Opening Interaction:** Envelope seal trigger (`#envelope-overlay`) [VERIFIED REPOSITORY].
- **Audio player:** Background widget (`#music-btn`) with James Arthur song, initial volume `0.3` [VERIFIED REPOSITORY].
- **RSVP Modal:** Code-validation, food restrictions, and WhatsApp redirection [VERIFIED REPOSITORY].
- **Gallery Grid:** Responsive Masonry grid rendering images [VERIFIED REPOSITORY].
- **Photo Upload Widget:** File size validation and bucket upload [VERIFIED REPOSITORY].

## Experience conflict check

- Rebuild recommendation: Re-implement the monolithic layout into unified React routes. Consolidate the duplicate gallery logic between `/` and `/galeria` to use the same component.
