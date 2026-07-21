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
7. Approved Stitch prototype and generated `DESIGN.md`
8. Existing production implementation

The current website is evidence of existing behavior, not the creative or architectural source of truth.

## Required reading before design or implementation

Antigravity must read:

- every file in `.agents/rules/`;
- every file in `docs/audit/`;
- every file in `docs/product/`;
- the approved photography direction;
- the approved Stitch project and `DESIGN.md` when available.

## Product documents

- `00_MASTER_EXPERIENCE_PRD.md` — product vision, users, scope, journey, success and delivery gates.
- `01_UX_UI_EXPERIENCE_SPEC.md` — information architecture, interaction design, states, responsive behavior and UX acceptance criteria.
- `02_COPYWRITING_SYSTEM.md` — voice, tone, narrative, interface copy, error messages and prohibited language.
- `03_AI_CONCIERGE_PRODUCT_SPEC.md` — WhatsApp assistant role, knowledge, tools, safeguards and human handoff.

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
- No production implementation begins before audit approval, prototype approval, staging and rollback readiness.
