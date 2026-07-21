# Review 01 — Audit Quality and Conditional Creative Direction

**Status:** Changes required before Gate 3 approval  
**Reviewer decision:** Audit is useful but not yet sufficiently evidenced to be treated as fully verified. Creative direction is conditionally selected as a controlled synthesis, not as one of the three concepts exactly as written.

---

# 1. Repository verification

The remote branch now includes:

- completed audit documents under `docs/audit/`;
- five planning documents under `docs/implementation/`;
- `docs/product/09_STITCH_CONCEPT_DIRECTIONS.md`;
- no application-code changes in the audit branch.

This is the correct branch discipline. Production implementation is not authorized by this review.

---

# 2. Audit review

## 2.1 Useful findings

The audit correctly identifies several material issues:

- monolithic static architecture;
- public browser access to Supabase;
- permissive guest-list and RSVP policies described in the repository migration file;
- uncontrolled photo-upload risk;
- lack of a proper staging environment;
- duplicated and mixed gallery behavior;
- need for an individual RSVP and a secure server-side operation layer.

These findings are directionally correct and relevant.

## 2.2 Evidence gap

Several documents use `Status: Complete` without preserving enough evidence to distinguish:

- live configuration verified directly;
- repository configuration inferred from code or SQL;
- recommendations;
- measurements;
- assumptions.

Every audit fact must be labeled as one of:

- **VERIFIED LIVE** — confirmed directly in the authenticated service;
- **VERIFIED REPOSITORY** — confirmed from committed files or Git history;
- **INFERRED** — reasoned from implementation evidence but not confirmed live;
- **UNVERIFIED** — requires service access or further testing.

## 2.3 Vercel audit correction

`03_VERCEL_CONFIGURATION.md` does not include sufficient evidence for a complete Vercel audit.

It must add:

- exact command or authenticated source used;
- project ID and team scope, with no secret values;
- production branch evidence;
- latest successful production deployment ID, date and commit;
- latest failed deployment if any;
- domain and alias inventory;
- environment-variable names by environment;
- build and root-directory settings;
- deployment-protection state;
- preview URL behavior;
- rollback evidence.

Until those items are recorded, the Vercel status is **partially verified**, not complete.

## 2.4 Supabase audit correction

`04_SUPABASE_SCHEMA.md` and `05_RLS_AND_STORAGE_POLICIES.md` appear substantially derived from repository files. They do not prove that the live project currently matches the SQL file.

They must add authenticated evidence for:

- live table and column inventory;
- views;
- functions and RPCs;
- triggers;
- indexes and constraints;
- actual live RLS policies;
- Storage buckets and live object policies;
- bucket visibility;
- object counts;
- orphaned records and files;
- duplicate RSVP and guest records;
- whether migrations in the repository were actually applied.

The policy findings remain P0 candidates, but must be described as **repository-confirmed and live-unverified** until checked in Supabase.

## 2.5 Performance audit correction

`09_PERFORMANCE_BASELINE.md` contains numeric scores without:

- test date;
- tested URL;
- tool and version;
- device profile;
- network profile;
- Lighthouse report or JSON;
- screenshot or command evidence;
- run count and median.

The values cannot currently be used as an engineering baseline.

Repeat the tests and attach the evidence. Until then, mark the metrics **UNVERIFIED ESTIMATES**.

## 2.6 Asset audit correction

`07_ASSET_INVENTORY.md` is not a complete asset inventory. It lists only a small subset of repository assets.

It must inventory every:

- image;
- icon;
- favicon and PWA asset;
- audio file;
- generated portrait;
- civil photograph;
- venue photograph;
- placeholder;
- example guest photograph;
- external URL asset.

The row for `assets/song.mp3` must not state `Fair Use` or `Approved` without documented permission or an authorized embed/source. Its status must be:

- **Copyrighted**;
- **License unverified**;
- **Not approved for final production until authorization is documented**.

## 2.7 Security audit expansion

The security report must also test and document:

- invitation-code enumeration;
- local fallback guest codes;
- public access to personal RSVP data;
- HTML injection risk where database values are inserted through `innerHTML`;
- upload rate limiting;
- MIME spoofing and file-content validation;
- maximum upload size;
- duplicate RSVP handling;
- Web3Forms key scope and abuse exposure;
- example or placeholder phone numbers;
- administrative-route protection;
- whether public gallery URLs expose metadata or private images;
- logging of personal data.

---

# 3. Implementation-plan review

## 3.1 Target architecture

A modular Next.js implementation on Vercel is a reasonable target, but it is not automatically approved merely because the legacy site is monolithic.

The final architecture decision must compare:

1. modular static/Vite implementation;
2. Next.js App Router;
3. incremental migration versus full rebuild.

The decision must be based on:

- secure server operations;
- personalized invitation rendering;
- Supabase and Sheets integration;
- maintainability;
- preview and rollback;
- gallery performance;
- project complexity.

## 3.2 Individual RSVP contradiction

The target data plan and design map still preserve `passes` in `guest_list` and global guest state.

This contradicts the approved product rule:

> RSVP is individual. There is no visible partner, companion, family-pass or quota logic.

Required correction:

- remove `passes` from the target guest-facing model;
- retain legacy values only in a migration/archive field if operationally necessary;
- never render or use passes to determine the current invitation experience;
- create one active invitation record per person.

## 3.3 Migration-plan risks

The current backup proposal is not sufficient as a full database backup.

Required corrections:

- use an approved Supabase/PostgreSQL backup method;
- back up schema, data and Storage metadata;
- avoid exposing service-role tokens in shell history;
- define encryption and deletion of temporary backups;
- include row counts and checksums before and after migration;
- include a mapping for legacy code-based RSVP rows to individual guest IDs;
- define rollback SQL and restoration order;
- test on an isolated project or local Supabase environment.

## 3.4 Event-type consistency

The migration plan uses values such as `wedding`, while the approved system uses explicit contexts such as:

- `civil`;
- `preparativos`;
- `iglesia`;
- `invitados` or another approved canonical value.

Create one controlled enum or constraint and document it once.

## 3.5 Audio architecture

Do not design the final architecture around a locally stored commercial song until licensing is verified.

The audio component must support:

- authorized local asset or permitted embed;
- user-triggered start;
- pause;
- low initial volume;
- unavailable-audio fallback;
- no dependency on audio for understanding the experience.

---

# 4. Creative-direction review

The three written directions are useful as hypotheses, but they are not yet Stitch outputs. They are short text descriptions, not concept boards, screens or prototypes.

Do not state that Stitch concept generation is complete until there are actual visual deliverables.

## 4.1 Concept A — El Umbral Vivo

### Strengths

- strongest emotional structure;
- clear ritual of entry;
- compatible with restraint and real photography;
- medium implementation complexity;
- best foundation for mobile and accessibility.

### Required corrections

- the gallery must not be reduced to only a horizontal ribbon;
- avoid a generic chat overlay—the primary concierge is WhatsApp;
- RSVP should feel like part of the narrative, not a generic utility drawer;
- closing copy should use the approved date and emotional language, not only `Nos vemos en Chicureo`;
- verify contrast and readable serif weights.

## 4.2 Concept B — Archivo en Movimiento

### Strengths

- strongest model for the living gallery;
- supports civil history and guest participation;
- gives photographs real narrative authority.

### Risks

- `accreditation form` and press-desk language feel institutional rather than intimate;
- dossier and monospace styling can become cold or affected;
- forced horizontal scrolling is an accessibility and mobile risk;
- making the archive the entire interface can reduce event-information clarity.

Use this as a chapter and content system, not as the complete structural backbone.

## 4.3 Concept C — La Fecha como Edificio

### Strengths

- strongest recognizable graphic signature;
- date can become masks, chapter numbers and closing mark;
- high potential for screenshots and memorability.

### Risks

- proposed 3D, scroll-linked zoom and WebGL are excessive for the project;
- high accessibility and performance risk;
- event facts nested inside animated geometry may become difficult to find;
- visual spectacle could dominate the human story.

Use the date as a two-dimensional typographic architecture, not as a heavy scroll monolith.

---

# 5. Conditional creative decision

## Selected structural backbone

# **Concept A — El Umbral Vivo**

This is the preferred structural and emotional direction.

It is not approved exactly as currently written.

## Controlled synthesis

The final direction should combine:

- **A:** ritual of entry, emotional pacing and hospitality;
- **C:** `23·10·26` as a two-dimensional graphic signature, masks and chapter architecture;
- **B:** living archive, civil-history treatment and guest participation.

Working name:

# **23·10·26 — El Umbral Vivo**

## Non-negotiable visual behavior

- real photography remains the emotional evidence;
- date typography creates recognition without heavy 3D;
- the continuous line connects history, event, RSVP and archive;
- gallery uses a responsive editorial composition, not forced horizontal scroll;
- mobile is independently composed;
- RSVP is an in-flow personal ritual with an immediately accessible shortcut;
- WhatsApp is the concierge entry;
- all effects have reduced-motion fallbacks;
- event facts remain instantly accessible.

---

# 6. Required deliverables before Gate 3 approval

Antigravity must create or coordinate actual Stitch deliverables for all three directions.

For each direction provide:

1. concept board;
2. desktop opening;
3. mobile opening;
4. story/history composition;
5. ceremony and Arboleda composition;
6. RSVP default, loading, success and failure states;
7. home gallery and upload states;
8. `/galeria` archive screen;
9. WhatsApp concierge entry;
10. closing screen;
11. reduced-motion alternative;
12. design rationale;
13. implementation-complexity estimate.

Then prepare a recommended hybrid prototype based on the controlled synthesis above.

Do not implement application code before those visual deliverables are reviewed.

---

# 7. Immediate next authorized action

Antigravity is authorized to:

- correct and evidence the audit documents;
- create the missing verified-facts and asset-manifest documents;
- generate the actual Stitch concept boards and screen systems;
- prepare a visual comparison for human review.

Antigravity is not yet authorized to:

- implement the Next.js rebuild;
- change Supabase schema or policies;
- replace production assets;
- merge to `main`;
- deploy production.
