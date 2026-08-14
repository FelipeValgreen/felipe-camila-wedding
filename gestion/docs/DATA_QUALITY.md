# DATA_QUALITY.md

## Objetivo

Definir checks de integridad que deben poder ejecutarse sin revisar filas manualmente.

## RSVP / invitados

- RSVP sin integrantes inesperados;
- integrante duplicado dentro de respuesta;
- guest vinculado a múltiples integrantes incompatibles;
- confirmado sin ficha;
- ficha con estado inválido;
- asistencia/reconfirmación mezcladas;
- restricción conjunta no resuelta por persona.

## Relaciones

- grupo sin miembros;
- miembro duplicado;
- confidence fuera de allowlist;
- relación `confirmed` basada sólo en inferencia sin aprobación cuando se pueda detectar.

## Seating

- una persona en dos mesas;
- asignado no `attending`;
- mesa inexistente;
- sobrecapacidad;
- `guest.table_id` inconsistente con assignment cuando ambos campos existen;
- asiento/ficha virtual persistida sin `guest_id`.

## Finanzas

- pagos huérfanos;
- montos negativos no permitidos por regla;
- moneda faltante cuando corresponda;
- saldo inconsistente con pagos según modelo canónico.

## Cronograma

- end < start;
- referencias huérfanas;
- categorías/estados inválidos.

## Música

- prioridad inválida;
- vínculo proveedor inexistente;
- cues críticos sin track cuando el estado indica final.

## Salón

- dimensiones no positivas;
- objetos con NaN/infinito;
- referencia de mesa inexistente;
- IDs de objeto duplicados.

## Sync

- outbox stuck;
- processed sin evidencia externa cuando el esquema permita verificar;
- entity_id vacío;
- retries anormales.

## Frecuencia

- health checks ligeros: continuos/on-demand;
- auditoría profunda: antes de releases P0 y freeze;
- seating: cada vez que se aplique una propuesta masiva;
- T-24: auditoría completa operativa.
