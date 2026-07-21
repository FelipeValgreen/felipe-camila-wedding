# Design System Specifications (DESIGN.md)

This document establishes the design tokens, typography rules, component layouts, and visual constraints for **23·10·26 — El Umbral Vivo**.

---

## 1. Visual Mockups Showcase

````carousel
![Concept A — El Umbral Vivo](/Users/valgreen/.gemini/antigravity/brain/94ea7098-d7d9-44f3-9e42-962542303365/concept_a_umbral_vivo_1784604554809.jpg)
<!-- slide -->
![Concept B — Archivo en Movimiento](/Users/valgreen/.gemini/antigravity/brain/94ea7098-d7d9-44f3-9e42-962542303365/concept_b_archivo_movimiento_1784604575600.jpg)
<!-- slide -->
![Concept C — La Fecha como Edificio](/Users/valgreen/.gemini/antigravity/brain/94ea7098-d7d9-44f3-9e42-962542303365/concept_c_fecha_edificio_1784604599469.jpg)
<!-- slide -->
![Recommended Hybrid — 23·10·26 — El Umbral Vivo](/Users/valgreen/.gemini/antigravity/brain/94ea7098-d7d9-44f3-9e42-962542303365/hybrid_umbral_vivo_1784604626741.jpg)
````

---

## 2. Foundations

### Color System
- **Background Cream:** `#f4f4f0` (Warm sand)
- **Primary Charcoal:** `#1a1a1a` (High-contrast text and line work)
- **Accent Gray:** `#7f7f7f` (Secondary text labels and metadata)
- **Error Red:** `#b33a3a` (Validation error callouts)
- **Success Green:** `#2e7d32` (Submission confirmation states)

### Typography
- **Heading Serif (Playfair Display):**
  - Title: `4rem` (Line height `1.1`, weight `600`)
  - Subtitle: `2rem` (Line height `1.2`, weight `400`)
- **Body Sans (Montserrat / System Sans):**
  - Standard Body: `0.875rem` (Line height `1.6`, weight `300` / `400`)
  - Metadata: `0.75rem` (Line height `1.5`, letter spacing `0.15em`, weight `500`)

### Spacing & Breakpoints
- **Grid:** 12-column layouts on desktop, 4-column on mobile.
- **Breakpoints:**
  - Mobile: `<640px`
  - Tablet: `640px` to `1024px`
  - Desktop: `>1024px`
- **Spacing Scale:** `8px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`.

### Motion System
- **Opening Transition:** `transform 1.2s cubic-bezier(0.25, 1, 0.5, 1)` (Vertical split separation of the main page overlay).
- **Fade-ins:** `opacity 0.8s ease-out`.
- **Reduced Motion Fallback:** All transformations (`transform`, `clip-path`) are disabled, converting to simple instant display or cross-fades.

---

## 3. Component Specifications

### A. RSVP Modal Component
- **States:**
  - **Idle:** Input for guest invitation code.
  - **Loading:** Fetching guest name from Server Action (skeleton loader).
  - **Form entry:** Individual name, attendance toggle (`Sí` / `No`), food restrictions drop-down (Celíaco, Vegano, Alergias, Ninguno), and WhatsApp contact input. No passes or companion fields are visible.
  - **Submitting:** Save action state (disabled submit button, progress spinner).
  - **Success:** Confirmation animation and direct button to launch pre-formatted WhatsApp chat.
  - **Failure:** Red border callout with error description and retry button.

### B. Curated Living Gallery & Photo Upload Widget
- **Masonry Grid:** Responsive columns. Images feature thin black outlines and hover grayscale-to-color transition.
- **Upload Modal:** File selector, drag-and-drop zone. Shows progress indicator (0% to 100%).
- **Consent Checkbox:** Enforces user checking a box reading: *"Autorizo a que esta foto sea visible para otros invitados en la galería de la boda."*

---

## 4. Prohibited Variants

- Do not use cursive or romantic script fonts.
- Do not use background flower assets or romantic graphics.
- Do not expose plus-one count or pass limitations.
- Do not execute client-side API requests directly using write keys.
- Do not auto-play background audio.
