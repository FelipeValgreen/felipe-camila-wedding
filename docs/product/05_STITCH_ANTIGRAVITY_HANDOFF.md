# 05 — Stitch → Antigravity Handoff Specifications

This document defines the high-fidelity design specifications and visual mockups produced in Stitch for all three concept directions, concluding with the selected hybrid system.

---

## 1. Visual Concepts Gallery

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

## 2. Concept A — El Umbral Vivo

### Rationale
Focused on the ritual of entry. The main date `23·10·26` acts as a clean front-door threshold. Splitting the date vertically reveals the content dynamically as the user scrolls, creating a premium look and feel.

### Deliverables & Composition
- **Opening:** Sand-colored canvas with clean serif text. Date split line is perfectly centered.
- **Story:** Minimalist chronological layout using high-contrast typography.
- **RSVP:** A dynamic slide-up panel. No passes numbers are displayed.
- **Gallery & Upload:** A clean horizontal ribbon. Upload is triggered by a minimalist `+` button.
- **Closing:** A black and white photo of the couple overlayed with: *"23.10.26 — El Umbral Vivo"*.
- **Motion:** Fade-ins and slide splits are immediately bypassed when `prefers-reduced-motion` is active.

---

## 3. Concept B — Archivo en Movimiento

### Rationale
Built as a documentary dossier. Emphasizes collaborative guest participation and unedited everyday photographs, placing the living gallery at the center.

### Deliverables & Composition
- **Opening:** Split screen; a vertical film-strip carousel on the left and monospace metadata info on the right.
- **Story:** Card layout styled like index folders.
- **RSVP:** Monospace form styled like a credentials register.
- **Gallery & Upload:** A horizontal Masonry carousel with card uploads.
- **Closing:** A print-style table summarizing metadata details.
- **Motion:** Horizontal scrolls fall back to vertical layouts on mobile viewports.

---

## 4. Concept C — La Fecha como Edificio

### Rationale
Uses the digits `23`, `10`, `26` as bold structural silhouettes. Images are masked inside the numbers, creating a memorable graphic signature.

### Deliverables & Composition
- **Opening:** Large stacked numerals acting as photo containers.
- **Story:** Text columns nested inside geometric blocks.
- **RSVP:** Fixed button sliding out from the geometric grid.
- **Gallery & Upload:** Grid layout aligned with typographic columns.
- **Closing:** Numbers collapse horizontally into a unified date line.
- **Motion:** Scroll-linked masks are disabled on mobile to prevent layout shift.

---

## 5. Selected Hybrid: 23·10·26 — El Umbral Vivo

The approved design synthesizes the three concepts:
- **Structure (Concept A):** Seamless ritual of entry and vertical split transition.
- **Branding (Concept C):** Typographic date masks (`23·10·26`) serving as the primary signature and page dividers.
- **Participation (Concept B):** The collaborative B&W masonry living archive and inline photo upload component.
- **Constraints:** RSVP is strictly individual. Background audio relies on the user pressing play.
