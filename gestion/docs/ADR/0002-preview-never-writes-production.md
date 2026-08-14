# ADR-0002 — Preview y Development no escriben producción

**Estado:** Accepted  
**Fecha:** 14 de agosto de 2026

## Contexto

El Centro de Gestión opera datos reales de invitados, seating, finanzas y proveedores. Usar Vercel Preview o desarrollo local contra recursos productivos con mutaciones habilitadas transforma QA en un riesgo operativo.

## Decisión

Por defecto:

```text
Production → puede escribir producción según permisos
Preview → read-only contra producción
Development → read-only contra producción
```

Las mutaciones fuera de producción sólo se habilitan contra infraestructura aislada:

- Supabase staging/local;
- datos ficticios;
- Google Sheet de prueba o sync deshabilitado;
- secretos propios de staging.

## Implementación esperada

Barreras independientes:

- guard de Route Handlers;
- guard del cliente Supabase navegador;
- guard de sincronización externa.

No depender de una sola barrera.

## Consecuencias

- Preview puede validar UX de lectura de forma segura;
- mutaciones reales requieren staging;
- algunos flows interactivos pueden usar drafts locales hasta disponer de staging;
- ningún agente debe habilitar flags de escritura sin verificar los destinos reales.

## Regla de seguridad

Si no puede demostrarse el aislamiento:

```text
BLOCKED_PREVIEW_ISOLATION_REQUIRED
```
