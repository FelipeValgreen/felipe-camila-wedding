# CONTEXT.md — Contexto Maestro del Centro de Gestión

**Versión:** 3.0  
**Fecha:** 13 de agosto de 2026  
**Ámbito:** `gestion/**` + migraciones de soporte en `supabase/migrations/**`

## 1. Identidad y alcance

El repositorio `FelipeValgreen/felipe-camila-wedding` contiene experiencia pública y Centro de Gestión. Este contexto aplica al Centro de Gestión.

- Caso real: Felipe y Camila
- Fecha: 23 de octubre de 2026
- Timezone: `America/Santiago`
- Producción: `https://gestion.felipeycami.cl/dashboard`
- App: `gestion/`
- Proyecto Vercel: `gestion`
- Supabase canónico: proyecto de gestión vigente
- Google Sheets operacional: `F&C Centro Comandos`

Producción contiene datos personales reales. El repositorio es público: **no almacenar PII ni secretos en Git**.

## 2. Propósito

Construir un Wedding Planning OS que permita a pareja/planner operar el matrimonio completo sin depender de herramientas técnicas para el día a día, preservando la lógica ya probada de RSVP, conciliación, auditoría y sync.

No reconstruir desde cero.

## 3. Principios de producto

```text
Todo está conectado.
Supabase es la verdad estructurada.
Sheets es espejo o transición.
IA propone y explica.
El humano confirma cambios sensibles.
```

La solución debe ser excelente primero para el caso Felipe/Camila y quedar preparada para un segundo matrimonio sin premature SaaS complexity.

## 4. Benchmark externo

Las capturas y el video compartido son referencia de patrones funcionales, no identidad ni especificación literal.

Referencia de video: `https://www.youtube.com/watch?v=CoHKehTBP-Y`

No afirmar que su contenido fue verificado si no se pudo recuperar/transcribir.

Aprendizajes reutilizables:

- módulos claros;
- invitados/mesas/salón conectados;
- proveedores;
- presets y referencias;
- ayuda contextual;
- import/export;
- lenguaje operativo simple.

La identidad visual, navegación, microcopy, asistente y decisiones UX deben ser propias.

## 5. Stack

- Next.js 14
- React 18
- TypeScript 5
- Tailwind/PostCSS + CSS modular/específico por módulo
- Supabase Auth/PostgreSQL/RLS/RPC
- Vercel + Cron
- Google Sheets API
- GitHub

Validación disponible:

```text
npm run lint
npm run typecheck
npm run build
npm run check:ci
```

## 6. Arquitectura

```text
Usuario autenticado
→ Next.js /dashboard
→ APIs server-side / Supabase client con RLS
→ PostgreSQL canónico
→ audit_log
→ sync_outbox
→ Google Sheets espejo cuando aplica
```

Preview/Development usan guards para impedir escrituras sobre producción y borradores locales persistentes para probar UX de mutación.

## 7. Modelo de RSVP/personas

- `rsvp_responses`: evidencia original de la respuesta;
- `rsvp_response_members`: personas declaradas/detectadas dentro de una respuesta;
- `wedding_guests`: ficha individual canónica;
- `management_issues`: diferencias y casos que requieren revisión.

Reglas:

- una respuesta no equivale necesariamente a una persona;
- no +1 implícito;
- no fuzzy matching automático;
- exact match único puede automatizarse;
- ambigüedad requiere revisión;
- asistencia y reconfirmación son independientes;
- restricciones alimentarias son sensibles.

## 8. Relaciones y ramas

Entidades V2:

- `guest_relationship_groups`;
- `guest_relationship_members`;
- `wedding_guests.family_branch`.

Semántica:

```text
confidence=confirmed
→ vínculo conocido
→ puede ser regla fuerte de seating

confidence=probable
→ vínculo por validar
→ sólo preferencia blanda

family_branch
→ afinidad explícita de organización
→ no implica parentesco exacto
```

Datos nominales de relaciones viven en la base privada. Las migraciones públicas contienen sólo esquema.

## 9. Mesas

Entidades:

- `wedding_tables`;
- `seating_assignments`;
- `wedding_guests.table_id`.

Reglas duras:

- sólo `attending`;
- capacidad máxima;
- estado consistente entre asignación y ficha mediante RPC/transacción;
- grupos conocidos no deben separarse silenciosamente.

La UX V2 permite CRUD de mesas, drag & drop, selector alternativo, asignación/quitar, edición y Preview persistente.

## 10. Seating Intelligence

El motor puede planificar usando:

- fichas operativas;
- confirmados conocidos todavía sin ficha, como registros virtuales;
- relaciones canónicas;
- `family_branch` explícito;
- afinidades generales;
- capacidad real y capacidad propuesta.

Escenarios:

1. Cohesión familiar;
2. Equilibrada;
3. Mezcla social.

Cada propuesta debe ser explicable, reversible y separada de las asignaciones reales hasta aprobación y conciliación.

## 11. Salón

Entidad V2: `event_venue_layouts`.

Separar siempre:

- plano/referencia oficial;
- layout operativo editable;
- propuesta temporal de seating.

El editor soporta mover, redimensionar, rotar, bloquear, duplicar y eliminar elementos, además de versión canónica en producción y borrador local en Preview.

## 12. Operación

Entidades canónicas V2:

- `event_budget_items`;
- `event_budget_payments`;
- `event_timeline_items`;
- `event_music_items`;
- `event_documents`;
- `event_tasks`.

La pareja/planner puede mantener desde UI:

- presupuesto;
- proveedores;
- pagos;
- cronograma;
- canciones/cues;
- documentos;
- tareas manuales.

## 13. Copiloto operacional

El Copiloto consulta fuentes conectadas antes de responder.

Reglas:

- sólo hechos presentes en snapshot;
- declarar ausencia/incertidumbre;
- no inventar parentescos, canciones, costos, horarios ni documentos;
- diferenciar hecho, inferencia y recomendación;
- acciones con confirmación explícita;
- fallback grounded si el LLM externo no está disponible.

Acciones actuales:

- crear momento/canción de Música;
- crear bloque de Cronograma;
- crear Tarea.

En Preview estas acciones generan borradores locales. En producción usan APIs canónicos con permisos/auditoría.

## 14. Navegación V2

### Control

- Inicio
- Necesita atención
- Planificación
- Estado del sistema

### Personas y espacio

- Invitados
- Mesas
- Salón

### Operación

- Cronograma
- Música
- Presupuesto y proveedores
- Documentos
- Actividad

Copiloto es transversal.

## 15. Entornos y seguridad

### Production

Datos reales y escrituras habilitadas según rol.

### Preview / Development

- lectura para validar la experiencia;
- DB writes bloqueadas por `environment-guard.ts`;
- Google Sheets sync bloqueado;
- mutaciones UX nuevas se guardan localmente cuando corresponde.

Regla permanente:

```text
Preview nunca escribe en producción.
```

Un staging Supabase/Sheets aislado sigue siendo una mejora futura y es requisito antes de pruebas de mutaciones masivas fuera de producción.

## 16. Estado del sistema

`/dashboard/system` y `/api/system-health` comprueban:

- disponibilidad de fuentes;
- entidades canónicas;
- integridad/numeración de mesas;
- capacidad vs confirmados;
- conciliación de fichas;
- asignaciones persistidas;
- relaciones canónicas;
- guards de escritura/sync.

## 17. Alcance protegido

No modificar como parte del Centro de Gestión:

- sitio público;
- RSVP público;
- galería;
- fotos;
- APIs públicas de inscripción.

Requieren un alcance separado.

## 18. Pendientes no resueltos por código

El sistema no puede inventar conocimiento privado. Para completar el caso real todavía pueden requerirse decisiones humanas como:

- conciliar identidades pendientes;
- definir ramas familiares/sociales no conocidas;
- decidir escenario final de seating;
- confirmar montaje real del recinto;
- completar música, cronograma, proveedores y pagos pendientes.

## 19. Evolución comercial posterior

- staging full-stack;
- suite E2E;
- multi-wedding;
- permisos por boda/proveedor;
- portal de proveedores;
- entregables versionados;
- onboarding segundo matrimonio;
- billing/entitlements después de validar lo anterior.
