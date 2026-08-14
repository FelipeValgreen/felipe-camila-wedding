# GAP_ANALYSIS.md — PRD vs implementación

**Estado:** EN CONSTRUCCIÓN AUTOMÁTICA  
**Fecha de inicio:** 14 de agosto de 2026

Este documento se completa contra el código, migraciones y configuración reales. No debe basarse sólo en documentación previa.

## Escala

- ✅ Implementado y verificable
- 🟡 Implementado con brecha
- 🧪 Implementado pero requiere prueba formal
- ⚪ No implementado
- 🔴 Bloqueante
- 👤 Decisión/operación humana necesaria

## Brechas confirmadas al iniciar la auditoría

| Área | Estado | Evidencia inicial | Acción |
|---|---|---|---|
| Núcleo documental | 🟡 | PRD/Context/Memory/Agents existen, pero hay contradicciones históricas | Consolidar documentos canónicos |
| TypeScript | ✅ | `gestion/package.json` contiene `typecheck` | Mantener como gate |
| Tests de gestión | 🔴 | no existe script `test` en `gestion/package.json` | Añadir runner + suite P0 |
| CI local | 🔴 | documentación menciona `check:ci`, pero script no existe | Implementar script canónico |
| E2E mutante | 🔴 | no hay staging full-stack aislado | Crear staging antes de E2E reales |
| Preview safety | ✅/🟡 | guards documentados | Verificar implementación + tests |
| API contracts | 🟡 | rutas existen, inventario canónico pendiente | Mapear `gestion/app/api/**` |
| Data model docs | 🟡 | documento contiene entidades futuras que ya evolucionaron | Reconstruir desde migraciones reales |
| Architecture docs | 🟡 | parte del documento está desfasada | Actualizar desde código real |
| Design system docs | 🟡 | `DESIGN_SYSTEM_V2.md` sigue como candidate | Promover/actualizar sistema vigente |
| Security docs | 🟡 → ✅ documental | informe histórico no era política vigente | `SECURITY_PRIVACY.md` creado |
| Backup/restore | 🟡 → ✅ documental | existían runbooks históricos | baseline vigente creado |
| Release gate | ⚪ → ✅ documental | no había checklist único | creado |
| Wedding day operations | ⚪ → ✅ documental | faltaba runbook no técnico | creado |
| Observability | 🟡 → ✅ documental | health existe según docs, política faltaba | creada |
| RBAC | 🟡 → ✅ documental | roles existentes sin matriz única | creada; verificar enforcement |

## Próximos pasos automáticos de esta auditoría

1. inventariar rutas API reales;
2. inventariar librerías de dominio;
3. inventariar migraciones/tablas vigentes;
4. revisar módulos del dashboard;
5. alinear README/CONTEXT/MEMORY/AGENTS/ARCHITECTURE/DATA_MODEL/STATUS;
6. implementar `test` y `check:ci`;
7. añadir tests P0 que no requieran infraestructura externa;
8. validar rama;
9. abrir PR de cierre;
10. registrar bloqueos humanos restantes.
