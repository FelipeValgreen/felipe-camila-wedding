# Auditoría Plot Twist — felipeycami.cl — 2026-10-23 (día del matrimonio)

Repo: `/home/claude/felipe-camila-wedding`, rama `audit/felipeycami-20261023` = `origin/fix/plot-twist-entry-20261022` @ `dc53c13`. Lectura estática + `npm run check:plot-twist` (sin DB). Todo lo que no pude verificar contra la base de producción está marcado **[NO VERIFICADO]** o **[ESPECULACIÓN]**.

Resumen ejecutivo (sin rodeos):

- **Hoy producción sirve "Express"** (`plot-twist/app.js` 4.5 KB → `/api/plot-twist/express`). Depende de una tabla `plot_twist_express_answers` y un RPC `plot_twist_express_answer` que **no existen en ninguna migración del repo ni en ninguna rama remota** (búsqueda en todos los refs: 0 resultados). Si alguien no los creó a mano en Supabase, **cada respuesta falla con 500/`SUPABASE_ERROR_404`** y el invitado ve "No pudimos guardar".
- **Express no necesita operador, ni etapas, ni flags**: solo necesita que existan las 24 filas de `plot_twist_tables` con `join_code_hash = sha256('1'..'23','novios')` (el seed NO las crea) y los objetos express.
- **El motor completo (cliente `aa9d4ec`) requiere un operador humano con `PLOT_TWIST_OPERATOR_KEY` empujando cada etapa a mano** (14 etapas, forzando casi siempre), más `plot_twist_stage_secrets` cargado con las respuestas de los novios (ningún archivo del repo lo hace), más 3 flags de entorno para tómbola/poderes/alianzas, más 7 migraciones adicionales aplicadas. **No existe auto-avance ni timer en ningún archivo.** Sin operador el juego queda congelado en `lobby` para siempre.
- Las 8 preguntas Express coinciden con la pauta de los novios en Q1–Q5, Q7, Q8. **Q6 (bachata romántica, índice 2) no tiene respuesta confirmada.**
- `npm run check:plot-twist`: **7 pass / 2 fail** (los 2 fallos son tests que buscan texto del cliente completo en el `app.js` Express actual).

---

## 1. Inventario del motor `api/_lib/plot-twist-engine.js`

Tablas base: `supabase/migrations/20261005205000_plot_twist_v1.sql` (games, tables, players, stages, actions, score_ledger, events, moments, media, powers, spins, reactions, operator_log). Todo el acceso es con service key via `supabaseRequest` (`api/_lib/supabase-admin.js:48-85`); no hay policies anon (`20261005205000:120`).

| Export (línea) | Qué hace | Tablas/RPC | Precondiciones / gates |
|---|---|---|---|
| `hash`, `cleanName`, `uuid` (4-6) | sha256 hex; normaliza nombre (≤32); uuid | — | — |
| `publicStagePayload` (8-9) | Elimina claves tipo `correctAnswer`, `answer_key`, `resolution`, … del payload de etapa | — | — |
| `getGame` (11) | Fila de `plot_twist_games` con `slug='matri-2026'` (slug hardcoded línea 3) | games | — |
| `getTableByToken` (12) | Mesa por `join_token_hash=sha256(token)` (QR `?m=`) | tables | — |
| `getTableByCode` (13) | Mesa por `join_code_hash=sha256(lower(trim(code)))` | tables | fila de mesa con ese hash debe existir |
| `findPlayer` (14) | Jugador por `device_token_hash`, `active=true` | players | — |
| `currentStage` (15) | Etapa cuyo `stage_key = game.current_stage_key` | stages | `current_stage_key` no nulo |
| `tableChoices` (16) | id+team_name de las otras mesas | tables | — |
| `snapshot` (17) | Estado para el cliente: game.status, player, table(score_cache, ready), stage (payload saneado), peers, última acción aceptada del tipo de la etapa | games, players, tables, stages, actions | — |
| `join` (18) | Crea jugador `spectator` o refresca `last_seen_at`. Errores: GAME_NOT_CONFIGURED 503, NICKNAME_REQUIRED, TABLE_NOT_FOUND 404, DEVICE_ALREADY_JOINED 409, NICKNAME_TAKEN 409 (ilike + índice único `plot_twist_unique_nickname_per_table`, migración :32) | games, tables, players | game existe (**no** valida `status`); mesa existe |
| `claimRole` (19) | PATCH role complice/dupla; 409→ROLE_TAKEN (índices únicos parciales :30-31) | players | sesión |
| `claimResponsible` (20) | Toma el primer slot libre de complice/dupla | players | sesión; ≤2 por mesa |
| `setTeamName` (21) | PATCH team_name; 409→TEAM_NAME_TAKEN (requiere índice de `20261008190000_plot_twist_table_name_guard.sql`) | tables | rol responsable |
| `setReady` (22) | PATCH `ready` | tables | rol responsable |
| `getTableAction` (23) | Acción aceptada de la mesa en una etapa | actions | — |
| `recover`, `recoveryCandidates` (27-28) | **Stub: siempre lanzan 403 RECOVERY_REQUIRES_VERIFICATION** | — | — |
| `resolveIndividualCallback` (29) | Cuenta `individual_vote` por `targetPlayerId`; devuelve ganador o `tied[]` | actions | — |
| `callbackState` (30) | Lo anterior + nombres | actions, players | sesión |
| `chooseCallbackTie` (31) | Responsable rompe empate insertando acción `callback_tiebreak` (idempotente: reutiliza la existente) | actions | rol responsable; target debe estar en `tied` |
| `readiness` (32) | total/ready/ratio sobre **todas** las filas de tables | tables | — |
| `feed` (33) | Últimos 30 `plot_twist_events` `visibility=public` y `reveal_at` nulo/pasado | events | sesión |
| `chronicle` (34) | ledger de la mesa + acciones + poderes + directorio de mesas | score_ledger, actions, powers, tables | sesión |
| `react` (35) | Inserta/actualiza reacción (😂❤️🔥; check en migración :99) | events, reactions | sesión; evento público existente |
| `usePower` (36-44) | RPC `plot_twist_use_power_atomic` | powers, score_ledger, events (migración `20261010100000`) | rol responsable; **`process.env.PLOT_TWIST_ATOMIC_POWERS==='enabled'` si no → 503 POWERS_NOT_READY (línea 41)**; en el RPC: etapa actual `type='powers'` y `status='open'` (:16-18); **solo `bonus_300` se liquida; cualquier otro power_key → `POWER_EFFECT_NOT_READY` (:28)**; target no permitido (:29) |
| `spin` (45-54) | RPC `plot_twist_spin_atomic` | spins (+col `stage_id`), powers, events (migración `20261008193000`) | rol responsable; idempotency UUID v1-5; **`PLOT_TWIST_ATOMIC_SPIN==='enabled'` si no → 503 TOMBOLA_NOT_READY (línea 51)**; RPC exige etapa actual `type='live_tombola'`, `status='open'` (:28-30); un giro por mesa por etapa (:31-33). El resultado **solo crea una fila en `plot_twist_powers`, no suma puntos** (:62-63). Probabilidades uniformes 1/7 (bonus_300 2/7) (:40-43), **no** los pesos de `game-v1.json` |
| `reveal` (55-67) | Campeón visible por `score_cache`, "Mesa de la Noche" por `secret_score_cache` (solo si >0 y sin empate), red de alianzas aceptadas | tables, alliances | alianzas solo si `PLOT_TWIST_ALLIANCES==='enabled'` (línea 61). **Usa `score_cache`, no recalcula desde ledger** (AGENTS.md lo prohíbe como fuente primaria) |
| `submitAction` (68-71) | Inserta en `plot_twist_actions`; valida kind vs tipo de etapa (`table_decision→table_decision`, `individual_callback→individual_vote`, `wager→wager`, `powers→power`); `individual_vote` target debe ser de la misma mesa; `wager.fraction ∈ {.25,.5,1}` → **0 es BAD_WAGER (línea 69)**; `table_decision.answer ∈ options`; guarda `scoreSnapshot` del wager; 409 → replay por idempotency_key o DECISION_ALREADY_LOCKED | actions, stages, games, tables | sesión; rol responsable para table_decision/wager/power; `game.current_stage_key` no nulo; etapa `status='open'` y `stage_key===current_stage_key` (STAGE_CLOSED 409) |
| `alliances` (73-80) | Lista invitaciones entrantes/salientes/aceptadas | alliances (migración `20261010163000`) | sesión; si flag off devuelve `{enabled:false}` |
| `allianceAction` (81-88) | RPC `plot_twist_alliance_action` (invite/accept/decline; aceptar suma +100 **secreto** a ambas mesas vía `plot_twist_apply_score`) | alliances, score_ledger, events | rol responsable; **`PLOT_TWIST_ALLIANCES==='enabled'` si no → 503 (línea 85)**; RPC exige `game.status in ('lobby','live')` (:30) |

Puntaje: la única vía de mutación es el RPC `plot_twist_apply_score` (`20261005205000:126-137`): inserta en `plot_twist_score_ledger` (append-only, trigger :155-157) y proyecta a `score_cache`/`secret_score_cache`. Lo invocan: `resolve_stage_private`, `resolve_wager_private`, `use_power_atomic`, `alliance_action`, y el op `compensate` del operador. `individual_vote` **nunca otorga puntos**. `optional_media` no tiene ningún endpoint (tabla `plot_twist_media` sin uso en `api/`).

Gates en la fila de juego/etapas: no hay feature flags en `games.config` ni en `stages.payload`; los únicos gates son las 3 variables de entorno (`RELEASE-GATES.md:20-23`: "apagadas por defecto") y `games.status` ('ended'/'locked' bloquean avance; alianzas exigen lobby/live).

Ops del cliente **no implementados en `api/plot-twist/session.js`**: `claim_role` (exportado en `client.js:10`, no está en el router `session.js:7-22` → 400 UNKNOWN_OPERATION; `app.js` no lo usa).

## 2. Cómo avanzan las etapas

- **Único mecanismo**: POST `/api/plot-twist/operator` `op:'advance'` (`api/plot-twist/operator.js:12`) → RPC `plot_twist_advance_stage(p_game_id,p_force)`. Requiere header `x-plot-twist-key` igual a `process.env.PLOT_TWIST_OPERATOR_KEY` (`operator.js:5`, comparación timing-safe; si la env no existe → siempre 401).
- UI: `plot-twist/operator.html` botones "AVANZAR SI ≥75%" / "FORZAR AVANCE" / "PAUSAR" / "FINALIZAR" / "RESOLVER" por etapa `table_decision` / "COMPENSAR" (`operator.html:3-4`).
- RPC base (`20261005205000:180-198`): si `ratio_ready < readiness_threshold` (0.75 del seed) y no force → `READINESS_THRESHOLD_NOT_MET`; cierra la actual, abre la siguiente por `position`, pone `games.status='live'` (o `'reveal'` si type reveal), **resetea `ready=false` en todas las mesas** (:195).
- RPC con guard (`20261010173000`, si fue aplicada **[NO VERIFICADO]**): además bloquea si `games.status in ('ended','locked')` (:9) y si la etapa actual es `table_decision` abierta/resolving sin resolver → `SCORING_STAGE_NOT_RESOLVED` (:11-14).
- **Auto-avance / timer: no existe.** `grep -rn "setInterval|closes_at|windowSeconds|auto"` en `api/`, `plot-twist/*.js`, `operator.html` y migraciones: `closes_at` solo se escribe al cerrar (`:192`/`:25`); `vercel.json` solo tiene el cron `rsvp-health`; `windowSeconds` de `game-v1.json` no lo lee nadie. Confirmado por docs: `IMPLEMENTATION-PLAN.md:14` P0-C2 "readiness 75% + timeout + auto-advance → DOING"; `PRD-MAESTRO-V2.md:115` "MISSING: … auto-advance".
- Readiness en la práctica: el botón "ESTAMOS LISTOS" solo aparece en etapas sin acción (`aa9d4ec app.js:46`: lobby, conversation, optional_media, locked, reveal) y solo para responsables. En etapas `table_decision`, `individual_callback`, `wager`, `live_tombola`, `powers` **no hay forma de marcar ready** → ratio=0 → el operador debe **FORZAR** siempre. Además el ratio cuenta todas las filas de `tables` (24 incl. "Novios"), así que 18 mesas con responsable activo tendrían que pulsar el botón.
- **PAUSAR no tiene REANUDAR**: `op:'pause'` pone `status='locked'` (`operator.js:16`); con el guard aplicado, `advance` devuelve `GAME_NOT_ACTIVE` y no hay op que vuelva a `live` → requiere editar la DB a mano.
- **Respuesta: SÍ, la experiencia completa exige un operador humano con la clave, presente toda la noche, pulsando ~14 avances + 3 resoluciones.** Felipe/Cami no deberían hacerlo (`RUNBOOK.md:23,50`).

## 3. `plot-twist/game-v1.json`

Define (líneas): game slug/threshold (3-7); 14 etapas (8-174) con posiciones 0..130: lobby, icebreaker(conversation), couple-1 (table_decision, 300 pts, 180 s), social-1 (individual_callback `last_dancer`), tombola-1, couple-2 (**type `clue_question`**, 400 pts, 240 s, pista), moment-couple-photo (optional_media, 100), social-2 (`final_wagerer`), power-window (powers), tombola-2, final-wager (wager .25/.5/1), final-question (table_decision, 1000 pts), locked, reveal. Tómbola (175-222): 6 resultados con pesos 12/8/8/5/5/6, `maxImpactFraction .15`, `steal_10 capFraction .1`. Scoring (223-227) y finalReveal/beats (228-260).

**Nadie lo carga.** `grep -rn "game-v1"` solo aparece en `AGENTS.md:12`. El seed `supabase/seed-plot-twist-v1.sql` duplica a mano las mismas 14 etapas (líneas 8-22) con diferencias: couple-2 es `table_decision` (seed:14) no `clue_question`; **el seed no inserta puntos ni respuestas** (no hay filas en `plot_twist_stage_secrets`, tabla de `20261006210000:2-9`); `windowSeconds`, pesos de tómbola, `maxImpactFraction`, `participationCapPerStage` no existen en ningún código. El RPC de resolución (`20261006210000:13-28`) lanza `STAGE_SECRET_NOT_FOUND` si no hay secreto → **sin insertar manualmente `plot_twist_stage_secrets(stage_id, answer_key, points, secret_correct)` para couple-1, couple-2 y final-question, el operador no puede resolver ninguna ronda y, con el guard, tampoco avanzar.**

Seed inserta: 1 fila de `plot_twist_games` (`'matri-2026'`, status `lobby`, `current_stage_key='lobby'`, threshold .75) (seed:2-4) y 14 `plot_twist_stages` (lobby `open`, resto `queued`) (seed:6-24). **Mesas: cero** — comentario explícito seed:26-27 "Tables are intentionally NOT seeded". Para que funcione "Mesa 1–23 o Novios" alguien debe insertar 24 filas con `join_token_hash` (NOT NULL, `20261005205000:17`) y `join_code_hash = sha256('1')…sha256('23'), sha256('novios')` (minúsculas, trim — `engine.js:13`). No hay script en el repo que lo haga (`grep join_code_hash scripts/ docs/ reports/` → solo la migración). **[NO VERIFICADO]** si esas 24 filas existen en producción; la respuesta `GET /session → {"game":{"status":"lobby"},"player":null}` solo prueba la fila de juego.

## 4. Cliente completo en `aa9d4ec`

`plot-twist/client.js` es **idéntico** en `aa9d4ec` y HEAD (`git diff aa9d4ec HEAD -- plot-twist/client.js` vacío). `plot-twist/index.html` en `50c20a9` vs HEAD: solo se añadió un `<style>` de tipografía y `global-readable.css`; la estructura (nav con 4 tabs oculto, `#card`, `#offline`, `<script type=module src=/plot-twist/app.js?v=novios1>`) es la misma. Restaurar = reemplazar `app.js`.

Vistas de `aa9d4ec:plot-twist/app.js`:

| Vista / estado | Líneas | Ops API (`client.js`) | Estado servidor |
|---|---|---|---|
| Entrada (nombre + mesa o `?m=`/`?mesa=` token) | 24 | `join` | OK (`engine:18`) |
| "¿Ya estabas jugando?" | 24 | ninguno (solo texto) | `recover`/`recovery_candidates` son stubs 403 (`engine:27-28`) |
| Ser responsable | 25 | `claim_responsible` | OK |
| Nombre de mesa | 26 | `team_name` | OK (unicidad si índice aplicado) |
| Sin etapa | 27 | — | — |
| **Ahora · live_tombola** | 29 | `spin` | **503 TOMBOLA_NOT_READY salvo `PLOT_TWIST_ATOMIC_SPIN=enabled` + migración `20261008193000`**. Muestra `resultKey` crudo ("gift shot"); sin catálogo ni consecuencia |
| **Ahora · powers** | 30-41 | `chronicle`, `power` | **503 salvo `PLOT_TWIST_ATOMIC_POWERS=enabled` + migración**; cliente filtra solo `bonus_300` (línea 33). Nota: `power-window` (pos 80) está **antes** de `tombola-2` (pos 90) → los poderes del 2º giro nunca pueden usarse |
| Ahora · individual_callback | 42 | `action(individual_vote)` | OK; nunca otorga puntos; `callback_state`/`callback_tie` existen en servidor pero **el cliente no los llama** (`grep callback` en app.js: 1 sola aparición = el nombre del tipo). El "más competitivo" no se muestra ni se hace valer |
| Ahora · wager | 43 | `action(wager)` | Botón **"NO APOSTAR" envía `fraction:0` → servidor rechaza BAD_WAGER (`engine:69`)**; el invitado ve "No pudimos completar eso" |
| Ahora · table_decision (ya respondida / abierta) | 44-45 | `action(table_decision)` | OK, idempotente, replay 409 |
| Ahora · resto (lobby, conversation, optional_media, locked, reveal) | 46 | `ready` | OK. optional_media no tiene subida de fotos (tabla `plot_twist_media` sin API) |
| La noche | 7 | `feed`, `react` | OK, pero `plot_twist_events` solo recibe filas desde los RPC de spin/power/alianza → **con flags apagados el feed está vacío siempre**; ningún op de operador crea eventos |
| Alianzas | 8-20 | `alliances`, `alliance_action` | Con flag off muestra "cuando el operador active esta etapa" (es una env var, no una etapa). Con flag on OK |
| Mi mesa | 21 | `chronicle` | OK (suma ledger visible) |
| Polling 12 s solo en "Ahora" | 51-61 | `restore` (GET) | OK |
| Offline outbox | `client.js:21-25` | solo encola `individual_vote` | OK |

Resumen de lo roto/stub en ese cliente: recuperación cross-device (stub 403), "NO APOSTAR" (siempre falla), tie-break de callback (no cableado), poderes distintos de bonus_300 (nunca liquidables), tómbola/poderes/alianzas (503 por defecto), feed vacío sin flags, `claim_role` op inexistente en router, resolución del "más competitivo" no aplicada.

## 5. Modo Express (`api/plot-twist/express.js` + `plot-twist/app.js` HEAD)

Objetos DB adicionales a las tablas base (inferidos de `express.js:5-6`):
- Tabla `plot_twist_express_answers` con columnas al menos: `player_id`, `game_id`, `table_id`, `question` (int), `answer` (int), `points` (int). Filtros usados: `player_id=eq`, `game_id=eq`, `question=eq`, `order=question.asc`.
- RPC `plot_twist_express_answer(p_player uuid, p_question int, p_answer int, p_correct int)` (línea 6). Debe insertar la fila y calcular `points` (el cliente promete "Cada acierto suma 100 puntos", app.js; el ranking divide por `count*800` = 8×100, línea 5). **Ni la tabla ni el RPC existen en `supabase/migrations/`, en `supabase_migration.sql`, ni en ningún ref remoto.** Si el RPC no es idempotente por (player,question), una doble llamada duplica puntos (ver guard abajo).

Preguntas (app.js, array `questions`) vs `correct=[1,0,2,1,0,2,0,1]` (`express.js:3`):

| # | Pregunta | Opciones [0,1,2] | Índice correcto → texto | Pauta novios | Match |
|---|---|---|---|---|---|
| 1 | ¿Quién perrea hasta el piso? | Felipe / Cami / Los dos… | 1 → **Cami** | Cami | ✅ |
| 2 | ¿A quién le gusta más la fiesta? | Felipe / Cami / La Mafi | 0 → **Felipe** | Felipe | ✅ |
| 3 | ¿Cuántos años tiene la Mafi? | 10 / 12 / 14 | 2 → **14 años** | 14 | ✅ |
| 4 | ¿Quién es más copuchento(a)? | Cami / Felipe / La Mafi… | 1 → **Felipe** | Felipe | ✅ |
| 5 | Próximo gran viaje soñado | África / Japón / Islandia | 0 → **África** | África | ✅ |
| 6 | ¿Qué baile reemplaza al vals? | tango / cueca brava / bachata romántica | 2 → **Una bachata romántica** | **sin respuesta conocida** | ⚠️ PENDING_APPROVAL |
| 7 | ¿En qué auto llegaron los novios? | Mercedes 190 SL / limusina / Escarabajo | 0 → **Mercedes-Benz 190 SL** | Mercedes 190 SL | ✅ |
| 8 | Canción favorita de la Cami | Color esperanza / Mariposa tecnicolor / La bicicleta | 1 → **Mariposa tecnicolor** | Mariposa tecnicolor | ✅ |

Sin mismatches en las 7 verificables. Q6 debe confirmarse con los novios o cambiarse antes de la fiesta (AGENTS.md: "Si falta una respuesta verdadera… PENDING_APPROVAL; no inventarla").

Revisión del handler:
- **Ranking** (`express.js:5`): `score = round(raw/(count*800)*800 + min(count,12)/12*200)` = promedio de puntos por jugador (0–800) + bonus de participación hasta 200 con 12 jugadores. Sí está equilibrado por tamaño; máximo 1000. Orden por `score`, luego `points`. Mesas sin jugadores → 0 (el cliente las filtra). Correcto. Matiz: una mesa con 1 jugador perfecto (817) supera a una de 12 con promedio 600 (800) — es diseño, no bug.
- **Código 'novios'** (`express.js:6`): regex `^(?:[1-9]|1[0-9]|2[0-3]|novios)$` acepta 1–23 y `novios` (tras `trim().toLowerCase()`); luego `join({tableCode})` → `getTableByCode` → `sha256('novios')`. Requiere la fila de mesa correspondiente **[NO VERIFICADO]**. El cliente también acepta `?mesa=` en la URL.
- **Colisión de apodo**: servidor lanza NICKNAME_TAKEN (`engine:18`); cliente (app.js, `onsubmit`) reintenta hasta 5 veces con sufijo " 2".." 5" y guarda `fc_guest_name`. OK. Mismo dispositivo que ya entró: `join` solo refresca `last_seen_at`; en otra mesa → DEVICE_ALREADY_JOINED.
- **Guard de orden** (`express.js:6`): si no hay respuesta previa a `question`, exige `earlier.length === question-1` → ANSWER_OUT_OF_ORDER 409. **Pero si ya existe respuesta a esa pregunta, vuelve a llamar al RPC sin más checks** → el comportamiento depende del RPC desconocido (posible doble crédito). El cliente mitiga con `busy` y envía siempre `n+1`.
- **Reload**: `GET /api/plot-twist/express?device=<uuid>` (`express.js:6` → `state`) reconstruye jugador, mesa, respuestas, puntos y ranking a partir de `localStorage pt_device_v1`. Sí restaura. El GET no valida formato del token (solo el POST).
- Menores: `state()` hace `table.id` sin comprobar `t?.[0]` → 500 si la mesa fue borrada; imports `getGame,getTableByCode,hash` sin uso; no hay pantalla/proyección del ranking Express (`screen.js` solo lee `plot_twist_events`, que Express no escribe) → el ganador habría que leerlo desde el teléfono de alguien que terminó o con SQL.

## 6. Estado documentado (`docs/plot-twist/`)

- `IMPLEMENTATION-PLAN.md:8-19`: P0 — solo **P0-A1 DONE** (constraints/ledger); P0-A2, B1, B2, B3, C1, C2, D1, D3 **DOING**; D2, E1, E2 "DONE base". P1 (:24-32): A1/A2 powers/tómbola **TODO**, B2 feed DOING, B3 chronicle DONE base, C1/C2 DOING, D1 BLOCKED (seating), D2 TODO. P2 (:37-43) todo TODO/BLOCKED. Bloque "QR landing release 2026-10-22" (:52-61): "BLOCKED: production session endpoint returns SUPABASE_ERROR_404… Game activation requires a separate reviewed initialization with real table mapping; none was invented"; rollback = commit `5e0e7a1b`.
- `ACCEPTANCE-MATRIX.md:7-36`: **30 criterios, 0 PASS**; AC-01..05,07..12,16..18,30 NOT RUN; AC-06,13,14,15,19..29 NOT IMPLEMENTED.
- `TEST-REPORT.md:18-19`: "no se considera ningún acceptance PASS". Sin evidencia registrada.
- `RELEASE-GATES.md:7-18`: 12 bloqueantes, **todos sin marcar**; :25-26 fallback recomendado: "juego guiado por animador/operador y no habilitar las acciones transaccionales".
- `RUNBOOK.md:33-35`: preflight exige `PLOT_TWIST_OPERATOR_KEY` en el entorno y aplicar migración + seed solo en E2E autorizado; :37-47 ensayo P0 obligatorio (ninguno con evidencia).
- `CONSOLIDACION-APRENDIZAJES-V6.md:2,67`: "NO equivale a funcionalidades construidas ni probadas… Estado actual: NO supera gates".
- `IMPLEMENTACION-REAL-2026-10-08.md:28-29`: "Sólo inspección estática… No se han ejecutado pruebas E2E".
- `PRD-MAESTRO-V2.md:113-115` baseline: DONE base responsables/team name/readiness/table decision/restore; MISSING auto-advance, wagers, powers, spins, media, reactions, pantalla, fórmula secreta, rate limit, rehearsal.
- Nada en `docs/` menciona el modo Express ni `plot_twist_express_*` (creado en los commits `a18615a`…`7890c6f`, 22-oct 22:59–23:15, sin docs ni migración).

## 7. Tests

- `tests/plot-twist-public-payload.test.mjs`: 3 tests unitarios de `publicStagePayload` (redacción de claves de respuesta).
- `tests/plot-twist-integration-contract.test.mjs`: 6 tests de **regex sobre el código fuente** (no ejecutan DB): claves idempotentes de alianzas en SQL, flags por defecto en engine, screen oculta finale, voto individual scoped, y dos sobre `plot-twist/app.js` ("Esta apuesta compromete", `isResponsible()?' <button class=accept`).
- `tests/plot-twist-db-smoke.sql`: smoke transaccional de alianzas para Postgres aislado (no se ejecuta en `npm`).
- `npm run check:plot-twist` (ejecutado, salida literal del TAP): `# tests 9 / # pass 7 / # fail 2 / EXIT=1`. Fallos: `not ok 5 - wager UI requires explicit confirmation of loss risk` y `not ok 6 - only responsible players see alliance acceptance controls` — ambos porque `plot-twist/app.js` ahora es el Express y ya no contiene esos textos. Los 6 `node --check` de sintaxis pasan.

## 8. Evaluación de riesgo para ESTA NOCHE

### (a) Mantener Express (lo que hay en producción)

Debe ser cierto en producción (**ninguno verificable desde el repo**):
1. 24 filas en `plot_twist_tables` (game `matri-2026`) con `join_code_hash` = sha256 de `'1'…'23'` y `'novios'`, y `join_token_hash` no nulo.
2. Tabla `plot_twist_express_answers` y RPC `plot_twist_express_answer(p_player,p_question,p_answer,p_correct)` creados a mano, con el RPC otorgando 100 pts por acierto e idealmente idempotente por (player,question).
3. `SUPABASE_URL` + `SUPABASE_SECRET_KEY`/`SERVICE_ROLE_KEY` en Vercel (ya funcionan: `/session` responde).
4. Q6 confirmada por los novios (hoy marca "bachata romántica").

Qué puede fallar: si falta (1) → todos ven "Usa una mesa del 1 al 23 o Novios"; si falta (2) → todos entran pero **ninguna respuesta se guarda** ("No pudimos guardar"). No requiere operador, flags, etapas ni resolución. Sin proyección de ranking: el cierre lo hace un humano leyendo el ranking desde un teléfono que terminó. Prueba mínima recomendada antes de las 17:30: entrar con un celular real, mesa `novios`, responder Q1 y confirmar que `personalPoints` sube y que un reload conserva el progreso. Es la opción de menor riesgo con diferencia.

### (b) Restaurar el cliente completo (`aa9d4ec:plot-twist/app.js`)

Todo lo siguiente debe ser cierto a la vez:
1. Migraciones aplicadas en orden en producción: `20261006210000` (stage_secrets + resolve_private), `20261008190000` (nombre único), `20261008193000` (spin), `20261010100000` (powers), `20261010163000` (alianzas), `20261010173000` (advance guard), `20261010180000` (wager guards). Solo la base está confirmada **[NO VERIFICADO el resto]**.
2. Las 14 `plot_twist_stages` seedeadas (`seed-plot-twist-v1.sql`) **[NO VERIFICADO]**; `games.current_stage_key='lobby'`.
3. 24 mesas (igual que en (a)).
4. **Filas en `plot_twist_stage_secrets` para `couple-1`, `couple-2`, `final-question` con `answer_key` ∈ {felipe,cami} / {perfecta,gente,fiesta,fotos}, `points` (300/400/1000 según json) y `secret_correct`** — insertadas a mano; no existe script. Sin esto, RESOLVER falla (`STAGE_SECRET_NOT_FOUND`) y con el guard tampoco se puede avanzar más allá de couple-1.
5. `PLOT_TWIST_OPERATOR_KEY` en Vercel y una persona (no Felipe/Cami) con esa clave y `/plot-twist/operator.html` abierto toda la cena.
6. Si se quieren tómbola/poderes/alianzas: `PLOT_TWIST_ATOMIC_SPIN=enabled`, `PLOT_TWIST_ATOMIC_POWERS=enabled`, `PLOT_TWIST_ALLIANCES=enabled` + redeploy. `RELEASE-GATES.md` dice explícitamente no habilitarlas sin E2E.
7. Cada mesa necesita que alguien pulse "SER RESPONSABLE DE MESA" y ponga nombre; sin nombre la mesa queda atrapada en la pantalla de nombre (`app.js:25-26`).
8. Revertir `tests` no es necesario, pero el `app.js` Express desaparece: los invitados que ya respondieron en Express pierden la UI de sus respuestas (la identidad `pt_device_v1` sí se conserva porque ambos usan `plot_twist_players`).

Qué se rompe si el operador no avanza: **todo**. El juego queda en `lobby` (etapa sin acción); los invitados ven solo "Pónganle nombre a su mesa" y el botón ESTAMOS LISTOS. Ninguna pregunta aparece jamás, no hay puntos, no hay reveal, `screen.html` muestra "Sigan disfrutando. Plot Twist volverá." indefinidamente. Si el operador avanza pero no RESUELVE (o faltan los secretos), las respuestas se guardan pero nunca suman y, con el guard, el avance se bloquea en la primera pregunta. Si pulsa PAUSAR, no hay botón para reanudar. Defectos adicionales que verán los invitados aun con todo configurado: "NO APOSTAR" falla; el feed "La noche" está vacío sin flags; la tómbola muestra claves crudas y solo `bonus_300` sirve; los poderes del 2º giro nunca se pueden usar por el orden de etapas; la pregunta final solo liquida la apuesta (`operator.html:3` llama `resolve_wager` para `final-question`, nunca `resolve`) → **nadie recibe los 1000 puntos base de la final**.

Conclusión: (b) exige hoy mismo ≥7 migraciones, inserts manuales de mesas y respuestas, 4 variables de entorno, un redeploy y un operador dedicado durante 2–3 horas, sobre un sistema con 0/30 acceptance ejecutados y defectos funcionales conocidos. (a) exige verificar 2 objetos DB y 24 filas, y confirmar Q6. Recomendación: **mantener Express, verificar sus dependencias con una prueba real antes de la ceremonia, y no tocar el motor completo esta noche.**

## Anexo — para guardar en memoria del proyecto
- `plot_twist_express_answers` / RPC `plot_twist_express_answer` no están versionados en el repo; si funcionan en prod, hay que exportar su DDL a una migración después del evento.
- Las 2 fallas de `check:plot-twist` son tests acoplados al cliente completo; actualizar o eliminar tras decidir qué cliente queda.
