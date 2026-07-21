# 06 — Data Flows

Status: **Complete**

## Required verified flows

### Individual RSVP Flow
1. Guest visits page and enters code.
2. Script fetches guest name from `guest_list` using the code.
3. Form fields auto-populate.
4. Guest selects attendance and dietary restrictions.
5. Form submit writes to `rsvp_guests` table in Supabase.
6. Web3Forms sends backup email notification.
7. WhatsApp link is loaded with prefilled text and opened.

### Photo Upload Flow
1. User clicks "Subir fotos".
2. File input opens (triggers camera/library selection on mobile).
3. Script validates file type (JPEG/PNG) and size (<10MB).
4. Uploads file to Supabase bucket `wedding-photos` at `guest_uploads/{filename}`.
5. Inserts metadata row into `guest_photos` with `approved = false`.
6. Triggers Web3Forms notification.
7. Displays success/loading animations.

## Failure-state matrix

| Flow | Failure | Current behavior | Data-loss risk | User message | Required correction | Priority |
|---|---|---|---:|---|---|---:|
| RSVP | DB Insert fail | Silently catches error, still opens WhatsApp | Low | None (silent) | Show error message and stop redirection | P0 |
| Upload | Storage upload fail | Alerts user, stops flow | Low | "Error al subir foto" | Show descriptive retry option | P1 |
