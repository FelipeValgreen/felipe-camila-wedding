# BACKUP_RESTORE.md — Respaldo y restauración

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026

## 1. Objetivo

Definir un procedimiento verificable para recuperar el Centro de Gestión ante errores de despliegue, migraciones defectuosas, corrupción accidental, fallos de sincronización o cambios operativos masivos.

Un backup sólo es válido si puede identificarse, verificarse y restaurarse de forma controlada.

## 2. Alcance protegido

Entidades mínimas críticas:

- `admin_profiles`;
- `wedding_guests`;
- `rsvp_responses`;
- `rsvp_response_members`;
- `rsvp_events`;
- `management_issues`;
- `guest_relationship_groups`;
- `guest_relationship_members`;
- `wedding_tables`;
- `seating_assignments`;
- `event_venue_layouts`;
- `event_tasks`;
- `vendors`;
- `expenses`;
- `expense_payments`;
- `event_budget_items`;
- `event_budget_payments`;
- `event_timeline_items`;
- `event_music_items`;
- `event_documents`;
- `event_memory` cuando exista/esté activo;
- `audit_log`;
- `sync_outbox`;
- `sync_conflicts`.

Verificar siempre el esquema vigente antes de ejecutar una copia.

## 3. Objetivos operativos

Para el caso Felipe/Camila:

- **RPO objetivo:** minimizar pérdida a menos de un ciclo de cambio operativo; antes de cualquier operación masiva debe existir snapshot inmediato.
- **RTO objetivo:** recuperación prioritaria del acceso y lectura; restauración de mutaciones críticas después de determinar el alcance.

Estos objetivos son operativos, no un SLA comercial.

## 4. Cuándo crear snapshot adicional

Obligatorio antes de:

- migración de esquema con riesgo;
- backfill;
- importación masiva;
- reconciliación masiva;
- aplicación masiva de seating;
- reconstrucción de Google Sheets;
- cambios extensos de RLS/grants;
- eliminación/archivo masivo;
- cambio de fuente canónica.

## 5. Backup de Supabase

### Preferencia

Usar capacidades nativas de backup/restauración del proyecto cuando estén disponibles y verificadas.

### Snapshot lógico adicional

Para operaciones de alto riesgo puede usarse un esquema interno de respaldo con estas condiciones:

- no expuesto por API;
- acceso revocado a `anon` y `authenticated`;
- nombre fechado;
- conteos registrados;
- propósito documentado;
- no sustituye el backup nativo.

Ejemplo conceptual:

```text
internal_backup.snapshot_20261020_pre_final_seating
```

No ejecutar SQL de backup genérico sin verificar columnas, relaciones y volumen actuales.

## 6. Verificación del backup

Registrar:

- timestamp `America/Santiago`;
- commit/deployment asociado;
- tablas incluidas;
- conteo por tabla crítica;
- responsable;
- motivo;
- método de restauración esperado.

Un snapshot sin conteos ni prueba de acceso se considera `UNVERIFIED`.

## 7. Google Sheets

Antes de reconstrucciones o cambios amplios:

1. duplicar el spreadsheet completo;
2. incluir fecha/hora en el nombre;
3. verificar que la copia abre;
4. registrar ID de la copia en el handoff/release;
5. no borrar la copia durante la misma operación.

Sheets sigue siendo espejo operativo; la restauración de Sheets nunca debe sobrescribir Supabase como fuente canónica sin una reconciliación deliberada.

## 8. Código / Vercel

Para cada release productivo relevante registrar:

- commit SHA;
- deployment estable anterior;
- deployment nuevo;
- migraciones aplicadas.

Rollback de código preferido:

1. desactivar feature/guard si existe;
2. promover deployment estable anterior o revertir commit;
3. aplicar corrección forward para esquema cuando revertir migración implique riesgo de datos.

## 9. Restauración selectiva

Preferir restaurar únicamente el alcance afectado.

Flujo:

```text
incidente
→ congelar mutaciones afectadas si es necesario
→ identificar ventana temporal
→ comparar producción vs snapshot
→ dry-run
→ restaurar filas/relaciones necesarias
→ verificar constraints
→ verificar auditoría
→ reconstruir sync derivado
→ smoke UI
```

No restaurar una tabla completa cuando existen cambios válidos posteriores al snapshot sin análisis de delta.

## 10. Restauración de invitados/RSVP

Verificar al menos:

- IDs canónicos;
- vínculo respuesta ↔ integrantes ↔ ficha;
- asistencia;
- reconfirmación;
- restricciones;
- incidencias;
- auditoría;
- outbox.

Nunca regenerar RSVP original desde una vista derivada si la evidencia canónica todavía existe.

## 11. Restauración de mesas

Debe mantener coherencia entre:

- `seating_assignments`;
- referencia de mesa en ficha cuando exista;
- capacidad;
- relaciones/bloqueos relevantes;
- layout si depende de mesas.

Después de restaurar ejecutar validación de:

- duplicados de persona;
- sobrecapacidad;
- asignados que no asisten;
- referencias huérfanas.

## 12. Restauración financiera

Preservar:

- moneda;
- montos históricos;
- pagos;
- vínculo a proveedor/ítem;
- timestamps;
- auditoría.

No recalcular retrospectivamente un monto histórico durante restauración salvo que la corrupción sea precisamente ese valor y exista evidencia.

## 13. Restauración de sync

Supabase manda.

Si Sheets está corrupta pero Supabase está íntegra:

1. respaldar Sheet actual;
2. definir corte consistente;
3. reconstruir desde entidades canónicas;
4. preservar/aislar outbox nuevo durante el proceso;
5. verificar filas por ID;
6. reanudar cola;
7. comprobar duplicados y errores.

No marcar manualmente operaciones como procesadas sin confirmar el estado externo.

## 14. Prueba de restauración

Antes de considerar el sistema listo para el evento, ejecutar al menos un simulacro en staging con datos ficticios:

- restauración de un invitado;
- restauración de asignación de mesa;
- recuperación de un ítem financiero;
- reconstrucción parcial del espejo de Sheets.

Documentar:

- tiempo;
- pasos;
- fallos;
- mejoras.

## 15. Día del matrimonio

Antes del freeze operativo final:

- snapshot Supabase;
- copia de Sheet;
- exportaciones offline;
- commit/deployment productivo registrado;
- ninguna migración no esencial en las últimas horas previas.

Durante el evento privilegiar correcciones operativas pequeñas y auditables sobre cambios estructurales.

## 16. Cierre de incidente

Después de restaurar:

- [ ] integridad de relaciones;
- [ ] conteos razonables;
- [ ] UI consistente;
- [ ] sync sano;
- [ ] `audit_log` revisado;
- [ ] causa raíz documentada;
- [ ] prevención añadida a tests/runbook;
- [ ] snapshots temporales retenidos según necesidad y luego gestionados de forma segura.
