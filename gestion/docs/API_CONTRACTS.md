# API_CONTRACTS.md — Contratos del Centro de Gestión

**Versión:** 0.1 — baseline para verificación  
**Fecha:** 14 de agosto de 2026

> Este documento define el formato de documentación obligatorio para las APIs del Centro de Gestión. Antes de declarar un endpoint como canónico, verificar su implementación real en `gestion/app/api/**` y las RPC/migraciones vigentes.

## 1. Principios

1. Autenticación no equivale a autorización.
2. Toda mutación revalida reglas de dominio en servidor.
3. Ningún endpoint confía en permisos calculados únicamente por UI.
4. Los errores deben ser estables y saneados.
5. Las mutaciones relevantes generan auditoría.
6. Las escrituras sincronizables generan outbox cuando corresponde.
7. Preview/Development no escriben producción.
8. Nunca devolver secretos ni hashes internos innecesarios.
9. Las operaciones masivas deben ser transaccionales o explícitamente parciales con resultado por ítem.
10. Los contratos deben versionarse si una incompatibilidad no puede evitarse.

## 2. Envelope recomendado

Éxito:

```json
{
  "ok": true,
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Mensaje seguro para UI"
  }
}
```

No todos los endpoints heredados cumplen necesariamente este envelope; no cambiar contratos productivos sin evaluar compatibilidad.

## 3. Códigos HTTP

- `200`: lectura/actualización exitosa;
- `201`: creación;
- `400`: payload inválido;
- `401`: no autenticado;
- `403`: autenticado sin permiso;
- `404`: entidad inexistente/no visible;
- `409`: conflicto de dominio/concurrencia;
- `422`: regla de dominio no satisfecha cuando sea útil distinguirla;
- `429`: rate limit;
- `500`: error interno saneado;
- `503`: dependencia crítica no disponible.

## 4. Autorización

Cada endpoint mutante debe documentar:

```text
Auth required: yes/no
Roles/permission: ...
Environment guard: ...
Audit: yes/no
Outbox: yes/no
Idempotency: ...
```

Ver `RBAC_PERMISSIONS.md`.

## 5. Dominios que requieren contrato explícito

### Sistema

- health/diagnóstico;
- environment guards;
- sync manual/cron.

### Invitados

- listar/buscar;
- crear;
- editar;
- archivar;
- restricciones;
- clasificación;
- rama familiar/social.

### RSVP y conciliación

- lectura de respuestas;
- integrantes;
- resolver integrante;
- incidencias;
- reconfirmación.

### Relaciones

- grupos;
- miembros;
- confidence `confirmed/probable`;
- edición/resolución.

### Mesas

- CRUD;
- asignar;
- mover;
- quitar;
- aplicación de propuesta;
- validación de capacidad.

### Salón

- cargar layout;
- crear versión;
- editar geometría;
- guardar versión canónica;
- recuperar referencia.

### Planificación

- tareas CRUD;
- estado/prioridad/responsable;
- completion.

### Finanzas

- budget items;
- payments;
- expenses heredados;
- vendors.

### Cronograma

- timeline items CRUD;
- orden;
- vínculos con proveedores.

### Música

- music items CRUD;
- acto/set/cue/prioridad;
- vínculos con proveedor.

### Documentos

- metadata CRUD;
- visibilidad;
- futuras versiones/archivos.

### Copiloto

- consulta grounded;
- snapshot;
- propuesta de acción;
- confirmación/ejecución;
- review state.

## 6. Reglas de payload

- IDs: UUID/canónico según esquema;
- timestamps: ISO-8601; presentación localizada en UI;
- timezone de negocio: `America/Santiago`;
- teléfonos: normalizados sólo cuando el dominio lo requiere;
- montos: evitar floats ambiguos; seguir tipo DB vigente;
- enums: validar allowlist;
- strings: trim + límites;
- metadata JSON: validar shape cuando afecte dominio.

## 7. Concurrencia

Entidades que puedan editarse desde varias superficies deben usar alguna estrategia de concurrencia:

- columna `version`;
- `updated_at` esperado;
- constraint/transaction;
- RPC atómica.

Ante conflicto, responder `409` y no pisar silenciosamente cambios posteriores.

## 8. Idempotencia

Requerida especialmente en:

- sync;
- retries;
- importaciones;
- aplicación masiva;
- webhooks;
- operaciones que puedan ser reintentadas por navegador/red.

La clave idempotente no debe incluir PII en texto claro si puede evitarse.

## 9. Errores

Código estable recomendado:

```text
AUTH_REQUIRED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
CONFLICT
CAPACITY_EXCEEDED
GUEST_NOT_ATTENDING
GUEST_NOT_RECONCILED
DUPLICATE_ASSIGNMENT
PREVIEW_WRITE_BLOCKED
EXTERNAL_SYNC_BLOCKED
DEPENDENCY_UNAVAILABLE
INTERNAL_ERROR
```

UI puede traducirlos a lenguaje humano.

## 10. Auditoría

Para mutaciones relevantes registrar cuando aplique:

- actor;
- entity type/id;
- action;
- before;
- after;
- origin;
- timestamp.

Evitar incluir secretos y minimizar PII redundante.

## 11. Sync

Un endpoint de negocio no debe fallar el dato canónico sólo porque Google Sheets no respondió, salvo que explícitamente se diseñe como transacción externa (no recomendado).

Flujo preferido:

```text
write Supabase
→ commit
→ enqueue sync_outbox
→ respuesta al usuario
→ worker
→ verify Sheet
→ processed
```

## 12. Preview guard

Mutaciones fuera de producción deben responder un error estable cuando no exista habilitación de staging.

Recomendado:

```json
{
  "ok": false,
  "error": {
    "code": "PREVIEW_WRITE_BLOCKED",
    "message": "Las escrituras están deshabilitadas en este entorno."
  }
}
```

## 13. Copiloto: contrato de acción

Una acción propuesta debe estar estructurada, por ejemplo:

```json
{
  "type": "create_timeline_item",
  "summary": "Agregar llegada del fotógrafo a las 16:30",
  "payload": {},
  "requires_confirmation": true
}
```

El cliente nunca ejecuta directamente instrucciones textuales del modelo. El servidor valida `type`, payload, permiso y precondiciones.

## 14. Checklist por endpoint

Antes de considerar un contrato cerrado:

- [ ] ruta y método reales verificados;
- [ ] auth verificada;
- [ ] rol/permiso verificado;
- [ ] schema de request;
- [ ] schema de response;
- [ ] errores estables;
- [ ] RLS/RPC involucrada;
- [ ] audit;
- [ ] outbox;
- [ ] environment guard;
- [ ] idempotencia/concurrencia;
- [ ] test positivo;
- [ ] test negativo.

## 15. Tarea de cierre

Este baseline debe completarse automáticamente a partir de la implementación real del repositorio: inventariar `gestion/app/api/**`, mapear métodos y dependencias, y sustituir esta sección por una tabla canónica de endpoints antes de declarar el release final.
