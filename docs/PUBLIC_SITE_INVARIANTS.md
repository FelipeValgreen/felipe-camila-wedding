# Public Site Invariants & Guard Rules

This document outlines the mandatory non-regression rules and invariants for `felipeycami.cl`.

## Permanent Rules
1. **Schedule**:
   - Church ceremony start time: `17:30` (17:30:00-03:00 ISO).
   - Cocktail time: `18:30`.
   - Dinner & party time: `19:30`.
2. **Dress Code**:
   - Title: `Formal`
   - Description: `Una noche para celebrar con elegancia y estilo.`
3. **Single Orientation Source of Truth**:
   - Images must have their physical pixel matrix normalized on disk (`v3` variants).
   - No `ROTATION_MAP` in `api/gallery.js` (must return `rotation: 0`).
   - No CSS `transform: rotate(...)` / `scale(...)` in `galeria/index.html`.
4. **Navigation & Links**:
   - Internal links (`/galeria/`, `/fotos/`) open in the **same tab** (no `target="_blank"`).
   - External links (WhatsApp, Maps, Waze, Paris) open in a **new tab** (`target="_blank"`).
   - Back links ("Volver a la invitación") in subpages point directly to `/?open=1#hero` to open the home without envelope animation or flash.
5. **RSVP & WhatsApp**:
   - WhatsApp confirmation validates first name and last name input.
   - Formats custom message with entered name and dietary restriction details.
6. **Hero Composition**:
   - Includes `<div class="hero-photo-window md:hidden"></div>` for clean mobile framing (`clamp(150px, 21svh, 220px)`).

## Verification Command
Before every commit, run:
```bash
npm run verify:public
```
