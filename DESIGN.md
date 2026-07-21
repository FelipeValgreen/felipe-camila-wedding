# Design System Specifications (DESIGN.md)

This document establishes the official foundations, visual thesis, components, responsive layout rules, and visual constraints for **23·10·26 — El Umbral Vivo**.

---

## 1. Visual Mockups Showcase

````carousel
![Concept A — El Umbral Vivo (Opening Frame)](/design/concepts/a-el-umbral-vivo/desktop_opening.jpg)
<!-- slide -->
![Concept B — Archivo en Movimiento (Opening Frame)](/design/concepts/b-archivo-en-movimiento/desktop_opening.jpg)
<!-- slide -->
![Concept C — La Fecha como Edificio (Opening Frame)](/design/concepts/c-la-fecha-como-edificio/desktop_opening.jpg)
<!-- slide -->
![Hybrid — 23·10·26 — El Umbral Vivo (Desktop Opening)](/design/concepts/hybrid-el-umbral-vivo/desktop_opening.jpg)
<!-- slide -->
![Hybrid — 23·10·26 — El Umbral Vivo (Mobile Opening)](/design/concepts/hybrid-el-umbral-vivo/mobile_opening.jpg)
````

---

## 2. Rationale & Source of Visual Deliverables

- All visual concept mockups displayed above were **externally generated as concept renders** using the Antigravity AI Image Generator to illustrate the visual layout goals before writing frontend CSS. They do not represent code-exported Stitch frames.
- **Stitch Status:** No Google Stitch project has been created or exported. The design foundations are documented here programmatically to act as guidelines for the manual CSS layout.

---

## 3. Design Foundations & Layout Specs

### 3.1 Visual Thesis
A unified creative synthesis based on:
1. **Ritual of Entry (Concept A):** A vertical threshold split animation centering the date `23·10·26`.
2. **Graphic Signature & Masks (Concept C):** A two-dimensional date layout where numbers mask real couple photos.
3. **Living Archive (Concept B):** A collaborative black-and-white masonry grid with inline sharing prompts.

### 3.2 Typography & Editorial Alternatives
To ensure a highly distinctive editorial fashion identity, we evaluate typography setups and reject generic Google Font pairings in favor of premium alternatives:

#### Target Selection: Google Fonts (Preloaded & Optimized)
- **Primary Serif:** **Playfair Display** (Italian editorial style; used for large dates, headings, and numbers).
- **Secondary Sans:** **Montserrat** (Geometric clean sans; used for small tracking labels and navigation links).
- **Minimum Body Size:** **16px** (Mandatory for mobile readability; WCAG compliant).

#### Distinctive Editorial Alternatives:
1. **Alternative Pair 1 (Modern Serif + Monospace Accent):**
   - **Serif:** *Cinzel* (Google Fonts, open-source). High-contrast Roman letters.
   - **Sans:** *Roboto Mono* (Google Fonts, open-source). Monoespaced numbers for table structures.
   - **Licensing:** Fully open-source SIL Open Font License.
2. **Alternative Pair 2 (Lux Classic Serif + Neo-grotesque):**
   - **Serif:** *Lora* (Google Fonts, open-source). Humanist contemporary serif with elegant curves.
   - **Sans:** *Inter* (Google Fonts, open-source). Maximum screen legibility at small sizes.
   - **Licensing:** Fully open-source SIL Open Font License.

### 3.3 Color System & Contrast Roles
Target WCAG AA Contrast ratio is guaranteed by enforcing strict semantic variables:
- **Background Cream:** `#f4f4f0` (Warm sand)
- **Primary Charcoal:** `#1a1a1a` (High-contrast text and thin lines)
- **Accent Gray:** `#6e6e6e` (Secondary labels; verified at >4.5:1 contrast against `#f4f4f0`)
- **Overlay Wash:** `rgba(26, 26, 26, 0.4)` (B&W filter wash over background images)
- **Error Red:** `#c62828` (Accessibility error alerts)
- **Success Green:** `#2e7d32` (Validation confirmation text)

### 3.4 Grid & Spacing Tokens
- **Desktop Grid:** 12-column symmetrical layout with `64px` gutters.
- **Mobile Grid:** 4-column layout with `16px` gutters.
- **Spacing Scale:**
  - `xs` (8px): Inner components margin.
  - `sm` (16px): Input fields and FAB spacing.
  - `md` (24px): Paragraph blocks.
  - `lg` (48px): Section padding.
  - `xl` (96px): Large block margins.

### 3.5 Photography & Crop Constraints
- **Only Real Photos Allowed:** No generic stock couple images.
- **Grayscale Filter:** All background images and grid previews must be set to `filter: grayscale(100%) opacity(90%)` by default. Grayscale filter is transition-removed on mouse-over.
- **Proportional Aspect Ratios:** Story images use `3:4` vertical crops. Main layouts use `16:9` widescreen dimensions.

### 3.6 Motion & Accessibility (Reduced-Motion)
- **Threshold Split:** Split animation plays on entry (`cubic-bezier(0.25, 1, 0.5, 1)`).
- **Reduced Motion:** When media query `(prefers-reduced-motion: reduce)` is matching:
  - `transition: none !important;`
  - `animation: none !important;`
  - The split overlay is hidden instantly on click, with no moving frames.

---

## 4. Component Layout Guidelines

### 4.1 RSVP Modal Component
- **Model Constraints:** Strictly individual. No passes, quotas, or group counts are rendered.
- **Feedback States:**
  - **Idle:** Clean input box for validation code.
  - **Loading:** skeleton loaders indicating name fetching.
  - **Success:** Confetti triggers; locks inputs; displays a link to open WhatsApp.
  - **Error:** Validation message set next to input field in Error Red `#c62828`.

### 4.2 Living Gallery & Upload Component
- **Masonry Grid:** Responsive columns. Images feature thin black outlines and hover grayscale-to-color transition.
- **Upload Modal:** File selector, drag-and-drop zone. Shows progress indicator (0% to 100%).
- **Consent Checkbox:** Enforces user checking a box reading: *"Autorizo a que esta foto sea visible para otros invitados en la galería de la boda."*

---

## 5. Prohibited Patterns

- Do not use script fonts.
- Do not use background flower assets or romantic graphics.
- Do not expose plus-one count or pass limitations.
- Do not execute client-side API queries directly using write keys.
- Do not auto-play background audio.
