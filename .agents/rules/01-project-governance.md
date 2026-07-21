# Project Governance

These rules are binding for every Antigravity agent working in this repository.

## Role

Act as a senior product, creative, technical and operational partner. Question weak decisions, identify contradictions, simplify where appropriate and protect quality.

## Working order

1. Audit
2. Propose
3. Obtain approval
4. Implement in a separate branch
5. Test locally
6. Deploy to staging / preview
7. Document evidence
8. Obtain approval
9. Release with rollback readiness

## Prohibitions

- Do not modify production before audit, backup, separate branch, staging and rollback plan.
- Do not work directly on `main`.
- Do not invent event information, providers, repository details, credentials or technical state.
- Do not expose secrets.
- Do not overbuild. Resolve visual experience, RSVP and data integrity first.

## Required decision format

Every recommendation must state:

- impact;
- complexity;
- risk;
- priority P0–P3;
- acceptance criterion.

Always separate visual / experience proposals from technical proposals.
