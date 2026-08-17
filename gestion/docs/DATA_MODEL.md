# DATA_MODEL.md — Modelo de datos canónico

**Verificado contra Supabase productivo:** 17 de agosto de 2026

> Supabase PostgreSQL es la fuente de verdad. Este documento describe el esquema operativo actual; cualquier cambio posterior debe contrastarse con `supabase/migrations/` y con el esquema desplegado.

## 1. Principios

- Supabase PostgreSQL es canónico.
- Google Sheets es un espejo operacional parcial, no una segunda fuente de verdad.
- Cada persona tiene una ficha individual en `wedding_guests`.
- Una respuesta RSVP puede representar una o varias personas.
- Asistencia y reconfirmación son estados independientes.
- Las mutaciones administrativas relevantes deben quedar en `audit_log`.
- Las escrituras que requieren espejo externo se publican mediante `sync_outbox`.
- Preview/Development fallan cerrados y no deben escribir producción.
- El modelo actual está optimizado para un matrimonio; el aislamiento por `wedding_id` es una evolución futura.

## 2. Núcleo de identidad y RSVP

### `admin_profiles`
Perfil administrativo ligado a Supabase Auth.

Campos clave: `id = auth.users.id`, `role`, `active`.

Roles operativos actuales:
- `owner`: control completo y eliminaciones sensibles;
- `editor`: lectura + creación/edición;
- `viewer`: sólo lectura.

### `wedding_guests`
Ficha individual canónica de cada invitado.

Contiene identidad, teléfono normalizado, grupo, lado/rama familiar, categoría, estados de invitación/asistencia/reconfirmación, restricciones alimentarias, vínculo RSVP, mesa, notas, versión y timestamps.

Reglas:
- una fila representa una persona;
- no fusionar personas para “hacer calzar” un RSVP conjunto;
- seating persistente requiere `attendance_status = attending`;
- conservar trazabilidad de cambios.

### `rsvp_responses`
Respuesta original recibida desde web/u otros canales.

Conserva nombre declarado, teléfono, asistencia, restricción, origen, conciliación, vínculo directo cuando aplica, estado de sync y timestamps.

Regla: es evidencia de la respuesta original y no debe reescribirse para simular una ficha individual.

### `rsvp_response_members`
Integrantes individualizados dentro de una respuesta RSVP conjunta.

Campos relevantes: `rsvp_id`, `guest_id`, nombre, asistencia, restricción, `resolution_status`, `match_method`, `confidence`, notas y datos de resolución.

Es la capa correcta para separar parejas/familias antes de vincular cada persona a `wedding_guests`.

### `rsvp_events`
Eventos del ciclo de vida RSVP. Sirve para trazabilidad de recepción/cambios y no reemplaza `audit_log` administrativo.

### `management_issues`
Incidencias operativas: RSVP no conciliado, respuesta conjunta pendiente, fallas de sync y otros casos que requieren intervención.

## 3. Relaciones y afinidades

### `guest_relationship_groups`
Grupo de relación explícito o probable.

Campos clave: `name`, `link_type`, `confidence` (`confirmed`/`probable`), `status`, `source`, `notes`.

### `guest_relationship_members`
Miembros de cada grupo relacional.

Puede enlazar a `wedding_guests` mediante `guest_id`, pero también conserva `person_name` para casos aún no conciliados.

Regla: una relación probable ayuda a planificar, pero no debe presentarse como parentesco/pareja confirmada sin evidencia.

## 4. Mesas y salón

### `wedding_tables`
Mesas persistidas con número, nombre, capacidad, tipo, zona, geometría porcentual y métrica, rotación, bloqueo, notas y versión.

### `seating_assignments`
Asignación canónica de una persona a una mesa.

Reglas:
- una persona, una mesa;
- validar capacidad;
- validar asistencia;
- mantener consistencia con `wedding_guests.table_id`;
- auditar asignaciones, movimientos y desasignaciones.

### `event_venue_layouts`
Versiones del layout operativo del recinto.

Campos desplegados:
- `name`, `venue_name`, `status`, `version`;
- `elements` JSONB;
- `reference_url`, `notes`, `template_key`;
- `space_width_m`, `space_height_m`, `grid_step_m`, `unit_system`;
- timestamps.

Existe un índice único parcial que permite como máximo un layout `active`.

La creación de una nueva versión debe usar la RPC `create_venue_layout_version`, que serializa y ejecuta atómicamente el reemplazo del layout activo.

## 5. Operación del evento

### `vendors`
Proveedor operativo con contacto, categoría, estado y coordinación de producción.

Además de los campos base, producción ya incluye:
- `day_of_contact`;
- `arrival_at`, `setup_at`, `teardown_at`;
- `location`;
- `deliverables` y `equipment` JSONB;
- `technical_requirements`;
- `contract_url`;
- `production_status`.

### `event_timeline_items`
Cronograma canónico con inicio/fin, título, categoría, responsable, proveedor, ubicación, estado, dependencias, notas y orden.

### `event_tasks`
Tareas operativas con título, descripción, categoría, responsable, prioridad, vencimiento, estado, fuente, entidad relacionada, proveedor y fecha de completitud.

### `event_music_items`
Momentos musicales/canciones con planificación, artista, versión, URL, cue, prioridad, proveedor, `vendor_id`, tipo de acto, set y notas técnicas.

### `event_documents`
Registro canónico de documentos y enlaces: categoría, título, URL, tipo, estado, fuente, notas y timestamps.

## 6. Presupuesto y pagos

Hay dos familias que no deben confundirse.

### Presupuesto operativo del evento
- `event_budget_items`
- `event_budget_payments`

`event_budget_items` incluye concepto, categoría, proveedor, responsable, estado, moneda, cantidades, neto unitario, bruto proyectado, monto contratado, pagado, vencimiento, notas y orden.

`event_budget_payments` registra pagos contra un ítem presupuestario con monto, moneda, fecha, método, estado, referencia y notas.

### Gastos operativos históricos/integrados
- `expenses`
- `expense_payments`

Siguen activos para flujos existentes y espejo Sheets. No representan facturación comercial de una futura plataforma SaaS.

## 7. Memoria y Copiloto

### `event_memory`
Memoria durable y explícita del evento.

Tipos permitidos: `fact`, `decision`, `preference`, `relationship`, `constraint`, `rejected_option`, `learning`.

Incluye sujeto, contenido JSONB, confianza (`confirmed`/`probable`/`inferred`), fuente, referencia, estado y actor.

### `copilot_review_state`
Estado de revisión por usuario y dominio: última revisión, snapshot y timestamp de actualización.

Regla: el Copiloto puede proponer acciones, pero las mutaciones requieren confirmación y pasan por APIs/RBAC/guards normales.

## 8. Auditoría, sincronización e integración

### `audit_log`
Historial administrativo de negocio con entidad, acción, before/after, actor, origen y timestamp.

### `sync_outbox`
Cola durable para sincronización externa con claim transaccional, estados, reintentos y backoff.

### `sync_conflicts`
Conflictos detectados durante sincronización/integración.

### Espejo automático actual a Google Sheets
El worker `gestion/lib/sync-outbox.ts` tiene mapeo automático para:

```text
wedding_guests        → INVITADOS_NUEVO
rsvp_responses        → CONFIRMACIONES_RSVP
wedding_tables        → MESAS_NUEVO
seating_assignments   → ASIGNACIONES_MESA
vendors               → PROVEEDORES
expenses              → GASTOS
expense_payments      → PAGOS
```

Los módulos `event_*`, relaciones, memoria y layout son canónicos en Supabase pero **no forman parte hoy de ese mapa automático del worker**. Cualquier referencia a una pestaña histórica/importada debe tratarse como referencia operacional, no como garantía de sync bidireccional.

## 9. WhatsApp y otros datos auxiliares

Tablas existentes:
- `whatsapp_sessions`;
- `whatsapp_processed_messages`;
- `guest_contact_events`;
- `guest_photos`.

Su existencia no implica que todos esos canales estén activos en la operación actual.

## 10. Seguridad de datos

Las tablas operativas críticas verificadas en producción usan RLS y políticas basadas en rol administrativo. Las RPC `SECURITY DEFINER` sensibles deben:

1. comprobar `auth.uid()`;
2. validar `security.get_my_role()` o perfil activo;
3. usar `search_path` explícito;
4. revocar ejecución pública;
5. conceder sólo a roles necesarios;
6. auditar la mutación cuando corresponda.

Nunca exponer `service_role` al navegador.

## 11. Relaciones principales

```text
auth.users
└── admin_profiles

rsvp_responses
└── rsvp_response_members
    └── wedding_guests

wedding_guests
├── guest_relationship_members
│   └── guest_relationship_groups
├── seating_assignments
│   └── wedding_tables
└── RSVP / restricciones / reconfirmación

vendors
├── event_budget_items
│   └── event_budget_payments
├── event_timeline_items
├── event_tasks
└── event_music_items

event_venue_layouts
└── versions del plano operativo

event_memory
└── memoria durable del Copiloto

mutaciones relevantes
├── audit_log
└── sync_outbox (cuando la entidad tiene espejo externo)
```

## 12. Evolución futura: multi-matrimonio

No es requisito para cerrar el caso Felipe/Camila. Cuando exista necesidad comercial, la migración debe ser gradual:

1. crear `weddings`;
2. crear `wedding_members`;
3. agregar `wedding_id` nullable a módulos nuevos;
4. backfill con validación;
5. actualizar consultas y RLS;
6. probar aislamiento con un segundo matrimonio;
7. convertir `wedding_id` en obligatorio sólo al final.

Nunca ejecutar esta evolución como una migración masiva sin staging, respaldo y pruebas de aislamiento.

## 13. Regla de cambio de esquema

Toda modificación debe:
- ser aditiva o tener plan explícito de compatibilidad;
- vivir en `supabase/migrations/`;
- revisar RLS/grants/RPC;
- incluir verificación automatizada cuando sea posible;
- evitar PII o seeds reales en el repositorio;
- documentar impacto en sync y rollback.
