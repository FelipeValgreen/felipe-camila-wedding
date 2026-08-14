# ADR-0001 — Supabase canónico, Google Sheets como espejo

**Estado:** Accepted  
**Fecha:** 14 de agosto de 2026

## Contexto

El matrimonio comenzó con información operativa distribuida entre formulario RSVP, Supabase y Google Sheets. Mantener dos fuentes editables de verdad crea conflictos, duplicados y ambigüedad sobre qué dato prevalece.

## Decisión

Supabase PostgreSQL es la fuente canónica para datos estructurados del Centro de Gestión.

Google Sheets se mantiene como:

- espejo operativo;
- exportación humana;
- apoyo de contingencia;
- integración para equipos que requieren planilla.

No se implementará sincronización bidireccional libre.

Flujo preferido:

```text
mutación autorizada
→ Supabase
→ audit_log
→ sync_outbox
→ worker idempotente
→ Google Sheets
```

## Consecuencias

### Positivas

- reglas y constraints en un lugar;
- auditoría consistente;
- menor riesgo de overwrite;
- retries controlables;
- producto reutilizable.

### Negativas

- cambios manuales en Sheets no son automáticamente canónicos;
- reconstrucción del espejo requiere procedimientos;
- usuarios de planilla deben entender que es una vista derivada.

## Reglas derivadas

1. fallo de Sheets no invalida escritura canónica;
2. no marcar outbox procesado antes de verificar la escritura externa;
3. Preview no sincroniza con Sheet productiva;
4. cualquier importación desde Sheet es un flujo explícito y validado, no sincronización implícita.
