# 08 — Human Approval Gates

## Objective

Define the decisions that AI may prepare but may not finalize without Felipe and Camila.

Human approval protects truth, identity, relationships, privacy and production safety.

---

# Gate 1 — Verified facts

Approve before prototype finalization:

- event date;
- ceremony name;
- reception name;
- schedules;
- addresses and map links;
- dress code;
- parking;
- gift information;
- official WhatsApp number;
- RSVP deadline;
- photo-publication policy.

Deliverable:

`docs/content/VERIFIED_EVENT_FACTS.md`

No pending field may be converted into plausible copy by AI.

---

# Gate 2 — Photography truth

Approve:

- hero photograph;
- couple photographs;
- civil-wedding selection;
- Santuario selection;
- Arboleda selection;
- gallery seed photographs;
- black-and-white treatment;
- desktop and mobile crops;
- any material retouching or expansion.

Reject:

- artificial likeness;
- wrong venue attribution;
- unapproved guest imagery;
- production placeholders;
- photographs that distort the story.

Deliverable:

`design/ASSET_MANIFEST.md`

---

# Gate 3 — Creative direction

Review the three Stitch territories.

Approve one structural backbone based on:

- emotional truth;
- distinctiveness;
- clarity;
- mobile quality;
- gallery integration;
- feasibility;
- accessibility;
- long-term memory value.

Deliverable:

`docs/decisions/CREATIVE_DIRECTION_DECISION.md`

Do not approve by saying only `I like this one`. Record reasons and rejected alternatives.

---

# Gate 4 — Narrative and copy

Approve:

- opening line;
- emotional declaration;
- history captions;
- event framing;
- RSVP wording;
- gallery wording;
- closing line;
- WhatsApp assistant introduction;
- sensitive error and handoff language.

Operational facts must be checked separately from emotional preference.

Deliverable:

`docs/content/APPROVED_COPY.md`

---

# Gate 5 — UX prototype

Approve the full prototype, not only the hero.

Review:

- personalized and neutral entry;
- event information;
- RSVP and all states;
- living gallery;
- upload consent and errors;
- `/galeria`;
- WhatsApp entry;
- returning guest;
- mobile;
- reduced motion;
- accessibility.

Deliverable:

`docs/decisions/PROTOTYPE_APPROVAL.md`

---

# Gate 6 — Data and invitation policy

Approve:

- individual RSVP model;
- guest identification method;
- handling of unknown or shared phone numbers;
- exceptional invitation requests;
- update and reconfirmation rules;
- Google Sheets operating model;
- historical civil-data separation;
- photo moderation and retention.

Deliverable:

`docs/decisions/DATA_AND_INVITATION_POLICY.md`

---

# Gate 7 — AI concierge behavior

Approve:

- knowledge domains;
- actions the assistant may execute;
- actions requiring explicit confirmation;
- mandatory human-handoff triggers;
- human operators and responsibilities;
- conversation retention;
- outbound templates;
- assistant disclosure language.

Deliverable:

`docs/decisions/AI_CONCIERGE_APPROVAL.md`

---

# Gate 8 — Technical migration

Approve before any production schema or infrastructure change:

- target architecture;
- migration steps;
- backup verification;
- RLS changes;
- Storage changes;
- environment changes;
- Vercel configuration;
- rollback procedure.

Deliverables:

- `docs/implementation/DATA_MIGRATION_PLAN.md`
- `docs/implementation/ROLLBACK_PLAN.md`

---

# Gate 9 — Staging acceptance

Approve after reviewing the actual preview on:

- iPhone Safari;
- Android Chrome;
- desktop;
- slow network;
- reduced motion;
- real or production-like guest data;
- real gallery data;
- upload;
- WhatsApp handoff.

Deliverable:

`docs/decisions/STAGING_ACCEPTANCE.md`

Record known defects and whether they block release.

---

# Gate 10 — Production release

Explicitly approve:

- release branch and commit;
- migrations;
- deployment window;
- smoke-test checklist;
- rollback owner;
- monitoring period;
- production decision.

Deliverable:

`docs/decisions/PRODUCTION_RELEASE_APPROVAL.md`

Silence or a successful automated test is not production approval.

---

# Approval record format

Every approval document must include:

- decision;
- date;
- decision makers;
- evidence reviewed;
- approved scope;
- rejected alternatives;
- remaining risks;
- conditions;
- next authorized action.

AI may prepare the record but a human must explicitly approve its decision content.
