# INCIDENT_RESPONSE.md

## Severidad

### SEV-0

- exposición activa de secretos/PII;
- corrupción masiva;
- acceso no autorizado significativo;
- sistema inutilizable durante operación crítica del evento.

### SEV-1

- módulo P0 roto;
- sync incorrecto;
- seating inconsistente;
- login degradado para usuarios autorizados.

### SEV-2

- bug con workaround;
- degradación no crítica;
- integración auxiliar caída.

## Flujo

```text
detectar
→ contener
→ preservar evidencia
→ evaluar datos
→ mitigar
→ recuperar
→ verificar
→ postmortem
```

## Durante incidente

- no borrar logs/evidencia;
- no rotar indiscriminadamente credenciales no afectadas;
- no restaurar tablas completas sin delta;
- no comunicar éxito hasta verificar estado canónico.

## Postmortem

Registrar:

- impacto;
- línea de tiempo;
- causa raíz;
- factores contribuyentes;
- detección;
- mitigación;
- prevención;
- test/check añadido.

No incluir secretos ni PII innecesaria en un repo público.
