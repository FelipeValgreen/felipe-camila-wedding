# STATUS_AND_ROADMAP.md — Estado y hoja de ruta

**Actualizado:** 17 de agosto de 2026

> Este documento registra capacidades y arquitectura. Los conteos operativos de invitados, RSVP, pagos, incidencias y mesas deben consultarse en las fuentes live.

## 1. Estado ejecutivo

El Centro de Gestión para Felipe & Camila está en **fase operativa y estabilizada** para el matrimonio actual. El cierre técnico de agosto incorpora CI reproducible, guards coherentes de Preview, documentación alineada al esquema real y reemplazo atómico del layout del salón.

Supabase continúa como fuente de verdad; Google Sheets es espejo parcial y Vercel aloja la aplicación privada.

## 2. Capacidades actuales

| Módulo | Estado | Nota |
|---|---|---|
| Autenticación administrativa | ✅ | Supabase Auth + `admin_profiles` + RLS |
| Command Center | ✅ | Resúmenes y fuentes operativas conectadas |
| Necesita atención | ✅ | Incidencias y conciliación auditables |
| Planificación / tareas | ✅ | `event_tasks` + acciones confirmables del Copiloto |
| Invitados | ✅ | Directorio, edición, clasificación, restricciones y conciliación |
| Relaciones de invitados | ✅ | Grupos confirmados/probables editables |
| Mesas | ✅ | CRUD, capacidad, asignar/quitar y controles de grupos |
| Seating Intelligence | ✅ / 🟡 | Escenarios explicables; aplicación real sigue protegida y depende de fichas conciliadas |
| Salón | ✅ | Editor métrico, versionado y reemplazo activo atómico |
| Cronograma | ✅ | `event_timeline_items` canónico + CRUD |
| Música | ✅ | Momentos, canciones, cues, proveedores y notas técnicas |
| Presupuesto | ✅ | `event_budget_items` + `event_budget_payments` |
| Proveedores | ✅ | CRUD + coordinación de producción |
| Pagos/gastos históricos | ✅ | `expenses` + `expense_payments` siguen soportados |
| Documentos | ✅ | Registro canónico y CRUD |
| Actividad / auditoría | ✅ | `audit_log` |
| Memoria IA | ✅ | `event_memory` |
| Copiloto operacional | ✅ / 🟡 | Grounded y confirmable; el LLM externo es opcional |
| Estado del sistema | ✅ | Diagnóstico de fuentes, integridad y guards |
| Google Sheets sync | ✅ / 🟡 | Worker automático para entidades mapeadas; no todos los módulos `event_*` se espejan |
| Preview seguro costo 0 | ✅ | Lectura permitida; DB/Sheets bloqueados por defecto |
| Tests automatizados | ✅ | Contratos de runtime, Copiloto, UI operativa, teléfonos, guards y venue |
| GitHub CI | ✅ | lint de higiene + typecheck + tests + build en PR/push |
| Vercel Preview | ✅ | Build real y smoke de autenticación verificados |

## 3. Arquitectura canónica actual

```text
Vercel / Next.js Centro de Gestión
        │
        ├── Supabase Auth
        │
        ├── Supabase PostgreSQL  ← fuente de verdad
        │     ├── RSVP / invitados
        │     ├── relaciones
        │     ├── mesas / seating
        │     ├── salón
        │     ├── proveedores
        │     ├── presupuesto / pagos
        │     ├── cronograma / tareas / música
        │     ├── documentos / memoria
        │     ├── audit_log
        │     └── sync_outbox
        │
        └── Google Sheets ← espejo parcial vía outbox worker
```

El detalle de tablas y relaciones está en `DATA_MODEL.md`.

## 4. Seguridad de entornos

Regla permanente:

```text
Preview / Development no escriben producción salvo opt-in explícito en un staging aislado.
```

Controles:
- `lib/runtime-policy.ts`: política pura y testeable;
- `lib/environment-guard.ts`: evaluación server-only;
- middleware: bloquea métodos mutantes de `/api/**` fuera de producción;
- cliente Supabase: bloquea REST/Storage mutante fuera del hostname productivo;
- sync externo: requiere opt-in independiente;
- los valores truthy soportados (`1`, `true`, `yes`, `on`) se interpretan igual en las capas relevantes.

## 5. Salón: garantía de versión activa

`event_venue_layouts` mantiene como máximo un registro `active` mediante índice único parcial.

La creación de una nueva versión usa `create_venue_layout_version`:

```text
validar rol y payload
→ lock de tabla
→ snapshot del activo anterior
→ archivar activo
→ insertar nueva versión activa
→ auditar before/after
→ commit
```

Si cualquier paso falla, PostgreSQL revierte la transacción y el layout anterior continúa activo.

## 6. Quality gate

Comando local/canónico:

```bash
cd gestion
npm ci
npm run check:ci
```

GitHub Actions ejecuta de forma explícita:
1. lint de higiene del repositorio;
2. `tsc --noEmit`;
3. suite `node:test`;
4. `next build`.

El lint de higiene es deliberadamente dependency-free y detecta, entre otros, marcadores de merge, `debugger` y tests enfocados accidentalmente. La corrección semántica de TypeScript se valida de forma separada con `typecheck`.

## 7. Preview costo 0

Mientras no exista staging pagado:

```text
branch
→ GitHub CI
→ Vercel Preview
→ lectura de fuentes reales
→ mutaciones bloqueadas
→ borradores locales para interacción de UI
→ revisión
→ merge controlado
```

Esto evita pagar infraestructura extra y, al mismo tiempo, impide usar producción como sandbox de escritura.

## 8. Google Sheets

El espejo automático actual está limitado al mapa declarado en `lib/sync-outbox.ts`:
- invitados;
- RSVP;
- mesas;
- asignaciones de mesa;
- proveedores;
- gastos;
- pagos.

Cronograma, música, presupuesto `event_*`, relaciones, memoria y layout permanecen canónicos en Supabase aunque puedan existir pestañas históricas o referencias manuales en Sheets.

## 9. Pendientes operativos antes del evento

Estos no son defectos del software; son trabajo de planificación que cambia con el matrimonio:

1. conciliar cualquier confirmado que todavía no tenga ficha individual;
2. completar relaciones/ramas familiares que sólo Felipe y Camila pueden confirmar;
3. escoger y ajustar el seating definitivo;
4. persistir asignaciones finales una vez conciliadas las fichas;
5. cargar medidas y decisiones definitivas del montaje;
6. cerrar canciones, cues, responsables y horarios;
7. completar entregables, contactos y coordinación de proveedores;
8. mantener documentos, tareas y memoria operacional actualizados.

## 10. Evolución deliberadamente futura

No bloquea el matrimonio actual:
- staging full-stack dedicado de pago;
- portal externo de proveedores;
- multi-matrimonio / `wedding_id` transversal;
- facturación SaaS;
- automatizaciones comerciales multi-cliente;
- E2E de mutaciones reales fuera de producción.

## 11. Criterio de release

Antes de merge:
- CI verde;
- Preview `READY`;
- login/sesión protegida verificados;
- sin errores runtime críticos del Preview;
- sin PII/secrets nuevos;
- migraciones revisadas y seguras.

Después de merge:
- migración requerida aplicada/verificada;
- deployment productivo `READY`;
- smoke test del dominio productivo;
- revisión de errores runtime;
- verificación de consistencia en Supabase.

## 12. Estado del closeout de agosto 2026

Completado:
- documentación canónica alineada a producción;
- CI GitHub reproducible;
- lint limpio sin dependencia faltante;
- flags de Preview consistentes entre capas;
- tests de contrato adicionales;
- creación de versiones del Salón transaccional;
- Preview smoke verificado.

La siguiente prioridad del proyecto deja de ser “estabilizar la plataforma” y pasa a ser **operar el matrimonio con datos reales y cerrar decisiones pendientes**.
