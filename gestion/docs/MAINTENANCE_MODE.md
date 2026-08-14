# MAINTENANCE_MODE.md

El Centro de Gestión debería disponer de una estrategia de mantenimiento antes de operaciones de alto riesgo.

## Cuándo usar

- migración crítica;
- restauración;
- reconciliación/backfill masivo;
- reconstrucción de seating final;
- incidente de integridad.

## Comportamiento deseado

- bloquear mutaciones no esenciales;
- mantener lectura cuando sea segura;
- mostrar mensaje humano;
- permitir acceso a operadores autorizados si es necesario;
- registrar inicio/fin;
- no confundir maintenance mode con caída no controlada.

## Implementación

Puede ser feature flag/env/config canónica, pero debe evitar depender de un deploy largo para activarse en una emergencia.

Esta capacidad es P1 antes del evento; no debe introducir complejidad que supere el beneficio si el sistema permanece estable y de bajo tráfico.
