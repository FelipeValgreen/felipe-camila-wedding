# CHANGELOG.md — Centro de Gestión

Este archivo registra cambios de producto y arquitectura relevantes. No debe usarse para conteos operativos de invitados, pagos o incidencias en tiempo real.

## 2026-08-14 — Closeout baseline

### Documentación

- agregado `docs/TEST_PLAN.md`;
- agregado `docs/SECURITY_PRIVACY.md`;
- agregado `docs/RELEASE_CHECKLIST.md`;
- agregado `docs/BACKUP_RESTORE.md`;
- agregado `docs/OBSERVABILITY.md`;
- agregado `docs/WEDDING_DAY_RUNBOOK.md`;
- agregado `docs/RBAC_PERMISSIONS.md`;
- agregado `docs/API_CONTRACTS.md` como baseline a completar desde código real.

### Objetivo

Consolidar el proyecto alrededor de una única definición de calidad, seguridad, permisos, operación, recuperación y release antes del cierre funcional de Felipe & Camila.

### Próximo cierre técnico

- reconciliar documentación histórica con código vigente;
- inventariar APIs/migraciones reales;
- añadir `test` / `check:ci` al subproyecto `gestion`;
- implementar suite mínima de dominio;
- crear staging full-stack aislado;
- ejecutar gap analysis PRD ↔ implementación;
- completar readiness operativo del 23 de octubre de 2026.
