# COPILOT_SPEC.md

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026

## 1. Objetivo

El Copiloto operacional reduce carga mental consultando fuentes autorizadas, explicando el estado del evento y preparando acciones estructuradas que el usuario puede confirmar.

No es un agente autónomo con permisos ilimitados.

## 2. Principio

```text
Datos primero.
Modelo después.
Validación siempre.
```

## 3. Flujo de lectura

```text
pregunta
→ identificar intención
→ consultar snapshot autorizado
→ construir contexto mínimo
→ respuesta grounded
→ declarar incertidumbre/ausencia
```

El modelo no debe responder hechos operativos actuales sólo desde memoria del prompt si existe una fuente conectada disponible.

## 4. Fuentes

Según permiso:

- invitados/RSVP;
- incidencias;
- relaciones;
- mesas/seating;
- layout;
- tareas;
- presupuesto/pagos;
- proveedores;
- cronograma;
- música;
- documentos;
- actividad/auditoría;
- memoria durable.

## 5. Tipos de afirmación

### Hecho

Presente explícitamente en snapshot.

### Inferencia

Derivación razonable, marcada como tal.

### Recomendación

Consejo o siguiente acción, no un dato existente.

Nunca presentar inferencia/recomendación como hecho.

## 6. Acciones

Una acción debe representarse como estructura allowlisted:

```json
{
  "type": "create_event_task",
  "summary": "Crear tarea para confirmar llegada del fotógrafo",
  "payload": {},
  "requires_confirmation": true
}
```

Tipos soportados deben registrarse en código, no aceptarse arbitrariamente desde texto del modelo.

## 7. Confirmación

Antes de una mutación sensible mostrar:

- qué cambiará;
- entidad;
- valores relevantes;
- impacto;
- advertencias.

Después de confirmar:

```text
cliente
→ API action
→ auth/RBAC
→ schema validation
→ domain validation
→ write
→ audit
→ result
```

El Copiloto sólo comunica éxito después de respuesta exitosa del API.

## 8. Acciones prohibidas sin confirmación

- modificar asistencia;
- mover personas;
- aplicar seating;
- cambiar presupuesto/pagos;
- borrar/archivar;
- compartir datos;
- cambiar roles;
- enviar mensajes;
- desplegar;
- aplicar layout final.

## 9. Guardrails de contenido

No inventar:

- parentescos;
- relaciones románticas;
- costos;
- pagos;
- proveedores;
- horarios;
- canciones;
- restricciones;
- documentos.

`probable` debe conservar etiqueta de probabilidad.

## 10. Fallback

Sin LLM externo, consultas críticas deben seguir disponibles mediante respuestas deterministas construidas desde snapshot:

- confirmados;
- personas sin ficha;
- mesas/capacidad;
- incidencias;
- pagos/tareas próximas;
- cronograma próximo;
- salud del sistema.

La disponibilidad del Wedding OS no depende del proveedor LLM.

## 11. Delta operacional

“¿Qué cambió desde mi última revisión?” usa un corte persistido por usuario/entorno autorizado.

Debe mostrar:

- nuevas altas;
- bajas/cambios de asistencia;
- cambios de mesa relevantes;
- nuevas incidencias;
- cambios operativos relevantes;
- fecha/hora del corte.

No marcar revisión como completada antes de que el usuario realmente reciba/acepte el snapshot según UX definida.

## 12. Memoria durable

Tipos conceptuales:

- fact;
- decision;
- preference;
- relationship;
- constraint;
- rejected_option;
- learning.

Cada item debe tener:

- fuente;
- confianza;
- estado;
- timestamps;
- scope del matrimonio.

No confundir memoria durable de producto con historial completo de conversación del LLM.

## 13. Privacidad

- enviar al proveedor sólo campos necesarios;
- no enviar secretos;
- minimizar PII;
- evitar logs de prompts completos;
- respetar RBAC;
- revisar configuración de retención del proveedor.

## 14. Observabilidad

Registrar sin PII innecesaria:

- intent;
- fuente consultada;
- provider/fallback;
- tool propuesta;
- confirmación/rechazo;
- error code;
- latencia.

## 15. Pruebas P0

- pregunta con dato existente;
- dato ausente;
- relación `probable`;
- viewer intenta mutar;
- owner propone acción;
- confirmación cancelada;
- payload inválido;
- conflicto de dominio;
- proveedor LLM caído;
- acción API falla;
- respuesta nunca afirma éxito prematuro;
- prompt injection dentro de un documento/dato no altera permisos.

## 16. No objetivos

- autonomía sin supervisión;
- ejecutar código arbitrario;
- acceso directo del modelo a service role;
- usar el LLM como validador de integridad;
- reemplazar al planner/pareja en decisiones sensibles.
