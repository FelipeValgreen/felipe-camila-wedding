# 05 — Stitch → Antigravity Execution Handoff

## Objective

Define how design exploration, prototype approval and implementation move between Stitch and Antigravity without losing the project’s human, visual and operational intent.

---

# 1. Responsibilities

## Stitch

Stitch is responsible for:

- divergent visual exploration;
- high-fidelity responsive design;
- interactive prototype;
- component and state design;
- design-system definition;
- generated `DESIGN.md`;
- visual comparison between concept directions.

Stitch is not authorized to define event facts, data architecture, privacy rules or production behavior independently.

## Antigravity

Antigravity is responsible for:

- reading all repository rules and specifications;
- completing the technical audit;
- importing approved Stitch design context;
- mapping designs to maintainable components;
- integrating Supabase, RSVP, gallery, upload and WhatsApp;
- accessibility and performance implementation;
- browser testing;
- preview deployment;
- evidence and rollback documentation.

Antigravity is not authorized to replace the approved visual direction with a simpler generic interpretation without documenting the conflict and requesting approval.

## Human decision makers

Felipe and Camila retain authority over:

- factual event information;
- final visual direction;
- real-photo selection;
- emotional tone;
- sensitive copy;
- invitation policy;
- guest-data exceptions;
- production approval.

AI may propose and test. Humans decide meaning, truth and appropriateness.

---

# 2. Required context package for Stitch

Before generating concepts, Stitch must receive:

- `00_MASTER_EXPERIENCE_PRD.md`;
- `01_UX_UI_EXPERIENCE_SPEC.md`;
- `02_COPYWRITING_SYSTEM.md`;
- `04_VISUAL_DESIGN_INNOVATION_SPEC.md`;
- approved photography direction;
- verified event facts;
- screenshots of the current website;
- approved and rejected reference boards;
- real-photo placeholders or approved images;
- critical states and routes;
- explicit prohibited patterns.

Do not provide Stitch with only a single broad prompt such as `create a premium wedding website`.

---

# 3. Divergence phase in Stitch

Create three independent projects:

1. `A — El Umbral Vivo`
2. `B — Archivo en Movimiento`
3. `C — La Fecha como Edificio`

Each must include:

- concept statement;
- emotional objective;
- social behavior encouraged;
- desktop opening;
- mobile opening;
- event-information composition;
- RSVP composition;
- living-gallery composition;
- upload interaction;
- concierge entry;
- closing frame;
- visual-system notes;
- accessibility and implementation risks.

The three projects must not be minor stylistic variations.

---

# 4. Concept evaluation matrix

Score each direction from 1 to 5:

| Criterion | Question |
|---|---|
| Distinctiveness | Could it be confused with another wedding website? |
| Human truth | Does it depend on real history and photographs? |
| Recognition | Does the invited person feel personally addressed? |
| Emotional progression | Does the experience have a meaningful arc? |
| Clarity | Can guests find date, venues and RSVP immediately? |
| Participation | Do gallery and WhatsApp feel integral? |
| Mobile quality | Is mobile independently designed and memorable? |
| Accessibility | Does the concept survive reduced motion and assistive use? |
| Feasibility | Can it be implemented performantly? |
| Extendability | Can it continue after the wedding? |

A visually spectacular concept that scores poorly on clarity or feasibility is not eligible.

---

# 5. Convergence phase

Select one structural backbone.

Document:

- chosen concept;
- rejected concepts and reasons;
- elements incorporated from other territories;
- emotional objective;
- distinctive visual signature;
- known implementation risks;
- design questions still unresolved.

Do not average the three directions into a compromise without a clear governing idea.

---

# 6. Required approved prototype

The approved prototype must cover:

- personalized and neutral entry;
- invalid invitation context;
- emotional declaration;
- photographic history;
- civil-wedding historical context;
- ceremony and reception information;
- map actions;
- RSVP idle, validation, saving, success, previous-response and error states;
- home living gallery;
- photo-upload preview, consent, progress, moderation and error states;
- `/galeria` complete archive;
- practical-information section;
- WhatsApp assistant entry;
- human-help path;
- closing;
- desktop, tablet and mobile behavior;
- reduced-motion examples.

Static ideal screens are insufficient. Operational and failure states are mandatory.

---

# 7. Required `DESIGN.md`

Stitch must generate or support a final `DESIGN.md` containing:

## Foundations

- concept and philosophy;
- color tokens and semantic roles;
- typography families, weights and scale;
- spacing scale;
- grids and breakpoints;
- borders, radii and shadows;
- image aspect ratios and crops;
- motion durations and easing;
- reduced-motion behavior.

## Components

- navigation;
- personalized entry;
- chapter heading;
- schedule and venue block;
- map action;
- RSVP form and all states;
- status messages;
- gallery composition;
- archive card or image unit;
- upload overlay;
- consent control;
- WhatsApp entry;
- footer / closing.

## Rules

- approved usage;
- responsive transformations;
- prohibited variants;
- accessibility requirements;
- content limits;
- real-photo requirements.

---

# 8. Antigravity import procedure

Antigravity must:

1. read `.agents/rules/`;
2. read `docs/audit/`;
3. read `docs/product/`;
4. inspect the approved Stitch project and `DESIGN.md`;
5. map every designed screen to routes, components and data states;
6. identify conflicts between design and current architecture;
7. propose a technical implementation plan;
8. receive approval before changing application code;
9. implement in a new branch based on the approved audit state;
10. create a Vercel preview;
11. execute visual and functional QA;
12. document deviations from the prototype.

---

# 9. Design-to-code mapping document

Before implementation, Antigravity must produce:

`docs/implementation/DESIGN_TO_CODE_MAP.md`

For each section include:

| Designed element | Route / component | Data source | State dependencies | Responsive behavior | Accessibility | Implementation risk |
|---|---|---|---|---|---|---|

No major visual block should be implemented without an explicit mapping.

---

# 10. Implementation constraints

- no production changes during design exploration;
- no direct work on `main`;
- no new data model based solely on generated UI;
- no duplicated gallery or upload flows;
- no fake production photos;
- no hidden plus-one or passes logic;
- no frontend success state without backend confirmation;
- no visual simplification that destroys the approved identity;
- no heavy motion without measured performance and fallback;
- no merge without preview evidence and approval.

---

# 11. Visual QA procedure

Compare implementation against the approved prototype at:

- wide desktop;
- standard laptop;
- tablet portrait;
- iPhone-sized viewport;
- Android-sized viewport;
- reduced motion;
- slow network.

Review:

- typography;
- spacing;
- image crop;
- line and date system;
- motion timing;
- content hierarchy;
- form states;
- gallery rhythm;
- interaction feedback;
- accessibility;
- console and network errors.

Antigravity must provide screenshots or browser evidence and list every accepted deviation.

---

# 12. Handoff acceptance criteria

The handoff is complete when:

- one visual direction is explicitly approved;
- all critical UX states are designed;
- `DESIGN.md` is complete;
- real-photo requirements are documented;
- the design-to-code map exists;
- implementation risks are visible;
- Antigravity can explain the product without relying on the current home structure;
- no unresolved design ambiguity can materially alter RSVP, gallery, WhatsApp, accessibility or mobile behavior.
