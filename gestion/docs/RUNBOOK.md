# RUNBOOK.md — Operación segura del Centro de Gestión

Este documento explica cómo actuar ante despliegues, migraciones, sincronización e incidentes sin afectar el RSVP activo.

## 1. Principio de operación

```text
Primero preservar datos.
Después diagnosticar.
Luego cambiar.
Finalmente verificar.
```

No ejecutar una acción irreversible durante una investigación.

## 2. Entornos

### Producción

- `gestion.felipeycami.cl`
- Supabase real
- Google Sheets real
- confirmaciones activas

### Preview

Debe apuntar a:

- Supabase staging;
- datos ficticios;
- planilla de prueba o sync desactivado.

### Local

Preferir:

- Supabase local;
- seed ficticio;
- integraciones externas desactivadas.

## 3. Comprobación previa a cualquier tarea

Verificar:

- [ ] rama distinta de `main`;
- [ ] alcance limitado a `gestion/**`;
- [ ] variables del entorno;
- [ ] proyecto Supabase correcto;
- [ ] Sheets correcto;
- [ ] ausencia de secretos productivos en Preview;
- [ ] estado de RSVP y outbox;
- [ ] respaldo si habrá escritura de datos;
- [ ] rollback definido.

## 4. Desarrollo con Antigravity IDE u otro agente

Antes de permitir edición:

1. Abrir el repositorio.
2. Seleccionar la rama de trabajo.
3. Pedir lectura de todos los Markdown de `gestion/`.
4. Pedir auditoría de solo lectura.
5. Revisar el plan propuesto.
6. Confirmar que no tocará frontend público.
7. Confirmar staging.
8. Autorizar un cambio acotado.

Si el agente pierde contexto, detener y crear handoff.

## 5. Crear respaldo de Supabase

Antes de migraciones o cambios masivos:

1. Crear una migración de respaldo o proceso controlado.
2. Usar esquema `internal_backup`.
3. Copiar las tablas críticas necesarias.
4. Revocar acceso a `public`, `anon` y `authenticated`.
5. Verificar conteos.
6. Registrar fecha y propósito.
7. No exponer el esquema por API.

Tablas críticas mínimas:

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

## 6. Crear respaldo de Google Sheets

Antes de reconstruir pestañas o realizar cambios amplios:

1. Duplicar el archivo completo.
2. Nombrarlo con fecha y propósito.
3. Verificar que la copia abre.
4. Guardar su ID en el PR o handoff.
5. No eliminar respaldos antiguos durante la misma operación.

## 7. Migraciones

### Flujo obligatorio

```text
Crear SQL
→ revisar SQL
→ aplicar local
→ seed ficticio
→ pruebas
→ staging
→ Preview
→ revisión humana
→ respaldo productivo
→ aprobación
→ producción
→ verificación
```

### No ejecutar en primer paso

- `DROP TABLE`;
- `DROP COLUMN`;
- cambios de tipo;
- `NOT NULL` inmediato;
- reemplazo de triggers productivos;
- backfill masivo;
- cambios al contrato de RSVP.

### Después de migrar

Verificar:

- tablas y columnas;
- constraints;
- índices;
- RLS;
- grants;
- funciones;
- conteos;
- reconfirmación sin cambios involuntarios;
- outbox;
- logs de errores.

## 8. Despliegue

### Antes del PR

Desde `gestion/`:

```bash
npm install
npm run lint
npm run build
```

Cuando existan:

```bash
npm run typecheck
npm test
```

### PR

Debe incluir:

- alcance;
- riesgo;
- archivos;
- migraciones;
- pruebas;
- datos afectados;
- rollback;
- fuera de alcance.

### Preview

Comprobar:

- login;
- navegación;
- permisos;
- móvil;
- escritorio;
- errores de consola;
- llamadas a Supabase staging;
- ausencia de escritura en producción.

### Producción

Solo después de aprobación explícita.

Verificar:

- despliegue verde;
- dominio correcto;
- login;
- métricas;
- creación/edición controlada cuando corresponda;
- outbox;
- Sheets;
- errores de Vercel;
- ausencia de regresión pública.

## 9. Diagnóstico de RSVP

Ante una confirmación aparentemente perdida:

1. Consultar `rsvp_responses` por rango horario.
2. Consultar `rsvp_events`.
3. Comprobar evento `created`.
4. Consultar `rsvp_response_members`.
5. Comprobar estado de conciliación.
6. Consultar `management_issues`.
7. Consultar `sync_outbox`.
8. Revisar logs de Vercel si el intento pudo fallar antes de persistir.

Supabase prueba respuestas guardadas. No prueba intentos del navegador que no llegaron a insertarse.

## 10. Diagnóstico de conciliación

Si un RSVP aparece sin vincular:

1. No usar similitud difusa automática.
2. Buscar teléfono exacto y único.
3. Buscar nombre normalizado exacto y único.
4. Revisar si contiene varias personas.
5. Revisar si la ficha ya está vinculada a otra respuesta.
6. Crear incidencia si no es inequívoco.
7. Resolver mediante flujo auditado.
8. Verificar que reconfirmación no cambió.

## 11. Diagnóstico de mesas

Si una asignación falla:

1. Verificar `attendance_status = attending`.
2. Verificar ficha activa.
3. Verificar mesa existente.
4. Verificar capacidad.
5. Verificar asignación previa.
6. Revisar RPC o ruta transaccional.
7. Revisar `audit_log`.
8. Revisar `sync_outbox`.
9. Verificar consistencia entre asignación y `guest.table_id`.

No reparar manualmente una sola columna sin corregir la relación completa.

## 12. Diagnóstico de Google Sheets

### Cola pendiente

Revisar:

- estado;
- intentos;
- próximo reintento;
- entidad;
- error sin PII.

### Procesamiento manual

La ruta manual requiere usuario autorizado:

```text
POST /api/sync/process
```

No ejecutarla desde Preview contra producción.

### Cron

Ruta conocida:

```text
/api/cron/sync-outbox
```

Frecuencia conocida:

```text
0 * * * *
```

Usar respuestas `no-store` y, durante diagnóstico, nonce único para descartar caché.

### Reconstrucción baseline

Solo si:

- existe respaldo de Sheets;
- existe corte consistente de Supabase;
- se conocen encabezados;
- se verifican conteos;
- se separa cola histórica de operaciones nuevas;
- se documenta el reemplazo.

## 13. Restauración

Antes de restaurar:

1. detener nuevas escrituras si es necesario;
2. identificar alcance exacto;
3. comparar backup con producción;
4. hacer dry-run;
5. restaurar solo entidades afectadas;
6. mantener IDs y relaciones;
7. verificar auditoría;
8. reconstruir Sheets si corresponde;
9. reactivar operaciones;
10. documentar incidente.

No restaurar una tabla completa si el problema afecta solo unas filas sin evaluar cambios posteriores al respaldo.

## 14. Reversión de código

Opciones:

- revertir PR;
- desplegar commit estable;
- desactivar feature flag;
- retirar ruta nueva;
- mantener migración aditiva si no causa daño.

No revertir automáticamente una migración destructiva sin plan de datos.

## 15. Incidente de seguridad

Ante sospecha de exposición:

1. detener agente o despliegue;
2. revocar o rotar secreto;
3. revisar logs;
4. revisar accesos;
5. revisar RLS;
6. invalidar sesiones si corresponde;
7. comprobar datos leídos o modificados;
8. documentar incidente;
9. no publicar secretos en PR o chat.

## 16. Handoff obligatorio

Cuando una tarea quede incompleta, crear:

```text
gestion/docs/handoffs/YYYY-MM-DD-tarea.md
```

Contenido mínimo:

- objetivo;
- rama;
- último commit;
- estado del PR;
- archivos;
- migraciones;
- entornos tocados;
- pruebas;
- datos modificados;
- pendientes;
- rollback;
- siguiente acción exacta.

## 17. Checklist de cierre

- [ ] No se modificó el sitio público.
- [ ] No se cambió el contrato RSVP.
- [ ] No se usó producción como staging.
- [ ] Respaldo creado si correspondía.
- [ ] Build ejecutado.
- [ ] Pruebas ejecutadas si existen.
- [ ] RLS revisada.
- [ ] Sin secretos en diff.
- [ ] Preview verificado.
- [ ] Producción verificada solo con autorización.
- [ ] Supabase consistente.
- [ ] Sheets consistente.
- [ ] Auditoría presente.
- [ ] Rollback documentado.
