# 02 — Routes and Components

Status: **Complete**

## Route inventory

| Route | Purpose | Entry file | Data source | Authentication | Current status | Risk |
|---|---|---|---|---|---|---|
| `/` | Main Invitation Landing | `index.html` | Supabase / Static | Public / Code | Operational | Medium |
| `/galeria` | Complete photo archive | `galeria/index.html` | Supabase | Public | Operational | Low |
| `/fotos` | Standalone photo upload | `fotos/index.html` | Supabase | Public | Operational | High |
| `/admin` | Photos / RSVP administration | `admin/index.html` | Supabase | None | Operational | High |

## Approved route behavior

### Home `/`
- Displays the main invitation, schedule, dress code, and countdown timer.
- Integrates a curated B&W gallery filtered by "Nuestro Civil" and "Preparativos".
- Contains a clean `Subir fotos` float or CTA.
- Provides a floating individual RSVP trigger.

### Full gallery `/galeria`
- Keeps `/galeria` as the dedicated full archive, with progressive loading, full lightbox, and categorizations.

### Photo upload `/fotos`
- Kept as a reusable standalone fallback for quick sharing. Must align with the same Supabase storage bucket policy.

## Component / section inventory

- **Opening Interaction:** Envelope stamp trigger (`#envelope-overlay`), plays music and opens the invitation.
- **Audio widget:** In-context background player (`#music-btn`) with James Arthur song (volume initial `0.3`).
- **Countdown timer:** Target date 23 Oct 2026.
- **RSVP Form:** Code-validation, individual attendee status, food restrictions, and WhatsApp redirection link.
- **Photo Upload:** Drag-and-drop file upload with format check, writing to Supabase bucket `wedding-photos`.

## Experience conflict check

- Rebuild recommendation: Consolidate redundant/overlapping routes and components. Ensure the photo upload section is a reusable component shared between `/` and `/galeria`.
