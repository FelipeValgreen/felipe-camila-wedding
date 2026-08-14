# ADR-0007 — Documentación canónica por subproyecto

**Estado:** Accepted  
**Fecha:** 14 de agosto de 2026

## Contexto

El repositorio contiene documentos históricos en la raíz y documentación más reciente en `gestion/`. Algunas versiones antiguas describen ramas, conteos y estados que ya no corresponden al Centro de Gestión actual.

## Decisión

Para cualquier trabajo en `gestion/**`, las fuentes documentales canónicas son:

1. `gestion/PRD.md`
2. `gestion/CONTEXT.md`
3. `gestion/MEMORY.md`
4. `gestion/AGENTS.md`
5. `gestion/docs/**` vigente
6. código/migraciones reales como autoridad final cuando exista discrepancia

Los documentos históricos de `/docs` raíz se consideran evidencia de fases pasadas salvo referencia explícita vigente.

## Consecuencias

- menos decisiones basadas en estado obsoleto;
- agentes deben verificar código real antes de afirmar capacidades;
- los documentos canónicos se actualizan cuando cambia un contrato;
- conteos operativos en tiempo real no se congelan en `MEMORY.md`.
