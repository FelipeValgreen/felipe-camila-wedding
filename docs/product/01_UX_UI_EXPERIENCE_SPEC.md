# 01 — UX/UI Experience Specification

## Objective

Translate the product vision into an explicit interaction system that Antigravity and Stitch must follow.

The experience must be emotionally memorable, operationally clear and usable without relying on visual effects.

---

# 1. UX model

The primary emotional progression is:

```text
Recognition
  -> meaning
  -> memory
  -> anticipation
  -> orientation
  -> decision
  -> contribution
  -> assistance
  -> closure
```

Each act must have one dominant user question:

| Act | Dominant question |
|---|---|
| Entry | Is this really for me? |
| Declaration | Why does this moment matter? |
| History | What story am I entering? |
| Event | What will happen and where? |
| RSVP | What do I need to decide? |
| Gallery | How can I become part of the memory? |
| Concierge | Where do I get help? |
| Closing | What feeling remains? |

No section may attempt to answer all questions at once.

---

# 2. Information architecture

## Persistent priority order

1. Date
2. Personal invitation context
3. RSVP state
4. Ceremony and reception information
5. Practical assistance
6. Living gallery
7. Secondary content

## Recommended primary navigation

```text
La historia
El 23 de octubre
Confirmar
Archivo vivo
Información
```

On mobile, use a compact menu plus a context-aware persistent action.

## Context-aware CTA

Before RSVP completion:

> `Confirmar asistencia`

After RSVP completion:

> `Ver mi confirmación` or `Hablar por WhatsApp`

The persistent CTA must hide when it would cover the RSVP, upload form or critical content.

---

# 3. Entry and personalization

## Valid personalized invitation

Show the guest’s first name only when the token or identity context is valid.

Preferred structure:

```text
[Name],
esta invitación es para ti.
```

Secondary information may identify Felipe and Camila and the date.

## Unknown or invalid context

Never expose whether a specific person exists in the guest database.

Provide:

- neutral invitation entry;
- a safe way to enter an invitation code or request help;
- clear error language;
- WhatsApp assistance.

## Returning guest

When a returning guest has already responded:

- acknowledge existing status;
- allow review or controlled update;
- do not force the entire emotional journey before reaching practical information.

---

# 4. Progressive disclosure

The site should reveal complexity only when needed.

Examples:

- dietary details appear only when attending and when a relevant option is selected;
- full address and map actions appear with the relevant venue;
- upload consent appears before final photo submission;
- WhatsApp operational options appear after RSVP save;
- full archive filters belong mainly to `/galeria`, not all at once on the home.

Avoid accordion overload and hidden essential information.

---

# 5. Homepage UX by act

## Act 0 — Anticipation

### Required

- immediate visual identity;
- entry interaction under approximately one second where possible;
- no blocked access to essential content;
- reduced-motion version.

### Failure conditions

- mandatory 3D envelope;
- waiting for a long animation;
- unclear clickable object;
- music starting automatically.

## Act 1 — Recognition

### Required

- personal name when safely available;
- one dominant action;
- date and couple identity visible or immediately accessible;
- no competing navigation before entry.

## Act 2 — Declaration

### Required

- maximum one short statement;
- strong visual hierarchy;
- no operational form;
- enough space to create a perceptual pause.

## Act 3 — History

### Required

- four to six curated moments maximum on the primary journey;
- civil wedding clearly marked as a previous chapter;
- photographs may open or expand without losing scroll position;
- no generic chronology component.

## Act 4 — Event

### Required

For each venue:

- verified name;
- role: ceremony or reception;
- time;
- location;
- map action;
- relevant arrival guidance.

The event schedule must be scannable in under ten seconds.

## Act 5 — RSVP

### Guest identification state

- recognized guest greeting;
- invitation status;
- no pass count;
- no companion controls.

### Form fields

Minimum expected:

- attendance: yes / no;
- dietary restriction when attending;
- detail when needed;
- phone only if absent or verification is required;
- email only if operationally justified.

Do not ask for information already known unless it must be confirmed.

### Submission states

1. idle;
2. validating;
3. saving;
4. saved;
5. partial sync or queued, when applicable;
6. recoverable error;
7. duplicate or previous response;
8. offline.

### Success rule

Never display success or open WhatsApp before Supabase confirms the save or controlled update.

### Update rule

A guest may review and request a change. Sensitive or exceptional changes may require human confirmation.

## Act 6 — Living gallery

### Home presentation

- show a curated subset, not an endless wall;
- use visual rhythm, varied scale and deliberate whitespace;
- initial images must load progressively;
- display meaningful album or chapter context;
- use real Supabase data rather than fictitious production placeholders.

### Home actions

- `Agrega tu mirada`
- `Ver archivo completo`

### Upload interaction

Recommended as a modal, drawer or immersive overlay integrated with the visual system.

Steps:

1. identify uploader or request name;
2. choose camera or library;
3. preview image;
4. state publication visibility and consent;
5. submit;
6. show progress;
7. explain success and moderation state;
8. allow another upload or return.

### Upload failure recovery

- preserve name and selected file where technically possible;
- explain whether the upload or metadata save failed;
- allow retry;
- never say the photo was published when only Storage succeeded.

### `/galeria`

Must provide:

- complete archive;
- filters validated by real data;
- keyboard and touch lightbox;
- progressive loading;
- empty, error and offline states;
- direct upload action;
- shareable route without exposing private information.

## Act 7 — Concierge

### UX principle

Conversation is a service shortcut, not a requirement to understand the event.

### Entry points

- practical information section;
- RSVP success;
- persistent help action;
- direct WhatsApp number.

### Handoff transparency

Users must know whether they are interacting with an assistant and when a human takes over.

## Act 8 — Closing

- one photographic or graphic resolution;
- one short closing statement;
- date signature;
- no new complex functionality.

---

# 6. Responsive composition

## Desktop

Desktop may use:

- large typographic architecture;
- asymmetric grids;
- controlled image overlap;
- scroll-linked transitions;
- generous negative space.

Desktop must not require hover for essential meaning or actions.

## Mobile

Mobile is a separately composed experience, not stacked desktop.

Priorities:

- portrait photography;
- readable line lengths;
- thumb-zone actions;
- immediate access to RSVP, maps and WhatsApp;
- camera upload;
- safe-area support;
- reduced payload;
- no horizontal scrolling requirement.

## Breakpoint behavior

For every approved component, `DESIGN.md` must specify:

- desktop layout;
- tablet transformation;
- mobile layout;
- image crop;
- typography scale;
- motion reduction;
- touch target behavior.

---

# 7. Interaction and motion

## Permitted motion purposes

- reveal a chapter;
- connect related information;
- indicate progress;
- confirm an action;
- transition between memory and future;
- focus attention.

## Motion limits

- core information must remain accessible without motion;
- no interaction should depend only on hover;
- no repeated decorative movement near forms;
- no long scroll-jacking;
- no autoplay carousel;
- no background motion that competes with reading;
- respect `prefers-reduced-motion`.

## Feedback timing

- tap or click response: immediate visual state;
- validation feedback: next to the affected input;
- save progress: explicit and persistent;
- success: only after confirmed operation;
- background queue state: disclosed, not disguised as complete.

---

# 8. Form design standards

- labels remain visible;
- placeholders are examples, not labels;
- required status is explicit;
- errors explain how to recover;
- focus moves to the first invalid field when appropriate;
- radio controls use large touch areas;
- form data survives recoverable errors;
- destructive changes require confirmation;
- no dark patterns or guilt language.

---

# 9. Accessibility requirements

Minimum:

- WCAG AA contrast;
- semantic headings and landmarks;
- visible focus;
- full keyboard access;
- accessible dialog focus management;
- image alt text based on function and content;
- audio controls with labels;
- reduced-motion path;
- form errors associated with fields;
- screen-reader status announcements for saving and upload progress;
- touch targets of at least approximately 44 × 44 CSS pixels.

Photography and typography must never reduce legibility below these requirements.

---

# 10. UX writing integration

Every screen must separate:

- emotional copy;
- factual content;
- instruction;
- action label;
- system status.

Do not use poetic language for errors, consent, schedules or database status.

---

# 11. Analytics events

At minimum define:

- invitation opened;
- personalized context loaded / failed;
- event-information section viewed;
- map opened by venue;
- RSVP started;
- RSVP attendance selected;
- RSVP submitted;
- RSVP saved;
- RSVP failed;
- WhatsApp opened after RSVP;
- gallery viewed;
- upload started;
- upload succeeded;
- upload failed;
- complete archive opened;
- concierge opened;
- human help requested.

Analytics must not expose sensitive guest or dietary data.

---

# 12. UX acceptance tests

A representative guest must be able to:

1. identify whose wedding and date it is without confusion;
2. confirm that the invitation is individual;
3. locate ceremony and reception information quickly;
4. submit RSVP on mobile without zooming or horizontal scrolling;
5. know whether the response was saved;
6. open WhatsApp after success;
7. upload a photo from a mobile library or camera;
8. understand publication consent and moderation;
9. view the complete archive;
10. request human help;
11. complete critical tasks with reduced motion and keyboard navigation.

The UX fails if visual innovation makes any of these tasks materially harder.
