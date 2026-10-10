# AGENTS.md — PLOT TWIST

Este archivo gobierna cualquier trabajo de agentes sobre Plot Twist en este repositorio.

## Fuente de verdad
Leer, en orden, antes de modificar:
1. docs/plot-twist/PRD-MAESTRO-V2.md
2. docs/plot-twist/IMPLEMENTATION-PLAN.md
3. docs/plot-twist/ACCEPTANCE-MATRIX.md
4. docs/plot-twist/ARCHITECTURE-V1.md
5. docs/plot-twist/RUNBOOK.md
6. plot-twist/game-v1.json
Si hay conflicto, PRD-MAESTRO-V2 gana. Código actual NO redefine producto.

## Misión
Construir Plot Twist completo y ensayable para Felipe & Cami, 23.10.2026. No entregar recomendaciones como sustituto de implementación. Trabajar en bloques coherentes y verificar después.

## Reglas de ejecución
- Rama de trabajo: feat/plot-twist-v1 hasta nuevo gate.
- No merge a main ni deploy productivo definitivo sin aprobación explícita.
- No mutar Supabase productivo ni crear recursos pagados sin aprobación explícita.
- No inventar seating, respuestas de novios, tokens finales, premios físicos ni contenido sensible.
- Cambios DB deben ser aditivos, revisables e idempotentes.
- No declarar DONE por compilar; DONE exige acceptance E2E.
- No romper RSVP, galería, invitación ni APIs existentes.
- Mantener compatibilidad móvil Safari iOS y Android moderno.
- Mantener visual de felipeycami.cl: Inter/Newsreader, dark/cream/wine/gold, monograma aprobado.
- Guest UI nunca muestra complice/dupla; dice Responsable de mesa.
- Servidor valida toda acción crítica.
- Toda mutación de score usa ledger; jamás PATCH directo de score como lógica de negocio.
- Acciones repetibles usan idempotency key.
- Nunca guardar token/secret crudo en logs.
- Nunca mostrar respuesta activa en pantalla pública/feed.
- Media es opcional.
- Offline nunca produce confirmación falsa.

## Método de trabajo
Para cada bloque:
1. localizar requisito y IDs de acceptance;
2. inspeccionar implementación existente;
3. implementar vertical slice completo (DB/API/client/UI);
4. añadir o actualizar fixture/test/harness;
5. verificar build/checks;
6. actualizar IMPLEMENTATION-PLAN y ACCEPTANCE-MATRIX;
7. recién entonces pasar al siguiente bloque.
Preferir bloques completos a commits cosméticos aislados.

## Orden obligatorio de implementación
P0-A: modelo/constraints/ledger.
P0-B: identity/recovery/session.
P0-C: stage engine/readiness/auto-advance.
P0-D: collective + individual actions/callbacks.
P0-E: wager/final scoring.
P1-A: powers/spins.
P1-B: media/feed/reactions/chronicle.
P1-C: operator audit + hall screen.
P1-D: physical kit generator.
P2: rehearsal/performance/polish.
No construir features posteriores sobre invariantes P0 rotas.

## Estado y consistencia
Servidor = verdad; localStorage = identidad/cache/outbox. Una mesa solo puede tener una decisión colectiva aceptada por stage/kind. Dos responsables son redundancia, no dos votos. Stage cerrado rechaza writes salvo tolerancia explícita del PRD. Reload debe reconstruir UI desde snapshot.

## Seguridad
RLS habilitado. Browser invitado no usa service role. Operator endpoint requiere secreto server-side y debe registrar acciones. Rate limiting antes de producción. Cualquier endpoint nuevo valida game, player, table, stage, role, status, payload e idempotencia según corresponda.

## Contenido
No crear trivia privilegiada. Evitar humillación y temas sensibles. Si falta una respuesta verdadera de Felipe/Cami, marcarla PENDING_APPROVAL; no inventarla. El final visible y secreto son competencias separadas.

## Gate de producción
Antes de solicitar autorización: preview sano, migración revisada, rollback documentado, P0 automatizado/manual pasado, rehearsal plan listo, secrets requeridos listados, ninguna dependencia pagada nueva.

## Prohibido
- reescribir main;
- aplicar SQL productivo “para probar”;
- ocultar errores con mocks en producción;
- hardcodear service keys/operator keys;
- usar score_cache como fuente primaria;
- dar puntos por cada foto subida;
- exigir que todos se registren;
- hacer que Felipe/Cami administren la cena;
- afirmar E2E sin haberlo ejecutado.
