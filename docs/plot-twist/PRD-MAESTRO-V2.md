# PLOT TWIST — PRD MAESTRO V2

Estado: fuente de verdad. Evento: Felipe & Cami, 23.10.2026. Ruta: /plot-twist.

## North Star
Juego social de sobremesa para ~20 mesas. El teléfono provoca conversación y momentos reales; no los reemplaza. Atención activa objetivo: 20–35 min repartidos en 60–90 min.

## Reglas no negociables
- Servidor = fuente de verdad; mesa = unidad competitiva.
- Todos pueden participar. Dos “Responsables de mesa” confirman decisiones colectivas. complice/dupla son detalles internos.
- 1 teléfono por mesa basta; no exigir email, teléfono ni registro completo.
- Foto, video, alcohol, levantarse o visitar otra mesa nunca bloquean progreso.
- Nunca mostrar confirmado sin ACK. Ningún retry/doble tap duplica puntos.
- Felipe/Cami no operan el sistema durante el matrimonio.
- Sin ranking completo permanente. Sin humillación ni temas sensibles.
- Todo cambio de score pasa por ledger append-only e idempotente.

## Roles
Invitado: estado, individuales, reacciones, media opcional, La noche, Mi mesa.
Responsable: además respuesta colectiva, readiness, apuesta, poder/target.
Operador backup: pause/open/close/skip/resolve, compensación, roles, poderes, media, lock/reveal.
Pantalla salón: solo información pública y curada.

## Identidad y recuperación
QR por mesa /plot-twist/m/{token} y fallback /plot-twist + código. Pedir solo nombre/apodo. device_token local, hash servidor y snapshot local. Nombre único case-insensitive dentro de mesa. Reentrada restaura estado. Cambio de dispositivo: QR+código+selección de identidad previa; sin PII. Acciones críticas siguen protegidas por rol.

## Navegación
AHORA: una acción dominante. LA NOCHE: moments curados, radar, tómbola, media aprobada. MI MESA: integrantes, responsables, score, poderes, hitos y crónica.

## State machine
Juego: draft -> lobby -> live -> locked -> reveal -> ended.
Stage: queued -> open -> resolving/closed -> revealed -> archived.
Readiness objetivo 75%; avance por umbral, timeout seguro u operador. Nunca reloj rígido durante servicio.

## Guion maestro
0 Lobby: nombre + 2 responsables.
1 Algo en común: conversación sin puntos.
2 Felipe/Cami #1: decisión mesa, 300.
3 El último en pie: individual, callback.
4 Tómbola #1: live.
5 Felipe/Cami #2: decisión mesa, 400.
6 Momento novios: media opcional, bonus cap.
7 El más competitivo: individual; el ganador será final_wagerer.
8 Poderes: estrategia limitada.
9 Tómbola #2: live.
10 Todo o Nada: callback + apuesta.
11 Última pregunta.
12 Juego cerrado: congelar ledger.
13 Reveal: campeón + Mesa de la Noche + pieza física colectiva.
Objetivo máximo 8–12 activaciones significativas; stages opcionales se pueden omitir sin romper arco.

## Contenido
Preguntas de novios deducibles, con pistas o “quién es más probable”; no trivia privilegiada. Respuestas correctas se congelan antes del evento.
Última: “Si Felipe y Cami pudieran guardar una sola cosa de esta noche, ¿qué creen que elegirían?” Opciones: que todo saliera perfecto / ver a su gente junta / la fiesta / las fotos. Respuesta narrativa prevista “ver a su gente junta”, pendiente aprobación final de los novios.

## Individuales y callbacks
Pantalla dice “ESTA VEZ NO CONVERSEN”. last_dancer se usa luego en una llamada ligera. final_wagerer = más votado como competitivo; empate lo resuelve responsable. Si participación insuficiente, responsable decide.

## Scoring
Visible: ledger inmutable con delta, reason, table, stage, action, metadata, idempotency_key. Cache = proyección.
Secreto: colaboración, generosidad, participación, riesgo por otros, interacción. Determina Mesa de la Noche; jamás cambia Campeón.
Media puntúa una vez por oportunidad, no por archivo. Robos/penalidades cap recomendado 10–15%. Sin swap total. Corrección = ledger compensatorio.

## Todo o Nada
final_wagerer elige 25/50/100% antes de ver la última pregunta. Snapshot y apuesta server-side; queda congelada. Correcta suma monto apostado, incorrecta resta. Idempotente.

## Poderes V1
Escudo; Doble (no final); Robo limitado; Regalo envenenado. Estados available/armed/used/expired, target opcional, restricciones por stage. Ningún poder borra el mérito acumulado.

## Tómbola
Premio / Penitencia amable / Plot Twist social. Resultado se fija server-side antes de animar. Alcohol solo flavor opcional con alternativa sin alcohol; jamás requisito.

## Media
Fotos primero, video corto secundario. Storage existente + metadata Plot Twist separada. Estados local_pending/uploading/uploaded/approved/rejected. Compresión, retry, idempotencia. Upload no da puntos automáticamente. Feed solo aprobado.

## Final Plot Twist
Campeones de Plot Twist = mayor score visible al lock.
Mesa de la Noche = mayor score secreto con fórmula predefinida.
Cada mesa tiene desde el inicio una pieza; juntas forman F+C · 23.10.26/composición aprobada.
Reveal: “Toda la noche creyeron que había 20 equipos” -> campeón -> “Plot Twist estaba mirando otra cosa” -> Mesa de la Noche -> unir piezas -> “Las piezas nunca fueron premios individuales” -> “Creyeron que había 20 equipos. Siempre hubo uno solo: nuestra gente.” -> agradecimientos/baile.
El score secreto nunca invalida al campeón visible.

## Offline
Snapshot último estado. Outbox solo bajo riesgo. Wager/power/tómbola requieren ACK y no se encolan silenciosamente. Reconexión = flush idempotente + snapshot servidor.

## Datos/API
Tablas plot_twist_games/tables/players/stages/actions/score_ledger/events/moments/media/powers/spins/reactions/operator_log. Validar unicidad nickname case-insensitive, códigos por juego, append-only ledger, índices y constraints.
session API: restore/join/responsible/team-name/ready/action.
Pendientes: recovery, individual vote, wager, power, spin, media, reactions, feed, chronicle.
Operator API con autenticación separada y operator_log.

## Seguridad/operación
RLS en todo; invitados no escriben DB directo; secret solo servidor; tokens hashed; operator key fuera del cliente invitado; rate limit en writes. Panel backup, no operación normal. Pantalla salón independiente y nunca filtra respuestas activas.

## Kit físico
QR+código, reglas en 3 líneas, instrucción de reentrada, pieza final y sobre si aplica. No imprimir hasta freeze de seating/tokens.

## Gates
A Spec freeze: PRD + AGENTS + contenido + acceptance.
B Preview: UI/APIs con fixtures, sin producción DB.
C E2E autorizado: migración aditiva + seed en Supabase real.
D Rehearsal: 8–12 personas, edades mixtas, comida/ruido, iOS/Android.
E Event freeze: respuestas, seating, QR, kit, operador.
No merge/deploy definitivo ni mutación Supabase productiva sin aprobación explícita.

## Acceptance P0
QR/código correctos; nombre repetido seguro; máximo 2 responsables; 1 teléfono basta; reload restaura; cambio teléfono recuperable; doble tap idempotente; 10 envíos consistentes; offline 5 min conserva confirmado; caída servidor no da falso éxito; respuesta cerrada inmutable; score reproducible desde ledger; wager congelado; poder de un uso; media no bloquea; ranking reproducible; operador recupera sin editar DB; invitado no entra a operador; pantalla no filtra; final visible/secreto reproducible.

## Definition of Done
Feature DONE = comportamiento E2E + acceptance, no “existe código”. V1 lista solo con P0 + rehearsal + contenido aprobado + respuestas congeladas + kit + backup + migración revisada + rollback + preview sano + aprobación de producción.

## Baseline actual
DONE base: responsables, team name, readiness, table decision idempotente, restore de decisión.
PARTIAL: shell, join/persistencia, ledger/RPC, operador, seed.
MISSING/REWORK: recovery cross-device, individuales/callback resolver, auto-advance, wagers, powers, spins, media UI/metadata, reactions/feed, chronicle, pantalla salón, fórmula secreta final, rate limit, operator audit, generador físico, rehearsal harness.
