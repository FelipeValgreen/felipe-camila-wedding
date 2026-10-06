# PLOT TWIST — IMPLEMENTATION PLAN

Actualizado contra PRD Maestro V2. Estados: TODO / DOING / BLOCKED / DONE.

## P0 — invariantes
| ID | Slice | Estado | Gate |
|---|---|---|---|
| P0-A1 | constraints nickname/código/ledger append-only | TODO | migration review |
| P0-A2 | score RPC idempotente | DOING | no prod apply |
| P0-B1 | join + restore same-device | DOING | AC-01/05 |
| P0-B2 | recovery cross-device | TODO | AC-06 |
| P0-B3 | offline/outbox correcto | TODO | AC-09/10 |
| P0-C1 | stage state machine | DOING | AC-11 |
| P0-C2 | readiness 75% + timeout + auto-advance | TODO | simulation |
| P0-D1 | collective decision | DOING | AC-07/08 |
| P0-D2 | individual vote | TODO | callback test |
| P0-D3 | callback resolver/ties/fallback | TODO | callback test |
| P0-E1 | wager snapshot/freeze | TODO | AC-13 |
| P0-E2 | final resolution +/- wager | TODO | ledger replay |

## P1 — juego completo
| ID | Slice | Estado |
|---|---|---|
| P1-A1 | powers inventory/use/target/caps | TODO |
| P1-A2 | tombola entitlement + deterministic spin | TODO |
| P1-B1 | media opportunity/upload metadata | TODO |
| P1-B2 | reactions + curated moments feed | TODO |
| P1-B3 | Mi mesa chronicle | TODO |
| P1-C1 | operator audit/compensation/role transfer | TODO |
| P1-C2 | hall screen + no-leak policy | TODO |
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
