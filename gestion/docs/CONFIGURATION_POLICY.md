# CONFIGURATION_POLICY.md

## Tipos

### Secretos

Variables de entorno/secret manager; nunca Git.

### Configuración por entorno

- URLs;
- IDs de proyecto/Sheet;
- flags de integración;
- provider settings.

### Configuración de negocio

Preferir entidad/config canónica auditable cuando deba cambiar sin deploy:

- timezone;
- fecha del evento;
- venue;
- límites operativos;
- estados del evento.

## Regla

No hardcodear en múltiples componentes un mismo dato de negocio. Centralizar y documentar la fuente.

## Validación

La aplicación debe fallar de forma explícita ante configuración requerida faltante y nunca imprimir el secreto faltante/valor completo.
