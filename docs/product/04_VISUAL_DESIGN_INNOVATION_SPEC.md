# 04 — Visual Design Innovation Specification

## Objective

Define a visual system strong enough to be recognized without relying on conventional wedding symbols, generic luxury styling or decorative effects.

The design must be spectacular because it has a clear idea, not because it contains more animation.

---

# 1. Visual thesis

The interface is built from three primary materials:

1. `23·10·26` as spatial architecture;
2. a continuous line as narrative connection;
3. real photography as emotional evidence.

Supporting materials:

- editorial typography;
- deliberate negative space;
- controlled contrast between memory and future;
- asymmetrical grids;
- motion based on reveal, focus and transition.

The product should feel like a digital exhibition, cinematic title sequence and private invitation, without becoming an imitation of any one of them.

---

# 2. Distinctive identity test

A proposed screen fails when:

- removing the names makes it indistinguishable from another wedding website;
- the design can be summarized only as `minimal`, `premium` or `cinematic`;
- photographs could be replaced by stock without changing the concept;
- the date is merely a heading rather than part of the composition;
- motion is decorative rather than structural;
- sections repeat the same centered title, paragraph, card and button pattern.

A proposed screen passes when:

- the date system remains recognizable across formats;
- photography and typography create a specific rhythm;
- the page has identifiable visual memory;
- practical content remains clear;
- mobile retains the concept rather than a simplified generic layout.

---

# 3. Design territories for Stitch

Stitch must create three separate projects.

## Territory A — El Umbral Vivo

Primary idea: entering a different emotional state.

Visual devices:

- vertical apertures;
- light and shadow;
- large empty planes;
- photographic fragments;
- restrained line animation;
- ceremonial pacing.

Emotional target:

- anticipation;
- intimacy;
- recognition;
- transition.

Risk:

- becoming too abstract or slow.

## Territory B — Archivo en Movimiento

Primary idea: memory as a curated living collection.

Visual devices:

- editorial image sequences;
- archive labels;
- dates and short annotations;
- varied image scale;
- physical-book rhythm;
- visible contribution to the gallery.

Emotional target:

- truth;
- shared history;
- participation;
- continuity.

Risk:

- resembling a conventional editorial portfolio.

## Territory C — La Fecha como Edificio

Primary idea: `23·10·26` constructs the interface.

Visual devices:

- monumental numerals;
- masks;
- modular grids derived from 23 / 10 / 26;
- typographic transitions;
- numbers becoming venue, schedule and gallery containers.

Emotional target:

- recognition;
- monumentality;
- anticipation;
- iconic recall.

Risk:

- prioritizing graphic expression over warmth.

## Recommended synthesis

Use:

- the emotional entry of Territory A;
- the photographic truth and gallery logic of Territory B;
- the identity and recognizability of Territory C.

Do not average the three designs. Select one structural backbone and integrate only justified elements from the others.

---

# 4. Color system

## Foundation

- charcoal: `#11110F`;
- deep black: `#070707`;
- warm paper: `#F2EEE6`;
- luminous ivory: `#FAF8F3`;
- stone: `#918D85`;
- ceremonial wine: `#4A222A`;
- aged champagne: `#B79A72`.

## Rules

- one dominant background, one text color and one accent per viewport;
- wine and champagne are accents, not luxury decoration;
- photographs determine local color balance;
- no pastel wedding palette;
- no bright metallic gold simulation;
- success, warning and error colors must remain accessible and distinct from brand accents.

---

# 5. Typography system

## Expressive role

A high-contrast editorial serif for:

- names;
- date;
- chapter statements;
- large emotional copy.

Candidate directions:

- Instrument Serif;
- Cormorant Garamond;
- licensed Canela or Editorial New.

## Functional role

A precise sans serif for:

- navigation;
- schedule;
- maps;
- forms;
- status;
- consent;
- accessibility labels.

Candidate directions:

- Avenir;
- Neue Montreal;
- Inter;
- licensed Suisse International.

## Rules

- maximum two families;
- no wedding scripts;
- no decorative handwritten fonts;
- avoid excessive tracking as a substitute for design;
- body copy must remain readable over long sessions and mobile screens.

---

# 6. Grid and space

## Desktop

- 12-column grid;
- generous outer margins;
- variable image spans;
- intentional off-grid elements;
- strong vertical pacing;
- no universal centered container.

## Mobile

- 4-column grid;
- portrait-first composition;
- edge-to-edge photography where useful;
- text protected by functional margins;
- no miniaturized desktop collages;
- no forced horizontal narrative scroll.

## Spatial rhythm

Alternate:

- density and silence;
- full-bleed and contained;
- image-led and type-led;
- monochrome and color;
- historical and anticipatory.

Every transition must signal a change of meaning.

---

# 7. Photography integration

- one dominant image at a time in critical acts;
- independent desktop and mobile crops;
- protect faces and gestures from text overlap;
- use black and white selectively for memory, not as a global filter;
- use image scale to express importance;
- preserve real texture and skin;
- no AI-generated depictions of the couple;
- no production placeholders presented as real guests;
- all assets require approval status and source metadata.

---

# 8. Motion language

## Primary motion verbs

- reveal;
- open;
- connect;
- focus;
- pass;
- confirm;
- accumulate.

## Preferred techniques

- image masks derived from numerals;
- line drawing with purpose;
- subtle photographic scale or pan;
- type entering by line or plane;
- monochrome-to-color transition;
- chapter change through spatial opening;
- RSVP success resolving the line or date.

## Limits

- no heavy WebGL as the foundation;
- no permanent parallax;
- no animation blocking critical information;
- no autoplay carousel;
- no repeated decorative loops near forms;
- reduced-motion alternative for every major sequence.

---

# 9. Component appearance

## Navigation

Minimal, context-aware and quiet. It should not resemble a SaaS header.

## Buttons

Use few button styles:

- primary decision;
- secondary navigation;
- subtle text action;
- destructive or exceptional action.

Avoid excessive pills, shadows and icon decoration.

## Forms

Forms must feel integrated into the editorial system but remain conventional enough to be immediately understood.

- visible labels;
- generous touch areas;
- clear focus;
- precise status;
- no ornamental fields;
- no glassmorphism.

## Gallery

The home gallery is a curated composition, not a uniform social grid.

`/galeria` may use a more systematic archive grid while retaining the same visual identity.

The upload action may appear as an intentional empty frame or visual interruption labelled `Agrega tu mirada`.

## Maps and practical cards

Use restrained informational modules with strong hierarchy. Do not apply the same card treatment to every section.

---

# 10. Visualization requirements

Stitch must produce, at minimum:

- three concept boards;
- opening frame desktop and mobile;
- personalized state;
- story sequence;
- ceremony / reception composition;
- RSVP idle, validation, saving, success and error states;
- living gallery with real-photo placeholders clearly labelled;
- upload overlay with preview and consent;
- practical information and WhatsApp entry;
- closing frame;
- reduced-motion examples;
- design tokens and component states.

For each concept, explain:

- visual idea;
- emotional objective;
- social behavior encouraged;
- usability risk;
- implementation complexity;
- why it cannot be confused with a wedding template.

---

# 11. Visual acceptance criteria

A direction is eligible for implementation when:

- Felipe and Camila recognize themselves in it;
- the system works with real approved photography;
- the date has a structural role;
- the gallery belongs naturally to the story;
- RSVP remains visually important and easy to complete;
- desktop and mobile are independently composed;
- reduced motion preserves meaning;
- the visual identity can extend to `/galeria`, WhatsApp preview, favicon and social sharing;
- the interface remains clear under real content and error states;
- at least one independent reviewer describes the experience without relying only on generic adjectives.
