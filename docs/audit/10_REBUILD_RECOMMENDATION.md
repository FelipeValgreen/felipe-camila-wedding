# 10 — Rebuild Recommendation

Status: **Pending completion of the full audit**

## Decision objective

Determine which parts of the current platform should be:

- retained unchanged;
- retained but isolated;
- refactored;
- migrated;
- rebuilt;
- removed.

## Required separation

Provide two independent proposals:

### A. Visual and experience proposal

- distinctive concept and visual signature;
- information architecture;
- mobile and desktop experience;
- photography direction;
- motion language;
- RSVP placement;
- integrated home gallery and photo-upload experience;
- full `/galeria` archive relationship;
- WhatsApp concierge entry;
- accessibility and performance constraints.

### B. Technical proposal

- target stack;
- repository structure;
- data model;
- migration strategy;
- staging strategy;
- deployment and rollback;
- testing strategy;
- RSVP, Google Sheets and WhatsApp integration;
- unified Supabase gallery, Storage, moderation and upload architecture.

## Creative standard

Do not copy conventional wedding websites. Reference editorial fashion, luxury, architecture, museums and hospitality. The experience may be completely rethought.

The proposed distinctive direction to evaluate is:

> **23·10·26 — A Living Invitation**

The date and a continuous line may function as an architectural system for masks, transitions, navigation, locations, story progression and RSVP confirmation. Treat this as a hypothesis to test, not an automatic final decision.

## Mandatory living-gallery experience

The photographic archive must be part of the home narrative rather than an isolated utility.

The proposed experience must define:

- where the gallery appears in the story;
- how historical civil photos and future wedding photos coexist without confusion;
- how the visual system transitions into the gallery;
- how `Subir fotos` appears without feeling like a generic form;
- mobile camera and library behavior;
- upload progress, success, failure and moderation states;
- how the home curated view links to the complete `/galeria` archive;
- how new approved photos appear without redeployment;
- how original historical files remain protected.

The gallery should make the invitation feel alive and evolving, while the RSVP and event information remain clear and easy to access.

## Recommendation matrix

| Area | Current state | Keep / refactor / rebuild / remove | Reason | Risk | Priority | Acceptance criterion |
|---|---|---|---|---:|---:|---|
| Migrate to Next.js | Current static HTML architecture is unscalable | Improved DevEx, performance, and security | Medium | Low | P1 | React/Next.js frontend setup |
| Secure Supabase Backend | RLS is open and keys are exposed | Prevents data corruption and unauthorized access | Medium | High | P0 | Implement Row Level Security securely |

## Implementation gate

No implementation may begin before:

1. audit approval;
2. backup verification;
3. separate implementation branch;
4. staging or preview environment;
5. approved visual prototype;
6. rollback plan;
7. data migration plan where applicable.
