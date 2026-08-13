# MEMORY.md — Memoria durable del Centro de Gestión

**Versión:** 2.0  
**Fecha:** 13 de agosto de 2026

## 1. Proyecto

- Caso real: Felipe & Camila
- Fecha del evento: 23 de octubre de 2026
- Zona horaria: `America/Santiago`
- Repo: `FelipeValgreen/felipe-camila-wedding`
- App de gestión: `gestion/`
- Producción: `https://gestion.felipeycami.cl/dashboard`

El repositorio es público. Nunca guardar aquí PII de invitados, teléfonos, alergias, relaciones nominales, secretos o datos financieros privados.

## 2. Objetivo permanente

Convertir el Centro de Gestión en un Wedding Planning OS reutilizable sin reconstruir desde cero.

Prioridad actual:

```text
primero excelente para Felipe & Camila
→ después reusable para un segundo matrimonio
→ recién después SaaS comercial completo
```

## 3. Arquitectura de datos

```text
Supabase = fuente canónica estructurada
Google Sheets = espejo / fuente transitoria donde corresponda
```

La UI debe distinguir cuando mezcla un consolidado de Sheets con un delta live de Supabase.

## 4. Reglas de dominio no negociables

- respuesta RSVP ≠ una persona necesariamente;
- conservar evidencia original en `rsvp_responses`;
- personas individuales en `rsvp_response_members` / `wedding_guests`;
- no existe +1 implícito;
- no fuzzy matching automático;
- asistencia y reconfirmación son estados distintos;
- sólo `attending` puede sentarse;
- capacidad de mesa es dura;
- restricciones alimentarias son sensibles;
- relaciones conocidas pueden ser reglas fuertes;
- relaciones `probable` nunca se convierten en parentesco confirmado por inferencia;
- IA propone antes de aplicar;
- cambios sensibles requieren confirmación explícita.

## 5. Entidades canónicas relevantes

Además de la base histórica, la V2 incorpora:

```text
event_tasks
guest_relationship_groups
guest_relationship_members
wedding_guests.family_branch
event_venue_layouts
event_budget_items
event_budget_payments
event_timeline_items
event_music_items
event_documents
```

Los datos privados usados para poblar relaciones o ramas familiares viven sólo en la base privada, no en migraciones públicas.

## 6. Invitados → Relaciones → Mesas → Salón

Éste es un solo flujo conectado:

```text
confirmado conocido
→ ficha individual
→ relación / rama explícita
→ propuesta de mesa
→ asignación real
→ ubicación física en salón
```

Un confirmado sin ficha puede entrar a Seating Intelligence como registro virtual de planificación, pero no puede persistirse en `seating_assignments` hasta conciliar su ficha.

## 7. Relaciones

Fuente canónica:

- `guest_relationship_groups`
- `guest_relationship_members`

Estados:

```text
confirmed = relación conocida / regla fuerte
probable  = vínculo por validar / preferencia blanda
```

`wedding_guests.family_branch` permite afinidad explícita como “rama mamá/papá” sin inventar parentescos.

## 8. Mesas y Seating Intelligence

La V2 dispone de:

- CRUD de mesas;
- banco de invitados;
- drag & drop + selector alternativo;
- asignar/quitar personas;
- capacidad dura;
- detección de grupos conocidos separados;
- Preview persistente local;
- escenarios IA: Cohesión, Equilibrada y Mezcla social;
- score explicable;
- mesas virtuales propuestas si falta capacidad;
- borrador de propuesta conectado con Salón.

La propuesta IA no debe escribir masivamente asignaciones reales durante su generación.

## 9. Salón

Separar siempre:

```text
referencia oficial / aspiracional
```

de:

```text
layout operativo editable
```

`event_venue_layouts` persiste el layout canónico. El editor soporta posición, tamaño, rotación, bloqueo, duplicación, eliminación y versiones. Preview guarda un borrador local, no producción.

## 10. Copiloto operacional

Identidad propia; no copiar nombres/personajes del benchmark.

Principio:

```text
consulta
explica
sugiere
prepara acciones
pide confirmación
recién después escribe si el entorno y rol lo permiten
```

Capacidades actuales:

- preguntas grounded sobre confirmados, mesas, presupuesto, cronograma, música, documentos, incidencias y tareas;
- fallback deterministic/grounded si el proveedor LLM externo falla;
- preparar acciones para Música;
- preparar bloques de Cronograma;
- preparar Tareas.

Nunca afirmar que un cambio se ejecutó antes de que el API confirme la escritura.

## 11. Preview y producción

Regla permanente:

```text
Preview / Development no escriben en producción.
```

`environment-guard.ts` bloquea:

- escrituras DB fuera de producción salvo opt-in explícito;
- sync externo fuera de producción salvo opt-in explícito.

Los módulos interactivos nuevos usan borradores persistentes locales en Preview.

Esto no reemplaza un staging full-stack. Un staging real sigue siendo requisito antes de probar mutaciones masivas fuera de producción.

## 12. Diseño V2

Dirección implementada:

- editorial;
- elegante;
- calmada;
- crema/oliva/cobre como sistema propio;
- jerarquía serif + UI sans;
- navegación por Control / Personas y espacio / Operación.

El benchmark externo sigue siendo referencia funcional, no especificación literal ni identidad.

## 13. Módulos V2

- Inicio
- Necesita atención
- Planificación
- Estado del sistema
- Invitados
- Mesas
- Salón
- Cronograma
- Música
- Presupuesto y proveedores
- Documentos
- Actividad
- Copiloto operacional transversal

## 14. Operación autogestionable

La pareja/planner debe poder administrar el caso sin entrar a Supabase para tareas normales:

- editar fichas;
- definir rama/afinidad;
- mantener relaciones;
- crear/editar mesas;
- distribuir personas;
- gestionar tareas;
- mantener cronograma;
- mantener música;
- presupuesto/proveedores/pagos;
- documentos;
- layout del salón.

## 15. Seguridad y privacidad

No modificar desde `gestion/**` sin un alcance separado:

- sitio público;
- RSVP público;
- galería;
- fotos.

No incluir en Git:

- secretos;
- teléfonos/correos de invitados;
- alergias o restricciones nominales;
- parentescos nominales;
- seed privado de relaciones;
- extractos financieros privados.

## 16. Validación

Comandos esperados:

```bash
npm run lint
npm run typecheck
npm run build
npm run check:ci
```

Vercel Preview debe quedar `READY` antes de merge.

## 17. Pendientes reales

Para cerrar el caso real:

- conciliar confirmados todavía sin ficha;
- completar ramas familiares/sociales desconocidas;
- ajustar escenario final de seating;
- aplicar asignaciones finales sólo con fichas conciliadas;
- terminar canciones/cues/horarios/responsables;
- ajustar layout con decisiones reales del recinto.

Para producto comercial:

- staging aislado;
- suite E2E;
- multi-wedding;
- permisos por boda/proveedor;
- portal de proveedores;
- onboarding segundo matrimonio;
- billing posterior.

## 18. Regla de actualización

Guardar aquí sólo decisiones duraderas y arquitectura.

No guardar estados temporales ni conteos que puedan cambiar con un RSVP.
