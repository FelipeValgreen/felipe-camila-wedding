# PRODUCTION_FREEZE.md — Política de freeze previo al matrimonio

**Evento:** 23 de octubre de 2026

## T-14

- reducir cambios de arquitectura;
- cerrar funcionalidades nuevas no esenciales;
- priorizar bugs, datos, QA y operación.

## T-7

- freeze estructural;
- no nuevas migraciones salvo P0;
- no nuevas integraciones;
- no cambios amplios de diseño;
- sólo correcciones, datos y readiness.

## T-72h

- sólo cambios P0/P1 operativos;
- cualquier deploy requiere rollback inmediato disponible;
- seating, cronograma y proveedores en cierre.

## T-24h

- no deploy salvo incidente crítico;
- snapshot/exportaciones offline;
- registrar deployment estable.

## Día del evento

- cero cambios estructurales;
- mutaciones sólo operativas;
- si hay fallo de aplicación, privilegiar continuidad offline antes que experimentar con producción.

## Excepción

Un cambio durante freeze debe registrar:

- severidad del problema;
- por qué no puede esperar;
- alcance;
- backup;
- prueba;
- rollback;
- aprobación.
