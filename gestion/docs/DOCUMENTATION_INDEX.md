# DOCUMENTATION_INDEX.md — Fuentes canónicas

**Fecha:** 14 de agosto de 2026

## Orden de lectura

1. `../PRD.md` — requisitos de producto y alcance.
2. `../CONTEXT.md` — arquitectura/contexto operativo vigente.
3. `../MEMORY.md` — decisiones durables.
4. `../AGENTS.md` — reglas de trabajo para agentes.
5. `ARCHITECTURE.md` — arquitectura técnica.
6. `DOMAIN_RULES.md` — reglas de negocio no negociables.
7. `DATA_MODEL.md` — modelo canónico/verificado.
8. `RBAC_PERMISSIONS.md` — permisos.
9. `SECURITY_PRIVACY.md` — política de seguridad y privacidad.
10. `API_CONTRACTS.md` — contratos HTTP/RPC.
11. `PREVIEW_STAGING.md` — separación de entornos.
12. `TEST_PLAN.md` — estrategia de calidad.
13. `OBSERVABILITY.md` — salud y diagnóstico.
14. `BACKUP_RESTORE.md` — recuperación.
15. `RUNBOOK.md` — operación técnica.
16. `RELEASE_CHECKLIST.md` — gates de release.
17. `WEDDING_DAY_RUNBOOK.md` — operación del 23/10/2026.
18. `STATUS_AND_ROADMAP.md` — capacidades y deuda vigente.
19. `GAP_ANALYSIS.md` — PRD vs implementación.
20. `ADR/` — decisiones arquitectónicas.
21. `specs/` — especificaciones de dominios complejos.

## Autoridad

Si dos documentos se contradicen:

```text
código/migraciones reales
→ ADR/reglas canónicas
→ documentación vigente
→ documentos históricos
```

La discrepancia debe corregirse; no convivir indefinidamente.

## Documentos históricos

Los archivos en `/docs` de la raíz del repositorio pueden representar fases anteriores del sitio público, RSVP o Centro de Gestión. No se consideran estado vigente de `gestion/**` salvo referencia explícita y verificada.

## Datos operativos dinámicos

No guardar como “memoria durable” conteos que cambian con RSVP, seating, pagos o incidencias. Consultarlos desde Supabase/Sheet cuando se necesiten.
