# CONCURRENCY.md

## Riesgo

Dos usuarios/superficies pueden editar una misma entidad mientras el estado cambia por RSVP, Copiloto, sync o UI.

## Estrategias

Usar según entidad:

- `version` incremental;
- `updated_at` esperado;
- constraints;
- RPC/transacción;
- advisory/row lock sólo cuando sea necesario.

## Casos críticos

- mover invitado;
- aplicar seating masivo;
- editar presupuesto/pago;
- aprobar layout;
- conciliación de RSVP.

## Regla

Ante estado obsoleto, retornar conflicto y mostrar datos actuales. No aplicar silenciosamente el payload viejo.
