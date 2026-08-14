# SEARCH_AND_FILTER_SPEC.md

## Invitados

Buscar por campos autorizados y normalizados, sin exponer PII adicional.

Filtros mínimos útiles:

- asistencia;
- conciliación/ficha;
- mesa;
- grupo/branch;
- restricción;
- incidencia.

## Proveedores

- categoría;
- estado;
- pagos/pendientes;
- day-of readiness.

## Documentos

- tipo;
- proveedor;
- estado;
- fecha.

## Rendimiento

Con volumen actual puede bastar filtrado simple, pero el contrato debe permitir server-side search/pagination cuando escale a múltiples bodas.
