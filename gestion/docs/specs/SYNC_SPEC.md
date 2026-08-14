# SYNC_SPEC.md — Supabase → Google Sheets

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026

## 1. Objetivo

Mantener Google Sheets como espejo operativo confiable sin convertirlo en segunda fuente de verdad ni acoplar las escrituras canónicas a la disponibilidad de Google.

## 2. Arquitectura

```text
mutación canónica
→ Supabase commit
→ sync_outbox
→ claim de lote
→ transformación
→ Google Sheets
→ verificación
→ processed
```

## 3. Propiedades obligatorias

- idempotencia;
- reintentos;
- backoff;
- claim transaccional;
- no procesar dos veces el mismo item simultáneamente;
- no marcar `processed` antes de verificar;
- error externo no revierte el dato canónico;
- payload/logs minimizan PII;
- Preview no escribe Sheet productiva.

## 4. Estados conceptuales

El esquema real puede variar, pero la cola debe representar al menos:

- pending;
- processing/claimed;
- processed;
- retryable failure;
- dead/failed después de política de reintentos.

Nunca dejar un item indefinidamente `processing` sin mecanismo de lease/recuperación.

## 5. Identidad de fila

Cada entidad sincronizada debe tener un ID canónico estable en Sheets para permitir upsert.

No usar exclusivamente número de fila como identidad porque las filas pueden moverse.

## 6. Transformación

- normalizar timestamps a presentación acordada;
- no degradar enums sin mapa explícito;
- preservar IDs;
- sanitizar fórmulas cuando se exporte texto no confiable;
- no escribir secretos;
- limitar campos sensibles a pestañas/usuarios que realmente los necesitan.

## 7. Idempotencia

Reprocesar el mismo outbox item debe producir el mismo estado externo final, no una fila duplicada.

Preferencia:

```text
entity_type + entity_id
→ localizar fila por ID canónico
→ update
```

Creaciones pueden hacer append sólo cuando se confirma que el ID no existe.

## 8. Reintentos

Errores retryable típicos:

- 429;
- 5xx;
- timeout;
- fallo de red.

Errores no retryable o de configuración requieren intervención:

- Sheet inexistente;
- permisos revocados;
- pestaña/headers incompatibles;
- credencial inválida;
- schema mapping roto.

## 9. Backoff

Usar backoff creciente con límite. Registrar `attempt_count`, próximo intento y último error saneado.

No crear loops rápidos que saturen Google.

## 10. Cron y manual

### Cron

Procesa lotes según frecuencia configurada.

Debe autenticarse con secreto dedicado y usar `no-store`.

### Manual

Sólo usuario autorizado/operador. Debe ejecutar el mismo worker/contrato, no una lógica paralela.

## 11. Conflictos

Como Sheets es espejo, un cambio manual externo que contradiga Supabase no debe sobrescribir automáticamente el canónico.

Si se detecta conflicto:

- registrar `sync_conflicts` o incidencia equivalente;
- conservar ambos valores si es necesario para revisión;
- resolver explícitamente.

## 12. Reconstrucción

Si el espejo se corrompe:

1. backup de Sheet;
2. snapshot consistente de Supabase;
3. pausa/control de cola;
4. reconstrucción por entidad/ID;
5. validación de conteos;
6. reanudación de outbox posterior al corte;
7. verificación de duplicados.

## 13. Observabilidad

Exponer internamente:

- pending count;
- failed count;
- oldest pending age;
- last success;
- last run;
- error codes;
- attempts.

No mostrar payloads completos con PII en dashboard de salud.

## 14. Pruebas P0

- create;
- update;
- retry 429;
- retry 500;
- timeout;
- duplicado de outbox;
- fila ya existente;
- Sheet sin permisos;
- headers cambiados;
- item stuck/lease vencido;
- Preview guard;
- reconstrucción de baseline con datos ficticios.

## 15. Regla de dominio

```text
Supabase correcto + Sheets temporalmente incorrecta
→ reparar Sheets

Sheets correcta + Supabase incorrecta
→ diagnosticar/restaurar Supabase

Nunca decidir canonicidad por cuál “se ve mejor”.
```
