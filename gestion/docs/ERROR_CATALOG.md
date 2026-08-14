# ERROR_CATALOG.md

Catálogo inicial de errores de dominio/API. Los códigos definitivos deben coincidir con implementación real.

| Código | Uso |
|---|---|
| `AUTH_REQUIRED` | sesión faltante |
| `FORBIDDEN` | rol/permiso insuficiente |
| `NOT_FOUND` | entidad no visible/inexistente |
| `VALIDATION_ERROR` | payload inválido |
| `CONFLICT` | concurrencia/estado incompatible |
| `CAPACITY_EXCEEDED` | mesa sin cupos |
| `GUEST_NOT_ATTENDING` | seating no elegible |
| `GUEST_NOT_RECONCILED` | falta ficha canónica |
| `DUPLICATE_ASSIGNMENT` | persona ya asignada |
| `PREVIEW_WRITE_BLOCKED` | mutación bloqueada por entorno |
| `EXTERNAL_SYNC_BLOCKED` | sync bloqueado por entorno |
| `SYNC_RETRYABLE` | dependencia temporal |
| `DEPENDENCY_UNAVAILABLE` | dependencia no disponible |
| `RATE_LIMITED` | límite de frecuencia |
| `INTERNAL_ERROR` | fallo saneado |

## Regla

La UI puede traducir mensajes, pero no debe depender de parsear texto arbitrario para saber qué ocurrió.
