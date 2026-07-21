# Product & Experience Specification Pack

This directory defines what Antigravity must design and eventually implement after the audit is completed and approved.

## Source-of-truth order

When documents conflict, use this precedence:

1. Approved factual event information
2. Security, data-integrity and production-safety rules in `.agents/rules/`
3. `00_MASTER_EXPERIENCE_PRD.md`
4. `01_UX_UI_EXPERIENCE_SPEC.md`
5. `02_COPYWRITING_SYSTEM.md`
6. `03_AI_CONCIERGE_PRODUCT_SPEC.md`
7. `04_VISUAL_DESIGN_INNOVATION_SPEC.md`
8. `06_CONTENT_AND_STATE_MATRIX.md`
9. Human approvals recorded under `08_HUMAN_APPROVAL_GATES.md`
10. Approved Stitch prototype and generated `DESIGN.md`
11. `05_STITCH_ANTIGRAVITY_HANDOFF.md`
12. Existing production implementation

The current website is evidence of existing behavior, not the creative or architectural source of truth.

## Required reading before design or implementation

Antigravity must read:

- every file in `.agents/rules/`;
- every file in `docs/audit/`;
- every file in `docs/product/`;
- the approved photography direction;
- the approved Stitch project and `DESIGN.md` when available.

## Product documents

- `00_MASTER_EXPERIENCE_PRD.md` — product vision, users, scope, journey, priorities, metrics and delivery gates.
- `01_UX_UI_EXPERIENCE_SPEC.md` — information architecture, interaction design, responsive behavior, forms, accessibility and UX acceptance criteria.
- `02_COPYWRITING_SYSTEM.md` — voice, tone, narrative, interface copy, error messages, consent and prohibited language.
- `03_AI_CONCIERGE_PRODUCT_SPEC.md` — WhatsApp assistant role, knowledge, tools, privacy, safeguards and human handoff.
- `04_VISUAL_DESIGN_INNOVATION_SPEC.md` — visual thesis, Stitch territories, typography, color, grid, photography, motion and visual acceptance criteria.
- `05_STITCH_ANTIGRAVITY_HANDOFF.md` — design exploration, concept selection, prototype, `DESIGN.md`, design-to-code mapping and QA handoff.
- `06_CONTENT_AND_STATE_MATRIX.md` — canonical sources and all critical interface, data, loading, empty, error and returning-user states.
- `07_MASTER_ANTIGRAVITY_EXECUTION_PROMPT.md` — single execution instruction and required workflow for Antigravity.
- `08_HUMAN_APPROVAL_GATES.md` — decisions that AI may prepare but Felipe and Camila must explicitly approve.

## Core product statement

> Felipe and Camila’s website is a personalized living invitation: it recognizes each guest, communicates a meaningful ritual, supports an individual RSVP, offers practical assistance and becomes a shared photographic archive before, during and after the wedding.

## Non-negotiable outcomes

- The visual experience must be globally distinctive and not resemble a wedding template.
- Event information and RSVP must remain immediately understandable.
- RSVP is individual.
- Supabase is the central source of truth.
- WhatsApp is the concierge and communication channel, not the only record of confirmation.
- The home includes a living gallery and photo upload.
- `/galeria` remains the complete archive.
- Historical civil-wedding photos and data remain protected.
- Every critical flow includes loading, success, failure, return and recovery states.
- AI identifies itself, uses approved knowledge and hands off to a human.
- No production implementation begins before audit approval, prototype approval, staging and rollback readiness.

## Current authorized use

These documents authorize Antigravity to:

- complete the audit;
- prepare implementation planning documents;
- coordinate or consume Stitch concept exploration;
- create prototypes and previews in separate branches;
- test non-destructively.

They do not authorize:

- changes to production;
- merges into `main`;
- unreviewed database migrations;
- publication of generated couple imagery;
- changes to invitation policy;
- unapproved event facts or copy.
