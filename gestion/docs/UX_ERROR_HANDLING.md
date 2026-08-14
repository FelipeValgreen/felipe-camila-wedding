# UX_ERROR_HANDLING.md

## Principios

- mensaje humano;
- conservar contexto/formulario cuando sea seguro;
- ofrecer siguiente acción;
- no exponer stack/SQL;
- diferenciar validación, permiso, conflicto y dependencia caída;
- no mostrar éxito optimista antes de confirmación cuando la acción es sensible.

## Ejemplos

### Capacidad

“Esta mesa ya no tiene cupos. Elige otra mesa o aumenta su capacidad si corresponde.”

### Conflicto

“Este registro cambió desde que lo abriste. Recargamos la versión más reciente antes de guardar.”

### Preview

“Las escrituras están deshabilitadas en este entorno.”

### Sync

“El cambio quedó guardado. La planilla todavía no se ha actualizado y el sistema volverá a intentarlo.”

## Acciones destructivas

Mostrar entidad e impacto; evitar confirmaciones genéricas sin contexto.
