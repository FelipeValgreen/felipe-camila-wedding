# 09 — Stitch Concept Directions

This document details the three independent visual and experience concept directions designed to escape conventional wedding templates and deliver a globally distinctive digital storytelling piece.

---

## Concept A: El Umbral Vivo (The Living Threshold)

> **Visual Thesis:** A narrative centered on space, transition, and chronological invitation. It treats the interface as a physical portal through which the guest enters.

### 1. Structure and Experience
- **Desktop & Mobile Opening:** A completely clean, sand-colored editorial layout featuring only the date `23·10·26` in a tall serif typeface. Clicking the center splits the date down the middle, creating a vertical slit transition (the "threshold") through which the main title fade-in occurs.
- **Event-Information Composition:** Large text formatting, utilizing heavy letter-spacing and structural grids. Times and locations are aligned vertically like museum signs, using minimal decorative elements.
- **RSVP:** A slide-out panel that opens from the right (on desktop) or rises from the bottom (on mobile). The form is minimal, utilizing single-line fields.
- **Gallery & Upload:** Integrated directly below the story section as a single horizontal ribbon. Clicks on photos open them in a full-bleed viewport. The "Subir fotos" action is represented by a simple plus icon `+` that slides open into a camera capture preview.
- **Concierge Entry:** A tiny floating text bubble in the corner reading: `[ ? ] Asistente de Boda`. Clicking it opens a chat-style overlay.
- **Closing:** A simple B&W photo of Felipe and Camila walking away, overlayed with the text *"Nos vemos en Chicureo"*.

### 2. Strategic Objectives
- **Emotional Objective:** A sense of entering a curated, intimate event.
- **Social Behavior Encouraged:** High-quality photo sharing (encouraging "artistic" snapshots of prep and guests).
- **Accessibility Risk:** Low-contrast serif text on background. Needs strict contrast verification (target WCAG AA).
- **Implementation Complexity:** Medium (requires smooth page-splitting animations).
- **Why it is NOT a template:** It completely lacks decorative envelope wrappers, romantic ribbons, or floral patterns, feeling more like a fashion lookbook or architectural exhibition website.

---

## Concept B: Archivo en Movimiento (Moving Archive)

> **Visual Thesis:** The invitation is treated as a shared documentary archive. It is built around a continuous timeline and document cards that shuffle as you scroll.

### 1. Structure and Experience
- **Desktop & Mobile Opening:** A split-screen landing. On the left, a vertical carousel of real, unedited photos (from civil preparations to everyday life). On the right, the core event facts: who, when, and where.
- **Event-Information Composition:** Styled like a print dossier or gallery index card, with monospace labels and crisp black lines separating rows.
- **RSVP:** Structured like an "accreditation form" at a press desk, emphasizing functional efficiency.
- **Gallery & Upload:** The central feature of the home page. The grid is a continuous horizontal scroll (masonry grid) containing civil photos and guest photos. The upload action is styled like a drag-and-drop card at the end of the carousel.
- **Concierge Entry:** Styled like a support terminal index link in the menu.
- **Closing:** A detailed metadata panel showing timestamps, weather forecast, and dress code reminders.

### 2. Strategic Objectives
- **Emotional Objective:** Nostalgia and participation. The guest feels like a co-creator of the wedding archive.
- **Social Behavior Encouraged:** Collaborative, casual photo uploads.
- **Accessibility Risk:** Horizontal scrolling layouts can be challenging for keyboard users.
- **Implementation Complexity:** High (requires custom horizontal scrolling and touch gesture mapping).
- **Why it is NOT a template:** It rejects the static single-page template, resembling instead a collaborative photo exhibition or documentary project website.

---

## Concept C: La Fecha como Edificio (The Date as a Structure)

> **Visual Thesis:** The numbers of the date `23.10.26` act as three-dimensional masks and structural anchors. The page is built like a scrolling monolith.

### 1. Structure and Experience
- **Desktop & Mobile Opening:** Large, oversized digits `23`, `10`, and `26` stacked vertically on the screen. As the guest scrolls, images of Felipe and Camila are masked inside the numbers, transitioning between B&W civil-wedding memories and upcoming religious venue previews.
- **Event-Information Composition:** Nested inside the geometry of the digits. Scrolling down slowly zooms into the "10" (representing October) to reveal the ceremony timings, and "26" (representing Colina/Chicureo) for the party.
- **RSVP:** A fixed button that slides out from the side of the numbers when they scroll past the fold.
- **Gallery & Upload:** A clean masonry grid that appears as if it is the "foundation" or floor of the architectural layout.
- **Concierge Entry:** An inline chat bubble embedded between the layout layers.
- **Closing:** The numbers collapse together into a single horizontal signature: `23·10·26`.

### 2. Strategic Objectives
- **Emotional Objective:** Wonder and awe at the structural beauty.
- **Social Behavior Encouraged:** Sharing screenshot captures on social media.
- **Accessibility Risk:** High. Scroll-linked animations and image masking are highly prone to causing scroll-jack latency or disorienting users.
- **Implementation Complexity:** High (requires fine-tuned CSS clip-paths or WebGL canvas renderers).
- **Why it is NOT a template:** It relies on bold geometric layout and editorial architecture instead of standard scrollable cards and wedding grids.
