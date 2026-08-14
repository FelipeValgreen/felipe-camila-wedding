# STATUS_AND_ROADMAP.md — Estado y hoja de ruta

**Actualizado:** 14 de agosto de 2026

> Los conteos de RSVP, pagos, incidencias y asignaciones cambian continuamente. Este documento registra capacidades de producto y arquitectura, no conteos operativos en tiempo real.

## 1. Leyenda

- ✅ Implementado y con base productiva
- 🧪 Implementado en rama/Preview y pendiente de merge
- 🟡 Funcional con una limitación conocida
- ⚪ Futuro
- 🔴 Bloqueante para una capacidad específica

## 2. Estado de producto

| Módulo | Estado | Estado técnico |
|---|---|---|
| Autenticación administrativa | ✅ | Supabase Auth + `admin_profiles` + RLS |
| Inicio / Command Center | ✅ | Resumen conectado de confirmados, mesas, cronograma, música, presupuesto, documentos e incidencias |
| Necesita atención | ✅ | Conciliación e incidencias con acciones auditadas |
| Planificación | ✅ | Prioridades derivadas + tareas manuales autogestionables |
| Invitados | ✅ | Directorio, edición rápida, restricciones, clasificación familiar/social y conciliación |
| Relaciones de invitados | ✅ | Grupos canónicos editables; conocidos = regla fuerte, probables = preferencia |
| Mesas | ✅ | CRUD, capacidad, asignar/quitar, drag & drop y avisos de grupos separados |
| Seating Intelligence | ✅ / 🟡 | Tres escenarios, score explicable, confirmados y mesas propuestas; aplicación masiva real sigue protegida |
| Salón | ✅ | Editor 2D operativo, layout canónico, referencia de recinto, drag/resize/rotación/bloqueo/versionado |
| Cronograma | ✅ | Fuente canónica en Supabase + CRUD + borradores seguros en Preview |
| Música | ✅ | Momentos/canciones/cues/proveedor + CRUD + acciones del Copiloto |
| Presupuesto | ✅ | `event_budget_items` canónico + CRUD |
| Proveedores | ✅ | CRUD, coordinación operativa, estados y auditoría |
| Pagos | ✅ | Registro, edición y eliminación con permisos/auditoría |
| Documentos | ✅ | Registro canónico + búsqueda/filtros + CRUD |
| Actividad | ✅ | `audit_log` presentado como timeline operativo |
| Copiloto operacional | ✅ / 🟡 | Grounding obligatorio, memoria, fallback seguro y acciones confirmables; LLM externo es opcional |
| Estado del sistema | ✅ | Diagnóstico de fuentes, integridad, capacidad, conciliación, Copiloto y guards de entorno |
| Google Sheets sync | ✅ | `sync_outbox`; bloqueado fuera de producción por guard |
| Auditoría | ✅ | `audit_log` para cambios relevantes |
| Preview seguro | ✅ / 🟡 | Escrituras DB/Sheets bloqueadas por defecto; módulos usan borradores locales. Falta staging full-stack |
| Typecheck separado | ✅ | `npm run typecheck` |
| Tests automatizados base | ✅ / 🟡 | 10 pruebas de contratos críticos; aún falta cobertura amplia de dominio/API/E2E |
| Quality gate de build | 🧪 | `npm run build` ejecuta `npm test` antes de `next build`; `npm run check:ci` consolida lint/typecheck/build |
| Staging full-stack aislado | 🔴 | Requerido antes de probar mutaciones reales fuera de producción |
| Portal de proveedores | ⚪ | Requiere roles y vistas acotadas |
| Multi-matrimonio | ⚪ | Siguiente etapa comercial, no necesaria para el caso Felipe/Camila |
| Facturación comercial | ⚪ | Pospuesta |

## 3. Modelo canónico

Supabase sigue siendo la fuente de verdad para entidades estructuradas. Google Sheets permanece como espejo o como fuente operacional transitoria sólo donde todavía corresponde.

Entidades relevantes:

```text
rsvp_responses
rsvp_response_members
wedding_guests
wedding_tables
seating_assignments
management_issues
vendors
expenses / expense_payments
event_budget_items / event_budget_payments
event_timeline_items
event_music_items
event_documents
event_tasks
guest_relationship_groups
guest_relationship_members
event_venue_layouts
event_memory
copilot_review_state
audit_log
sync_outbox
```

Las migraciones de esquema están versionadas en `supabase/migrations/`. Datos personales y backfills privados **no** se incluyen en el repositorio público.

## 4. Confirmados y fichas

La experiencia diferencia explícitamente:

1. asistentes conocidos en el consolidado + delta live;
2. personas con ficha operativa en `wedding_guests`;
3. personas todavía pendientes de conciliación;
4. personas realmente persistibles en `seating_assignments`.

Seating Intelligence puede incluir a un confirmado sin ficha como **registro virtual de planificación**, pero ese registro no puede escribirse como asignación real hasta ser conciliado.

## 5. Relaciones y familias

Las relaciones no dependen de una inferencia oculta del algoritmo.

```text
Relación conocida
→ regla fuerte

Relación por validar
→ preferencia blanda

family_branch explícito
→ afinidad operativa para seating
```

El usuario puede editar relaciones y ramas desde Invitados. Esto permite separar ramas familiares/sociales sin que el sistema invente quién es madre, padre, pareja, hermano o amigo.

## 6. Mesas y Seating Intelligence

La página de Mesas es un workspace autogestionable:

- banco de invitados;
- búsqueda y filtros;
- drag & drop;
- selector alternativo;
- CRUD de mesas;
- capacidad dura;
- grupos conocidos visibles;
- aviso cuando un grupo conocido queda separado;
- Preview persistente sin escribir producción.

Seating Intelligence genera tres escenarios:

- **Cohesión familiar**;
- **Equilibrada**;
- **Mezcla social**.

Cada escenario incluye score, razones, cupos y mesas adicionales propuestas cuando la capacidad real no alcanza. Guardar una propuesta crea un borrador que Salón puede visualizar; no ejecuta silenciosamente asignaciones reales.

## 7. Salón

El editor del Salón mantiene dos capas distintas:

### Referencia

Plano o imagen del recinto como overlay/guía.

### Layout operativo

Elementos editables con:

- posición;
- tamaño;
- rotación;
- bloqueo;
- duplicación;
- eliminación;
- biblioteca de objetos;
- medidas métricas;
- versión canónica en producción;
- borrador local persistente en Preview.

El borrador de Seating Intelligence puede visualizar mesas adicionales propuestas sobre el Salón sin confundirlas con mesas persistidas.

## 8. Copiloto operacional

El Copiloto es **data-first** y no depende de que un LLM externo responda para seguir siendo útil.

Flujo:

```text
pregunta
→ consulta fuentes conectadas
→ snapshot actual
→ memoria activa
→ respuesta grounded
→ acción propuesta, si corresponde
→ confirmación explícita
→ escritura permitida sólo en entorno y rol correctos
```

Acciones actualmente preparables incluyen:

- crear ficha de invitado;
- renombrar mesa;
- guardar memoria;
- canción/momento de Música;
- bloque de Cronograma;
- tarea de Planificación.

En Preview la confirmación crea borradores locales donde corresponde. En producción llama al API canónico correspondiente, con guard, permisos y auditoría.

## 9. Seguridad de entornos

Regla permanente:

```text
Preview / Development nunca deben escribir en la base o Sheets de producción.
```

La política se separó en dos capas:

- `lib/runtime-policy.ts`: lógica pura y testeable;
- `lib/environment-guard.ts`: adaptador server-only que evalúa `process.env`.

La política falla cerrada: cualquier entorno no identificado se trata como no productivo y bloquea escrituras.

Limitación conocida: los guards **no equivalen a un staging full-stack**. Para pruebas de mutaciones reales fuera de producción todavía se necesita un proyecto/branch Supabase aislado y un Sheet de prueba.

## 10. Quality gates

La rama de quality gates incorpora una primera suite automatizada sin dependencias de testing adicionales.

Cobertura inicial:

- teléfonos chilenos e internacionales;
- formatos inválidos;
- detección de Production/Preview/Development/unknown;
- bloqueo de escrituras por defecto en Preview;
- habilitación explícita de staging;
- bloqueo independiente de sincronización externa;
- fail-closed en entornos desconocidos.

Comandos:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run qa
npm run check:ci
```

`npm run build` ejecuta `npm test` antes de compilar Next.js. Un deployment no puede quedar verde si falla esta suite.

### Siguiente cobertura a incorporar

1. reglas de conciliación RSVP;
2. capacidad y consistencia de seating;
3. acciones confirmables del Copiloto;
4. CRUD de presupuesto/proveedores/timeline/música;
5. smoke tests autenticados de rutas críticas;
6. responsive y accesibilidad;
7. E2E sobre staging aislado.

## 11. Checklist antes de merge

- Preview `READY`;
- `npm test` verde;
- `next build` verde;
- typecheck verde;
- revisar warnings del build;
- errores runtime recientes revisados;
- guards de mutación vigentes;
- migraciones versionadas cuando existan;
- ausencia de PII/secrets nuevos;
- diff limitado a `gestion/**`;
- no tocar frontend/RSVP público.

## 12. Pendientes reales para cerrar el caso Felipe/Camila

No son todos bloqueantes de producto, pero sí tareas operativas antes del evento:

1. conciliar confirmados que todavía no tienen ficha individual;
2. completar ramas familiares/sociales que el algoritmo no puede conocer por sí solo;
3. elegir y ajustar un escenario de seating;
4. persistir asignaciones finales sólo cuando las fichas estén conciliadas;
5. ajustar el layout del Salón con medidas/decisiones reales del montaje;
6. completar canciones, cues, responsables y horarios pendientes;
7. completar coordinación de proveedores y documentos;
8. mantener tareas y memoria operacional al día;
9. habilitar staging aislado antes de la siguiente ronda de pruebas destructivas o de escritura real.
