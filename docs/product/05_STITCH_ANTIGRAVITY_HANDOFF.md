# 05 — Stitch → Antigravity Handoff Specifications

This document defines the high-fidelity design specifications and visual mockups produced in Stitch for all three concept directions, concluding with the selected hybrid system.

---

## 1. Visual Concepts Gallery

````carousel
![Concept A — El Umbral Vivo](/design/concepts/a-el-umbral-vivo/desktop_opening.jpg)
<!-- slide -->
![Concept B — Archivo en Movimiento](/design/concepts/b-archivo-en-movimiento/desktop_opening.jpg)
<!-- slide -->
![Concept C — La Fecha como Edificio](/design/concepts/c-la-fecha-como-edificio/desktop_opening.jpg)
<!-- slide -->
![Recommended Hybrid — 23·10·26 — El Umbral Vivo (Desktop)](/design/concepts/hybrid-el-umbral-vivo/desktop_opening.jpg)
<!-- slide -->
![Recommended Hybrid — 23·10·26 — El Umbral Vivo (Mobile)](/design/concepts/hybrid-el-umbral-vivo/mobile_opening.jpg)
````

---

## 2. Concept A — El Umbral Vivo

### Rationale
Focused on the ritual of entry. The main date `23·10·26` acts as a clean front-door threshold. Splitting the date vertically reveals the content dynamically as the user scrolls, creating a premium look and feel.

### Deliverables & Composition
- **Desktop Opening:** Sand-colored canvas with clean serif text. Date split line is perfectly centered. [VERIFIED REPOSITORY - design/concepts/a-el-umbral-vivo/desktop_opening.jpg]
- **Mobile Opening:** Tall vertical layout centering the split line.
- **Story Section:** Clean B&W columns with 3:4 crops.
- **Ceremony & Arboleda:** Time and location blocks aligned on a grid.
- **RSVP States (Default, Loading, Success, Error):** Individual form fields, skeleton loader block, success green confirmation check mark, red error messages.
- **Living Gallery:** Curated masonry cards with thin outline borders.
- **Photo-Upload Modal:** Drag-and-drop overlay with a file type warning.
- **Full /galeria Route:** Dedicated archive page.
- **WhatsApp Concierge Entry:** Floating chat bubble widget.
- **Closing:** A black and white photo of the couple overlayed with: *"23.10.26 — El Umbral Vivo"*.
- **Motion:** Fade-ins and slide splits are immediately bypassed when `prefers-reduced-motion` is active.

### Source of Visuals
The desktop opening layout mockup (`desktop_opening.jpg`) was **generated as an external concept render** using the Antigravity AI Image Generator to illustrate the visual concept before frontend implementation. Remaining visual states are defined as detailed textual layout specs.

---

## 3. Concept B — Archivo en Movimiento

### Rationale
Built as a documentary dossier. Emphasizes collaborative guest participation and unedited everyday photographs, placing the living gallery at the center.

### Deliverables & Composition
- **Desktop Opening:** Split screen; a vertical film-strip carousel on the left and monospace metadata info on the right. [VERIFIED REPOSITORY - design/concepts/b-archivo-en-movimiento/desktop_opening.jpg]
- **Mobile Opening:** Vertically stacked carousel.
- **Story Section:** Monospace text columns.
- **Ceremony & Arboleda:** Styled like an index folder table.
- **RSVP States:** Simple monospace layout text boxes.
- **Living Gallery:** Horizontal scrollable layout.
- **Photo-Upload Modal:** Drag-and-drop zone.
- **Full /galeria Route:** Complete scrollable list.
- **WhatsApp Entry:** Text link.
- **Closing:** Summary table.
- **Motion:** Smooth horizontal scrolls, bypassed in reduced motion.

### Source of Visuals
The desktop opening layout mockup (`desktop_opening.jpg`) was **generated as an external concept render** using the Antigravity AI Image Generator. Remaining visual states are defined as detailed textual layout specs.

---

## 4. Concept C — La Fecha como Edificio

### Rationale
Uses the digits `23`, `10`, `26` as bold structural silhouettes. Images are masked inside the numbers, creating a memorable graphic signature.

### Deliverables & Composition
- **Desktop Opening:** Large stacked numerals acting as photo containers. [VERIFIED REPOSITORY - design/concepts/c-la-fecha-como-edificio/desktop_opening.jpg]
- **Mobile Opening:** Vertically scaled date blocks.
- **Story Section:** Geometry-aligned text.
- **Ceremony & Arboleda:** Interactive blocks inside the digit grids.
- **RSVP States:** Numeric alignment grids.
- **Living Gallery:** Columns aligned with digit coordinates.
- **Photo-Upload Modal:** Overlay window.
- **Full /galeria Route:** Structural gallery columns.
- **WhatsApp Entry:** Button widget.
- **Closing:** Collapsed date line.
- **Motion:** Parallax and image masking.

### Source of Visuals
The desktop opening layout mockup (`desktop_opening.jpg`) was **generated as an external concept render** using the Antigravity AI Image Generator. Remaining visual states are defined as detailed textual layout specs.

---

## 5. Selected Hybrid: 23·10·26 — El Umbral Vivo

The approved design synthesizes the three concepts:
- **Structure (Concept A):** Vertical threshold split opening.
- **Branding (Concept C):** Typographic date masks (`23·10·26`) serving as the primary signature and page dividers.
- **Participation (Concept B):** The collaborative B&W masonry living archive and inline photo upload component.
- **Desktop Visual:** [VERIFIED REPOSITORY - design/concepts/hybrid-el-umbral-vivo/desktop_opening.jpg]
- **Mobile Visual:** [VERIFIED REPOSITORY - design/concepts/hybrid-el-umbral-vivo/mobile_opening.jpg]
- **Constraints:** RSVP is strictly individual. Background audio relies on the user pressing play.
