# STATUS_AND_ROADMAP.md — Estado y hoja de ruta

> Los conteos operativos cambian con cada RSVP. Consultar las fuentes conectadas antes de tomar decisiones. Este documento describe la arquitectura y el estado de producto; no es una fuente de conteos en tiempo real.

## 1. Leyenda

- ✅ Producción existente
- 🧪 Implementado en Preview / PR #34
- 🟡 Funcional, requiere consolidación
- 🔵 Siguiente entrega
- ⚪ No iniciado
- 🔴 Bloqueado o requiere decisión

## 2. Estado actual

| Módulo | Estado | Observación |
|---|---|---|
| Autenticación administrativa | ✅ | Supabase Auth + `admin_profiles` |
| RSVP y conciliación | ✅ / 🧪 | Base productiva existente + nueva UX en Preview |
| Invitados | 🧪 | Directorio, filtros, edición y distinción entre consolidado/live |
| Necesita atención | 🧪 | Bandeja accionable de conciliación e incidencias |
| Inicio / Command Center | 🧪 | Agrega confirmados, capacidad, cronograma, música, presupuesto y documentos |
| Mesas | 🧪 | Asignación, drag & drop, grupos, capacidad, edición y Preview local |
| Salón | 🧪 | Editor espacial independiente, drag, rotación, bloqueo, zoom y auditoría de layout |
| Planificación | 🧪 | Prioridades derivadas del estado conectado; no checklist genérica |
| Cronograma | 🧪 | Lectura en vivo desde `TIMELINE` |
| Música | 🧪 | Combina cronograma + presupuesto; no inventa playlist faltante |
| Presupuesto | 🧪 | Lectura en vivo desde `PRESUPUESTO_IGLESIA` |
| Proveedores y pagos | 🟡 / 🧪 | Datos estructurados parciales en Supabase + nueva UX en Preview |
| Documentos | 🧪 | Registro privado en `DOCUMENTOS`, búsqueda, filtros y altas protegidas |
| Actividad | 🧪 | `audit_log` presentado como timeline legible |
| Copiloto operacional | 🧪 | Beta de solo lectura, grounded en fuentes conectadas; identidad distinta del benchmark externo |
| Google Sheets sync | ✅ | `sync_outbox` sigue siendo la vía para el espejo donde aplica |
| Auditoría | ✅ | `audit_log` para cambios relevantes |
| Portal de proveedores | ⚪ | Falta permisos, vistas por rol y UX dedicada |
| Entregables versionados | ⚪ | Falta modelo y portal |
| Plano arquitectónico/escala real | 🔵 | El Salón actual usa coordenadas relativas y anclajes conceptuales |
| IA de propuestas de seating | 🔵 | Debe operar sobre propuestas aisladas y reversibles |
| Staging formal aislado | 🔴 | Preview bloquea escrituras deliberadas, pero falta Supabase/Sheets staging independiente |
| Tests automatizados | 🔴 | No existe suite formal suficiente |
| Typecheck separado | 🔴 | El build de Next valida tipos, pero falta script independiente |
| Multi-matrimonio | ⚪ | Posterior al segundo piloto |
| Facturación comercial | ⚪ | Pospuesta |

## 3. Arquitectura operativa V2

### Confirmados

`CONFIRMADOS_ACTUALES` funciona como consolidado curado y `rsvp_response_members` como fuente live para detectar RSVP posteriores al último corte. La UI debe presentar ambos niveles y nunca confundir un corte de hoja con el estado conocido más reciente.

### Datos estructurados

Supabase sigue siendo la fuente canónica para entidades operativas estructuradas como invitados, mesas, asignaciones, incidencias, auditoría, proveedores y pagos cuando esos modelos existen.

### Fuentes especializadas en Sheets

Mientras la migración no esté completa, algunos dominios se consumen directamente desde el Centro de Comandos:

- `CONFIRMADOS_ACTUALES`;
- `GRUPOS_MESA`;
- `PRESUPUESTO_IGLESIA`;
- `TIMELINE`;
- `DOCUMENTOS`.

La interfaz debe declarar la procedencia cuando mezcle Supabase y Sheets.

## 4. Hallazgos operativos detectados durante el V2

Fotografía observada durante la iteración del 12 de agosto de 2026. No hardcodear estos valores:

- la lista de asistentes conocida es mayor que las fichas maestras actualmente operativas;
- Supabase tenía 53 fichas activas marcadas como asistentes en la consulta de auditoría;
- existían 6 mesas y 60 cupos configurados;
- no existían asignaciones persistidas en `seating_assignments` en ese corte;
- se detectó numeración de mesa duplicada;
- se detectaron coordenadas de mesas prácticamente superpuestas.

Por esta razón el producto diferencia explícitamente:

1. asistentes conocidos;
2. asistentes consolidados;
3. RSVP live pendientes de consolidación;
4. fichas maestras operativas;
5. personas efectivamente asignables a mesas.

## 5. Seguridad de Preview

El PR #34 utiliza una política conservadora:

- lecturas pueden consultar fuentes operativas para validar la experiencia;
- las acciones de edición sensibles se simulan localmente en Preview cuando corresponde;
- endpoints nuevos de escritura deben bloquear Preview explícitamente;
- no se hacen migraciones destructivas;
- no se fusiona ni despliega a producción sin aprobación humana.

Esto reduce riesgo, pero **no reemplaza un staging formal**.

## 6. Producto ya cubierto por PR #34

El flujo principal del Centro de Gestión ya puede recorrerse como:

`Inicio → Planificación → Invitados → Necesita atención → Mesas → Salón → Cronograma → Música → Presupuesto/Proveedores → Documentos → Actividad`

La navegación y el diseño ya no replican el benchmark compartido. Se adoptaron patrones útiles, pero con una identidad editorial-operativa propia y un Copiloto operacional distinto.

## 7. Próximas prioridades

### Fase inmediata — QA y consolidación

1. revisar visualmente todas las rutas autenticadas en desktop/tablet/móvil;
2. resolver conteos y semántica entre asistentes conocidos vs fichas operativas;
3. corregir la configuración real de mesas antes de persistir un layout final;
4. revisar todos los botones y estados vacíos/error/loading;
5. validar permisos de escritura de cada endpoint;
6. limpiar warnings de build y deuda CSS;
7. documentar rollback y checklist de merge.

### Staging real

Antes de habilitar flujos de escritura amplios en Preview:

- crear Supabase staging o branch persistente;
- usar datos ficticios o copia sanitizada;
- separar Google Sheets de prueba;
- separar variables Vercel Preview/Production;
- ejecutar smoke tests repetibles.

### Seating Intelligence

Siguiente bloque de producto después de QA:

- reglas duras y preferencias;
- grupos conocidos vs probables;
- propuestas aisladas;
- múltiples escenarios;
- score explicable;
- comparación;
- aprobación explícita;
- aplicación transaccional;
- rollback.

La IA nunca modifica asignaciones reales durante la generación.

### Salón profesional

El editor actual debe evolucionar con:

- fondo de plano real;
- escala/dimensiones verificadas;
- objetos y biblioteca de montaje;
- capas;
- alineación y snapping;
- versiones;
- vistas por proveedor;
- exportación.

No incluir 3D inicialmente.

### Copiloto V2

La beta actual es data-first y de solo lectura. La evolución deberá mantener:

- grounding en fuentes conectadas;
- explicación de por qué responde algo;
- diferenciación entre hecho, inferencia y sugerencia;
- confirmación explícita antes de cualquier acción;
- registro de acciones;
- permisos por rol.

No convertirlo en agente autónomo de escritura.

## 8. MVP comercial

El producto se acerca al MVP cuando:

1. la pareja puede operar sin entrar a Supabase;
2. el planner gestiona invitados, RSVP, mesas, salón y cronograma;
3. las respuestas conjuntas cuentan por persona;
4. las incidencias son accionables;
5. banquetera/venue/foto/AV pueden tener vistas acotadas;
6. cambios relevantes quedan auditados;
7. la interfaz funciona en móvil y escritorio;
8. IA/seating sólo propone hasta aprobación humana;
9. existe staging real y pruebas mínimas;
10. puede incorporarse un segundo matrimonio sin duplicar código.

## 9. Fuera de alcance inmediato

- cambios al sitio público;
- pagos online;
- marketplace;
- 3D;
- app nativa;
- IA autónoma;
- merge automático a producción.
