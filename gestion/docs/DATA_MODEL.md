# DATA_MODEL.md — Modelo de datos

> Este documento describe el modelo usado por el Centro de Gestión y la dirección de evolución. Verificar siempre el esquema real antes de migrar.

## 1. Principios

- Supabase PostgreSQL es canónico.
- Google Sheets es espejo.
- Cada persona tiene una ficha individual.
- Una respuesta RSVP puede tener varios integrantes.
- Asistencia y reconfirmación son estados independientes.
- Cambios operativos deben ser auditables.
- El modelo futuro debe aislar datos por `wedding_id`.

## 2. Entidades actuales principales

### `admin_profiles`

Propósito:

- perfil administrativo asociado a Supabase Auth;
- rol actual;
- activación o desactivación.

Campos conceptuales relevantes:

- `id` → `auth.users.id`
- `role`
- `active`

Riesgo actual:

- roles globales demasiado generales para proveedores y multi-matrimonio.

### `wedding_guests`

Persona individual operativa.

Datos conceptuales:

- identidad;
- teléfono normalizado;
- grupo;
- lado familiar;
- categoría;
- asistencia;
- restricción alimentaria;
- reconfirmación;
- estado de ficha;
- vínculo RSVP;
- mesa;
- versión;
- actualización.

Reglas:

- no representar dos personas en una ficha;
- no alterar reconfirmación indirectamente;
- usar soft delete;
- la asignación de mesa requiere asistencia confirmada.

### `rsvp_responses`

Respuesta original enviada al sistema.

Datos conceptuales:

- nombre escrito;
- teléfono;
- asistencia;
- restricción declarada;
- origen;
- estado de conciliación;
- vínculo individual cuando aplica;
- estado de sincronización;
- timestamps.

Regla:

- conservar como evidencia original.

### `rsvp_response_members`

Integrantes individuales detectados dentro de una respuesta.

Datos conceptuales:

- `rsvp_id`
- `guest_id`
- nombre mostrado y normalizado;
- asistencia;
- restricción;
- estado de resolución;
- método de coincidencia;
- confianza;
- notas;
- actor y fecha de resolución.

Regla:

- es la capa que permite separar parejas y respuestas familiares.

### `rsvp_events`

Eventos del ciclo de vida de RSVP.

Usos:

- confirmar que una creación tuvo evento correspondiente;
- monitoreo de salud;
- trazabilidad.

No sustituye `audit_log` para operaciones administrativas.

### `management_issues`

Incidencias operativas.

Campos conceptuales:

- tipo;
- entidad;
- severidad;
- estado;
- título;
- descripción;
- metadata;
- resolución;
- actor;
- timestamps.

Debe evolucionar hacia el motor de “Necesita tu atención”.

### `wedding_tables`

Mesas configuradas.

Datos conceptuales:

- número;
- nombre;
- capacidad;
- tipo;
- zona;
- posición;
- bloqueo;
- notas;
- versión.

### `seating_assignments`

Asignación individual de una persona a una mesa.

Reglas:

- una persona, una mesa;
- validar capacidad;
- validar asistencia;
- mantener consistencia con `wedding_guests.table_id`;
- auditar movimientos.

### `vendors`

Proveedores del matrimonio.

Debe evolucionar para incluir:

- categoría;
- contacto;
- estado;
- contrato;
- montos;
- responsable;
- acceso al portal;
- actividad;
- documentos.

### `expenses`

Compromisos financieros asociados a conceptos o proveedores.

### `expense_payments`

Pagos vinculados a gastos.

La facturación comercial de la plataforma no debe mezclarse con estos gastos del matrimonio.

### `audit_log`

Historial de cambios de negocio.

### `sync_outbox`

Cola de sincronización con sistemas externos.

Reglas:

- idempotencia;
- claim transaccional;
- reintentos;
- no procesar desde Preview productivo;
- no marcar `processed` antes de verificar.

### `sync_conflicts`

Conflictos detectados durante sincronización o integración.

### `guest_photos`

Fotografías de invitados. Pertenece al ecosistema general, pero cualquier cambio de galería pública está fuera del alcance actual del dashboard.

### WhatsApp

Tablas conocidas:

- `whatsapp_sessions`
- `whatsapp_processed_messages`
- `guest_contact_events`

La integración real aún no está operativa.

## 3. Relaciones principales

```text
auth.users
└── admin_profiles

rsvp_responses
└── rsvp_response_members
    └── wedding_guests

wedding_guests
├── seating_assignments
│   └── wedding_tables
└── rsvp_responses / rsvp_response_members

vendors
├── expenses
│   └── expense_payments
└── futuro vendor_access

cambios de entidades
├── audit_log
└── sync_outbox
```

## 4. Vistas y RPC

Elementos conocidos o esperados:

- vista de resumen de gestión RSVP;
- conciliación de integrante;
- creación de integrante;
- actualización de incidencias;
- asignación transaccional a mesa;
- desasignación;
- claim de lote `sync_outbox`.

Toda RPC debe verificarse en el esquema real antes de documentar su firma definitiva.

## 5. Tablas nuevas recomendadas

### `weddings`

```text
id
slug
couple_names
event_date
timezone
status
venue_name
settings
created_at
archived_at
```

Primer registro:

- Felipe y Camila
- 23 de octubre de 2026
- zona horaria `America/Santiago`

### `wedding_members`

```text
wedding_id
user_id
role
permissions
active
invited_by
created_at
```

### `vendor_access`

```text
wedding_id
vendor_id
user_id
access_role
permissions
active
expires_at
last_access_at
```

### `timeline_events`

```text
wedding_id
title
category
start_at
end_at
location
description
responsible_user_id
status
visibility
```

### `timeline_event_vendors`

Relación muchos-a-muchos entre cronograma y proveedores.

### `deliverables`

```text
wedding_id
vendor_id
title
deliverable_type
url
version
status
visibility
due_at
uploaded_by
created_at
updated_at
```

### `venue_layouts`

```text
wedding_id
name
venue_name
width
height
measurement_unit
background_url
scale
version
status
```

### `venue_layout_objects`

```text
layout_id
object_type
name
position_x
position_y
width
height
rotation
capacity
locked
layer
metadata
```

### `seating_rules`

```text
wedding_id
rule_type
guest_id
related_guest_id
group_name
table_id
priority
hard_constraint
reason
active
```

### `seating_suggestion_runs`

Debe guardar:

- snapshot o versión de entradas;
- reglas;
- algoritmo/modelo;
- puntuación;
- advertencias;
- explicación;
- estado;
- actor;
- timestamps.

### `seating_suggestion_assignments`

Asignaciones propuestas, separadas de `seating_assignments`.

## 6. Estrategia multi-matrimonio

No migrar todo en una sola operación.

Orden:

1. Crear `weddings`.
2. Crear el matrimonio actual.
3. Crear `wedding_members`.
4. Agregar `wedding_id` nullable a módulos nuevos.
5. Agregar `wedding_id` nullable progresivamente a tablas existentes.
6. Backfill por lotes con dry-run.
7. Validar conteos y relaciones.
8. Actualizar consultas y RLS.
9. Probar aislamiento con un segundo matrimonio.
10. Convertir a obligatorio solo al final.

## 7. RLS objetivo

Toda tabla multi-matrimonio debe verificar:

- usuario autenticado;
- membresía activa;
- `wedding_id`;
- rol;
- permiso específico.

No confiar únicamente en filtros frontend.

## 8. Datos sensibles

Clasificación alta:

- teléfonos;
- correos;
- alergias;
- notas personales;
- documentos;
- pagos;
- relaciones o incompatibilidades entre invitados.

Aplicar:

- vistas limitadas;
- columnas seleccionadas;
- logs anonimizados;
- mínimo privilegio;
- datos ficticios en staging.

## 9. Regla de migración

El esquema documentado como “objetivo” no implica autorización para crearlo completo.

Cada incorporación debe:

- pertenecer a un PR pequeño;
- ser aditiva;
- tener rollback;
- probarse fuera de producción;
- aplicarse a producción únicamente con respaldo y aprobación.
