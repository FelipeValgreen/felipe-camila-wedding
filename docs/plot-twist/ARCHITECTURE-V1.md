# PLOT TWIST — Arquitectura V1

## Entidades previstas
plot_twist_games: configuración y estado global.
plot_twist_tables: vínculo a wedding_tables, token, nombre de equipo, readiness, score proyectado, secret_score.
plot_twist_players: apodo, device_token_hash, table_id, role [complice,dupla,spectator], active.
plot_twist_stages: orden, tipo, payload/config, estado, ventanas.
plot_twist_actions: respuesta/decisión canónica por mesa y etapa, idempotency_key, actor.
plot_twist_score_ledger: append-only, delta, reason, action_id, metadata.
plot_twist_events: feed/realtime/event sourcing liviano; visibility y reveal_at.
plot_twist_media: referencia storage, player/table/moment, moderation, score_awarded.
plot_twist_moments: oportunidades opcionales y bonus máximo.
plot_twist_powers: inventario/uso/target/status.
plot_twist_spins: giros de tómbola y resultado server-side.
plot_twist_reactions: emoji simple sobre eventos/media.
plot_twist_operator_log: acciones administrativas auditables.

## Identidad
El QR contiene token de mesa no secuencial. Primer ingreso genera device UUID local persistente. El backend entrega sesión de alcance limitado. No se usa el nombre como credencial.

## Concurrencia
Restricciones únicas por (game, table, stage) donde solo puede existir una decisión; Cómplice y Dupla compiten de forma segura y gana la primera confirmación.
Toda escritura puntuable exige idempotency_key único.
Ledger append-only; correcciones son entradas compensatorias.

## Realtime
Supabase Realtime para stage/eventos/radar. Polling de respaldo con backoff. Reconnect siempre hace snapshot autoritativo antes de aplicar eventos nuevos.

## Offline
IndexedDB:
- session/table snapshot
- current stage snapshot
- pending eligible actions
- pending media blobs/metadatos
No confirmar localmente efectos aleatorios/competitivos sin servidor.

## Seguridad
RLS por sesión/mesa; espectadores sin INSERT en acciones competitivas.
Operador separado de cliente invitado.
No poner service-role en navegador.
Validación server-side de stage abierto, rol, target, límites, score y duplicados.

## Storage
Mantener bucket wedding-photos para continuidad operativa, con paths plot-twist/{game}/{table}/{uuid}. Registrar metadata en plot_twist_media. Evolucionar a signed upload/RLS si el pipeline actual no ofrece aislamiento suficiente.

## API/RPC
join_table(table_token, device_token, nickname)
claim_role(session, role)
submit_action(stage, payload, idempotency_key)
mark_ready(stage)
use_power(power_id,target,idempotency_key)
spin_tombola(idempotency_key)
create_media_intent(moment,idempotency_key)
finalize_media(...)
react(event,emoji)
operator_transition(...)
get_game_snapshot(...)

## Estados
game: draft -> lobby -> live -> locked -> reveal -> ended
stage: draft -> queued -> open -> resolving -> revealed -> closed
action: pending -> accepted|rejected|superseded
media: local_pending -> uploaded -> pending_review -> visible|hidden

## Observabilidad
Registrar latencia, reconnects, acciones rechazadas, duplicados evitados, uploads fallidos, mesas atrasadas y operador overrides. Health view para la noche.

## Gates antes de producción
1. Prueba funcional con 4 mesas simuladas.
2. Prueba concurrencia Cómplice/Dupla.
3. Prueba offline/reload en Safari iOS.
4. Prueba 20 mesas / 200 espectadores simulados.
5. Prueba señal real en Arboleda.
6. Ensayo humano 8–12 personas de edades mixtas con comida/música.
7. Runbook físico y fallback impreso.
