# RUNBOOK.md — Operación segura del Centro de Gestión

**Actualizado:** 17 de agosto de 2026

Este runbook define cómo desarrollar, desplegar, migrar, sincronizar y recuperar el Centro de Gestión sin poner en riesgo el RSVP ni la base productiva.

## 1. Principio operativo

```text
Preservar datos → diagnosticar → cambiar lo mínimo → verificar → auditar
```

Reglas permanentes:
- Supabase es la fuente de verdad.
- Google Sheets es espejo parcial.
- No usar producción como entorno de pruebas de escritura.
- Preview puede leer datos reales sólo mientras todas las mutaciones permanezcan bloqueadas.
- Ninguna acción del Copiloto salta RBAC, guards o confirmación humana.
- No tocar el sitio/RSVP público desde cambios exclusivos del Centro de Gestión.

## 2. Entornos actuales

### Producción
- `gestion.felipeycami.cl`;
- Supabase productivo;
- Google Sheets real;
- mutaciones habilitadas según rol;
- sync externo habilitado.

### Vercel Preview — modo costo 0 actual
- puede usar lecturas reales para validar UI y datos;
- `ALLOW_NON_PRODUCTION_WRITES=false` por defecto;
- `NEXT_PUBLIC_ALLOW_NON_PRODUCTION_WRITES=false` por defecto;
- `ALLOW_NON_PRODUCTION_EXTERNAL_SYNC=false`;
- API, cliente Supabase y sync fallan cerrados ante escritura;
- las simulaciones editables deben usar borradores locales, no producción.

### Staging aislado
No existe hoy como dependencia obligatoria. Si en el futuro se habilita un Supabase branch/staging:
- usar sólo datos ficticios;
- habilitar `ALLOW_NON_PRODUCTION_WRITES` sólo en ese entorno;
- mantener sync externo apagado salvo que exista una Google Sheet de prueba dedicada.

## 3. Quality gate obligatorio

Desde `gestion/`:

```bash
npm ci
npm run check:ci
```

`check:ci` cubre lint, typecheck, tests y build mediante los scripts del proyecto. GitHub Actions ejecuta el mismo gate en cambios a `gestion/**`, migraciones Supabase y el workflow de CI.

No mergear con gate rojo.

## 4. Antes de modificar código o datos

Verificar:
- [ ] rama distinta de `main`;
- [ ] alcance del cambio;
- [ ] proyecto Supabase correcto;
- [ ] variables y entorno correctos;
- [ ] ausencia de secretos/PII en el diff;
- [ ] guard de Preview vigente;
- [ ] rollback definido;
- [ ] respaldo si habrá cambio productivo de datos de riesgo medio/alto.

## 5. Cambios de esquema

### Regla general
Toda DDL debe vivir en `supabase/migrations/` y revisarse como código.

Preferir cambios:
- aditivos;
- compatibles hacia atrás;
- con constraints verificables;
- con grants/RLS explícitos;
- sin seeds de PII.

### RPC `SECURITY DEFINER`
Antes de aprobar una RPC privilegiada, comprobar:
1. `auth.uid()` no nulo;
2. rol/perfil activo;
3. `search_path` explícito;
4. `REVOKE` a `PUBLIC`/`anon` cuando corresponda;
5. `GRANT` sólo a roles necesarios;
6. auditoría de negocio;
7. comportamiento transaccional.

### Cambios atómicos
Si una operación lógica requiere múltiples escrituras que deben suceder juntas, implementarla en una transacción/RPC, no como varias llamadas independientes desde Next.js.

Ejemplo vigente: crear una nueva versión de `event_venue_layouts` debe archivar la anterior y crear la nueva atómicamente mediante `create_venue_layout_version`.

## 6. Aplicación de migraciones productivas

Secuencia:

```text
SQL versionado
→ revisión estática/tests
→ CI verde
→ verificar impacto y rollback
→ aplicar migración
→ comprobar función/tabla/índice/RLS/grants
→ desplegar código consumidor
→ smoke test
```

Para cambios aditivos cuyo código antiguo no utiliza la nueva función/columna, es válido aplicar la migración antes del deploy para eliminar la ventana “código nuevo sin esquema”.

No ejecutar sin plan explícito:
- `DROP TABLE`;
- `DROP COLUMN`;
- cambio destructivo de tipo;
- backfill masivo;
- sustitución riesgosa de triggers;
- cambios del contrato RSVP público.

## 7. Respaldo

Antes de operaciones destructivas o backfills amplios:
- usar respaldo administrado de Supabase o snapshot/export verificado;
- registrar hora de corte;
- validar que el respaldo sea restaurable;
- no copiar PII a repositorios ni artefactos públicos.

Tablas prioritarias:
- `wedding_guests`;
- `rsvp_responses`;
- `rsvp_response_members`;
- `wedding_tables`;
- `seating_assignments`;
- `guest_relationship_groups` / `guest_relationship_members`;
- `vendors`;
- presupuesto/pagos;
- cronograma/música/documentos/tareas/memoria;
- `sync_outbox`;
- `audit_log`;
- `admin_profiles`.

Para Google Sheets, duplicar el archivo sólo antes de reconstrucciones o cambios masivos de pestañas.

## 8. PR y Preview

El PR debe explicar:
- alcance;
- riesgo;
- migraciones;
- pruebas;
- datos afectados;
- rollback;
- fuera de alcance.

En Preview verificar como mínimo:
- login;
- navegación principal;
- consola sin errores críticos;
- dashboard y fuentes cargando;
- responsive básico;
- mutaciones bloqueadas cuando no existe staging;
- ausencia de llamadas de escritura a Supabase/Sheets productivos.

## 9. Deploy productivo

Después de merge:
- comprobar Vercel `READY`;
- abrir `https://gestion.felipeycami.cl/dashboard`;
- validar login;
- validar `/api/system-health` mediante la UI autenticada;
- revisar Command Center;
- ejecutar una mutación de bajo riesgo sólo si el release la requiere;
- comprobar `audit_log`;
- comprobar `sync_outbox` si la entidad tiene espejo Sheets;
- revisar errores runtime recientes.

## 10. Diagnóstico RSVP

Ante una confirmación aparentemente perdida:
1. consultar `rsvp_responses` por rango horario;
2. consultar `rsvp_events`;
3. revisar `rsvp_response_members`;
4. comprobar conciliación;
5. revisar `management_issues`;
6. revisar `sync_outbox` y `sheet_sync_status`;
7. revisar logs de Vercel sólo si el intento pudo fallar antes de persistir.

Supabase prueba respuestas persistidas; no prueba un intento de navegador que nunca llegó al backend.

## 11. Conciliación

Si un RSVP no está vinculado:
1. preferir coincidencia exacta de teléfono/nombre cuando sea inequívoca;
2. detectar respuestas con múltiples personas;
3. no inventar vínculos por proximidad temporal solamente;
4. revisar si la ficha ya tiene otro RSVP;
5. resolver mediante flujo/RPC auditado;
6. verificar que reconfirmación no cambió accidentalmente.

## 12. Seating

Si una asignación falla:
1. verificar invitado activo;
2. verificar `attendance_status = attending`;
3. verificar mesa;
4. verificar capacidad;
5. revisar asignación previa;
6. usar RPC de asignación/desasignación;
7. revisar auditoría y outbox;
8. comprobar coherencia entre `seating_assignments` y `wedding_guests.table_id`.

Nunca reparar manualmente una sola columna dejando la relación inconsistente.

## 13. Salón

Al crear una nueva versión:
- validar elementos y dimensiones;
- usar `POST /api/venue-layout`;
- la ruta debe delegar en `create_venue_layout_version`;
- verificar que existe exactamente un layout `active` después de la operación;
- ante error, confirmar que el layout previo sigue activo.

## 14. Google Sheets sync

El worker automático sólo cubre las entidades declaradas en `gestion/lib/sync-outbox.ts`.

Para una cola pendiente revisar:
- `status`;
- `attempts`;
- `next_retry_at`;
- `last_error`;
- entidad/operación.

Procesamiento manual autenticado:

```text
POST /api/sync/process
```

Cron:

```text
/api/cron/sync-outbox
```

Nunca habilitar sync externo desde Preview contra la planilla real.

## 15. Incidente de seguridad

Ante sospecha de exposición:
1. detener el despliegue/automatización afectada;
2. revocar o rotar credenciales;
3. revisar sesiones y accesos;
4. revisar RLS/grants/RPC;
5. revisar logs/auditoría;
6. determinar datos leídos o modificados;
7. restaurar sólo si es necesario;
8. documentar incidente sin copiar secretos ni PII a GitHub/chat.

## 16. Rollback

### Código
- revertir PR o desplegar el último commit estable.

### Migración aditiva
- si la nueva estructura no causa daño, puede permanecer mientras se revierte el código.

### Datos
- detener escrituras sólo si es necesario;
- identificar filas/entidades afectadas;
- comparar contra backup/auditoría;
- restaurar el alcance mínimo;
- verificar relaciones y sync.

No ejecutar un rollback destructivo automático de base de datos.

## 17. Cierre de una entrega

- [ ] CI verde.
- [ ] Preview `READY` y smoke test completado.
- [ ] Sin secretos/PII nuevos.
- [ ] Migraciones versionadas y verificadas.
- [ ] RLS/grants revisados si hubo DDL/RPC.
- [ ] Producción `READY` después del merge.
- [ ] Smoke test productivo realizado.
- [ ] `audit_log`/`sync_outbox` coherentes cuando corresponde.
- [ ] Documentación canónica actualizada.
- [ ] No se introdujo regresión al RSVP/sitio público.
