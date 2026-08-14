# ADR-0006 — Preservar historial mediante archivo/soft delete

**Estado:** Accepted  
**Fecha:** 14 de agosto de 2026

## Contexto

Invitados, pagos, proveedores, documentos y otras entidades acumulan relaciones y auditoría. Un borrado físico accidental puede romper integridad y eliminar evidencia necesaria para operar o reconstruir decisiones.

## Decisión

Para entidades con historial de negocio se prefiere archivo/soft delete o estado inactivo. El borrado físico queda reservado a casos explícitos, con permiso elevado, sin dependencias o con procedimiento controlado.

## Consecuencias

- mejor trazabilidad;
- menor riesgo de relaciones huérfanas;
- consultas deben filtrar estados archivados cuando corresponda;
- políticas de retención post-evento deben distinguir archivo operacional de eliminación definitiva.
