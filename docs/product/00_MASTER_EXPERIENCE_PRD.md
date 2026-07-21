# 00 — Master Experience PRD

## Product name

**23·10·26 — El Umbral Vivo**

Working descriptor:

> A personalized living invitation, human concierge and shared photographic archive for Felipe and Camila’s religious wedding.

## Status

Product and experience definition. Implementation is blocked until the technical audit, design prototype and release gates are approved.

---

# 1. Product vision

The platform must transform a conventional wedding invitation into a meaningful digital threshold.

A guest should not feel that they opened an event landing page. They should feel that:

1. the invitation recognizes them personally;
2. their relationship with Felipe and Camila is acknowledged;
3. the event has emotional and ceremonial meaning;
4. all practical information is clear;
5. confirming attendance is simple and trustworthy;
6. questions can be resolved conversationally;
7. their presence and photographs can become part of a living collective memory.

The website must combine emotional resonance with operational clarity. Innovation is successful only when it improves recognition, meaning, orientation, participation or memory.

---

# 2. Product problem

The current product contains valuable functions and data but behaves as an accumulation of wedding modules:

- opening envelope;
- event information;
- RSVP;
- gallery and uploads;
- trivia;
- playlist;
- WhatsApp actions.

This weakens the main journey and produces four risks:

1. **Generic perception:** the site can resemble premium wedding templates.
2. **Narrative dilution:** emotional, practical and entertainment content compete equally.
3. **Operational ambiguity:** RSVP, passes, WhatsApp and Supabase responsibilities are not sufficiently clear.
4. **Fragmented memory:** the home, `/fotos` and `/galeria` do not yet behave as one coherent photographic system.

---

# 3. Product hypothesis

If the experience:

- identifies each guest individually;
- presents the wedding as the next chapter of a real shared history;
- uses `23·10·26`, a continuous line and real photography as a distinctive design language;
- makes the individual RSVP the natural conclusion of the invitation;
- integrates the gallery and photo contribution into the home;
- provides a trustworthy WhatsApp concierge;

then guests will understand the event more clearly, feel more personally included, confirm with less friction and participate more actively in the shared memory.

---

# 4. Primary users

## 4.1 Personally invited guest

Needs:

- know that the invitation is genuinely for them;
- understand date, time, ceremony, reception and dress code;
- confirm or decline quickly;
- communicate dietary needs;
- ask practical questions;
- receive a reliable acknowledgement;
- revisit information later.

Risks:

- confusing the civil wedding with the religious event;
- believing an invitation includes a partner or additional passes;
- abandoning an overlong or unclear experience;
- doubting whether the confirmation was saved.

## 4.2 Older or less digital guest

Needs:

- readable typography;
- direct navigation;
- obvious buttons;
- minimal mandatory interactions;
- human help through WhatsApp;
- no dependence on complex gestures or animation.

## 4.3 Mobile-first guest

Needs:

- fast loading;
- safe portrait image crops;
- thumb-accessible actions;
- maps and WhatsApp access;
- camera and photo-library upload;
- stable behavior on mobile networks.

## 4.4 Felipe, Camila and the operational team

Needs:

- one source of truth for guests and RSVP;
- clear visibility of pending, confirmed and declined guests;
- reliable dietary information;
- conversation and human-handoff visibility;
- protected historical photographs;
- a simple way to moderate and organize uploads;
- a reversible deployment process.

---

# 5. Jobs to be done

## Guest jobs

- When I receive the invitation, help me understand that it is personal and why my presence matters.
- When I need practical information, help me find it without searching through decorative content.
- When I decide whether to attend, let me answer once and know the result was saved.
- When I have a question, let me ask naturally and reach a person if needed.
- When I take a meaningful photo, let me contribute it easily and understand how it may be used.

## Couple and operations jobs

- When guests respond, consolidate accurate individual RSVP data.
- When guests ask repetitive questions, answer them consistently without losing human escalation.
- When photos are uploaded, protect originals, moderate visibility and publish without redeployment.
- When the site changes, protect production and historical data.

---

# 6. Experience principles

## 6.1 Recognition before information

The experience first establishes who the invitation is for, then presents emotional and practical content.

## 6.2 Meaning before decoration

Every visual element must support memory, transition, belonging, orientation or action.

## 6.3 Clarity before spectacle

Date, locations, RSVP and assistance must remain accessible without completing animations or deciphering experimental navigation.

## 6.4 Participation before passive consumption

The guest can respond, ask, contribute and revisit.

## 6.5 Truth before generated perfection

Real photographs and real history take precedence over artificial scenes or faces.

## 6.6 Hospitality before automation

AI must feel helpful, transparent and reversible through human handoff.

## 6.7 Accessibility as respect

Reduced motion, readable copy, clear focus and honest errors are part of the emotional quality of the product.

---

# 7. Product architecture

## Primary experience

```text
Personal invitation or direct home entry
  -> recognition
  -> emotional declaration
  -> living history
  -> October 23 event information
  -> individual RSVP
  -> living gallery and contribution
  -> practical concierge
  -> closing
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Complete living invitation and principal journey |
| `/invitacion?t=TOKEN` | Personalized invitation context or equivalent secure route |
| `/galeria` | Complete photographic archive |
| `/fotos` | Dedicated upload fallback or direct contribution route |
| `/informacion` | Optional direct practical-information route if validated by UX testing |
| administrative route | Moderation and operations, protected and not publicly discoverable |

The home, `/galeria` and `/fotos` must share one gallery and upload architecture.

---

# 8. Homepage acts

## Act 0 — Anticipation

Purpose: interrupt ordinary browsing without delaying access.

Requirements:

- `23·10·26` as the first graphic signal;
- maximum brief entry transition;
- no mandatory long intro;
- accessible skip or immediate continuation behavior.

## Act 1 — Personal recognition

Purpose: establish that the invitation is individual.

Required pattern:

> `[Name], esta invitación es para ti.`

When no valid guest context exists, use a neutral but dignified entry without exposing guest data.

## Act 2 — Human declaration

Purpose: communicate emotional meaning in very few words.

No event-detail overload.

## Act 3 — Living history

Purpose: show a real relationship through curated fragments.

Requirements:

- civil wedding is clearly historical;
- no conventional timeline;
- real approved photography;
- concise captions or dates;
- independent mobile crops.

## Act 4 — The next chapter

Purpose: make October 23 concrete and memorable.

Information:

- religious ceremony;
- reception;
- confirmed schedules;
- verified locations;
- maps;
- dress code.

## Act 5 — Individual RSVP

Purpose: allow one guest to confirm or decline with confidence.

Requirements:

- no visible partner, companion, family or passes logic;
- minimal fields;
- dietary information only when attending;
- validation before submission;
- Supabase save or update before success acknowledgement;
- Google Sheets operational sync or queue state;
- WhatsApp offered after successful save;
- clear duplicate, offline and failure states.

## Act 6 — Living gallery

Purpose: transform memory into collective participation.

Requirements:

- curated home view;
- 8–12 initial images, progressively loaded;
- civil, preparations and guest images clearly contextualized;
- `Agrega tu mirada` upload action;
- `Ver archivo completo` link to `/galeria`;
- camera or library selection on supported mobile devices;
- preview, consent, progress, success, moderation and error states;
- no redeploy required for approved new photos.

## Act 7 — Concierge

Purpose: provide hospitality and practical clarity.

Information and actions:

- maps;
- parking;
- dress code;
- gift information;
- verified frequently asked questions;
- WhatsApp assistant;
- human escalation.

## Act 8 — Closing

Purpose: end with anticipation and emotional resolution.

Preferred copy direction:

> `Nos vemos el 23 de octubre.`

---

# 9. Functional requirements

## P0 — Integrity and safety

- individual guest identification;
- individual RSVP;
- truthful save acknowledgement;
- protected Supabase access;
- historical-photo recovery and protection;
- staging and rollback;
- no secrets in the frontend or generated documents;
- human handoff for WhatsApp.

## P1 — Core experience

- responsive living invitation;
- complete event information;
- integrated home gallery;
- reusable photo upload;
- complete `/galeria` archive;
- practical WhatsApp concierge;
- accessible and low-bandwidth alternatives.

## P2 — Experience elevation

- personalized copy;
- controlled motion system;
- narrative transitions;
- album curation;
- analytics and funnel visibility;
- reconfirmation workflow.

## P3 — Experimental

- advanced generative motion;
- optional contextual personalization beyond name;
- post-event memory experience;
- advanced archive browsing.

Trivia and collaborative playlist are not part of the primary product. They may be retained only if testing proves they add value without diluting RSVP, performance or identity.

---

# 10. AI role in the product

AI may support:

- approved-answer retrieval;
- guest-state-aware assistance;
- controlled RSVP or dietary-change tools;
- conversation summarization;
- human-handoff classification;
- design variation and responsive adaptation;
- visual QA and test generation.

AI may not:

- invent event facts;
- expose other guests;
- add companions;
- perform uncontrolled database mutations;
- impersonate Felipe or Camila;
- claim an operation succeeded without backend confirmation;
- fabricate photographs of the couple.

---

# 11. Content strategy

The content system must distinguish:

- emotional narrative;
- event facts;
- interaction instructions;
- system feedback;
- assistance responses.

Emotional copy may be poetic but brief. Operational copy must be literal, concrete and testable.

Approved facts must live in a structured content source with version, update date and approver.

---

# 12. Visual success standard

The experience must be recognizable without wedding clichés.

The proposed visual signature combines:

- `23·10·26` as architecture;
- a continuous line as narrative and interaction device;
- real photography as primary material;
- editorial typography;
- controlled contrast between memory and anticipation;
- asymmetric but intentional composition;
- motion with narrative purpose.

The design fails if it can be described as merely elegant, premium, minimalist or cinematic without a specific recognizable system.

---

# 13. Success metrics

## Operational

- RSVP completion rate by valid invitation visit;
- save success rate;
- duplicate or conflicting response rate;
- dietary-data completeness;
- WhatsApp resolution and human-handoff rate;
- gallery upload success rate;
- moderation turnaround.

## Experience

- percentage reaching event information;
- percentage reaching RSVP;
- RSVP abandonment by step;
- time to find location or schedule;
- return visits;
- gallery engagement;
- mobile error rate;
- accessibility defect count.

## Qualitative

Test guests should be able to say:

- “Entendí de inmediato que era para mí.”
- “Supe qué hacer y dónde encontrar la información.”
- “No parecía una plantilla de matrimonio.”
- “Se sentía como Felipe y Camila.”
- “Confié en que mi confirmación quedó registrada.”

---

# 14. Non-goals

- building a general social network;
- replacing professional wedding photography;
- adding entertainment features merely to increase session duration;
- creating a fully autonomous general-purpose chatbot;
- exposing the guest database;
- turning the experience into a technology demonstration;
- preserving the current structure solely because it already exists.

---

# 15. Delivery workflow

## Phase 1 — Audit

Verify repository, Vercel, Supabase, data, assets, policies and performance.

## Phase 2 — Creative divergence in Stitch

Produce three radically different directions:

- El Umbral Vivo;
- Archivo en Movimiento;
- La Fecha como Edificio.

## Phase 3 — Concept decision

Evaluate originality, humanity, clarity, participation, mobile behavior, feasibility and memory.

## Phase 4 — UX and content prototype

Prototype the full journey and every critical state.

## Phase 5 — `DESIGN.md`

Document tokens, typography, grids, image behavior, components, motion, accessibility and prohibited patterns.

## Phase 6 — Antigravity implementation

Implement in a separate branch, connect verified data flows and create a preview deployment.

## Phase 7 — QA and release

Test devices, real data, failures, performance, accessibility, staging and rollback before production.

---

# 16. Global acceptance criteria

The product is ready for production only when:

- the approved prototype and implementation match within documented tolerances;
- all event facts are verified;
- RSVP is individual and reliable;
- WhatsApp opens only after successful save where used in the RSVP flow;
- the home gallery and `/galeria` share the same authoritative source;
- historical photos are backed up and protected;
- upload, moderation and errors are tested;
- mobile, desktop, slow network and reduced motion are tested;
- no critical accessibility defects remain;
- production has a tested rollback procedure;
- Felipe and Camila approve the visual identity, copy and real-photo selection.
