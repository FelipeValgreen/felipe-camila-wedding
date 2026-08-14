# FEATURE_FLAGS.md

Usar feature flags sólo cuando reduzcan riesgo real.

## Buen uso

- habilitar una capacidad nueva de forma gradual;
- desactivar integración defectuosa;
- maintenance mode;
- activar una nueva experiencia sin eliminar inmediatamente la anterior.

## Mal uso

- ocultar deuda indefinidamente;
- saltarse permisos;
- habilitar escritura en Preview sin staging;
- dejar contratos incompatibles sin migración.

## Requisitos

Toda flag debe tener:

- nombre;
- propósito;
- default;
- entornos;
- owner;
- criterio y fecha aproximada de eliminación.
