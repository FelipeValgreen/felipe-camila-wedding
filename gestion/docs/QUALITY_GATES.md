# QUALITY_GATES.md — Puertas de calidad

**Fecha:** 14 de agosto de 2026

## Gate 1 — Edit

Antes de terminar una unidad de cambio:

- TypeScript compila;
- reglas de dominio no se duplican innecesariamente;
- no hay secretos/PII;
- estados de error están manejados;
- no se introducen botones sin implementación.

## Gate 2 — Commit/PR

- lint;
- typecheck;
- tests relevantes;
- build;
- documentación contractual;
- migraciones versionadas;
- rollback.

## Gate 3 — Preview

- deployment READY;
- smoke funcional;
- responsive;
- consola/runtime;
- guard de mutación;
- no escritura en producción.

## Gate 4 — Staging

Requerido para mutaciones complejas:

- Supabase aislado;
- datos ficticios;
- E2E;
- RLS/permissions;
- migraciones;
- sync de prueba cuando aplique;
- rollback/dry run.

## Gate 5 — Production

- PR aprobado;
- backup cuando corresponda;
- CI verde;
- deploy del commit correcto;
- smoke;
- observabilidad;
- sync sano.

## Gate 6 — Wedding Day Ready

- Definition of Done operacional;
- snapshot final;
- offline pack;
- responsables;
- contingencias.

Ningún gate posterior compensa un gate anterior fallido.
