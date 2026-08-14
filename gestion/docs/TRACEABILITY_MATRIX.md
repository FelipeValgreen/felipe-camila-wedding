# TRACEABILITY_MATRIX.md

Este archivo mapea requisitos críticos del PRD a evidencia de implementación y prueba. Se completa durante el cierre.

| Requisito | Código / datos | Test | Estado |
|---|---|---|---|
| Supabase canónico | por verificar | por verificar | 🟡 |
| Preview no escribe producción | guards documentados | falta prueba formal | 🟡 |
| RSVP ≠ persona | modelo documentado | tests raíz parciales | 🟡 |
| No +1 implícito | reglas | por verificar | 🟡 |
| Seating capacidad dura | APIs/RPC por verificar | falta suite gestión | 🔴 |
| Relaciones probable vs confirmed | tablas/UI documentadas | falta suite gestión | 🔴 |
| Salón 2D versionado | módulo/migración por verificar | falta suite | 🟡 |
| Presupuesto/pagos | módulo/tablas por verificar | falta suite | 🟡 |
| Cronograma | módulo/tablas por verificar | falta suite | 🟡 |
| Música | módulo/tablas por verificar | falta suite | 🟡 |
| Documentos | módulo/tablas por verificar | falta suite | 🟡 |
| Copiloto grounded | implementación por verificar | falta suite | 🟡 |
| Audit log | tabla/uso por verificar | falta cobertura | 🟡 |
| Sync idempotente | worker por verificar | tests históricos parciales | 🟡 |
| RBAC | middleware/RLS por verificar | tests negativos faltan | 🔴 |
| Backup/restore | proceso documentado | ensayo staging faltante | 🔴 |
| Wedding day offline | runbook creado | simulacro faltante | 👤 |

No declarar ✅ hasta inspeccionar código/migración y, cuando corresponda, ejecutar prueba.
