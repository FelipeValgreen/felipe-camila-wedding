# TEST_PLAN.md — Plan de pruebas del Centro de Gestión

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026  
**Ámbito:** `gestion/**` y contratos de datos consumidos por el Centro de Gestión.

## 1. Objetivo

Establecer una estrategia de calidad reproducible para que `gestion.felipeycami.cl` pueda evolucionar sin depender de validación manual informal ni de producción como entorno de prueba.

El plan protege especialmente:

- datos de invitados y RSVP;
- conciliación de personas;
- capacidad y asignación de mesas;
- presupuesto y pagos;
- proveedores;
- cronograma y música;
- documentos;
- layout del salón;
- Copiloto y memoria durable;
- auditoría;
- sincronización con Google Sheets;
- separación Preview / Production.

## 2. Principios

1. No probar mutaciones destructivas sobre producción.
2. Build y typecheck no reemplazan tests de dominio.
3. Toda regla crítica debe tener al menos una prueba positiva y una negativa.
4. Los tests no deben depender de PII real.
5. Las pruebas E2E mutantes requieren staging aislado.
6. Preview sin staging debe permanecer read-only para producción.
7. Ninguna prueba puede afirmar éxito sin verificar el estado final persistido.
8. Las pruebas de IA deben validar guardrails y contratos, no una redacción exacta del modelo.

## 3. Pirámide de pruebas

### 3.1 Unitarias

Cubren funciones puras y reglas deterministas:

- normalización;
- validadores;
- capacidad;
- elegibilidad de seating;
- scoring;
- reglas de relaciones;
- cálculos financieros;
- transformaciones de cronograma/música;
- helpers de entorno;
- serialización de layouts;
- permisos.

### 3.2 Integración

Cubren operaciones entre capas:

- Route Handler → Supabase;
- RPC → constraints → auditoría;
- outbox → Google Sheets de prueba;
- autenticación → autorización;
- escritura → `audit_log`;
- escritura sincronizable → `sync_outbox`.

### 3.3 E2E

Cubren journeys de usuario completos en staging:

- login;
- dashboard;
- invitado;
- conciliación;
- relaciones;
- mesas;
- salón;
- presupuesto;
- proveedores;
- pagos;
- planificación;
- cronograma;
- música;
- documentos;
- Copiloto;
- actividad.

### 3.4 Smoke de producción

Sólo lectura o acciones explícitamente controladas. Nunca usar datos ficticios que contaminen el caso real.

## 4. Matriz P0 de dominio

### Autenticación y RBAC

- usuario sin sesión no entra a `/dashboard`;
- usuario inactivo no opera;
- `viewer` no ejecuta mutaciones;
- `editor` sólo ejecuta mutaciones autorizadas;
- `owner` mantiene capacidades administrativas;
- service role nunca se expone al cliente.

### RSVP y conciliación

- una respuesta puede representar varias personas;
- el RSVP original permanece inmutable como evidencia;
- exact match único puede conciliar;
- coincidencia ambigua no se resuelve automáticamente;
- teléfono compartido no implica relación confirmada;
- no se crea `+1` implícito;
- `attendance_status` y `reconfirmation_status` permanecen independientes.

### Invitados

- una ficha representa una persona;
- restricciones se mantienen por persona;
- soft delete no destruye historial;
- cambios relevantes generan auditoría;
- un confirmado sin ficha puede ser visible para planificación, pero no persistirse en seating final.

### Relaciones

- `confirmed` puede usarse como regla fuerte;
- `probable` sólo como preferencia;
- no promover `probable` a `confirmed` por inferencia automática;
- grupos conocidos separados generan alerta.

### Mesas

- sólo `attending` puede asignarse;
- una persona no puede ocupar dos mesas;
- no superar capacidad;
- mover invitado mantiene consistencia;
- quitar invitado limpia relación completa;
- operaciones quedan auditadas;
- drag & drop tiene alternativa accesible.

### Seating Intelligence

- no escribe asignaciones reales durante generación;
- respeta capacidad y relaciones fuertes;
- propuesta identifica déficit de capacidad;
- score tiene razones explicables;
- aplicar requiere confirmación;
- aplicación final es transaccional;
- rollback conserva integridad.

### Salón

- posiciones/dimensiones válidas;
- rotación y bloqueo persistibles;
- referencia visual no se confunde con layout operativo;
- mesas persistidas y layout usan escala coherente;
- Preview guarda borrador sin escribir producción.

### Presupuesto y pagos

- estimado/contratado/pagado/saldo consistentes;
- pago no puede quedar huérfano;
- historial monetario no se reescribe silenciosamente;
- moneda/tipo de cambio se conservan según contrato;
- eliminación sensible requiere permiso y auditoría.

### Proveedores

- CRUD respeta permisos;
- estado sigue transiciones soportadas;
- proveedor se relaciona con pagos/documentos/timeline cuando corresponda;
- datos ajenos no se exponen a futuros roles externos.

### Cronograma

- start/end y duración coherentes;
- orden estable;
- proveedor/responsable opcional no rompe el evento;
- cambios quedan auditados;
- Preview usa borrador seguro.

### Música

- acto/set/momento/canción/cue se conserva;
- prioridades soportadas;
- `No tocar` no se interpreta como `Must Play`;
- proveedor relacionado no duplica la fuente de verdad.

### Documentos

- metadata se persiste;
- permisos controlan visibilidad;
- búsqueda/filtro no filtra datos no autorizados;
- versiones no destruyen evidencia previa cuando aplique.

### Copiloto

- responde desde snapshot grounded;
- separa hecho, inferencia y recomendación;
- declara ausencia de información;
- no inventa parentescos/costos/canciones/horarios;
- una acción sensible requiere confirmación explícita;
- el servidor revalida toda acción;
- fallback determinista mantiene consultas críticas sin proveedor LLM.

### Sync Google Sheets

- outbox idempotente;
- 429/5xx no pierde operación;
- no marcar `processed` antes de verificar escritura;
- reintento no duplica fila canónica;
- Preview no sincroniza con Sheet productiva.

## 5. Matriz responsive mínima

Validar journeys P0 en:

- 360×800;
- 390×844;
- 430×932;
- 768×1024;
- 1366×768;
- 1440×900.

## 6. Accesibilidad

P0:

- navegación por teclado;
- focus visible;
- labels de formularios;
- mensajes de error asociados;
- contraste;
- targets táctiles;
- `prefers-reduced-motion` cuando corresponda;
- alternativa a drag & drop.

Objetivo: WCAG 2.2 AA razonablemente aplicable.

## 7. Datos de prueba

Crear seeds ficticios que cubran:

- 20 invitados;
- 3 respuestas conjuntas;
- 2 RSVP ambiguos;
- 2 restricciones alimentarias;
- 2 grupos `confirmed`;
- 2 relaciones `probable`;
- 4 mesas con capacidad distinta;
- 1 mesa al límite;
- 3 proveedores;
- 5 ítems de presupuesto;
- 3 pagos;
- 6 bloques de cronograma;
- 8 ítems de música;
- 3 documentos;
- 1 layout de salón.

No reutilizar nombres, teléfonos ni restricciones reales.

## 8. Comandos objetivo

El repositorio debe converger a:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run check:ci
```

`check:ci` debe ser la puerta local mínima y ejecutar las verificaciones deterministas disponibles.

## 9. Gate de PR

Un PR funcional no debe considerarse listo si falta alguno de los siguientes elementos aplicables:

- [ ] typecheck;
- [ ] tests unitarios/integración relevantes;
- [ ] build;
- [ ] E2E para flujo crítico cuando exista staging;
- [ ] Preview `READY`;
- [ ] ausencia de PII/secrets nuevos;
- [ ] migraciones versionadas;
- [ ] rollback;
- [ ] screenshots para cambios UI;
- [ ] actualización documental si cambió un contrato.

## 10. Gate de producción

- [ ] backup/snapshot previo si hay migración o mutación masiva;
- [ ] PR aprobado;
- [ ] CI verde;
- [ ] staging verde para mutaciones reales;
- [ ] smoke de Preview;
- [ ] migraciones revisadas;
- [ ] RLS/grants verificados;
- [ ] plan de rollback;
- [ ] deployment productivo `READY`;
- [ ] smoke post-deploy;
- [ ] health/sync sin regresiones.

## 11. Brecha actual

A fecha de este documento, `gestion/package.json` dispone de `typecheck` pero no de una suite formal `test`, `test:e2e` ni un `check:ci` canónico. Los tests históricos del repositorio raíz protegen principalmente RSVP/API heredados y no sustituyen una suite del Centro de Gestión.

La siguiente tarea técnica derivada de este plan es implementar el runner de pruebas del subproyecto `gestion/`, comenzar por reglas P0 puras y añadir E2E una vez exista staging full-stack aislado.
