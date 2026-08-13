# STATUS_AND_ROADMAP.md — Estado y hoja de ruta

**Actualizado:** 13 de agosto de 2026

> Los conteos de RSVP, pagos, incidencias y asignaciones cambian continuamente. Este documento registra capacidades de producto y arquitectura, no conteos operativos en tiempo real.

## 1. Leyenda

- ✅ Implementado y con base productiva
- 🧪 Implementado en la rama/Preview de la entrega V2
- 🟡 Funcional con una limitación conocida
- ⚪ Futuro
- 🔴 Bloqueante para una capacidad específica

## 2. Estado de producto

| Módulo | Estado | Estado técnico |
|---|---|---|
| Autenticación administrativa | ✅ | Supabase Auth + `admin_profiles` + RLS |
| Inicio / Command Center | 🧪 | Resumen conectado de confirmados, mesas, cronograma, música, presupuesto, documentos e incidencias |
| Necesita atención | ✅ / 🧪 | Conciliación e incidencias existentes, integradas a la nueva navegación |
| Planificación | 🧪 | Prioridades derivadas + tareas manuales autogestionables |
| Invitados | ✅ / 🧪 | Directorio, edición rápida, restricciones, clasificación familiar/social y conciliación |
| Relaciones de invitados | 🧪 | Grupos canónicos editables; conocidos = regla fuerte, probables = preferencia |
| Mesas | ✅ / 🧪 | CRUD de mesas, capacidad, asignar/quitar, drag & drop y avisos de grupos separados |
| Seating Intelligence | 🧪 / 🟡 | Tres escenarios, score explicable, todos los confirmados y mesas virtuales; aplicación masiva real permanece protegida |
| Salón | 🧪 | Editor 2D operativo, layout canónico, plano oficial como referencia, drag/resize/rotación/bloqueo/versionado |
| Cronograma | 🧪 | Fuente canónica en Supabase + CRUD + borradores seguros en Preview |
| Música | 🧪 | Momentos/canciones/cues/proveedor + CRUD + acciones del Copiloto |
| Presupuesto | 🧪 | `event_budget_items` canónico + CRUD |
| Proveedores | ✅ / 🧪 | CRUD, estados y auditoría |
| Pagos | 🧪 | Registro, edición y eliminación con permisos/auditoría |
| Documentos | 🧪 | Registro canónico + búsqueda/filtros + CRUD |
| Actividad | ✅ / 🧪 | `audit_log` presentado como timeline operativo |
| Copiloto operacional | 🧪 / 🟡 | Grounding obligatorio, fallback seguro y acciones confirmables para Música/Cronograma/Tareas; proveedor LLM externo no es requisito de disponibilidad |
| Estado del sistema | 🧪 | Diagnóstico de fuentes, integridad, capacidad, conciliación y guards de entorno |
| Google Sheets sync | ✅ | `sync_outbox`; bloqueado fuera de producción por guard |
| Auditoría | ✅ | `audit_log` para cambios relevantes |
| Preview seguro | ✅ / 🟡 | Escrituras DB/Sheets bloqueadas; módulos nuevos usan borradores locales persistentes. Aún no existe DB staging completa |
| Typecheck separado | ✅ | `npm run typecheck` y `npm run check:ci` |
| Tests automatizados de dominio/E2E | 🔴 | Falta suite formal; el build/TypeScript no reemplaza pruebas de interacción |
| Portal de proveedores | ⚪ | Requiere roles y vistas acotadas |
| Multi-matrimonio | ⚪ | Siguiente etapa comercial, no necesaria para el caso Felipe/Camila |
| Facturación comercial | ⚪ | Pospuesta |

## 3. Modelo canónico V2

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
audit_log
sync_outbox
```

Nuevas entidades de esta entrega:

- `guest_relationship_groups` y `guest_relationship_members` para vínculos conocidos/probables;
- `wedding_guests.family_branch` para una rama/afinidad explícita sin inventar parentescos;
- `event_venue_layouts` para layout espacial versionado.

Las migraciones de esquema están versionadas en `supabase/migrations/`. Datos personales y backfills privados **no** se incluyen en el repositorio público.

## 4. Confirmados y fichas

La experiencia diferencia explícitamente:

1. asistentes conocidos en el consolidado + delta live;
2. personas con ficha operativa en `wedding_guests`;
3. personas todavía pendientes de conciliación;
4. personas realmente persistibles en `seating_assignments`.

Seating Intelligence puede incluir a un confirmado sin ficha como **registro virtual de planificación**, pero ese registro no puede escribirse como asignación real hasta ser conciliado.

## 5. Relaciones y familias

Las relaciones ya no dependen de una inferencia oculta del algoritmo.

```text
Relación conocida
→ regla fuerte

Relación por validar
→ preferencia blanda

family_branch explícito
→ afinidad operativa para seating
```

El usuario puede editar relaciones y ramas desde Invitados. Esto permite separar, por ejemplo, ramas familiares sin que el sistema invente quién es madre, padre, pareja o hermano.

## 6. Mesas y Seating Intelligence

La página de Mesas es ahora un workspace autogestionable:

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

El editor del Salón ya tiene dos capas distintas:

### Referencia

Plano oficial del recinto como overlay/guía.

### Layout operativo

Elementos editables con:

- posición;
- tamaño;
- rotación;
- bloqueo;
- duplicación;
- eliminación;
- biblioteca de objetos;
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
→ respuesta grounded
→ acción propuesta, si corresponde
→ confirmación explícita
→ escritura permitida sólo en entorno y rol correctos
```

Acciones actualmente preparables:

- canción/momento de Música;
- bloque de Cronograma;
- tarea de Planificación.

En Preview la confirmación crea un borrador local. En producción llama al API canónico correspondiente, con guard, permisos y auditoría.

## 9. Seguridad de entornos

Regla permanente:

```text
Preview / Development nunca deben escribir en la base o Sheets de producción.
```

La rama implementa `environment-guard.ts` y aplica guards a endpoints de escritura y sincronización. Además, los módulos nuevos usan `localStorage` sólo como sandbox persistente en Preview.

Limitación conocida: esto **no equivale a un staging full-stack**. Para pruebas de mutaciones reales fuera de producción todavía se necesita un proyecto/branch Supabase aislado y un Sheet de prueba.

## 10. Validación actual

La rama V2 se despliega automáticamente como Vercel Preview. Cada cambio funcional se valida con el build de Next.js/TypeScript del deployment; el proyecto además dispone de:

```bash
npm run typecheck
npm run check:ci
```

Antes de cada merge final se debe verificar:

- deployment Preview en estado `READY`;
- build sin errores;
- errores runtime recientes;
- guards de endpoints de mutación;
- migraciones de esquema versionadas;
- ausencia de PII/secrets nuevos en el repo público.

## 11. Pendientes reales para cerrar el caso Felipe/Camila

No son bloqueantes de la nueva arquitectura, pero sí tareas operativas:

1. conciliar los confirmados que todavía no tienen ficha individual;
2. completar ramas familiares/sociales que el algoritmo no puede conocer por sí solo;
3. elegir y ajustar un escenario de seating;
4. persistir asignaciones finales sólo cuando las fichas estén conciliadas;
5. ajustar el layout del Salón con medidas/decisiones reales del montaje;
6. completar canciones, cues, responsables y horarios pendientes;
7. mantener tareas manuales y documentación al día.

## 12. Siguiente etapa de producto comercial

Después de cerrar el caso real:

- staging aislado completo;
- test E2E de flujos críticos;
- `wedding_id` / multi-matrimonio sin duplicación de código;
- permisos por boda y proveedor;
- portal de proveedores;
- entregables/versiones;
- exportaciones operativas;
- onboarding de un segundo matrimonio;
- recién después, billing/entitlements.

## 13. Fuera de alcance de esta entrega

- cambios al sitio público o RSVP público;
- marketplace;
- pagos online;
- app nativa;
- 3D;
- agente con escrituras autónomas sin confirmación;
- publicar datos personales en GitHub.
