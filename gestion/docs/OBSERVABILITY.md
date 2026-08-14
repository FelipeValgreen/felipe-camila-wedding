# OBSERVABILITY.md — Observabilidad y salud operacional

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026

## 1. Objetivo

Definir qué señales debe observar el Centro de Gestión para detectar degradaciones antes de que se conviertan en problemas operativos del matrimonio.

La observabilidad debe permitir responder:

1. ¿Está disponible la aplicación?
2. ¿Pueden autenticarse los usuarios autorizados?
3. ¿Las fuentes canónicas responden?
4. ¿Las mutaciones están fallando?
5. ¿La sincronización está atrasada?
6. ¿Existen inconsistencias de dominio?
7. ¿Se produjo una regresión tras un deploy?
8. ¿Qué cambió y quién lo hizo?

## 2. Capas

### Disponibilidad

- Vercel deployment;
- dominio;
- rutas principales;
- latencia básica.

### Aplicación

- errores 5xx;
- errores no controlados;
- errores de Client Components;
- timeouts;
- fallos de dependencias externas.

### Datos

- Supabase disponible;
- consultas críticas;
- integridad de relaciones;
- capacidad de mesas;
- conciliación;
- registros huérfanos.

### Integraciones

- `sync_outbox` pendiente/fallida;
- Google Sheets;
- cron;
- proveedor LLM cuando esté habilitado.

### Negocio

- incidencias abiertas;
- confirmados sin ficha;
- asignados no elegibles;
- mesas sobre capacidad;
- pagos vencidos;
- tareas vencidas.

## 3. Health endpoint

`/api/system-health` es la superficie de diagnóstico del Centro de Gestión y debe mantener una respuesta estable y saneada.

Debe poder representar estados como:

```text
ok
warning
degraded
error
```

No debe exponer:

- secretos;
- tokens;
- teléfonos;
- nombres completos innecesarios;
- payloads privados;
- SQL;
- stack traces crudos en producción.

## 4. Señales mínimas

### App

- HTTP status;
- tiempo de respuesta;
- deployment/commit cuando sea seguro exponerlo internamente;
- entorno.

### Supabase

- conexión/consulta crítica;
- disponibilidad de entidades requeridas;
- errores de autorización;
- fallos RPC.

### RSVP / invitados

- RSVP sin integrantes cuando deberían tenerlos;
- personas confirmadas sin ficha;
- conciliaciones ambiguas;
- fichas duplicadas potenciales detectadas por reglas explícitas.

### Mesas

- sobrecapacidad;
- asignaciones duplicadas;
- asignado no `attending`;
- mesa inexistente;
- diferencia entre asignación y referencia de ficha cuando exista.

### Sync

- pendientes;
- fallidos;
- edad del elemento pendiente más antiguo;
- intentos;
- última ejecución exitosa;
- último error saneado.

### Operación

- tareas vencidas;
- pagos vencidos;
- documentos críticos faltantes cuando exista una regla explícita;
- eventos de cronograma incompletos críticos.

## 5. Logging

Usar logs estructurados cuando sea posible.

Campos recomendados:

```text
level
request_id
route
method
status
duration_ms
operation
entity_type
entity_id (cuando sea necesario)
error_code
environment
deployment_id
```

No registrar por defecto PII o payloads completos.

## 6. Correlation ID

Toda operación compleja debería poder correlacionarse entre:

```text
request
→ API
→ Supabase/RPC
→ audit_log
→ sync_outbox
→ worker
→ Google Sheets
```

No es obligatorio que todas las capas usen hoy el mismo campo, pero la dirección arquitectónica debe permitir rastrear un incidente sin depender de nombres o teléfonos.

## 7. Audit log vs logs

### `audit_log`

Explica cambios de negocio:

- actor;
- acción;
- entidad;
- antes/después;
- origen;
- fecha.

### Logs técnicos

Explican ejecución:

- request;
- error;
- duración;
- dependencia;
- retry.

No sustituir uno con el otro.

## 8. Alertas P0 recomendadas

### Críticas

- dashboard inaccesible;
- login general roto;
- Supabase no disponible;
- error de autorización que expone acceso indebido;
- sync escribiendo datos incorrectos;
- corrupción/duplicación masiva;
- secreto expuesto.

### Altas

- outbox con errores repetidos;
- confirmaciones nuevas que no aparecen en el pipeline esperado;
- mesas sobre capacidad;
- alta tasa de 5xx;
- cron sin ejecución esperada;
- dependencia crítica degradada.

### Operativas

- pagos/tareas vencidos;
- confirmados sin ficha;
- relaciones por validar;
- documentos o cues pendientes.

## 9. Frecuencia

Para el caso actual:

- health automático en cada interacción/página de sistema;
- cron de sync según configuración vigente;
- revisión manual diaria durante planificación activa;
- revisión más frecuente durante la última semana;
- monitoreo operativo durante el día del evento.

No crear polling agresivo sin necesidad.

## 10. Dashboard Estado del sistema

`/dashboard/system` debe ser comprensible para una persona no técnica.

Cada check debe incluir:

- nombre humano;
- estado;
- explicación;
- impacto;
- acción recomendada cuando aplique;
- timestamp de la observación.

Evitar mostrar simplemente mensajes de excepción internos.

## 11. Deploy monitoring

Después de cada release:

- deployment `READY`;
- HTTP de login/dashboard;
- health endpoint;
- errores runtime recientes;
- mutación controlada si el release lo requiere;
- outbox/sync;
- regresiones de permisos.

## 12. Copiloto

Medir por separado:

- disponibilidad de proveedor LLM;
- fallback utilizado;
- tool/action propuesta;
- action confirmada;
- action rechazada;
- error de tool;
- latencia.

No almacenar el prompt privado completo sólo para métricas.

## 13. Retención de logs

Definir la retención según proveedor y necesidad operativa. Minimizar logs con datos confidenciales y revisar que los proveedores externos no retengan payloads sensibles más de lo necesario.

## 14. Runbook de incidente técnico

```text
alerta
→ confirmar alcance
→ identificar deployment/request/entidad
→ bloquear superficie si hay riesgo
→ preservar evidencia
→ diagnosticar capa
→ mitigar
→ verificar datos
→ smoke
→ documentar causa raíz
→ crear test/check preventivo
```

## 15. Criterio de cierre

Antes del evento debe ser posible detectar desde la aplicación o herramientas operativas:

- si Supabase está sano;
- si Sheets está sincronizando;
- si existen inconsistencias de invitados/mesas;
- si Preview está protegido;
- si el sistema tuvo errores recientes relevantes.
