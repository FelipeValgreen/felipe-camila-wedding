# DOMAIN_RULES.md — Reglas de negocio

Estas reglas prevalecen sobre decisiones de UI, conveniencia técnica o sugerencias de IA.

## 1. Personas y respuestas

### 1.1 Una respuesta no es una persona

`rsvp_responses` conserva lo que se envió originalmente.

Una respuesta puede contener:

- una persona;
- una pareja;
- varias personas;
- un nombre ambiguo;
- una persona inexistente en la nómina.

Las personas representadas se gestionan mediante `rsvp_response_members` y se vinculan a `wedding_guests`.

### 1.2 Una ficha por persona

Toda persona que deba contabilizarse, recibir menú o asignarse a mesa necesita una ficha individual.

No se permite contar una pareja como una sola persona.

### 1.3 No crear acompañantes implícitos

Las invitaciones son individuales.

El sistema no debe:

- asumir `+1`;
- inventar acompañantes;
- expandir una respuesta sin evidencia;
- crear fichas genéricas sin revisión.

## 2. Conciliación

### 2.1 Conciliación automática permitida

Solo cuando existe:

- teléfono exacto y único; o
- nombre normalizado exacto y único.

### 2.2 Conciliación automática prohibida

No aplicar automáticamente por:

- similitud difusa;
- apodo;
- apellido parcial;
- error ortográfico;
- nombre de pareja;
- teléfono compartido;
- varias coincidencias;
- inferencia del agente.

Esos casos deben producir una incidencia.

### 2.3 Respuestas conjuntas

El RSVP original se conserva.

Cada integrante debe tener:

- nombre detectado;
- asistencia;
- restricción;
- estado de resolución;
- `guest_id` cuando corresponda;
- método de coincidencia;
- auditoría de aprobación.

Estados recomendados de respuesta:

- `unmatched`
- `partially_matched`
- `matched`
- `split_matched`
- `ambiguous`
- `conflict`

## 3. Asistencia y reconfirmación

### 3.1 Estados independientes

`attendance_status` indica respuesta o decisión de asistencia.

`reconfirmation_status` indica una verificación posterior.

Modificar uno no debe modificar el otro automáticamente.

### 3.2 Transiciones

Cambios de asistencia deben:

- registrar actor;
- registrar antes y después;
- actualizar métricas;
- sincronizar el espejo;
- no borrar la respuesta original.

## 4. Restricciones alimentarias

Las restricciones son datos sensibles.

Deben:

- asociarse a una persona individual;
- incluir detalle cuando sea necesario;
- ser visibles para la banquetera autorizada;
- ocultarse a proveedores que no las necesiten;
- evitarse en logs con nombre completo.

Una restricción conjunta debe asignarse a cada integrante correspondiente, no copiarse sin revisión a toda la respuesta.

## 5. Invitados

### 5.1 Estado de ficha

Preferir soft delete:

- `active`
- `inactive`
- `replaced`
- archivado

No borrar físicamente una ficha con historial sin respaldo y aprobación explícita.

### 5.2 Datos mínimos

Una ficha operativa debe contener al menos:

- nombre;
- estado;
- categoría;
- grupo o clasificación;
- asistencia;
- restricciones;
- vínculo RSVP cuando exista.

## 6. Mesas

### 6.1 Elegibilidad

Solo una persona individual con asistencia `attending` puede asignarse a una mesa.

### 6.2 Capacidad

No superar capacidad.

Una reducción de capacidad no puede dejar una mesa sobreocupada sin una resolución explícita.

### 6.3 Consistencia

`seating_assignments` y `wedding_guests.table_id` deben mantenerse consistentes mediante una operación transaccional.

### 6.4 Historial

Asignar, mover y quitar de mesa debe auditarse.

## 7. IA para mesas

### 7.1 Separación entre propuesta y realidad

La IA escribe exclusivamente en entidades de propuesta, por ejemplo:

- `seating_suggestion_runs`
- `seating_suggestion_assignments`

Nunca escribe directamente en:

- `seating_assignments`
- `wedding_guests.table_id`

### 7.2 Restricciones duras

La IA no puede violar:

- capacidad;
- asistencia;
- parejas marcadas como inseparables;
- incompatibilidades explícitas;
- accesibilidad;
- mesas bloqueadas;
- reservas obligatorias.

### 7.3 Aprobación

Toda propuesta requiere:

1. explicación;
2. puntuación;
3. advertencias;
4. revisión humana;
5. aprobación explícita;
6. aplicación transaccional;
7. auditoría;
8. posibilidad de revertir.

Si una generación queda incompleta, no debe afectar datos reales.

## 8. Proveedores

### 8.1 Mínimo privilegio

Cada proveedor ve solo la información necesaria.

Ejemplos:

- Banquetera: personas, menús, alergias, mesas.
- Centro: plano, capacidad, montaje y cronograma.
- Fotografía: cronograma, shot list y contactos autorizados.
- Audiovisual: cues, escenario, energía, archivos y horarios.

### 8.2 Datos prohibidos por defecto

Un proveedor no debe ver, salvo permiso explícito:

- notas familiares privadas;
- teléfonos generales;
- presupuesto de otros proveedores;
- mensajes personales RSVP;
- documentos ajenos.

### 8.3 Permisos por matrimonio

Los permisos futuros deben incluir `wedding_id` y no depender solo de un rol global.

## 9. Supabase y Sheets

### 9.1 Fuente canónica

Supabase es la única fuente canónica.

### 9.2 Sheets

Google Sheets es:

- espejo;
- exportación;
- respaldo humano;
- apoyo operativo.

No debe ser una fuente editable bidireccional libre.

### 9.3 Sincronización

Una operación se marca procesada solo después de verificar la escritura.

Un fallo de Sheets:

- no elimina el dato;
- no invalida el RSVP;
- genera alerta o reintento;
- conserva trazabilidad.

## 10. Auditoría

Registrar para cambios relevantes:

- actor;
- acción;
- entidad;
- valor anterior;
- valor nuevo;
- origen;
- fecha.

No usar `console.log` como auditoría de negocio.

## 11. Respaldos

Antes de migraciones o cambios masivos, respaldar al menos:

- `wedding_guests`
- `rsvp_responses`
- `rsvp_response_members`
- `management_issues`
- `wedding_tables`
- `seating_assignments`
- `vendors`
- `expenses`
- `sync_outbox`
- `audit_log`
- `admin_profiles`

Usar `internal_backup` y revocar acceso a:

- `public`
- `anon`
- `authenticated`

## 12. Alcance de frontend

Mientras se desarrolla la adaptación comercial del Centro de Gestión:

- no modificar el sitio público;
- no modificar su diseño;
- no modificar el formulario RSVP;
- no cambiar sus APIs;
- no cambiar la galería;
- no modificar carga de fotografías.

Cualquier cambio público requiere una tarea y aprobación separadas.
