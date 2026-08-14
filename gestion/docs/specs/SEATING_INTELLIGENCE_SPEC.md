# SEATING_INTELLIGENCE_SPEC.md

**Versión:** 1.0  
**Fecha:** 14 de agosto de 2026

## 1. Objetivo

Generar propuestas de distribución de invitados que respeten reglas duras y optimicen preferencias blandas, sin modificar asignaciones reales durante la generación.

## 2. Entradas

### Invitados elegibles

- ficha individual o registro virtual de planificación claramente marcado;
- `attendance_status`;
- categoría/grupo;
- `family_branch`;
- relaciones canónicas;
- restricciones de seating explícitas;
- accesibilidad/reservas cuando existan.

Un confirmado virtual sin `guest_id` puede aparecer en propuesta, pero no persistirse en `seating_assignments`.

### Mesas

- ID;
- número interno;
- nombre visible;
- capacidad;
- zona/tipo;
- bloqueo;
- ocupación persistida;
- metadata relevante.

### Relaciones

- `confirmed` = regla fuerte cuando el grupo está marcado como inseparable/operativamente fuerte;
- `probable` = preferencia blanda;
- incompatibilidades explícitas = restricción dura.

## 3. Escenarios

### Cohesión

Maximiza permanencia de grupos/ramas relacionadas.

### Equilibrada

Balancea cohesión, mezcla y utilización de capacidad.

### Mezcla social

Permite mayor diversidad entre grupos respetando restricciones duras.

## 4. Restricciones duras

Una propuesta inválida si viola:

- asistencia elegible;
- una persona en más de una mesa;
- capacidad;
- incompatibilidad explícita;
- mesa bloqueada;
- reserva obligatoria;
- accesibilidad explícita;
- relación inseparable confirmada cuando esté definida como hard rule.

## 5. Preferencias blandas

Pueden influir score:

- `family_branch`;
- relaciones `probable`;
- cohesión por grupo;
- balance de ocupación;
- distribución social;
- proximidad/zonas si el layout lo soporta.

Nunca presentar una preferencia inferida como hecho.

## 6. Score

Cada escenario debe retornar:

- score total;
- sub-scores;
- razones principales;
- advertencias;
- capacidad usada;
- cupos libres;
- déficit;
- mesas virtuales propuestas cuando falten cupos.

No usar un número sin explicación.

## 7. Generación

Flujo:

```text
snapshot
→ validar inputs
→ fijar restricciones duras
→ generar escenarios
→ validar cada escenario
→ calcular score
→ explicar
→ devolver propuesta
```

No escribir en tablas reales durante este flujo.

## 8. Aplicación

Flujo separado:

```text
proposal_id / payload aprobado
→ confirmación humana
→ re-fetch estado actual
→ detectar conflicto/concurrencia
→ validar permisos
→ validar capacidad/reglas
→ transacción
→ seating_assignments
→ guest.table_id si aplica
→ audit_log
→ sync_outbox
```

Si el estado cambió desde la propuesta, abortar o pedir nueva revisión; no aplicar una propuesta obsoleta silenciosamente.

## 9. Rollback

Guardar suficiente información en auditoría/aplicación para poder reconstruir asignaciones anteriores de una aplicación masiva.

## 10. UX

Debe mostrar claramente:

- `Propuesta` vs `Distribución actual`;
- grupos conocidos;
- relaciones por validar;
- mesas adicionales virtuales;
- conflictos;
- razones de score;
- botón de aplicar separado de generar.

Drag & drop es complementario, no único mecanismo.

## 11. Casos de prueba P0

1. todos caben exactamente;
2. faltan 10 cupos;
3. grupo confirmado excede capacidad de una mesa;
4. invitado `not_attending`;
5. confirmado sin ficha;
6. incompatibilidad explícita;
7. mesa bloqueada;
8. dos relaciones probables conflictivas;
9. cambio concurrente antes de aplicar;
10. rollback de propuesta aplicada.

## 12. No objetivos

- inferir parentescos automáticamente;
- optimización social basada en datos personales no recolectados;
- aplicar sin confirmación;
- resolver seating con una llamada LLM sin validador determinista.
