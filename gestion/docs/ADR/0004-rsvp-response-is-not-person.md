# ADR-0004 — Una respuesta RSVP no equivale necesariamente a una persona

**Estado:** Accepted  
**Fecha:** 14 de agosto de 2026

## Contexto

El formulario RSVP puede recibir una persona, una pareja o varias personas en una sola respuesta. Modelar cada respuesta como un único invitado produce errores de conteo, seating, restricciones y conciliación.

## Decisión

Separar evidencia de respuesta y personas operativas:

```text
rsvp_responses
→ rsvp_response_members
→ wedding_guests
```

- `rsvp_responses` conserva la evidencia original;
- `rsvp_response_members` representa integrantes detectados/declarados;
- `wedding_guests` representa personas individuales canónicas.

No existe acompañante implícito.

## Conciliación

Automática sólo ante coincidencia exacta y única según reglas de dominio. Casos ambiguos requieren revisión humana.

## Consecuencias

- conteos por persona son confiables;
- respuestas conjuntas se conservan;
- seating y restricciones operan sobre individuos;
- la UI debe diferenciar respuesta y persona;
- integraciones y reportes no deben contar filas RSVP como personas sin transformación explícita.
