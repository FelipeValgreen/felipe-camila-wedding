# ADR-0003 — IA grounded y confirmación humana para mutaciones

**Estado:** Accepted  
**Fecha:** 14 de agosto de 2026

## Contexto

El Copiloto puede reducir carga mental, pero opera dominios sensibles: invitados, seating, presupuesto, cronograma, música y documentos. Permitir escrituras autónomas basadas en texto libre introduciría riesgo de alucinación, permisos incorrectos y cambios difíciles de auditar.

## Decisión

El Copiloto sigue el flujo:

```text
consulta
→ snapshot autorizado
→ respuesta grounded
→ acción estructurada propuesta
→ confirmación humana
→ API/RPC
→ validación de permisos y dominio
→ escritura
→ audit_log
```

La IA no recibe un bypass privilegiado y no ejecuta directamente instrucciones textuales.

## Guardrails

- no inventar parentescos;
- no convertir `probable` en hecho;
- no inventar costos, canciones, horarios o proveedores;
- diferenciar hecho/inferencia/recomendación;
- declarar ausencia de información;
- validar toda mutación en servidor;
- mantener fallback determinista para consultas críticas cuando el LLM no esté disponible.

## Consecuencias

La experiencia puede ser más lenta que un agente autónomo, pero es más segura, explicable y apropiada para operaciones reales del evento.
