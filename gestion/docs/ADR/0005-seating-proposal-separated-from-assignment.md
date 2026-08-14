# ADR-0005 — Propuestas de seating separadas de asignaciones reales

**Estado:** Accepted  
**Fecha:** 14 de agosto de 2026

## Contexto

Seating Intelligence necesita explorar alternativas, scores y mesas virtuales. Esas simulaciones pueden cambiar varias veces y no deben afectar la distribución real mientras se calculan.

## Decisión

La generación de escenarios trabaja en una capa de propuesta/borrador separada.

Sólo después de revisión y confirmación humana se aplica mediante una operación transaccional que revalida:

- asistencia;
- ficha conciliada;
- capacidad;
- relaciones fuertes/incompatibilidades;
- concurrencia;
- permisos.

## Consecuencias

- comparar escenarios es seguro;
- Preview puede mostrar propuestas sin tocar producción;
- el usuario distingue simulación de realidad;
- aplicar una propuesta es una acción sensible, auditable y reversible.
