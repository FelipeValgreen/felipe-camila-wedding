# Auditoría revisada del Centro de Gestión

**Repositorio:** `FelipeValgreen/felipe-camila-wedding`  
**Rama auditada:** `docs/gestion-ai-context`  
**Fecha:** 25 de julio de 2026  
**Alcance:** exclusivamente `gestion/**`  
**Modalidad:** inspección de código y documentación en modo solo lectura.

---

## 1. Límite de esta auditoría

Esta auditoría confirma lo que existe en el repositorio y cómo está implementado según el código inspeccionado.

No constituye una validación funcional completa de producción. No se probaron mediante escrituras reales:

- creación o edición contra Supabase productivo;
- políticas RLS efectivas con todos los roles;
- fallos de red o reintentos reales;
- sincronización contra Google Sheets productivo;
- comportamiento completo en móviles reales;
- rendimiento con datos de producción;
- despliegues Preview conectados a staging.

Por tanto, cuando este documento indique que un módulo es funcional, debe entenderse como:

> La implementación existe y parece coherente según el código, pendiente de pruebas controladas en un entorno aislado.

---

## 2. Regla de alcance obligatoria

Los trabajos de adaptación comercial y visual deben limitarse a:

```text
gestion/**
```

Quedan fuera de alcance, salvo autorización explícita y separada:

- frontend público de `felipeycami.cl`;
- formulario público de RSVP;
- APIs públicas de inscripción;
- galería pública;
- subida pública de fotografías;
- flujo activo de confirmaciones;
- Supabase productivo durante desarrollo;
- Google Sheets productivo durante desarrollo.

El matrimonio se encuentra en operación real y continúan ingresando confirmaciones. Ninguna mejora del dashboard puede interrumpir ese flujo.

---

## 3. Conclusión ejecutiva

El Centro de Gestión no debe reconstruirse desde cero.

La auditoría encontró una base reutilizable en:

- autenticación con Supabase;
- directorio individual de invitados;
- respuestas RSVP originales;
- integrantes de respuestas conjuntas;
- bandeja de incidencias;
- asignación transaccional de mesas;
- validación de capacidad;
- auditoría;
- sincronización idempotente mediante `sync_outbox`;
- proveedores, gastos y pagos como base inicial.

Los principales problemas están en:

- jerarquía visual;
- claridad de navegación;
- acciones incompletas;
- botones que no tienen un flujo completo;
- experiencia móvil;
- comprensión de RSVP frente a personas individuales;
- experiencia operativa de mesas;
- plano visual demasiado básico;
- falta de un sistema visual consistente.

La estrategia correcta es conservar la lógica confiable y rediseñar progresivamente la experiencia.

---

## 4. Mapa de rutas actuales

| Ruta | Archivo | Estado según código |
|---|---|---|
| `/` | `gestion/app/page.tsx` | Redirección a `/dashboard`. |
| `/login` | `gestion/app/login/page.tsx` | Login con Supabase Auth; contiene validación local de correos que debe revisarse. |
| `/auth/callback` | `gestion/app/auth/callback/route.ts` | Callback de autenticación. |
| `/dashboard` | `gestion/app/dashboard/page.tsx` | Resumen con métricas y refresco periódico. |
| `/dashboard/guests` | `gestion/app/dashboard/guests/page.tsx` | Invitados individuales y respuestas originales. |
| `/dashboard/issues` | `gestion/app/dashboard/issues/page.tsx` | Resolución de incidencias y respuestas conjuntas. |
| `/dashboard/tables` | `gestion/app/dashboard/tables/page.tsx` | Gestión por lista y plano referencial. |
| `/dashboard/finance` | `gestion/app/dashboard/finance/page.tsx` | Proveedores, gastos y pagos. |
| `/dashboard/activity` | `gestion/app/dashboard/activity/page.tsx` | Actividad basada en `audit_log`. |

---

## 5. APIs actuales reutilizables

| Ruta | Función principal | Decisión |
|---|---|---|
| `POST/PATCH/DELETE /api/guests` | Crear, editar y eliminar invitados | Reutilizar creación/edición. Revisar y limitar borrado físico. |
| `POST/PATCH/DELETE /api/tables` | Administrar mesas | Reutilizar validaciones. Revisar eliminación física. |
| `POST/DELETE /api/seating` | Asignar o quitar invitados | Reutilizar como núcleo transaccional. |
| `POST /api/rsvp/reconcile` | Conciliar RSVP | Reutilizar sin cambios funcionales no autorizados. |
| `POST/PATCH /api/vendors` | Administrar proveedores | Reutilizar y ampliar progresivamente. |
| `POST/PATCH /api/expenses` | Administrar gastos | Reutilizar y completar UI más adelante. |
| `POST/PATCH/DELETE /api/payments` | Administrar pagos | Reutilizar; revisar política de anulación frente a borrado. |
| `POST /api/sync/process` | Procesar sincronización manual | Conservar. No modificar en los primeros PR visuales. |
| `GET /api/cron/sync-outbox` | Procesar cron horario | Conservar. Fuera de alcance inicial. |

---

## 6. Hallazgos de experiencia de usuario

### Navegación

La navegación actual es funcional, pero representa módulos técnicos más que flujos cotidianos.

Debe evolucionar hacia una estructura comprensible:

1. Inicio
2. Invitados
3. RSVP e incidencias
4. Mesas
5. Planos
6. Cronograma
7. Proveedores
8. Entregables
9. Finanzas
10. Actividad
11. Configuración

No deben agregarse enlaces activos hacia páginas inexistentes. Una futura sección debe mostrarse deshabilitada y explicada, o no mostrarse todavía.

### Botones y acciones

Cada acción visible debe quedar en uno de estos estados:

1. funcional;
2. eliminada;
3. deshabilitada con explicación;
4. registrada como tarea concreta del roadmap.

No deben existir botones que parezcan operativos y no produzcan un resultado claro.

### Móvil

Las tablas actuales de invitados y RSVP dependen demasiado del desplazamiento horizontal. Deben diseñarse alternativas responsive:

- filas compactas;
- tarjetas;
- columnas prioritarias;
- filtros persistentes;
- acciones accesibles;
- detalles en drawer o página secundaria.

---

## 7. Estado corregido por módulo

| Módulo | Backend y datos | Interfaz actual | Decisión |
|---|---|---|---|
| Autenticación | Reutilizable | Funcional, con hardcode de correos | Corregir de forma separada y pequeña. |
| Dashboard | Consultas reutilizables | Funcional pero con jerarquía mejorable | Rediseñar visualmente sin cambiar datos. |
| Invitados | Base robusta | Funcional, densa en móvil | Conservar lógica y rediseñar UX. |
| RSVP | Modelo correcto | Puede ser difícil de comprender | Conservar evidencia original y mejorar lenguaje. |
| Incidencias | RPC y flujo reutilizables | Funcional, requiere simplificación | Rediseñar resolución guiada. |
| Mesas por lista | Backend transaccional sólido | Operativamente confuso | Rediseñar completamente la interacción. |
| Plano de mesas | Datos básicos reutilizables | Referencial y limitado | Construir nuevo editor 2D por etapas. |
| Proveedores | Base inicial existente | Integrado dentro de Finanzas | Separar y completar progresivamente. |
| Finanzas | Modelo inicial reutilizable | Acciones incompletas | Mejorar en PR específico posterior. |
| Actividad | `audit_log` reutilizable | Sin paginación suficiente | Mejorar consulta y navegación. |
| Sincronización | Núcleo valioso y sensible | Presentación técnica | Conservar backend y simplificar lenguaje. |

---

## 8. Módulo de mesas

### Lo que debe conservarse

- `wedding_tables`;
- `seating_assignments`;
- `assign_guest_to_table`;
- `unassign_guest_from_table`;
- validación de asistencia;
- validación de capacidad;
- auditoría;
- sincronización con Sheets.

### Problemas actuales

- coordenadas X/Y manuales;
- falta de arrastrar y soltar;
- falta de zoom y desplazamiento;
- falta de fondo del recinto;
- falta de capas y objetos;
- interacción móvil poco clara;
- bloqueo del plano no completamente coherente con los controles visibles;
- mezcla en una sola pantalla de configuración, asignación y representación visual.

### Nueva estructura recomendada

#### Vista 1: gestión por personas

- búsqueda;
- filtros;
- confirmados sin mesa;
- restricciones alimentarias;
- selección múltiple;
- asignar, mover y quitar;
- capacidad visible;
- experiencia móvil completa.

#### Vista 2: gestión por mesa

- tarjetas de mesa;
- ocupación y capacidad;
- integrantes;
- grupos;
- restricciones;
- alertas;
- acciones rápidas.

#### Vista 3: plano 2D

- drag-and-drop;
- zoom y pan;
- fondo del recinto;
- objetos;
- capas;
- rotación;
- bloqueo;
- alineación;
- historial de versiones.

El plano debe construirse después de estabilizar la gestión operativa por lista y por mesa.

---

## 9. Riesgos de seguridad e integridad

### Preview conectado a producción

Es el riesgo prioritario.

Antes de cualquier PR funcional debe verificarse que Vercel Preview no use:

- `NEXT_PUBLIC_SUPABASE_URL` de producción;
- `SUPABASE_SECRET_KEY` de producción;
- `GOOGLE_SHEETS_SPREADSHEET_ID` productivo;
- credenciales de servicio de Google productivas.

El entorno Preview debe apuntar a staging o tener las escrituras externas desactivadas.

### Borrado físico

Los endpoints actuales incluyen operaciones físicas de eliminación.

Regla para el desarrollo futuro:

- no ampliar el uso de borrado físico;
- preferir `inactive`, `archived_at`, `cancelled` o `voided`;
- conservar auditoría;
- exigir respaldo y aprobación para cualquier eliminación masiva.

### Falta de `wedding_id`

No incorporar un segundo matrimonio antes de implementar aislamiento por evento y pruebas de RLS.

### Autorización duplicada

La comprobación administrativa está repetida en varias rutas. Su centralización es deseable, pero debe hacerse en un PR pequeño, con pruebas de regresión y sin mezclarla con cambios de finanzas.

### Correos autorizados en frontend

La lista local del login debe eliminarse en un PR de autenticación separado. La autorización debe depender de Supabase Auth y `admin_profiles`, no de un array en el cliente.

---

## 10. Diferencias entre documentación y código

- Los conteos incluidos en documentos son fotografías históricas, no valores permanentes.
- El código consulta dinámicamente a Supabase.
- Proveedores y gastos tienen una base funcional, pero la interfaz no ofrece un ciclo completo de administración.
- El plano 2D actual es referencial, no un editor.
- `gestion/package.json` no posee actualmente scripts formales de `test` ni `typecheck`.
- La documentación debe actualizarse cuando cambien rutas, tablas, RPC o decisiones de alcance.

---

## 11. Primer PR funcional corregido

La propuesta original de la auditoría mezclaba demasiados cambios. No debe implementarse como una sola entrega.

### PR 0B — Protecciones de desarrollo y calidad

**Objetivo:** preparar un entorno seguro antes del rediseño.

**Incluye únicamente:**

1. agregar script `typecheck` con `tsc --noEmit`;
2. documentar y validar variables por entorno;
3. introducir una protección explícita para impedir sincronización o escrituras administrativas en Preview cuando no estén autorizadas;
4. establecer una comprobación mínima de build y typecheck;
5. documentar cómo usar staging.

**No incluye:**

- cambios de UI;
- cambios de login;
- refactor de todas las APIs;
- edición o eliminación de proveedores;
- edición o eliminación de gastos;
- migraciones productivas;
- cambios a RSVP;
- cambios a mesas;
- cambios a `sync_outbox` productivo.

### Criterios de aceptación

- `npm run build` termina correctamente;
- `npm run typecheck` existe y termina correctamente, o los errores previos quedan documentados sin ocultarse;
- Preview no puede procesar la planilla productiva por error;
- no se cambia el comportamiento de producción;
- no se modifica el sitio público;
- rollback mediante revert del PR.

---

## 12. Secuencia de PR recomendada

### PR 0A — Documentación

- documentación base;
- auditoría revisada;
- sin código.

### PR 0B — Seguridad de desarrollo

- staging;
- variables;
- typecheck;
- guardas de entorno.

### PR 1 — Sistema visual y navegación

- design system;
- shell del dashboard;
- navegación;
- responsive;
- inventario de acciones;
- sin migraciones.

### PR 2 — Dashboard operativo

- “Necesita tu atención”;
- jerarquía de métricas;
- actividad reciente;
- accesos rápidos;
- lenguaje humano para sincronización.

### PR 3 — Invitados, RSVP e incidencias

- interfaz responsive;
- separación comprensible entre personas y respuestas;
- resolución guiada;
- backend actual conservado.

### PR 4 — Mesas operativas

- gestión por persona;
- gestión por mesa;
- selección múltiple;
- grupos;
- restricciones;
- backend actual conservado.

### PR 5 — Plano 2D

- editor visual por etapas;
- objetos;
- fondo;
- capas;
- versiones;
- aplicación controlada.

### PR posteriores

- proveedores y portal;
- cronograma;
- entregables;
- IA para propuestas de mesas;
- multi-matrimonio.

---

## 13. Matriz final de reutilización

| Elemento actual | Estado según código | Reutilizar | Rediseñar | Riesgo |
|---|---|---:|---:|---|
| Supabase Auth y middleware | Implementado | Sí | Parcial | Medio |
| Dashboard | Implementado | Consultas | Sí | Bajo |
| Invitados | Implementado | Backend y modelo | Sí | Medio por PII |
| RSVP originales | Implementado | Sí | Presentación | Alto por operación activa |
| Respuestas conjuntas | Implementado | Sí | Presentación | Alto por conciliación |
| Incidencias | Implementado | RPC y datos | Sí | Medio |
| Mesas por lista | Implementado | Backend | Sí | Medio |
| Plano referencial | Limitado | Datos básicos | Sí, completo | Medio |
| Proveedores | Parcial | Sí | Sí | Medio |
| Finanzas | Parcial | Sí | Sí | Medio |
| Actividad | Implementado | Sí | Parcial | Bajo |
| `sync_outbox` | Implementado | Sí | Solo lenguaje visual | Alto |
| Google Sheets | Operativo como espejo | Sí | No en fase inicial | Alto |
| Sitio público | Producción activa | No tocar | No | Crítico |

---

## 14. Decisión final

El Centro de Gestión está en una condición adecuada para una mejora progresiva.

La prioridad no es reemplazar la arquitectura existente, sino:

1. aislar desarrollo de producción;
2. establecer controles de calidad;
3. crear un sistema visual coherente;
4. corregir navegación y acciones incompletas;
5. rediseñar los módulos de mayor fricción;
6. incorporar planos e inteligencia artificial sobre una base estable.

Toda mejora debe demostrar qué reutiliza antes de proponer reemplazos.

---

## 15. Próxima acción autorizable

Después de aprobar y fusionar la documentación:

1. configurar o verificar staging;
2. verificar variables Vercel Preview;
3. crear la especificación `TASK-001` para PR 0B;
4. pedir a Antigravity un plan de implementación de solo lectura;
5. revisar el plan;
6. autorizar un PR pequeño sin migraciones productivas.
