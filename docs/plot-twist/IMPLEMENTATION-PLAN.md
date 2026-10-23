# PLOT TWIST — IMPLEMENTATION PLAN

Actualizado contra PRD Maestro V2. Estados: TODO / DOING / BLOCKED / DONE.

## P0 — invariantes
| ID | Slice | Estado | Gate |
|---|---|---|---|
| P0-A1 | constraints nickname/código/ledger append-only | DONE | migration review |
| P0-A2 | score RPC idempotente | DOING | no prod apply |
| P0-B1 | join + restore same-device | DOING | AC-01/05 |
| P0-B2 | recovery cross-device | DOING | AC-06 |
| P0-B3 | offline/outbox correcto | DOING | AC-09/10 |
| P0-C1 | stage state machine | DOING | AC-11 |
| P0-C2 | readiness 75% + timeout + auto-advance | DOING | simulation |
| P0-D1 | collective decision | DOING | AC-07/08 |
| P0-D2 | individual vote | DONE base | callback test |
| P0-D3 | callback resolver/ties/fallback | DOING | callback test |
| P0-E1 | wager snapshot/freeze | DONE base | AC-13 |
| P0-E2 | final resolution +/- wager | DONE base | ledger replay |

## P1 — juego completo
| ID | Slice | Estado |
|---|---|---|
| P1-A1 | powers inventory/use/target/caps | TODO |
| P1-A2 | tombola entitlement + deterministic spin | TODO |
| P1-B1 | media opportunity/upload metadata | TODO |
| P1-B2 | reactions + curated moments feed | DOING |
| P1-B3 | Mi mesa chronicle | DONE base |
| P1-C1 | operator audit/compensation/role transfer | DOING |
| P1-C2 | hall screen + no-leak policy | DOING |
| P1-D1 | QR/recovery cards generator | BLOCKED seating freeze |
| P1-D2 | final physical pieces generator | TODO design approval |

## P2 — readiness evento
| ID | Slice | Estado |
|---|---|---|
| P2-1 | fixtures/simulator 20 mesas | TODO |
| P2-2 | concurrency/retry tests | TODO |
| P2-3 | iOS/Android accessibility pass | TODO |
| P2-4 | venue network rehearsal | BLOCKED venue |
| P2-5 | 8–12 person rehearsal | BLOCKED scheduling |
| P2-6 | content freeze / couple answers | BLOCKED approval |
| P2-7 | rollback + event-day runbook | TODO |

## Dependencias de usuario que NO bloquean desarrollo
Seating final, respuestas verdaderas de novios, premios físicos, persona backup y aprobación de pieza final se mantienen como placeholders hasta el gate correspondiente. No preguntar antes de ser estrictamente necesario.

## Próximo bloque
Cerrar P0-A/B/C/D/E antes de profundizar P1. Cada cambio debe actualizar esta tabla.


## QR landing release — 2026-10-22
Scope: real photograph, responsive presentation and entry form reusing the existing Plot Twist client. No game rules, API, scores, migrations or seating changed.
- Preview 6decbfe: real WebP loaded at 680 × 453; no face cropping (intrinsic 3:2 ratio).
- Browser validation: zero and alphabetic table input rejected; 8 accepted by format validation. This does not prove mesa 8 exists.
- /fotos/, /plot-twist/, /galeria/, upload script, WebP and /api/gallery returned HTTP 200.
- Gallery rendered 177 photographs; upload anchor navigation verified. No real upload or successful join executed.
- Existing 9 payload/integration-contract tests passed.
- BLOCKED: production session endpoint returns SUPABASE_ERROR_404. Supabase public schema lacks plot_twist_* tables. Game activation requires a separate reviewed initialization with real table mapping; none was invented.
- NOT RUN: physical iPhone/Safari and mobile browser emulation (browser dependencies unavailable).
- Rollback: redeploy production commit 5e0e7a1b81d0ce024ded8b072214c652bbf73a86.
