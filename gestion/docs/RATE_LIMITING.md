# RATE_LIMITING.md

## Objetivo

Proteger endpoints costosos/sensibles sin perjudicar operación normal.

## Candidatos

- login/auth según proveedor;
- Copiloto/LLM;
- importaciones;
- sync manual;
- acciones masivas;
- endpoints públicos RSVP (fuera del alcance directo de `gestion/**`, pero relevantes al ecosistema).

## Principios

- persistente cuando serverless hace ineficaz memoria local;
- por usuario/acción antes que sólo IP para dashboard autenticado;
- respuesta `429` estable;
- no usar rate limit como autorización;
- límites ajustables por entorno;
- observabilidad de bloqueos.

No implementar un límite arbitrario que pueda bloquear a coordinación el día del evento sin vía de override autorizada.
